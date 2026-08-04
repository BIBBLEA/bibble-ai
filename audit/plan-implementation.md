# Plan d'implémentation — bibble-ai

> Établi le 2026-08-04, mis à jour après audit approfondi de la chaîne authentification / e-mails
> Branche `fix-stripe-resend` — voir l'[état des lieux](./etat-des-lieux.md)

Le plan est organisé en **deux blocs indépendants** :

- **[BLOC A — Resend / E-mails & Authentification](#bloc-a--resend--e-mails--authentification)** : rendre tous les parcours e-mail fonctionnels de bout en bout (mission prioritaire de la cliente)
- **[BLOC B — Stripe / Paiements & Crédits](#bloc-b--stripe--paiements--crédits)** : sécurité des crédits, idempotence des webhooks, passage en production

---

# BLOC A — Resend / E-mails & Authentification

## Diagnostic

L'infrastructure d'envoi est saine (SMTP Resend actif, domaine `bibble-ai.com` vérifié, e-mails
délivrés). Le problème est **applicatif** : sur 6 parcours e-mail attendus, **1 seul est implémenté**
et il comporte des défauts.

| Parcours | État actuel |
|---|---|
| Inscription + confirmation | ⚠️ Implémenté mais fragile (erreurs silencieuses, PKCE cross-navigateur) |
| Mot de passe oublié | 🔴 Absent — code reverté (`baa348d`, `02649d9`, `a7e6962`) |
| Renvoi de l'e-mail de confirmation | 🔴 Absent — utilisateur non confirmé définitivement bloqué |
| Changement de mot de passe (connecté) | 🔴 Absent |
| Changement d'adresse e-mail | 🔴 Absent |
| Page « Mon compte » | 🔴 Absente — aucune page profil dans l'app |

## A1 — Corriger le parcours d'inscription existant

- [ ] **A1.1** `src/app/login/page.tsx` : lire `searchParams.get("error")` et afficher un message
      lisible. Aujourd'hui le callback redirige vers `/login?error=auth_callback_error` (voir
      `src/app/api/auth/callback/route.ts:37-39`) mais la page **ne lit que `redirect`** — l'utilisateur
      voit une page de connexion muette et ne comprend pas que sa confirmation a échoué.
- [ ] **A1.2** `src/app/api/auth/callback/route.ts` : distinguer les causes d'échec (code absent, code
      expiré, `code_verifier` manquant) et passer un motif explicite en query string plutôt qu'un
      `auth_callback_error` générique.
- [ ] **A1.3** Traiter le **cas PKCE cross-navigateur** : les liens de confirmation sont en PKCE
      (tokens `pkce_…` visibles dans les logs Resend). Si l'utilisateur s'inscrit sur mobile et ouvre
      le mail sur ordinateur, le `code_verifier` est absent → échec systématique. Deux options :
      (a) basculer les templates sur le flux `token_hash` + `verifyOtp` côté callback (robuste,
      recommandé), ou (b) afficher un écran de récupération invitant à renvoyer le lien.
- [ ] **A1.4** Changer le placeholder du champ e-mail (`login/page.tsx:146`) : `vous@exemple.com`
      **est à l'origine des erreurs 422 Resend** — il a été recopié tel quel lors des tests, or Resend
      refuse les domaines `example.com`. Utiliser `prenom.nom@email.com`.
- [ ] **A1.5** Ajouter un champ « Confirmer le mot de passe » à l'inscription et remonter
      `minLength` de 6 à 8 caractères (`login/page.tsx:163`).
- [ ] **A1.6** Message post-inscription plus explicite : rappeler l'adresse saisie, indiquer de
      vérifier les spams, proposer le renvoi (voir A2).

## A2 — Renvoi de l'e-mail de confirmation

- [ ] **A2.1** Ajouter un bouton « Renvoyer l'e-mail de confirmation » sur `/login` (visible après une
      inscription ou après une erreur « Email not confirmed »)
- [ ] **A2.2** Implémenter `supabase.auth.resend({ type: 'signup', email })` avec le même
      `emailRedirectTo` que l'inscription
- [ ] **A2.3** Anti-abus : désactiver le bouton pendant 60 s (l'intervalle minimum par utilisateur
      configuré côté Supabase est de 60 s — sans garde-fou, l'utilisateur reçoit une erreur brute)

## A3 — Mot de passe oublié (flux complet à recréer)

- [ ] **A3.1** Lien « Mot de passe oublié ? » sur `/login`, sous le champ mot de passe
- [ ] **A3.2** Page `/auth/forgot-password` : saisie de l'e-mail →
      `supabase.auth.resetPasswordForEmail(email, { redirectTo: <APP_URL>/auth/update-password })`.
      L'e-mail part par le SMTP Resend déjà configuré — **pas besoin de la clé API Resend côté code**,
      contrairement à l'ancienne implémentation revertée qui appelait l'API Resend directement.
- [ ] **A3.3** Réponse neutre quel que soit le résultat (« Si un compte existe pour cette adresse,
      un e-mail a été envoyé ») afin de ne pas révéler quels e-mails sont inscrits
- [ ] **A3.4** Page `/auth/update-password` : réception du lien, saisie + confirmation du nouveau mot
      de passe, `supabase.auth.updateUser({ password })`, puis redirection vers `/dashboard`
- [ ] **A3.5** Gérer le lien expiré ou déjà utilisé : message clair + lien pour relancer une demande

## A4 — Espace « Mon compte » (pages à créer)

Aucune page de profil n'existe aujourd'hui (l'app se limite à dashboard, historique, facturation,
portail admin et pages légales).

- [ ] **A4.1** Créer `/dashboard/account` + entrée « Mon compte » dans
      `src/components/dashboard/sidebar.tsx`
- [ ] **A4.2** Section profil : affichage/modification du nom, prénom, téléphone
      (`profiles.full_name`, métadonnées utilisateur)
- [ ] **A4.3** Section mot de passe : changement pour un utilisateur connecté
      (`supabase.auth.updateUser({ password })`), avec re-saisie du mot de passe actuel
- [ ] **A4.4** Section e-mail : changement d'adresse (`supabase.auth.updateUser({ email })`) — déclenche
      un e-mail de confirmation sur **les deux** adresses ; prévoir l'écran d'attente correspondant
- [ ] **A4.5** Vérifier que le callback gère `type=email_change` (aujourd'hui il ne traite que
      l'échange de code générique)
- [ ] **A4.6** Suppression de compte (RGPD — le site publie une politique de confidentialité) : route
      serveur avec `service_role` supprimant l'utilisateur et ses données

## A5 — Templates d'e-mails Supabase

Actuellement les templates par défaut, **en anglais** (« Confirm your email address », « Reset your
password » — visibles dans les logs Resend).

- [ ] **A5.1** Traduire et brander **Confirm sign up** (français, logo Bibble AI, ton de la marque)
- [ ] **A5.2** Traduire et brander **Reset password**
- [ ] **A5.3** Traduire et brander **Change email address**
- [ ] **A5.4** Traduire **Magic link** et **Reauthentication** (non utilisés aujourd'hui, mais évite
      un e-mail anglais surprise si activés plus tard)
- [ ] **A5.5** Si A1.3 option (a) est retenue : adapter les templates au format `token_hash`
      (`{{ .TokenHash }}`) au lieu de `{{ .ConfirmationURL }}`
- [ ] **A5.6** Activer et traduire les notifications de sécurité « Password changed » et
      « Email address changed » (actuellement désactivées)

## A6 — URLs de callback et variables d'environnement

- [ ] **A6.1** Vérifier `NEXT_PUBLIC_APP_URL` sur Vercel (Production) = `https://www.bibble-ai.com` —
      c'est cette valeur qui construit les `redirectTo`
- [ ] **A6.2** Ajouter `https://www.bibble-ai.com/auth/update-password` et
      `/api/auth/callback` aux Redirect URLs Supabase (le wildcard `/**` les couvre déjà, mais une
      entrée explicite documente l'intention)
- [ ] **A6.3** Décider du domaine canonique : le Site URL Supabase pointe sur `www.bibble-ai.com`
      alors que le webhook Stripe de test vise `bibble-ai-kappa.vercel.app`. Uniformiser sur le
      domaine de production et ajouter une redirection `bibble-ai.com` → `www.bibble-ai.com`
- [ ] **A6.4** Trancher le sort de `RESEND_API_KEY` : plus aucun code ne l'utilise depuis les reverts.
      Si l'on s'en tient au SMTP Supabase (recommandé — un seul canal d'envoi), révoquer la clé
      « Vercel Integration » **et déconnecter l'intégration Vercel** dans Resend (Settings →
      Integrations → *Revoke access*) : c'est elle qui a créé la clé et poussé la variable, la
      supprimer seule la ferait réapparaître. Faisable avec notre accès Resend (rôle Member).
- [ ] **A6.5** Vérifier la présence d'un enregistrement DNS **DMARC** pour `bibble-ai.com` (SPF/DKIM
      sont validés par le statut « Verified » de Resend)

## A7 — Recette e-mails

- [ ] **A7.1** Inscription complète avec une **vraie adresse Gmail** : réception → confirmation →
      accès au dashboard
- [ ] **A7.2** Même parcours avec **Outlook** (délivrabilité différente)
- [ ] **A7.3** Parcours PKCE cross-navigateur : s'inscrire sur un navigateur, ouvrir le lien sur un
      autre — doit fonctionner ou afficher un message clair
- [ ] **A7.4** Mot de passe oublié : demande → e-mail → nouveau mot de passe → connexion
- [ ] **A7.5** Renvoi de confirmation, changement de mot de passe connecté, changement d'e-mail
- [ ] **A7.6** Cas d'erreur : lien expiré, lien déjà utilisé, e-mail inexistant, double demande en
      moins de 60 s
- [ ] **A7.7** Contrôler la délivrabilité (pas de classement en spam) et l'absence de nouvelles
      erreurs dans les logs Resend
- [ ] **A7.8** Nettoyer les comptes de test non confirmés dans Supabase (côté Resend, rien à purger :
      les envois vers `example.com` ont été refusés à la validation, aucune adresse n'a été
      blacklistée)

---

# BLOC B — Stripe / Paiements & Crédits

## B0 — 🔴 Faille critique à corriger en priorité

- [ ] **B0.1** **La policy RLS `Users can update own profile` (`001_initial_schema.sql:186-188`) n'a
      pas de clause `WITH CHECK` ni de restriction de colonnes.** Un utilisateur authentifié peut donc
      modifier son propre profil depuis la console du navigateur avec la clé anon publique — **y
      compris les colonnes `credits` et `plan`** — et s'attribuer des crédits illimités.
      Correctif : restreindre l'UPDATE aux colonnes non sensibles (policy avec `WITH CHECK` comparant
      `credits`/`plan` aux valeurs existantes, ou révocation du `UPDATE` sur ces colonnes via
      `REVOKE UPDATE (credits, plan) ON public.profiles FROM authenticated`), les modifications de
      crédits passant exclusivement par les fonctions `SECURITY DEFINER` de B1.
- [ ] **B0.2** Vérifier en base si des soldes de crédits incohérents existent déjà (comparer
      `profiles.credits` avec la somme des `credit_transactions`)

## B1 — Crédits atomiques

- [ ] **B1.1** Migration : fonction `consume_credit(p_user_id, p_video_id)` —
      `UPDATE profiles SET credits = credits - 1 WHERE id = p_user_id AND credits > 0 RETURNING credits`
      + insertion `credit_transactions` dans la même transaction
- [ ] **B1.2** Migration : fonction `grant_credits(p_user_id, p_amount, p_mode 'reset'|'add',
      p_description, p_reference_id)` pour le webhook et l'admin
- [ ] **B1.3** `/api/generate-video` : remplacer le read-then-write (`route.ts:98-181`). Débiter
      **avant** l'appel HeyGen et re-créditer si HeyGen échoue — aujourd'hui le solde est lu ligne 98,
      HeyGen répond plusieurs secondes plus tard, puis le solde est écrit : N requêtes parallèles avec
      1 crédit produisent N vidéos.
- [ ] **B1.4** `src/lib/credits.ts` : réécrire `deductCredit`, `grantSubscriptionCredits`,
      `grantManualCredits` en appels RPC
- [ ] **B1.5** `/api/admin` action `adjust_credits` : passer par la RPC
- [ ] **B1.6** Test de concurrence : 5 requêtes simultanées avec 1 crédit → 1 seule vidéo

## B2 — Sécurisation des routes vidéo et API

- [ ] **B2.1** `/api/video-download` : vérifier que `heygen_video_id` appartient à `user.id` **avant**
      d'appeler HeyGen et de renvoyer l'URL. Aujourd'hui le filtre `user_id` n'est appliqué qu'à la
      mise à jour en base (`route.ts:96`), pas à la réponse — tout compte authentifié peut récupérer
      la vidéo d'un autre.
- [ ] **B2.2** `/api/video-status` : même contrôle de propriété (`route.ts:111-121`)
- [ ] **B2.3** Ajouter `ADMIN_EMAIL` aux variables Vercel — absent aujourd'hui, le portail admin est
      donc inopérant en production (il échoue fermé). Mieux : remplacer la comparaison d'e-mail par un
      flag `is_admin` en base ou un custom claim JWT.
- [ ] **B2.4** Rate limiting applicatif sur `/api/generate-video` et les routes mutantes
- [ ] **B2.5** Revue complète des policies RLS sur `profiles`, `video_generations`,
      `credit_transactions`, `subscriptions`, `site_settings`

## B3 — Webhook Stripe : idempotence et correctifs

- [ ] **B3.1** Migration : table `stripe_events (id text primary key, type text, processed_at timestamptz default now())`
- [ ] **B3.2** Webhook : insérer `event.id` en tête de traitement (`on conflict do nothing`) ; si la
      ligne existe déjà, répondre 200 sans retraiter. Sans cela, un rejeu Stripe (déclenché notamment
      par les réponses 500 du handler, `route.ts:302-308`) **re-crédite l'abonné au plein montant du
      plan** et duplique les `credit_transactions`.
- [ ] **B3.3** Corriger `getSubscriptionPeriod` (`route.ts:43-46`) : `start` doit utiliser
      `current_period_start`, pas `current_period_end` — les deux bornes sont identiques aujourd'hui
- [ ] **B3.4** Journaliser les événements non gérés plutôt que de les ignorer silencieusement
- [ ] **B3.5** Rejeu depuis la sandbox (Workbench → Send test events) : double envoi du même événement
      → un seul traitement ; vérifier les périodes en base

## B4 — Passage en production Stripe (dépend de la cliente)

- [x] **B4.1** ✅ **Cliente** : activation du compte Stripe live `acct_1Tr0lOF37MrM9Z0l` — **faite**
      (confirmée le 2026-08-04). Les étapes B4.2 à B4.6 sont donc débloquées ; il me faut un accès au
      dashboard en mode live (ou, a minima, le secret `whsec_` du webhook de production).
- [ ] **B4.2** Recréer les 3 produits × 2 périodicités en mode live et récupérer les 6 price IDs
- [ ] **B4.3** Mettre à jour les 12 variables `*STRIPE_PRICE_*` sur Vercel (Production)
- [ ] **B4.4** Créer le webhook live vers `https://www.bibble-ai.com/api/webhooks/stripe` avec les 4
      événements (`checkout.session.completed`, `invoice.payment_succeeded`,
      `customer.subscription.updated`, `customer.subscription.deleted`) et reporter le `whsec_` live
      dans `STRIPE_WEBHOOK_SECRET`
- [ ] **B4.5** Basculer `STRIPE_SECRET_KEY` et `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` sur les clés live
      en Production uniquement (conserver les clés test en Preview/Development)
- [ ] **B4.6** Test réel de bout en bout : checkout petit montant → webhook → crédits attribués →
      remboursement

---

## Ordre d'exécution

```
BLOC A (e-mails)          ─── indépendant, prioritaire ───────────────┐
                                                                      ├── PR vers main
BLOC B  B0 (faille RLS)   ─── à traiter immédiatement ────────────────┤
        B1 → B2 → B3      ─── testables en sandbox ──────────────────┤
        B4                ─── débloqué (compte live activé) ─────────┘
                              nécessite un accès Stripe en mode live
```

**À demander à la cliente** : les accès et actions administratives sont regroupés dans
[actions-cliente.md](./actions-cliente.md). L'activation du compte Stripe live (B4.1) est faite ;
le point ouvert est désormais l'accès au dashboard live pour créer tarifs et webhook.

Chaque section donne lieu à un ou plusieurs commits sur `fix-stripe-resend`.
