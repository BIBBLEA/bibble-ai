-- ============================================
-- Préparation de la base locale
-- ============================================
-- Reproduire les privilèges que Supabase applique par défaut sur un projet
-- hébergé (ALTER DEFAULT PRIVILEGES sur le schéma public). Les migrations du
-- dépôt n'en contiennent aucun : sur le projet en ligne les tables en héritent,
-- une base créée de zéro non.
--
-- Sans ces droits, PostgREST refuse tout accès (42501) et les preuves ne
-- mesureraient plus la RLS mais l'absence de GRANT.
--
-- À appliquer après « npx supabase start » :
--   docker exec -i supabase_db_bibble-ai psql -U postgres -d postgres \
--     < audit/preuves/preparation-locale.sql
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
