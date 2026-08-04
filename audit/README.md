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
| [etat-stripe.md](./etat-stripe.md) | Détail Stripe — compte live **activé le 2026-08-04** ; restent les tarifs live, le webhook de production et la bascule des clés |

## Documents de configuration

Tout ce qui ne peut pas être fait depuis le code (comptes tiers, DNS, variables d'environnement,
interfaces d'administration) est regroupé ici :

| Document | Contenu |
|---|---|
| [actions-cliente.md](./actions-cliente.md) | **Checklist des actions de configuration** (accès administratifs, comptes tiers) — templates e-mail, clé Resend orpheline, variables Vercel, offre Supabase |
| [urls-callback.md](./supabase/urls-callback.md) | **Toutes les URLs à configurer** : Redirect URLs Supabase, webhooks Stripe, variables Vercel, DNS |
| [email-templates/](./supabase/email-templates/README.md) | **6 modèles d'e-mails HTML en français** aux couleurs du site, à coller dans les templates Supabase (+ mode d'emploi) |
