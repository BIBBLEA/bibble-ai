# État des lieux global — bibble-ai

> Synthèse du 2026-08-04 — branche `fix-stripe-resend`
> Détails par service : [Supabase](./etat-supabase.md) · [Resend](./etat-resend.md) · [Stripe](./etat-stripe.md)

## Contexte

SaaS de génération de vidéos avatar (Next.js + Supabase + HeyGen + Stripe), déployé sur Vercel
(`bibble-ai-kappa.vercel.app`, domaine cible `www.bibble-ai.com`). Deux missions :

1. **Sécurité** — corriger les vulnérabilités relevées par l'audit avant lancement.
2. **E-mails transactionnels** — fiabiliser inscription (confirmation) et réinitialisation de mot de passe.

## Synthèse : ce qui marche / ce qui manque

### ✅ Fonctionnel

| Domaine | Constat |
|---|---|
| Envoi d'e-mails | Chaîne Supabase → Resend **opérationnelle** : SMTP custom actif (`smtp.resend.com:465`, expéditeur `noreply@bibble-ai.com`), domaine `bibble-ai.com` vérifié, e-mails de confirmation et de reset délivrés les 22–23/07 |
| Inscription | `signUp` avec `emailRedirectTo` vers `/api/auth/callback` + « Confirm email » activé côté Supabase |
| Webhook Stripe (test) | Endpoint actif, 4 événements alignés avec le code, signature vérifiée, version API cohérente (`2026-06-24.dahlia`) |
| Auth des routes API | Toutes les routes vérifient le JWT utilisateur (`supabase.auth.getUser`) |

### 🔴 Bloquant / manquant

| # | Problème | Où |
|---|---|---|
| 0 | **Escalade de crédits via RLS** : la policy `Users can update own profile` (`001_initial_schema.sql:186-188`) n'a **ni `WITH CHECK` ni restriction de colonnes** → tout utilisateur connecté peut s'attribuer des crédits illimités depuis la console du navigateur avec la clé anon | Base |
| 1 | **Aucun flux « mot de passe oublié »** : code reverté (commits `baa348d`, `02649d9`, `a7e6962`), aucun lien sur `/login` | Code |
| 2 | ~~Compte Stripe live non activé~~ — **résolu le 2026-08-04** (activation faite par la cliente). Restent les étapes techniques : tarifs live, webhook live, bascule des clés | Stripe |
| 3 | **Crédits non atomiques** : lecture-puis-écriture partout (`generate-video`, `lib/credits.ts`, admin) → course : N requêtes parallèles avec 1 crédit = N vidéos | Code |
| 4 | **Pas d'idempotence webhook** : un retry Stripe re-crédite au plein montant du plan | Code |
| 5 | **IDOR vidéos** : `/api/video-download` et `/api/video-status` renvoient l'URL/statut de n'importe quelle vidéo à tout utilisateur authentifié (propriété non vérifiée) | Code |

### 🔴 Parcours e-mail : 1 implémenté sur 6

| Parcours | État |
|---|---|
| Inscription + confirmation | ⚠️ Implémenté mais fragile |
| Mot de passe oublié | 🔴 Absent (reverté) |
| Renvoi de l'e-mail de confirmation | 🔴 Absent — un utilisateur non confirmé est définitivement bloqué |
| Changement de mot de passe (connecté) | 🔴 Absent |
| Changement d'adresse e-mail | 🔴 Absent |
| Page « Mon compte » | 🔴 Absente — aucune page profil dans l'app |

Défauts du parcours d'inscription existant :

- `src/app/login/page.tsx` **ne lit jamais `?error=`** alors que le callback y redirige en cas d'échec (`api/auth/callback/route.ts:37-39`) → page de connexion muette, utilisateur perdu.
- Flux **PKCE** (tokens `pkce_…` dans les logs Resend) : ouvrir le lien de confirmation dans un autre navigateur que celui de l'inscription échoue systématiquement (`code_verifier` absent).
- Le placeholder du champ e-mail est `vous@exemple.com` (`login/page.tsx:146`) — **c'est l'origine des erreurs 422 Resend** : il a été recopié tel quel lors des tests.
- Pas de champ « confirmer le mot de passe », `minLength` à 6 caractères.

### ⚠️ À corriger / surveiller

| # | Problème | Où |
|---|---|---|
| 6 | Les échecs d'e-mails récents (422) viennent de **tests avec `vous@example.com`** — refaire les tests avec de vraies adresses | Process |
| 7 | Templates d'e-mails Supabase par défaut, **en anglais** | Supabase |
| 8 | Bug `getSubscriptionPeriod` : `current_period_start` = `current_period_end` | Code (`webhooks/stripe/route.ts:43-46`) |
| 9 | Clé `RESEND_API_KEY` sur Vercel **orpheline** (plus utilisée par le code) | Vercel/Resend |
| 10 | `ADMIN_EMAIL` absent des variables Vercel → panneau admin inopérant en prod (échoue fermé) ; contrôle admin par e-mail fragile | Vercel/Code |
| 11 | Aucun rate limiting applicatif sur les routes API (génération vidéo notamment) | Code |
| 12 | Supabase org **Free / instance Nano** en production ; RLS non audité en détail | Supabase |
| 13 | Webhook test pointe vers `bibble-ai-kappa.vercel.app` — le webhook live devra viser `www.bibble-ai.com` | Stripe |

## Conclusion

Le mythe « les mails ne marchent pas » est démonté : **l'infrastructure d'envoi est saine**, ce sont
les parcours applicatifs qui manquent — 1 seul des 6 attendus est implémenté, et les échecs récents
viennent d'un test fait avec le placeholder `vous@exemple.com` recopié depuis le formulaire.

Trois chantiers, par ordre d'urgence :

1. **La faille RLS (#0)** — un utilisateur peut se donner des crédits gratuits en une ligne de
   JavaScript. À corriger avant toute mise en ligne, indépendamment du reste.
2. **Les parcours e-mail (BLOC A)** — mission prioritaire de la cliente : reset, renvoi de
   confirmation, changement de mot de passe et d'e-mail, page « Mon compte », templates en français.
3. **Crédits atomiques, IDOR et idempotence (BLOC B)** — les vulnérabilités de l'audit initial.

Côté cliente, l'**activation du compte Stripe live** — préalable administratif à tout lancement — a
été réalisée le 2026-08-04 : le passage en production n'est plus bloqué par un délai externe.

Le déroulé des travaux est dans [plan-implementation.md](./plan-implementation.md) ; ce qui relève
des accès et comptes tiers est regroupé dans [actions-cliente.md](./actions-cliente.md).
