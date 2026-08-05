# Migrations 004 à 008 en production

Projet hébergé `lealaref6@gmail.com's Project` (`ixalcjbunskraviicnum`, branche `main`).
Contrôle préalable et application le 2026-08-05, depuis l'éditeur SQL du tableau de bord,
rôle `postgres`.

## Contrôle préalable

Requêtes de [controle-pre-migration.sql](./controle-pre-migration.sql).

| Contrôle | Constat |
|---|---|
| Registre de la CLI | schéma `supabase_migrations` **absent** |
| Objets de 004 à 008 | aucun présent |
| Policies `video_generations` | `Users can view own videos` (SELECT) + `Users can insert own videos` (INSERT) |
| PostgreSQL | 17.6, `uuid-ossp` active |
| Volumétrie | 10 profils, 20 vidéos, 22 transactions, 2 abonnements |

Le registre absent établit que le schéma a été posé à la main, jamais par la CLI. `supabase db push`
est donc écarté : il rejouerait depuis `000`, et `001_initial_schema.sql` échouerait dès
`CREATE TABLE public.profiles` — ce fichier n'est pas idempotent. Les cinq migrations ont été
collées à la main, dans l'ordre, avec vérification après chacune.

Pas de sauvegarde préalable : le plan Free n'inclut ni sauvegarde planifiée ni PITR. Les cinq
migrations ne réécrivent aucune donnée ; la seule écriture porte sur une ligne (droit
d'administration).

## Application

Toutes les étapes en `Success`. Vérifications :

**004 — crédits atomiques.** `consume_credit` et `grant_credits` créées, `prosecdef = true`,
ACL `{postgres=X/postgres,service_role=X/postgres}` : les `REVOKE` ont joué, ni `anon` ni
`authenticated` ne peuvent les appeler.

**005 — journal des événements Stripe.** `stripe_events` : RLS active, 0 policy.

**006 — droit d'administration.** Privilèges `UPDATE` d'`authenticated` sur `profiles` :
`avatar_url` et `full_name`, pas une colonne de plus. `credits`, `plan` et `is_admin` restent hors
d'atteinte du client.

**Désignation de l'administratrice.** La migration crée la colonne sans l'attribuer ; le code
déployé ensuite ne lit plus `ADMIN_EMAIL`. Profil constaté unique et à `false` avant écriture :

```sql
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'lealaref6@gmail.com';
```

`SELECT id, email, is_admin FROM public.profiles WHERE is_admin` ne rend qu'une ligne.

**007 — revue des policies RLS.** Confirmation demandée par le tableau de bord (`DROP POLICY`).
Après application, `video_generations` ne porte plus que `Users can view own videos` (SELECT) :
aucune écriture n'est possible depuis le navigateur.

**008 — limitation de débit.** `rate_limits` : RLS active, 0 policy. `check_rate_limit` :
ACL `{postgres=X/postgres,service_role=X/postgres}`.

## Contrôle final

Les six objets attendus sont en place : tables `stripe_events` et `rate_limits`, fonctions
`consume_credit`, `grant_credits` et `check_rate_limit`, colonne `profiles.is_admin`. La base porte
l'intégralité des correctifs `000` à `008`.

## Reste à faire

Déployer le code (merge `fix-stripe-resend` → `main`). Jusque-là les objets créés sont inertes :
aucun code en ligne ne les appelle, et le portail d'administration continue de reconnaître son
administratrice par `ADMIN_EMAIL` — l'accès n'est donc jamais interrompu.

Le registre `supabase_migrations.schema_migrations` reste absent : la base n'est pas suivie par la
CLI, conformément au choix ci-dessus.
