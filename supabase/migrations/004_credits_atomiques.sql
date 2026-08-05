-- ============================================
-- MIGRATION 004 : Crédits atomiques
-- ============================================
-- Le débit et l'attribution de crédits étaient partout faits en deux temps :
-- lecture du solde, puis écriture d'une valeur calculée en JavaScript
-- (`generate-video/route.ts:98-181`, `src/lib/credits.ts`, `admin/route.ts:107-136`).
-- Entre les deux, l'appel HeyGen prend plusieurs secondes : cinq requêtes
-- simultanées avec 1 crédit lisaient toutes « 1 » et produisaient 5 vidéos.
--
-- Correctif : deux fonctions SQL qui lisent, écrivent et journalisent dans une
-- seule transaction. La concurrence est réglée par le verrou de ligne posé par
-- PostgreSQL : en READ COMMITTED, une transaction concurrente attend la fin de
-- la première puis ré-évalue la ligne dans sa version à jour — la clause
-- `credits > 0` est donc revérifiée sur le solde réel, jamais sur un solde périmé.
--
-- Les rôles anon et authenticated n'ont plus l'UPDATE sur profiles depuis 003 :
-- ces fonctions sont donc SECURITY DEFINER et appelées côté serveur avec la clé
-- service_role.
--
-- Preuve du défaut : audit/preuves/resultats/avant/06-course-credits.log
-- ============================================

-- ============================================
-- FONCTION : consume_credit
-- Débite 1 crédit et journalise la transaction 'usage_debit'.
--
-- Convention de retour (jsonb, jamais NULL, jamais d'exception métier) :
--   succès  → {"success": true,  "reason": "ok",
--              "balance": <solde après débit>}
--   échec   → {"success": false, "reason": "insufficient_credits",
--              "balance": <solde inchangé, 0 en pratique>}
--           → {"success": false, "reason": "profile_not_found",
--              "balance": null}
-- L'appelant décide du code HTTP à partir de `reason` ; `balance` est toujours
-- présent (null seulement si le profil n'existe pas).
-- ============================================
CREATE OR REPLACE FUNCTION public.consume_credit(
  p_user_id UUID,
  p_video_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Décrément atomique : une seule instruction, le solde n'est jamais transporté
  -- côté application. Si aucune ligne ne satisfait `credits > 0`, rien n'est écrit.
  UPDATE public.profiles
     SET credits = credits - 1
   WHERE id = p_user_id
     AND credits > 0
  RETURNING credits INTO v_balance;

  IF v_balance IS NULL THEN
    -- Aucune ligne mise à jour : soit le profil n'existe pas, soit le solde est nul.
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'reason', 'profile_not_found',
        'balance', NULL
      );
    END IF;

    RETURN jsonb_build_object(
      'success', FALSE,
      'reason', 'insufficient_credits',
      'balance', (SELECT credits FROM public.profiles WHERE id = p_user_id)
    );
  END IF;

  -- Même transaction que le décrément : le journal ne peut pas diverger du solde.
  INSERT INTO public.credit_transactions (
    user_id, type, amount, balance_after, description, reference_id
  ) VALUES (
    p_user_id,
    'usage_debit',
    -1,
    v_balance,
    'Génération vidéo',
    p_video_id::TEXT
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'reason', 'ok',
    'balance', v_balance
  );
END;
$$;

-- ============================================
-- FONCTION : grant_credits
-- Attribue des crédits et journalise la transaction correspondante.
--
-- p_mode = 'reset' : le solde DEVIENT p_amount (renouvellement d'abonnement,
--                    crédits non cumulatifs) → transaction 'subscription_credit',
--                    `amount` = p_amount, comme les lignes déjà en base.
-- p_mode = 'add'   : le solde est INCRÉMENTÉ de p_amount, qui peut être négatif
--                    (ajustement admin, remboursement d'une génération échouée)
--                    → transaction 'manual_credit', `amount` = variation réelle
--                    du solde (elle diffère de p_amount si le plancher 0 a joué).
-- Dans les deux modes le solde est borné à 0 : il ne peut jamais devenir négatif.
--
-- Convention de retour (jsonb, jamais NULL, jamais d'exception métier) :
--   succès → {"success": true,  "reason": "ok",
--             "balance": <nouveau solde>, "previous_balance": <ancien solde>}
--   échec  → {"success": false, "reason": "profile_not_found" | "invalid_mode",
--             "balance": null, "previous_balance": null}
-- ============================================
CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_mode TEXT DEFAULT 'add',
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous INTEGER;
  v_balance INTEGER;
BEGIN
  IF p_mode NOT IN ('reset', 'add') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'reason', 'invalid_mode',
      'balance', NULL,
      'previous_balance', NULL
    );
  END IF;

  -- FOR UPDATE verrouille la ligne jusqu'au COMMIT : deux attributions
  -- simultanées sont sérialisées, la seconde lit le solde déjà mis à jour.
  SELECT credits INTO v_previous
    FROM public.profiles
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'reason', 'profile_not_found',
      'balance', NULL,
      'previous_balance', NULL
    );
  END IF;

  IF p_mode = 'reset' THEN
    v_balance := GREATEST(p_amount, 0);
  ELSE
    v_balance := GREATEST(v_previous + p_amount, 0);
  END IF;

  UPDATE public.profiles
     SET credits = v_balance
   WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (
    user_id, type, amount, balance_after, description, reference_id
  ) VALUES (
    p_user_id,
    CASE WHEN p_mode = 'reset' THEN 'subscription_credit' ELSE 'manual_credit' END,
    CASE WHEN p_mode = 'reset' THEN p_amount ELSE v_balance - v_previous END,
    v_balance,
    p_description,
    p_reference_id
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'reason', 'ok',
    'balance', v_balance,
    'previous_balance', v_previous
  );
END;
$$;

-- ============================================
-- DROITS D'EXÉCUTION
-- ============================================
-- Deux droits implicites doivent être retirés, sans quoi ces fonctions
-- rendraient à l'utilisateur exactement ce que 003 lui a enlevé :
--   1. PostgreSQL accorde EXECUTE à PUBLIC sur toute fonction créée ;
--   2. `000_privileges_schema_public.sql` pose un ALTER DEFAULT PRIVILEGES
--      qui accorde ALL ON FUNCTIONS à anon et authenticated.
-- Une fonction SECURITY DEFINER exécutable par `authenticated` permettrait à
-- n'importe quel porteur de la clé anon de s'attribuer des crédits.
REVOKE ALL ON FUNCTION public.consume_credit(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

-- Seul le serveur (clé service_role) appelle ces fonctions.
GRANT EXECUTE ON FUNCTION public.consume_credit(UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, TEXT, TEXT)
  TO service_role;
