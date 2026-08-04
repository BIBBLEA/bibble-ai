# Audit de configuration — bibble-ai

État des lieux réalisé le 2026-08-04 sur les trois services externes du projet, en vue de :

- corriger les vulnérabilités relevées par l'audit de sécurité (crédits atomiques, routes API, webhooks Stripe) ;
- **faire fonctionner les e-mails transactionnels** (confirmation d'inscription, réinitialisation de mot de passe).

| Document | Contenu |
|---|---|
| [etat-des-lieux.md](./etat-des-lieux.md) | **Synthèse globale** : ce qui marche, ce qui bloque, ce qui manque |
| [plan-implementation.md](./plan-implementation.md) | **Plan d'implémentation** : tâches ordonnées en 5 phases avec dépendances |
| [etat-supabase.md](./etat-supabase.md) | Détail Supabase — SMTP Resend actif et fonctionnel ; il manque tout le flux « mot de passe oublié » côté app (code reverté) |
| [etat-resend.md](./etat-resend.md) | Détail Resend — domaine vérifié, envois délivrés ; les échecs récents viennent de tests faits avec `vous@example.com` |
| [etat-stripe.md](./etat-stripe.md) | Détail Stripe — configuration sandbox conforme au code ; correctifs applicatifs à faire (idempotence, atomicité des crédits, mapping des Price IDs) |

## Périmètre

Ces documents couvrent les **correctifs applicatifs**, recettés en local et en sandbox Stripe. La
bascule du compte Stripe en mode live (tarifs, webhook et clés de production) relève de
l'administration du compte et n'est pas traitée ici.
