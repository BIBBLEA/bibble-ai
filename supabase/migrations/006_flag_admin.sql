-- ============================================
-- MIGRATION 006 : Flag d'administration en base
-- ============================================
-- Le portail d'administration (src/app/api/admin/route.ts) reconnaissait son
-- administrateur en comparant `user.email` à la variable d'environnement
-- ADMIN_EMAIL. Le droit reposait donc sur un attribut mutable et connu :
--   - l'adresse circule (mentions légales, support, en-têtes d'e-mails) ;
--   - le parcours de changement d'e-mail la rend portable — qui parvient à
--     faire porter cette adresse à son compte devient administrateur ;
--   - si le compte correspondant est supprimé, l'adresse redevient libre à
--     l'inscription.
-- Une variable d'environnement décrit par ailleurs un déploiement, pas une
-- personne : elle vaut pour tous les environnements qui la partagent.
--
-- Correctif : le droit devient un attribut de la ligne de profil, désigné une
-- fois pour toutes et attaché à l'`id` (donc insensible à un changement
-- d'adresse ultérieur). La colonne est hors de portée du client : les rôles
-- anon et authenticated n'ont plus l'UPDATE sur profiles depuis 003, et la
-- lecture du flag se fait côté serveur avec la clé service_role.
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_admin IS
  'Droit d''accès au portail d''administration. Écrit uniquement en SQL '
  '(rôle postgres) ou par le serveur via la clé service_role — jamais par '
  'l''utilisateur : voir les GRANT de 003 et 006.';

-- ============================================
-- DROITS SUR LA COLONNE
-- ============================================
-- État hérité de 003 : `REVOKE UPDATE ON public.profiles FROM anon,
-- authenticated`, suivi d'un `GRANT UPDATE (full_name, avatar_url)`. Un droit
-- accordé colonne par colonne ne s'étend pas aux colonnes créées ensuite :
-- is_admin naît donc déjà non modifiable par l'utilisateur. Les trois ordres
-- ci-dessous ne changent rien à cet état — ils le réaffirment, pour que la
-- protection de cette colonne soit lisible ici et survive à une base recréée
-- dans un ordre inattendu.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- Refus explicite, y compris à PUBLIC : documente l'intention et couvre le cas
-- d'un futur `GRANT UPDATE (...)` posé trop largement sur la table.
REVOKE UPDATE (is_admin) ON public.profiles FROM PUBLIC, anon, authenticated;

-- Lecture : `authenticated` conserve le SELECT sur profiles, mais la policy
-- « Users can view own profile » (001) le limite à sa propre ligne. Voir son
-- propre is_admin est sans conséquence — le connaître ne permet pas de l'écrire.
-- `anon` ne satisfait aucune policy de la table et ne lit donc rien.
--
-- L'INSERT reste hors de portée : aucune policy INSERT n'existe sur profiles
-- (002), et le trigger handle_new_user (001) n'écrit que id, email, full_name
-- et avatar_url — un nouvel inscrit prend toujours la valeur par défaut FALSE.
--
-- Côté serveur, aucune route ne recopie un objet reçu du client dans un UPDATE
-- sur profiles : toutes énumèrent leurs colonnes littéralement. La clé
-- service_role ne peut donc pas être détournée pour promouvoir un compte.

-- ============================================
-- DÉSIGNATION DU PREMIER ADMINISTRATEUR
-- ============================================
-- Aucune adresse n'est inscrite ici : une migration est un fichier versionné et
-- partagé, elle ne doit pas fixer qui administre le service. Après application,
-- exécuter dans l'éditeur SQL Supabase (rôle postgres) :
--
--   UPDATE public.profiles
--      SET is_admin = TRUE
--    WHERE email = 'adresse.de.l.administrateur@exemple.tld';
--
-- Le compte doit exister au préalable (s'inscrire d'abord sur le site). La
-- désignation se fait par e-mail parce que c'est la seule donnée lisible par un
-- humain, mais le droit reste porté par l'`id` de la ligne : changer d'adresse
-- ensuite ne le déplace pas, et personne ne peut en hériter en reprenant
-- l'adresse.
--
-- Contrôle après coup — la liste doit tenir en quelques lignes attendues :
--   SELECT id, email, is_admin FROM public.profiles WHERE is_admin;
--
-- Retrait d'un administrateur (départ, compte compromis) :
--   UPDATE public.profiles SET is_admin = FALSE WHERE id = '<uuid>';
--
-- Reprise en cas de perte du dernier compte administrateur : la même requête,
-- exécutée avec la clé service_role ou depuis l'éditeur SQL. Cette voie de
-- secours suppose l'accès au projet Supabase, ce qui est le bon niveau
-- d'exigence — c'est précisément ce qu'une variable d'environnement de secours
-- ne garantissait pas.
