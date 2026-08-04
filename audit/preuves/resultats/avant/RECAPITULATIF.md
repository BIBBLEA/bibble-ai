# Résultats des preuves — phase « avant »

Exécuté le 2026-08-04 18:30:21Z.

| # | Faille | Plan | Verdict | Sortie complète |
|---|---|---|---|---|
| 1 | Escalade de crédits via RLS | B0.1 | ❌ EXPLOITÉ | [01-rls-escalade-credits.log](./01-rls-escalade-credits.log) |
| 2 | IDOR sur les vidéos | B2.1 / B2.2 | ❌ EXPLOITÉ | [02-idor-videos.log](./02-idor-videos.log) |
| 3 | Rejeu du webhook Stripe | B3.1 / B3.2 | ❌ EXPLOITÉ | [03-idempotence-webhook.log](./03-idempotence-webhook.log) |
| 4 | Période d'abonnement erronée | B3.3 | ❌ EXPLOITÉ | [04-periode-abonnement.log](./04-periode-abonnement.log) |
| 5 | Mapping des Price IDs | B3.5 | ❌ EXPLOITÉ | [05-mapping-price-ids.log](./05-mapping-price-ids.log) |
| 6 | Course aux crédits | B1.3 / B1.6 | ❌ EXPLOITÉ | [06-course-credits.log](./06-course-credits.log) |

Codes de sortie : `0` = bloqué, `1` = exploité, `2` = indéterminé.
