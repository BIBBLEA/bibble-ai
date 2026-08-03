# Audit de configuration — bibble-ai

État des lieux réalisé le 2026-08-04 sur les trois services externes du projet, en vue de :

- corriger les vulnérabilités relevées par l'audit de sécurité (crédits atomiques, routes API, webhooks Stripe) ;
- **faire fonctionner les e-mails transactionnels** (confirmation d'inscription, réinitialisation de mot de passe).

| Document | Service | Constat en une ligne |
|---|---|---|
| [etat-supabase.md](./etat-supabase.md) | Supabase | SMTP Resend actif et fonctionnel ; il manque tout le flux « mot de passe oublié » côté app (code reverté) |
| [etat-resend.md](./etat-resend.md) | Resend | Domaine vérifié, envois délivrés ; les échecs récents viennent de tests faits avec `vous@example.com` |
| [etat-stripe.md](./etat-stripe.md) | Stripe | Tout est en sandbox : le compte live n'est **pas activé** (bloquant pour le lancement) |
