# Plan d'implémentation — bibble-ai

> Établi le 2026-08-04 — branche `fix-stripe-resend`
> Basé sur l'[état des lieux](./etat-des-lieux.md). Les numéros (#) renvoient aux problèmes qui y sont listés.

## Phase 1 — E-mails : flux mot de passe oublié (#1, #6, #7)

- [ ] **1.1** Ajouter un lien « Mot de passe oublié ? » sur `/login`
- [ ] **1.2** Créer la page `/auth/forgot-password` : formulaire e-mail → `supabase.auth.resetPasswordForEmail(email, { redirectTo: <APP_URL>/auth/update-password })` (l'e-mail part via le SMTP Resend déjà configuré — pas besoin de la clé API Resend côté code)
- [ ] **1.3** Créer la page `/auth/update-password` : réception du lien de récupération, saisie du nouveau mot de passe, `supabase.auth.updateUser({ password })`
- [ ] **1.4** Vérifier que `https://www.bibble-ai.com/auth/update-password` est couvert par les Redirect URLs Supabase (wildcard `/**` déjà en place — contrôle simple)
- [ ] **1.5** Traduire et brander les templates Supabase (Confirm sign up, Reset password, Magic link, Change email) en français — dashboard Authentication → Emails → Templates
- [ ] **1.6** Tests de bout en bout avec de **vraies adresses** (Gmail + Outlook) : inscription → confirmation → connexion, puis reset → nouveau mot de passe → connexion
- [ ] **1.7** Nettoyage : révoquer la clé Resend « Vercel Integration » orpheline et retirer `RESEND_API_KEY` de Vercel (ou la conserver documentée si un envoi applicatif direct est prévu plus tard)

## Phase 2 — Sécurité : crédits atomiques (#3)

- [ ] **2.1** Migration SQL : fonction RPC `consume_credit(user_id, video_id)` — `UPDATE profiles SET credits = credits - 1 WHERE id = $1 AND credits > 0 RETURNING credits` + insertion `credit_transactions` dans la même transaction
- [ ] **2.2** Migration SQL : fonction RPC `grant_credits(user_id, amount, mode reset|add, description, reference_id)` pour webhook et admin
- [ ] **2.3** Remplacer la logique lecture-puis-écriture dans `/api/generate-video` (débit **avant** l'appel HeyGen, re-crédit en cas d'échec HeyGen)
- [ ] **2.4** Remplacer `deductCredit` / `grantSubscriptionCredits` / `grantManualCredits` dans `src/lib/credits.ts` par des appels RPC
- [ ] **2.5** Remplacer la logique `adjust_credits` de `/api/admin` par la RPC
- [ ] **2.6** Test de concurrence : 5 requêtes parallèles avec 1 crédit → 1 seule vidéo générée

## Phase 3 — Sécurité : routes vidéo & API (#5, #10, #11)

- [ ] **3.1** `/api/video-download` : vérifier en base que `heygen_video_id` appartient à `user.id` **avant** d'appeler HeyGen et de renvoyer l'URL
- [ ] **3.2** `/api/video-status` : même contrôle de propriété
- [ ] **3.3** Ajouter `ADMIN_EMAIL` aux variables Vercel (ou mieux : colonne/claim `is_admin` en base au lieu d'une comparaison d'e-mail)
- [ ] **3.4** Rate limiting simple sur `/api/generate-video` (et idéalement les autres routes mutantes)
- [ ] **3.5** Passe rapide RLS sur `profiles`, `video_generations`, `credit_transactions`, `subscriptions`, `site_settings` (#12)

## Phase 4 — Stripe : idempotence & correctifs webhook (#4, #8)

- [ ] **4.1** Migration SQL : table `stripe_events (id text primary key, type text, processed_at timestamptz)`
- [ ] **4.2** Dans le webhook : insérer `event.id` en début de traitement (`on conflict do nothing`) ; si déjà présent → répondre 200 sans retraiter
- [ ] **4.3** Corriger `getSubscriptionPeriod` : `start` = `current_period_start` (actuellement `current_period_end` pour les deux bornes)
- [ ] **4.4** Rejouer les événements depuis la sandbox Stripe (Workbench → Send test events) : vérifier idempotence (double envoi = un seul traitement) et périodes correctes en base

## Phase 5 — Mise en production Stripe (#2, #13) — dépend de la cliente

- [ ] **5.1** 🔑 **Cliente** : activer le compte Stripe live (`acct_1Tr0lOF37MrM9Z0l`) — informations société, identité, IBAN
- [ ] **5.2** Recréer les 3 produits × 2 périodicités en mode live ; récupérer les 6 price IDs live
- [ ] **5.3** Mettre à jour les 12 variables `*_STRIPE_PRICE_*` sur Vercel (env Production) avec les IDs live
- [ ] **5.4** Créer le webhook live → `https://www.bibble-ai.com/api/webhooks/stripe` avec les 4 événements ; reporter le `whsec_` live dans `STRIPE_WEBHOOK_SECRET` (Production)
- [ ] **5.5** Basculer `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` sur les clés live (Production uniquement — garder les clés test en Preview/Dev)
- [ ] **5.6** Test réel de bout en bout : checkout petit montant → webhook → crédits attribués → remboursement

## Ordre d'exécution et dépendances

```
Phase 1 (e-mails)      — indépendante, à faire en premier (mission prioritaire)
Phase 2 (crédits)      — indépendante
Phase 3 (routes)       — indépendante
Phase 4 (webhook)      — avant la phase 5
Phase 5 (Stripe live)  — bloquée par l'activation du compte (action cliente, à demander dès maintenant)
```

Les phases 1 à 4 sont testables intégralement en environnement de test actuel.
Chaque phase = un ou plusieurs commits sur `fix-stripe-resend`, PR unique vers `main` en fin de mission (ou PR par phase si la cliente préfère des livraisons progressives).
