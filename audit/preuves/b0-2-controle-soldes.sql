-- ============================================
-- B0.2 — Rechercher les soldes de crédits incohérents
-- ============================================
-- À exécuter sur le projet Supabase en production, dans l'éditeur SQL du
-- tableau de bord. Requêtes de lecture seule : aucun SELECT ci-dessous ne
-- modifie quoi que ce soit.
--
-- Objet : la policy corrigée en 003 laissait tout utilisateur authentifié
-- écrire dans profiles.credits. Reste à savoir si quelqu'un s'en est servi
-- avant le correctif. Le journal credit_transactions est alimenté par le
-- serveur seul ; un solde qui ne correspond pas à la somme du journal est donc
-- le signe d'une écriture directe.
--
-- Limite à connaître : une écriture directe suivie d'une consommation complète
-- ne laisse pas d'écart. L'absence d'écart ne prouve donc pas l'absence d'abus,
-- seulement l'absence de trace résiduelle. La requête 3 couvre en partie ce cas
-- en cherchant les soldes négatifs et les consommations sans crédit préalable.
-- ============================================

-- --- 1. Écarts entre le solde et le journal ---------------------------------
-- Une ligne = un compte dont le solde ne s'explique pas par ses transactions.
-- « ecart » positif : le compte détient plus de crédits que le journal n'en
-- justifie — c'est la signature d'une attribution directe.

SELECT
  p.id,
  p.email,
  p.plan,
  p.credits                                   AS solde_actuel,
  COALESCE(SUM(t.amount), 0)                  AS somme_journal,
  p.credits - COALESCE(SUM(t.amount), 0)      AS ecart,
  COUNT(t.id)                                 AS nb_transactions,
  MAX(t.created_at)                           AS derniere_transaction
FROM public.profiles p
LEFT JOIN public.credit_transactions t ON t.user_id = p.id
GROUP BY p.id, p.email, p.plan, p.credits
HAVING p.credits <> COALESCE(SUM(t.amount), 0)
ORDER BY (p.credits - COALESCE(SUM(t.amount), 0)) DESC;


-- --- 2. Ampleur globale -----------------------------------------------------
-- Vue d'ensemble : combien de comptes concernés, et pour quel volume.

SELECT
  COUNT(*)                                       AS comptes_avec_ecart,
  COUNT(*) FILTER (WHERE ecart > 0)              AS comptes_en_exces,
  COALESCE(SUM(ecart) FILTER (WHERE ecart > 0), 0) AS credits_en_exces,
  COALESCE(MAX(ecart), 0)                        AS ecart_maximum
FROM (
  SELECT p.credits - COALESCE(SUM(t.amount), 0) AS ecart
  FROM public.profiles p
  LEFT JOIN public.credit_transactions t ON t.user_id = p.id
  GROUP BY p.id, p.credits
) AS ecarts
WHERE ecart <> 0;


-- --- 3. Autres signatures d'anomalie ----------------------------------------
-- a) Soldes négatifs : impossibles par le chemin applicatif.

SELECT id, email, credits
FROM public.profiles
WHERE credits < 0;

-- b) Comptes ayant consommé sans qu'aucun crédit leur ait été attribué.

SELECT
  p.id,
  p.email,
  p.credits,
  SUM(t.amount) FILTER (WHERE t.amount < 0) AS total_consomme
FROM public.profiles p
JOIN public.credit_transactions t ON t.user_id = p.id
GROUP BY p.id, p.email, p.credits
HAVING SUM(t.amount) FILTER (WHERE t.amount > 0) IS NULL
   AND SUM(t.amount) FILTER (WHERE t.amount < 0) IS NOT NULL;

-- c) Plan renseigné sans abonnement Stripe correspondant : l'autre colonne que
--    la faille laissait écrire.

SELECT p.id, p.email, p.plan, p.stripe_subscription_id
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
WHERE p.plan IS NOT NULL
  AND s.id IS NULL;


-- --- 4. Vérifier l'état réel de la policy en production ---------------------
-- Confirme que la base hébergée est bien dans l'état du dépôt. Avant
-- l'application de 003, « qual » vaut (auth.uid() = id) et « with_check » est
-- NULL. Après, with_check est renseigné.

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Colonnes que le rôle « authenticated » peut écrire. Après 003, la réponse
-- attendue est full_name et avatar_url, rien d'autre.

SELECT column_name, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND grantee = 'authenticated'
  AND privilege_type = 'UPDATE'
ORDER BY column_name;
