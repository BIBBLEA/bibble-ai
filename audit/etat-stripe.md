# État des lieux — Stripe

> Audit du 2026-08-04 (branche `fix-stripe-resend`) — compte Stripe « BIBBLE.AI »
> Objectifs : idempotence + sécurisation des webhooks, fiabilité de l'attribution des crédits.
>
> **Périmètre** : correctifs applicatifs, recettés en sandbox. La bascule du compte en mode live
> (tarifs, webhook et clés de production) relève de l'administration du compte Stripe et n'est pas
> traitée ici.

## Configuration constatée

### Sandbox « environnement de test BIBBLE.AI » (`acct_1Tr0lcFLZ6I0PNwC`)

| Élément | Valeur | Statut |
|---|---|---|
| Webhook endpoint | `https://bibble-ai-kappa.vercel.app/api/webhooks/stripe` — Active, 0 % d'erreur | OK (test) |
| Événements écoutés | `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_succeeded` | OK — aligné avec le code |
| Version API | `2026-06-24.dahlia` (identique au code `src/lib`/routes) | OK |
| Activité | 0 delivery sur la semaine écoulée | — |

## Ce qu'il manque par rapport à l'objectif

1. **Idempotence côté code (rappel de l'audit sécurité)** : `src/app/api/webhooks/stripe/route.ts`
   vérifie bien la signature mais ne déduplique pas les événements (`event.id`). Un retry Stripe
   re-crédite un abonné au plein montant du plan. → table `stripe_events` + insertion unique avant
   traitement.
2. **Bug `getSubscriptionPeriod`** (`route.ts:37-44`) : `current_period_start` est renseigné avec
   `current_period_end`. À corriger.
3. **Atomicité des crédits** : l'attribution/consommation se fait en lecture-puis-écriture non
   transactionnelle (webhook + `generate-video` + `lib/credits.ts`). → fonction RPC Postgres atomique.
4. **Mapping des Price IDs fragile** : `PLAN_CONFIG` (`route.ts:20-30`) et `PLAN_CREDITS`
   (`src/lib/stripe.ts`) sont construits avec `process.env.X || ""`. Une variable manquante produit la
   clé `""` ; plusieurs variables manquantes s'écrasent mutuellement sur cette même clé et faussent
   silencieusement le mapping. Combiné au `break` discret sur `priceId` inconnu (`route.ts:97-100`),
   un paiement peut être accepté sans qu'aucun crédit ne soit attribué, sans alerte. → filtrer les
   clés vides à la construction et rendre le `priceId` inconnu bruyant.

## Ordre de traitement

1. Correctifs code (idempotence, RPC crédits, bug période, durcissement du mapping).
2. Recette en sandbox : rejeu d'événements (Workbench → *Send test events*, ou
   `stripe trigger` via le CLI), vérification des périodes et des soldes en base.
