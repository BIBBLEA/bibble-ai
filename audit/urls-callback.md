# URLs de callback et de redirection à configurer

> Document destiné à la cliente — mis à jour le 2026-08-04 (branche `fix-stripe-resend`)
> Toutes les manipulations ci-dessous se font **dans les interfaces web** (Supabase, Vercel, Stripe).
> Voir aussi : [actions-cliente.md](./actions-cliente.md) · [email-templates/](./email-templates/README.md)

## 0. Domaine canonique

Le domaine de référence de l'application est :

```
https://www.bibble-ai.com
```

Toutes les URLs de ce document utilisent ce domaine. Le domaine Vercel
`https://bibble-ai-kappa.vercel.app` reste valide (préproduction) mais **ne doit plus être utilisé
dans les configurations de production**.

À vérifier : `bibble-ai.com` (sans `www`) doit rediriger vers `https://www.bibble-ai.com`
— sinon un utilisateur arrivé sur l'apex sera déconnecté au retour d'un e-mail (les cookies de
session ne sont pas partagés entre les deux domaines).

---

## 1. Supabase — Authentication → URL Configuration

Dashboard : `https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/url-configuration`

### Site URL

```
https://www.bibble-ai.com
```

*(déjà configuré — à ne pas modifier)*

### Redirect URLs (liste complète à avoir)

| URL | Rôle |
|---|---|
| `https://www.bibble-ai.com/**` | Production — couvre toutes les pages |
| `https://bibble-ai-kappa.vercel.app/**` | Préproduction Vercel |
| `http://localhost:3000/**` | Développement local |

Ces trois entrées sont **déjà présentes** et les jokers `/**` suffisent techniquement.
Pour documenter l'intention, ajouter en plus les entrées explicites suivantes :

```
https://www.bibble-ai.com/api/auth/callback
https://www.bibble-ai.com/api/auth/confirm
https://www.bibble-ai.com/auth/update-password
```

> ⚠️ `/api/auth/confirm` et `/auth/update-password` sont des pages **en cours de développement**.
> Les ajouter dès maintenant est sans risque : une Redirect URL déclarée mais inexistante ne casse
> rien, alors qu'une URL manquante fait échouer le lien reçu par e-mail.

### À quoi sert chaque URL

| URL | Déclenchée par | Ce qu'elle fait |
|---|---|---|
| `/api/auth/callback` | Lien « Confirmer mon adresse » de l'e-mail d'inscription | Échange le code contre une session puis redirige vers le tableau de bord |
| `/api/auth/confirm` | *(à venir)* liens e-mail au format `token_hash` | Version robuste du callback : fonctionne même si l'e-mail est ouvert sur un autre appareil que celui de l'inscription |
| `/auth/update-password` | Lien « Réinitialiser mon mot de passe » | Formulaire de choix du nouveau mot de passe |

---

## 2. Supabase — Authentication → Emails

Dashboard : `https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/templates`

### Durée de validité des liens

Réglage **Email OTP Expiration** (Authentication → Providers → Email) : valeur recommandée
**3600 secondes (1 heure)**.

Les textes des e-mails fournis dans [email-templates/](./email-templates/README.md) annoncent
**« ce lien expire dans 1 heure »**. Si vous choisissez une autre durée, il faut corriger cette
phrase dans les templates concernés — sinon le message affiché sera faux.

### Templates

Les 6 modèles HTML à coller sont fournis dans le dossier
[`audit/email-templates/`](./email-templates/README.md), avec la marche à suivre.

---

## 3. Vercel — Variables d'environnement

Dashboard : Project `bibble-ai` → Settings → Environment Variables

| Variable | Environnement | Valeur attendue | État |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Production | `https://www.bibble-ai.com` | **à vérifier** — c'est cette valeur qui construit les liens de retour Stripe et de réinitialisation de mot de passe |
| `NEXT_PUBLIC_APP_URL` | Preview | `https://bibble-ai-kappa.vercel.app` | à vérifier |
| `ADMIN_EMAIL` | Production | l'adresse administratrice | **absente** — sans elle le portail admin est inaccessible en production |
| `RESEND_API_KEY` | toutes | — | à supprimer (voir [actions-cliente.md](./actions-cliente.md#3-resend)) |

⚠️ Sans valeur, `NEXT_PUBLIC_APP_URL` retombe sur `http://localhost:3000` : les clients seraient
renvoyés vers une adresse locale après un paiement.

Après toute modification de variable, **redéployer** (Deployments → ⋯ → Redeploy) : les variables ne
sont lues qu'au build.

---

## 4. Stripe — URLs de webhook

Dashboard : `https://dashboard.stripe.com/webhooks`

### Webhook actuel (mode test / sandbox)

```
https://bibble-ai-kappa.vercel.app/api/webhooks/stripe
```

À conserver tel quel pour les tests.

### Webhook à créer (mode live — le compte est activé, cette étape est débloquée)

```
https://www.bibble-ai.com/api/webhooks/stripe
```

Événements à cocher — exactement ces quatre :

```
checkout.session.completed
invoice.payment_succeeded
customer.subscription.updated
customer.subscription.deleted
```

Puis copier le secret de signature (`whsec_…`) affiché à la création et me le transmettre pour la
variable `STRIPE_WEBHOOK_SECRET` (Production).

### URLs de retour Stripe (gérées automatiquement par le code)

Aucune saisie manuelle nécessaire — elles sont construites à partir de `NEXT_PUBLIC_APP_URL` :

| Parcours | URL générée |
|---|---|
| Paiement réussi | `https://www.bibble-ai.com/dashboard?checkout=success` |
| Paiement annulé | `https://www.bibble-ai.com/dashboard/billing?checkout=cancelled` |
| Retour du portail client | `https://www.bibble-ai.com/dashboard/billing` |

C'est la raison pour laquelle le point 3 (`NEXT_PUBLIC_APP_URL`) est important.

---

## 5. DNS — délivrabilité des e-mails

Chez le registrar du domaine `bibble-ai.com` :

| Type | Nom | Statut |
|---|---|---|
| SPF / DKIM (posés par Resend) | — | ✅ Domaine « Verified » côté Resend |
| **DMARC** | `_dmarc.bibble-ai.com` | ❓ **à vérifier / créer** |

Enregistrement DMARC recommandé pour démarrer (mode observation, sans risque de blocage) :

```
Type  : TXT
Nom   : _dmarc
Valeur: v=DMARC1; p=none; rua=mailto:contact@bibble-ai.com
```

Sans DMARC, Gmail et Outlook classent plus facilement les e-mails en spam.

---

## Récapitulatif des actions

- [ ] Vérifier la redirection `bibble-ai.com` → `www.bibble-ai.com`
- [ ] Ajouter les 3 Redirect URLs explicites dans Supabase
- [ ] Régler / confirmer **Email OTP Expiration** à 3600 s
- [ ] Coller les 6 templates d'e-mails (voir [email-templates/](./email-templates/README.md))
- [ ] Vérifier `NEXT_PUBLIC_APP_URL` sur Vercel (Production **et** Preview)
- [ ] Ajouter `ADMIN_EMAIL` sur Vercel (Production)
- [ ] Créer l'enregistrement DNS DMARC
- [ ] Créer le webhook Stripe live + transmettre le `whsec_` *(ou me donner l'accès au dashboard)*
