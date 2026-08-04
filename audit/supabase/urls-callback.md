# URLs de callback et de redirection à configurer

> Mis à jour le 2026-08-04 (branche `fix-stripe-resend`)
> Manipulations à faire dans les interfaces web (Supabase, Vercel, Stripe).
> Voir aussi : [actions-cliente.md](../actions-cliente.md) · [email-templates/](./email-templates/README.md)

Domaine de référence de l'application : **`https://www.bibble-ai.com`**. Le domaine Vercel
`https://bibble-ai-kappa.vercel.app` reste valide en préproduction, mais ne doit plus servir dans les
configurations de production.

---

## 1. Supabase — Redirect URLs

Dashboard : `https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/url-configuration`

✅ **Fait le 2026-08-04.** Les trois entrées existantes (`https://www.bibble-ai.com/**`,
`https://bibble-ai-kappa.vercel.app/**`, `http://localhost:3000/**`) couvraient déjà tout grâce au
joker `/**` ; les deux entrées explicites ci-dessous ont été ajoutées pour documenter l'intention.
Total : 5 URLs.

```
https://www.bibble-ai.com/api/auth/callback
https://www.bibble-ai.com/auth/update-password
```

| URL | Déclenchée par | Ce qu'elle fait |
|---|---|---|
| `/api/auth/callback` | Tous les liens reçus par e-mail (inscription, réinitialisation, changement d'adresse, lien de connexion, invitation) | Vérifie le lien, ouvre la session, puis redirige selon le type : tableau de bord, choix du nouveau mot de passe ou page « Mon compte » |
| `/auth/update-password` | Redirection interne après un lien de réinitialisation | Formulaire de choix du nouveau mot de passe |

> Le callback accepte deux formats de lien : l'ancien (`?code=…`, conservé pour les e-mails déjà
> envoyés) et le nouveau (`?token_hash=…&type=…`), utilisé par les modèles d'e-mails. Ce second
> format fonctionne même si l'e-mail est ouvert sur un autre appareil que celui de l'inscription —
> c'est la raison de la bascule.

---

## 2. Supabase — durée de validité des liens

✅ Réglage **Email OTP Expiration** (Authentication → Providers → Email) : **3600 secondes (1 heure)**
— vérifié le 2026-08-04, rien à changer.

C'est la durée annoncée dans les textes des [modèles d'e-mails](./email-templates/README.md). Une
autre valeur imposerait de corriger cette phrase dans les modèles, sinon le message affiché sera faux.

---

## 3. Vercel — variables d'environnement

Dashboard : projet `bibble-ai` → Settings → Environment Variables

| Variable | Environnement | Valeur attendue | État |
|---|---|---|---|
| `ADMIN_EMAIL` | Production | l'adresse administratrice | **absente** — sans elle, le portail admin est inaccessible en production |
| `NEXT_PUBLIC_APP_URL` | Production | `https://www.bibble-ai.com` | à vérifier |
| `NEXT_PUBLIC_APP_URL` | Preview | `https://bibble-ai-kappa.vercel.app` | à vérifier |
| `RESEND_API_KEY` | toutes | — | à supprimer (voir [actions-cliente.md §2](../actions-cliente.md#2-resend--clé-api-orpheline-)) |

⚠️ Sans valeur, `NEXT_PUBLIC_APP_URL` retombe sur `http://localhost:3000` : les clients seraient
renvoyés vers une adresse locale après un paiement.

Après toute modification, **redéployer** (Deployments → ⋯ → Redeploy) : les variables ne sont lues
qu'au build.

---

## 4. Stripe — URLs de webhook

Dashboard : `https://dashboard.stripe.com/webhooks`

Le webhook de test pointe vers `https://bibble-ai-kappa.vercel.app/api/webhooks/stripe` — à conserver
tel quel. Le webhook **live** est à créer vers :

```
https://www.bibble-ai.com/api/webhooks/stripe
```

Événements à cocher, exactement ces quatre :

```
checkout.session.completed
invoice.payment_succeeded
customer.subscription.updated
customer.subscription.deleted
```

Puis récupérer le secret de signature (`whsec_…`) affiché à la création : il alimente la variable
`STRIPE_WEBHOOK_SECRET` (Production).

Les URLs de retour Stripe (paiement réussi, annulé, sortie du portail client) sont construites
automatiquement à partir de `NEXT_PUBLIC_APP_URL` — aucune saisie manuelle, d'où l'importance du §3.

---

## Récapitulatif des actions

- [ ] Ajouter les 3 Redirect URLs explicites dans Supabase
- [ ] Régler / confirmer **Email OTP Expiration** à 3600 s
- [ ] Coller les 6 templates d'e-mails (voir [email-templates/](./email-templates/README.md))
- [ ] Ajouter `ADMIN_EMAIL` sur Vercel (Production)
- [ ] Vérifier `NEXT_PUBLIC_APP_URL` sur Vercel (Production **et** Preview)
- [ ] Créer le webhook Stripe live et transmettre le `whsec_` *(ou ouvrir un accès au dashboard)*
