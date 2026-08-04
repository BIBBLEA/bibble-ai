# Actions à réaliser par la cliente

> Document du 2026-08-04 — branche `fix-stripe-resend`
> Ce qui ne peut pas être fait depuis le code : comptes tiers, variables d'environnement,
> interfaces d'administration. Le reste (pages, routes, sécurité) est de mon côté.
> 🤝 = je peux m'en charger si vous me donnez l'accès.

---

## 1. Supabase — templates d'e-mails en français 🤝

Les e-mails envoyés aujourd'hui sont les modèles Supabase par défaut, **en anglais** (« Confirm your
email address »), sans logo ni identité visuelle.

**Où** : `https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/templates`

**Quoi** : coller les 6 modèles HTML fournis dans
[`supabase/email-templates/`](./supabase/email-templates/README.md) — le README indique quel fichier
va dans quel onglet, avec l'objet à saisir.

Vérifier au passage **Email OTP Expiration** (Authentication → Providers → Email) : doit valoir
**3600 secondes**, la durée annoncée dans le texte des e-mails.

---

## 2. Resend — révoquer la clé et l'intégration inutilisées 🤝

**Où** : `https://resend.com` (équipe `lealaref6`) — j'y ai accès en rôle **Member**, je peux donc
le faire moi-même. **J'attends votre feu vert**, rien n'est fait à ce stade.

| Action | Détail |
|---|---|
| Révoquer la clé API « Vercel Integration » | Créée il y a 8 jours, jamais utilisée (*No activity*). La clé « SUPABASE », elle, fait fonctionner tous les e-mails du site : **à ne surtout pas toucher**. |
| Déconnecter l'intégration Vercel | Settings → Integrations → *Revoke access*. C'est elle qui a créé la clé ci-dessus et poussé la variable `RESEND_API_KEY` dans Vercel ; sans ça, elles réapparaîtraient. |

**Réservé à votre compte administrateur** : activer la double authentification (MFA), absente sur les
deux comptes de l'équipe. Ce compte peut envoyer des e-mails au nom de `bibble-ai.com`.

**Pour les tests** : jamais d'adresse en `@example.com` ou `@exemple.com` — Resend les rejette, c'est
l'origine exacte de l'impression que « les e-mails ne fonctionnent plus ». Utiliser de vraies
adresses (Gmail, Outlook).

---

## 3. Vercel — variables d'environnement 🤝

**Où** : `https://vercel.com` → projet `bibble-ai` → Settings → Environment Variables

| Variable | Action |
|---|---|
| `ADMIN_EMAIL` | **Ajouter** (Production) — absente aujourd'hui, le portail d'administration est donc inutilisable en production. |
| `NEXT_PUBLIC_APP_URL` | **Vérifier** qu'elle vaut `https://www.bibble-ai.com` en Production. Sans valeur, les clients sont renvoyés vers `localhost` après un paiement. |
| `RESEND_API_KEY` | **Supprimer** — plus utilisée par le code (voir §2). |

Après modification : redéployer (Deployments → ⋯ → Redeploy), les variables ne sont lues qu'au build.

Détail des URLs concernées : [supabase/urls-callback.md](./supabase/urls-callback.md).

---

## 4. Stripe — passage en production

Le compte live est **activé** : il ne reste que la partie technique, de mon côté (recréer les 3
offres × 2 périodicités en live, créer le webhook de production, basculer les clés et les 12
variables de tarif sur Vercel).

**Ce dont j'ai besoin** : un accès au dashboard Stripe — ou, si vous préférez créer le webhook
vous-même, le secret de signature `whsec_…` affiché à sa création
([mode d'emploi](./supabase/urls-callback.md#4-stripe--urls-de-webhook)).

> ⚠️ Stripe réclame parfois des justificatifs **après** l'activation (identité, adresse, RIB). Ces
> demandes arrivent par e-mail et suspendent les virements si elles restent sans réponse.

---

## 5. Supabase — dimensionnement de l'offre (décision, pas urgent)

Le projet tourne sur le **plan gratuit**, instance **Nano** : pas de sauvegarde restaurable à la
minute près, mise en pause après inactivité, ressources limitées, 30 e-mails/heure côté
authentification.

Pour un site qui encaisse des paiements réels, le passage au plan **Pro (25 $/mois)** est à prévoir.
Pas bloquant pour le lancement — c'est une décision à prendre en connaissance de cause.

---

## Ce dont j'ai besoin de votre part

| Élément | Pourquoi |
|---|---|
| Accès Stripe en mode live **ou** le secret `whsec_…` | Tarifs live et webhook de production (§4) |
| Feu vert pour le ménage Resend (§2) | Je ne révoque rien sans votre accord |
| Adresse à utiliser pour `ADMIN_EMAIL` | Accès au portail d'administration (§3) |
| Adresse de contact du pied des e-mails | `contact@bibble-ai.com` est utilisé par défaut dans les modèles — à confirmer |
| 2 vraies adresses e-mail de test (Gmail + Outlook) | Recette de l'inscription et de la réinitialisation |

---

## Déjà vérifié, rien à faire

Domaine `bibble-ai.com` : redirection vers `www` en place (308). Authentification e-mail complète :
DKIM, SPF et DMARC (`p=reject`) tous configurés. Site URL et Redirect URLs Supabase correctement
renseignées. SMTP Resend actif et fonctionnel.
