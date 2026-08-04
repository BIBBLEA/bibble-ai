# Plan d'implémentation — bibble-ai

> Établi le 2026-08-04, mis à jour après audit approfondi de la chaîne authentification / e-mails
> Branche `fix-stripe-resend` — voir l'[état des lieux](./etat-des-lieux.md)

Le plan est organisé en **deux blocs indépendants** :

- **[BLOC A — Resend / E-mails & Authentification](#bloc-a--resend--e-mails--authentification)** : rendre tous les parcours e-mail fonctionnels de bout en bout (priorité de la mission)
- **[BLOC B — Stripe / Paiements & Crédits](#bloc-b--stripe--paiements--crédits)** : sécurité des crédits, idempotence des webhooks

> **Périmètre** : les deux blocs sont des correctifs applicatifs, recettés en local et en sandbox
> Stripe. La bascule du compte Stripe en mode live (tarifs, webhook et clés de production) relève de
> l'administration du compte et sort du périmètre de ce plan.

---

# BLOC A — Resend / E-mails & Authentification

## Diagnostic

L'infrastructure d'envoi est saine (SMTP Resend actif, domaine `bibble-ai.com` vérifié, e-mails
délivrés). Le problème est **applicatif** : sur 6 parcours e-mail attendus, **1 seul est implémenté**
et il comporte des défauts.

| Parcours | État au moment de l'audit | État après implémentation |
|---|---|---|
| Inscription + confirmation | ⚠️ Implémenté mais fragile (erreurs silencieuses, PKCE cross-navigateur) | ✅ Motifs d'erreur explicites, liens `token_hash` valides depuis n'importe quel appareil |
| Mot de passe oublié | 🔴 Absent — code reverté (`baa348d`, `02649d9`, `a7e6962`) | ✅ `/auth/forgot-password` + `/auth/update-password` |
| Renvoi de l'e-mail de confirmation | 🔴 Absent — utilisateur non confirmé définitivement bloqué | ✅ Bouton sur `/login`, verrou de 60 s |
| Changement de mot de passe (connecté) | 🔴 Absent | ✅ Section « Mon compte », mot de passe actuel exigé |
| Changement d'adresse e-mail | 🔴 Absent | ✅ Section « Mon compte » + double confirmation |
| Page « Mon compte » | 🔴 Absente — aucune page profil dans l'app | ✅ `/dashboard/account`, avec suppression de compte |

Branche fusionnée dans `main` et déployée. Les modèles d'e-mails sont collés dans Supabase et les
parcours inscription, mot de passe oublié et changement d'adresse ont été validés en conditions
réelles. Reste : les variables d'environnement Vercel (A6) et les notifications de sécurité (A5.6).

## A1 — Corriger le parcours d'inscription existant

- [x] **A1.1** ~~`src/app/login/page.tsx` : lire `searchParams.get("error")` et afficher un message
      lisible~~ — fait : quatre motifs traduits en messages (`missing_code`, `expired_link`,
      `pkce_missing`, `verification_failed`), plus l'ancien `auth_callback_error` conservé pour les
      liens déjà envoyés, et un bandeau vert sur `?message=email_confirmed`
- [x] **A1.2** ~~`src/app/api/auth/callback/route.ts` : distinguer les causes d'échec~~ — fait :
      fonction `classifyAuthError`, le cas `code_verifier` étant testé en premier car son message
      Supabase contient aussi « invalid »
- [x] **A1.3** ~~Traiter le **cas PKCE cross-navigateur**~~ — option (a) retenue : le callback accepte
      désormais `?token_hash=…&type=…` (`verifyOtp`, liste blanche typée des cinq types e-mail) **et**
      conserve `?code=…` pour les liens partis avant la bascule. Le paramètre `next` est validé contre
      les redirections ouvertes. Templates adaptés en A5.5.
- [x] **A1.4** ~~Changer le placeholder du champ e-mail~~ — fait : `prenom.nom@email.com`
- [x] **A1.5** ~~Ajouter un champ « Confirmer le mot de passe » et remonter `minLength` à 8~~ — fait,
      avec validation d'égalité avant appel et texte d'aide
- [x] **A1.6** ~~Message post-inscription plus explicite~~ — fait : adresse saisie rappelée, renvoi
      aux spams, bloc de renvoi affiché dans la foulée

## A2 — Renvoi de l'e-mail de confirmation

- [x] **A2.1** ~~Bouton « Renvoyer l'e-mail de confirmation » sur `/login`~~ — fait : visible après une
      inscription, après une erreur de confirmation venant du callback, et après un échec de connexion
      « Email not confirmed »
- [x] **A2.2** ~~`supabase.auth.resend({ type: 'signup', email })`~~ — fait, avec le `emailRedirectTo`
      produit par le même helper que l'inscription
- [x] **A2.3** ~~Anti-abus : désactiver le bouton pendant 60 s~~ — fait : décompte visible, timer
      nettoyé au démontage, réponse neutre qui ne révèle pas si le compte existe

## A3 — Mot de passe oublié (flux complet à recréer)

- [x] **A3.1** ~~Lien « Mot de passe oublié ? » sur `/login`~~ — fait, sous le champ mot de passe, en
      mode connexion uniquement
- [x] **A3.2** ~~Page `/auth/forgot-password`~~ — fait : `resetPasswordForEmail` avec
      `redirectTo` vers `/api/auth/callback?next=/auth/update-password`. L'e-mail part par le SMTP
      Resend déjà configuré, aucune clé API Resend côté code.
- [x] **A3.3** ~~Réponse neutre quel que soit le résultat~~ — fait : message identique en cas de succès
      et d'adresse inconnue ; seule la limite de fréquence (429) est signalée, elle ne révèle rien.
      Bouton verrouillé 60 s avec décompte.
- [x] **A3.4** ~~Page `/auth/update-password`~~ — fait : vérification de session au montage, nouveau
      mot de passe + confirmation (8 caractères minimum), puis redirection vers `/dashboard`
- [x] **A3.5** ~~Gérer le lien expiré ou déjà utilisé~~ — fait : écran dédié avec bouton « Demander un
      nouveau lien ». Le callback renvoie les échecs du parcours de récupération vers
      `/auth/update-password?error=…` plutôt que vers `/login`, dont les messages parlent de
      confirmation d'inscription.

## A4 — Espace « Mon compte »

- [x] **A4.1** ~~Créer `/dashboard/account` + entrée « Mon compte » dans la sidebar~~ — fait, entrée
      placée avant « Mon abonnement »
- [x] **A4.2** ~~Section profil~~ — fait : prénom, nom et téléphone écrits dans les métadonnées
      utilisateur **et** `profiles.full_name`, avec repli sur `full_name` pour les comptes créés avant
      l'ajout de ces champs (la table `profiles` n'a pas de colonnes `first_name`/`last_name`/`phone`)
- [x] **A4.3** ~~Section mot de passe~~ — fait : le mot de passe actuel est vérifié par
      `signInWithPassword` avant tout appel à `updateUser({ password })`
- [x] **A4.4** ~~Section e-mail~~ — fait, avec l'écran d'attente expliquant les deux confirmations
- [x] **A4.5** ~~Vérifier que le callback gère `type=email_change`~~ — fait : redirection vers
      `/dashboard/account?message=email_changed`, bandeau de confirmation côté page
- [x] **A4.6** ~~Suppression de compte (RGPD)~~ — fait : `POST /api/account/delete`, confirmation par
      saisie du mot `SUPPRIMER`, suppression via `service_role` en s'appuyant sur les
      `ON DELETE CASCADE` déjà en place. La suppression est refusée (409) tant qu'un abonnement Stripe
      est actif : la résilier à la place de l'utilisateur laisserait un abonnement facturé sans compte.

## A5 — Templates d'e-mails Supabase

Les six modèles français sont écrits, collés dans Supabase et vérifiés en conditions réelles.

- [x] **A5.1** ~~Traduire et brander **Confirm sign up**~~ — collé et testé : e-mail reçu, lien de
      confirmation fonctionnel
- [x] **A5.2** ~~Traduire et brander **Reset password**~~ — collé et testé de bout en bout
- [x] **A5.3** ~~Traduire et brander **Change email address**~~ — collé et testé (double confirmation)
- [x] **A5.4** ~~Traduire **Magic link** et **Reauthentication**~~ — collés. Non utilisés aujourd'hui :
      ils évitent un e-mail anglais surprise si ces parcours sont activés plus tard.
- [x] **A5.5** ~~Si A1.3 option (a) est retenue : adapter les templates au format `token_hash`
      (`{{ .TokenHash }}`) au lieu de `{{ .ConfirmationURL }}`~~ — fait le 2026-08-04 : les 5 modèles
      à lien pointent sur `{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=…`
      (`05-code-de-confirmation.html` conserve son code `{{ .Token }}`), README mis à jour avec la
      consigne de ne coller qu'après la mise en production du callback. Le modèle de changement
      d'adresse porte **deux** liens (`{{ .TokenHash }}` et `{{ .TokenHashNew }}`) : *Secure email
      change* étant actif, le même message part vers l'ancienne et la nouvelle adresse et le
      changement n'aboutit qu'une fois les deux ouverts.
- [ ] **A5.6** Activer et traduire les notifications de sécurité « Password changed » et
      « Email address changed » (actuellement désactivées)

## A6 — URLs de callback et variables d'environnement

- [x] **A6.1** ~~Vérifier `NEXT_PUBLIC_APP_URL` sur Vercel (Production)~~ — fait le 2026-08-04, ainsi
      que `SUPABASE_SERVICE_ROLE_KEY` (suppression de compte) et l'ajout de `ADMIN_EMAIL` =
      `lealaref6@gmail.com`, qui rend le portail d'administration de nouveau utilisable. Projet
      redéployé, les variables n'étant lues qu'au build.
- [x] **A6.2** ~~Ajouter `https://www.bibble-ai.com/auth/update-password` et `/api/auth/callback` aux
      Redirect URLs Supabase~~ — fait le 2026-08-04 : les deux entrées sont enregistrées (5 URLs au
      total). Le wildcard `/**` les couvrait déjà, l'ajout documente l'intention.
- [x] **A6.3** ~~Domaine canonique : `www.bibble-ai.com`~~ — la redirection depuis l'apex est déjà en
      place (308, vérifiée le 2026-08-04). Le webhook Stripe de sandbox vise `bibble-ai-kappa.vercel.app`,
      ce qui est normal pour l'environnement de test.
- [x] **A6.4** ~~Trancher le sort de `RESEND_API_KEY`~~ — tranché : on s'en tient au SMTP Supabase,
      un seul canal d'envoi. La variable est supprimée de Vercel (2026-08-04).
      **Reste à faire côté Resend** : révoquer la clé « Vercel Integration » **et déconnecter
      l'intégration Vercel** (Settings → Integrations → *Revoke access*). C'est elle qui a créé la
      clé et poussé la variable — sans cette étape, les deux réapparaîtront au prochain déploiement.
- [x] **A6.5** ~~Vérifier la présence d'un enregistrement DNS **DMARC**~~ — vérifié le 2026-08-04 :
      `_dmarc.bibble-ai.com` = `v=DMARC1; p=reject;`. SPF, DKIM et DMARC sont en place, rien à faire.

## A7 — Recette e-mails

- [x] **A7.1** ~~Inscription complète avec une **vraie adresse Gmail**~~ — testé : réception →
      confirmation → accès au tableau de bord
- [x] **A7.2** ~~Mot de passe oublié : demande → e-mail → nouveau mot de passe → connexion~~ — testé
- [x] **A7.3** ~~Changement d'adresse e-mail~~ — testé
- [x] **A7.4** ~~Cas d'erreur~~ — vérifié en production sur les redirections du callback : absence de
      paramètre, jeton invalide selon les cinq types, `type` inconnu, code PKCE invalide, tentative
      de redirection hors domaine (`next=//evil.example`). Réponse neutre et verrou de 60 s confirmés
      sur le formulaire de mot de passe oublié.

Recette close : les parcours e-mail sont validés.

---

# BLOC B — Stripe / Paiements & Crédits

## B0 — 🔴 Faille critique à corriger en priorité

- [x] **B0.1** ~~La policy RLS `Users can update own profile` (`001_initial_schema.sql:186-188`)
      n'avait ni clause `WITH CHECK` ni restriction de colonnes~~ — **corrigé** le 2026-08-04
      (`003_securisation_profiles.sql`). L'`UPDATE` est retiré au niveau table et rendu sur les
      seules colonnes `full_name` et `avatar_url` ; `credits`, `plan` et les références Stripe sont
      réservés au serveur. Le `WITH CHECK` interdit en outre de réaffecter la ligne.
      Preuve : `resultats/avant/01-…log` (❌ solde 2 → 9 999) puis `resultats/apres/01-…log`
      (✅ 42501, solde inchangé, `full_name` toujours modifiable).
      Ajoute `000_privileges_schema_public.sql` : les migrations s'appuyaient sur les privilèges
      implicites d'un projet hébergé sans jamais les déclarer, si bien qu'une base recréée depuis le
      dépôt n'avait aucun droit. Sans cet ordre — privilèges puis restrictions — le `REVOKE` de 003
      était annulé.
- [ ] **B0.2** Vérifier en base si des soldes de crédits incohérents existent déjà (comparer
      `profiles.credits` avec la somme des `credit_transactions`) — **nécessite un accès en lecture
      au projet hébergé**, non réalisable en local

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
- [ ] **B3.5** Durcir le mapping des Price IDs : `PLAN_CONFIG` (`route.ts:20-30`) et `PLAN_CREDITS`
      (`src/lib/stripe.ts`) sont construits avec `process.env.X || ""`. Une variable manquante crée la
      clé `""` et plusieurs variables manquantes s'écrasent sur cette même clé, faussant le mapping
      sans bruit. Filtrer les clés vides à la construction, et rendre le `priceId` inconnu bruyant
      (`route.ts:97-100` fait aujourd'hui un `break` discret : le paiement est accepté, aucun crédit
      n'est attribué, aucune alerte).
- [ ] **B3.6** Rejeu depuis la sandbox (Workbench → Send test events, ou `stripe trigger` via le CLI) :
      double envoi du même événement → un seul traitement ; vérifier les périodes en base

---

## Ordre d'exécution

```
BLOC A (e-mails)          ─── indépendant, prioritaire ───────────────┐
                                                                      ├── PR vers main
BLOC B  B0 (faille RLS)   ─── à traiter immédiatement ────────────────┤
        B1 → B2 → B3      ─── testables en sandbox ──────────────────┘
```

L'ensemble du plan est recetté en local et en sandbox Stripe : aucune étape ne requiert le compte
en mode live.

Chaque section donne lieu à un ou plusieurs commits sur `fix-stripe-resend`.
