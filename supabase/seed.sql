-- ============================================
-- SEED DATA (Données de test)
-- À exécuter uniquement en environnement de développement
-- ============================================

-- Note : Les utilisateurs sont créés via Supabase Auth.
-- Ce fichier est un exemple de comment insérer des données de test
-- une fois qu'un utilisateur existe dans auth.users.

-- Exemple d'insertion d'une transaction de crédit (à adapter avec un vrai user_id) :
-- INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
-- VALUES ('user-uuid-here', 'subscription_credit', 6, 6, 'Abonnement Growth — 6 crédits attribués');

-- Mapping des plans et crédits :
-- ┌──────────┬─────────┬──────────┐
-- │ Plan     │ Prix    │ Crédits  │
-- ├──────────┼─────────┼──────────┤
-- │ starter  │ 9,99€   │ 2        │
-- │ growth   │ 19,99€  │ 6        │
-- │ pro      │ 39,99€  │ 15       │
-- └──────────┴─────────┴──────────┘
