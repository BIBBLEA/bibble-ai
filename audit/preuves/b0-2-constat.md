# B0.2 — Constat sur les soldes de crédits

Requêtes de `b0-2-controle-soldes.sql` exécutées le 2026-08-04 sur le projet hébergé.
Résultats reproduits sans données nominatives : trois comptes sont concernés, désignés ici
1, 2 et 3. La correspondance figure dans la sortie brute de la requête 1.

## Écarts relevés

| Compte | Plan | Solde | Somme du journal | Écart | Transactions | Dernière |
|---|---|---|---|---|---|---|
| 1 (administratrice) | growth | 0 | −6 | **+6** | 13 | 2026-07-15 |
| 2 | starter | 0 | −3 | **+3** | 6 | 2026-08-01 |
| 3 | aucun | 0 | −1 | **+1** | 1 | 2026-07-12 |

Total : 3 comptes, **10 crédits** non justifiés par le journal, écart maximum 6.

Aucun solde négatif. Aucun plan renseigné sans abonnement actif correspondant.

## Lecture

Les trois comptes ont un solde nul et un journal négatif : ils ont **consommé plus de crédits
qu'il ne leur en a été attribué au journal**. Dix crédits sont donc entrés sans laisser de trace.

Aucune voie applicative ne peut produire cela — vérifié dans le code antérieur aux correctifs :
le webhook Stripe, l'action `adjust_credits` du portail d'administration et les trois fonctions
de `src/lib/credits.ts` insèrent toutes une ligne dans `credit_transactions` dans la foulée de
l'écriture du solde. Ces dix crédits proviennent donc d'une écriture directe sur
`profiles.credits`, par l'une de ces deux voies :

- l'éditeur SQL du tableau de bord Supabase, sous le rôle `postgres` ;
- la faille B0.1, avec la clé publique du site.

**Les deux laissent exactement la même trace.** Rien ne permet de les distinguer après coup.

## Ce qui oriente vers des attributions manuelles

- Les volumes sont faibles et cohérents avec des essais : 6 correspond au quota mensuel du plan
  Growth, 3 et 1 à des appoints.
- Les trois comptes sont à zéro aujourd'hui : rien n'a été thésaurisé.
- Aucun plan n'a été usurpé, alors que la faille permettait aussi d'écrire la colonne `plan` —
  c'est ce qu'aurait fait quelqu'un cherchant à s'octroyer un abonnement.
- Le plus gros écart porte sur le compte de l'administratrice elle-même.
- Le compte 3 n'a jamais eu de plan et ne compte qu'une seule transaction, un débit isolé.

Ces éléments désignent des crédits posés à la main pendant la mise au point, puis consommés.

## Ce qui reste à confirmer

**Une seule question tranche le dossier** : des crédits ont-ils été attribués à la main depuis
l'éditeur SQL Supabase pendant les essais ? Si oui, les dix crédits sont expliqués et le dossier
est clos. Sinon, il faut retenir l'hypothèse d'une exploitation de la faille — dix vidéos
générées sans contrepartie, ce qui reste d'ampleur négligeable au regard du coût unitaire.

## Portée du contrôle

Une écriture directe suivie d'une consommation intégrale du solde ne laisse aucun écart : ce
contrôle ne détecte que les traces résiduelles. Il ne prouve donc pas l'absence d'abus, seulement
qu'aucun abus n'a laissé de trace détectable au-delà de ces dix crédits.

## État de la base hébergée

La requête 4 montre que la production porte déjà les restrictions de `003_securisation_profiles.sql` :

- la policy `Users can update own profile` a bien une clause `with_check` ;
- le rôle `authenticated` ne peut écrire que `full_name` et `avatar_url`.

Sur une base sans cette migration, `authenticated` disposerait de l'`UPDATE` sur toutes les
colonnes. **La faille B0.1 est donc déjà fermée en production.** Reste à établir quand et par qui
les migrations y ont été appliquées, et si le lot complet (000 à 008) l'a été ou seulement une
partie — les correctifs des crédits atomiques et de l'idempotence des webhooks en dépendent.
