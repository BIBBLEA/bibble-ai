-- ============================================
-- MIGRATION 000 : Privilèges du schéma public
-- ============================================
-- Un projet Supabase hébergé accorde par défaut aux rôles anon, authenticated
-- et service_role les droits sur les objets du schéma public. Les migrations du
-- dépôt s'appuyaient sur ce comportement implicite sans jamais le déclarer :
-- une base recréée depuis ces seuls fichiers n'avait aucun droit, et PostgREST
-- refusait toute requête (42501).
--
-- Cette migration rend ces privilèges explicites. Elle s'exécute avant la
-- création des tables, de sorte que ALTER DEFAULT PRIVILEGES les couvre toutes,
-- et avant 003 qui restreint ensuite l'écriture sur profiles.
--
-- Sur le projet en ligne, l'appliquer ne change rien : elle décrit l'état déjà
-- en place.
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- Tables déjà présentes le cas échéant (application sur une base existante).
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
