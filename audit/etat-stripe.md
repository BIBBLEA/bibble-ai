# État des lieux — Stripe

> Audit du 2026-08-04 (branche `fix-stripe-resend`) — compte Stripe « BIBBLE.AI »
> Objectifs : idempotence + sécurisation des webhooks, fiabilité de l'attribution des crédits.

## Configuration constatée

### Compte live (`acct_1Tr0lOF37MrM9Z0l`)

| Élément | Valeur | Statut |
|---|---|---|
| Activation | **Compte activé** — confirmé le 2026-08-04 *(au moment de l'audit, le dashboard live ne donnait accès qu'aux sandboxes)* | OK |
| Produits / tarifs live | À créer (les 6 price IDs actuels sont ceux de la sandbox) | ⚠️ à faire |
| Webhook live | À créer vers `https://www.bibble-ai.com/api/webhooks/stripe` | ⚠️ à faire |
| Clés live sur Vercel | Non basculées (clés de test en Production) | ⚠️ à faire |

### Sandbox « environnement de test BIBBLE.AI » (`acct_1Tr0lcFLZ6I0PNwC`)

| Élément | Valeur | Statut |
|---|---|---|
| Webhook endpoint | `https://bibble-ai-kappa.vercel.app/api/webhooks/stripe` — Active, 0 % d'erreur | OK (test) |
| Événements écoutés | `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_succeeded` | OK — aligné avec le code |
| Version API | `2026-06-24.dahlia` (identique au code `src/lib`/routes) | OK |
| Activité | 0 delivery sur la semaine écoulée | — |

## Ce qu'il manque par rapport à l'objectif

1. ~~Activer le compte Stripe live~~ — **fait** (activation confirmée le 2026-08-04). Le passage en production n'est donc plus bloqué par un délai administratif ; reste à surveiller d'éventuelles demandes de justificatifs complémentaires de Stripe, qui suspendraient les virements.
2. **Créer le webhook live** une fois le compte activé, avec les 4 mêmes événements, pointant vers **`https://www.bibble-ai.com/api/webhooks/stripe`** (le webhook de test pointe vers le domaine `bibble-ai-kappa.vercel.app` ; le domaine de prod doit être utilisé en live), puis reporter le `whsec_…` live dans `STRIPE_WEBHOOK_SECRET` sur Vercel (env Production).
3. **Recréer produits/prix en mode live** : les 6 price IDs (`STRIPE_PRICE_{STARTER,GROWTH,PRO}_{MONTHLY,ANNUAL}`) configurés sur Vercel correspondent à des prix de la sandbox ; les IDs live seront différents et devront remplacer les variables d'environnement Production.
4. **Idempotence côté code (rappel de l'audit sécurité)** : `src/app/api/webhooks/stripe/route.ts` vérifie bien la signature mais ne déduplique pas les événements (`event.id`). Un retry Stripe re-crédite un abonné au plein montant du plan. → table `stripe_events` + insertion unique avant traitement.
5. **Bug `getSubscriptionPeriod`** (`route.ts:43-46`) : `current_period_start` est renseigné avec `current_period_end`. À corriger.
6. **Atomicité des crédits** : l'attribution/consommation se fait en lecture-puis-écriture non transactionnelle (webhook + `generate-video` + `lib/credits.ts`). → fonction RPC Postgres atomique.

## Ordre de mise en production conseillé

1. Correctifs code (idempotence, RPC crédits, bug période) — testables en sandbox.
2. ~~Activation du compte live~~ — fait.
3. Produits + prix live, webhook live vers `www.bibble-ai.com`, mise à jour des env Vercel Production.
4. Paiement réel de bout en bout (checkout → webhook → crédits) avec un petit montant, puis remboursement.
