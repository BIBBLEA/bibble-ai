-- ============================================
-- MIGRATION 003 : Sécurisation de la table profiles
-- ============================================
-- La policy « Users can update own profile » (001_initial_schema.sql:186-188)
-- n'avait ni WITH CHECK ni restriction de colonnes. Un utilisateur authentifié
-- pouvait modifier n'importe quelle colonne de son profil — crédits et plan
-- compris — depuis la console de son navigateur, avec la clé anon publiée dans
-- le site.
--
-- Correctif : retirer le droit d'UPDATE au niveau de la table et ne l'accorder
-- que sur les colonnes non sensibles. Les crédits, le plan et les références
-- Stripe ne sont modifiables que par le serveur (service_role).
--
-- Preuve : audit/preuves/scripts/01-rls-escalade-credits.mjs
-- ============================================

-- --- Policy : ajout du WITH CHECK (interdit de réaffecter la ligne) ---
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- --- Droits par colonne ---
-- Un GRANT au niveau table ne peut pas être restreint colonne par colonne :
-- il faut le retirer entièrement, puis le rendre sur les seules colonnes
-- que l'utilisateur peut modifier lui-même.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;

GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- Rappel des colonnes désormais réservées au serveur :
--   credits, plan, stripe_customer_id, stripe_subscription_id, id, email
