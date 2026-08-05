-- ============================================
-- Contrôle avant application des migrations
-- ============================================
-- À exécuter sur le projet hébergé, dans l'éditeur SQL du tableau de bord.
-- Lecture seule : aucune de ces requêtes ne modifie quoi que ce soit.
--
-- Objet : établir ce que la base contient déjà, pour savoir lesquelles des
-- migrations 004 à 008 restent à appliquer et si l'une d'elles buterait sur un
-- objet existant.
-- ============================================

-- --- 1. Registre des migrations connues de la CLI ---------------------------
-- Détermine ce que « supabase db push » voudra appliquer. Un registre vide ou
-- absent signifie que le schéma a été posé à la main : la CLI voudra alors tout
-- rejouer depuis 000, et 001_initial_schema.sql échouera dès
-- « CREATE TABLE public.profiles » — ce fichier n'est pas idempotent (tables,
-- index, triggers et policies créés sans garde). Dans ce cas, coller 004 à 008
-- à la main plutôt que de passer par la CLI.

SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;


-- --- 2. Objets créés par les migrations à appliquer -------------------------
-- Attendu sur une base qui ne les a pas encore : « absent » partout.

SELECT 'table stripe_events'   AS objet, to_regclass('public.stripe_events')::text AS present
UNION ALL
SELECT 'table rate_limits',     to_regclass('public.rate_limits')::text
UNION ALL
SELECT 'fonction consume_credit',   to_regproc('public.consume_credit')::text
UNION ALL
SELECT 'fonction grant_credits',    to_regproc('public.grant_credits')::text
UNION ALL
SELECT 'fonction check_rate_limit', to_regproc('public.check_rate_limit')::text
UNION ALL
SELECT 'colonne profiles.is_admin',
       (SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'profiles'
           AND column_name = 'is_admin');


-- --- 3. Policy visée par la migration 007 -----------------------------------
-- Attendu : la ligne « Users can insert own videos » est présente. C'est elle
-- qui permet de contourner le contrôle de propriété des vidéos.

SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'video_generations'
ORDER BY policyname;


-- --- 4. Version de PostgreSQL et extensions ---------------------------------
-- Les migrations n'utilisent que du SQL standard et uuid-ossp, déjà activée en
-- 001. Ce contrôle écarte une incompatibilité de version.

SELECT version();

SELECT extname FROM pg_extension ORDER BY extname;


-- --- 5. Volumétrie ----------------------------------------------------------
-- Situe l'ampleur : les migrations ne réécrivent aucune donnée, mais l'ajout
-- d'une colonne sur une table volumineuse mérite d'être anticipé.

SELECT 'profiles'            AS table_name, count(*) FROM public.profiles
UNION ALL SELECT 'video_generations',   count(*) FROM public.video_generations
UNION ALL SELECT 'credit_transactions', count(*) FROM public.credit_transactions
UNION ALL SELECT 'subscriptions',       count(*) FROM public.subscriptions;
