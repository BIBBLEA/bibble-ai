# Actions à réaliser par la cliente

> Document du 2026-08-04 — branche `fix-stripe-resend`
> Ce qui ne peut pas être fait depuis le code : comptes tiers, variables d'environnement,
> interfaces d'administration. Le reste (pages, routes, sécurité) est de mon côté.
> 🤝 = je peux m'en charger si vous me donnez l'accès ou votre feu vert.

---

## 1. Supabase — templates d'e-mails en français 🤝

Les e-mails envoyés aujourd'hui sont les modèles Supabase par défaut, **en anglais** (« Confirm your
email address »), sans logo ni identité visuelle.

**Où** : `https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/templates`
**Quoi** : les 6 modèles HTML sont dans [`supabase/email-templates/`](./supabase/email-templates/README.md)
— le README indique quel fichier va dans quel onglet, avec l'objet à saisir.

- [ ] Coller le modèle **Confirm signup** (le plus important : c'est l'e-mail d'inscription)
- [ ] Coller le modèle **Reset password**
- [ ] Coller le modèle **Change email address**
- [ ] Coller les modèles **Magic link**, **Reauthentication** et **Invite user**
- [ ] Vérifier **Email OTP Expiration** = `3600` secondes (Authentication → Providers → Email)
- [ ] Confirmer l'adresse de contact affichée en pied des e-mails (`contact@bibble-ai.com` par défaut)

> 🤝 Alternative : me donner un accès au projet Supabase et je pose les 6 modèles moi-même.

---

## 2. Resend — ménage et sécurité du compte 🤝

**Où** : `https://resend.com` (équipe `lealaref6`) — j'y ai accès en rôle **Member**, je peux donc
faire le ménage moi-même. Rien n'est fait à ce stade, j'attends votre accord.

- [ ] Me donner le **feu vert** pour révoquer la clé API « Vercel Integration » (créée il y a 8
      jours, jamais utilisée) et déconnecter l'intégration Vercel qui l'a créée
- [ ] Activer la **double authentification (MFA)** sur votre compte administrateur — réservé à vous,
      elle est absente aujourd'hui sur les deux comptes de l'équipe

> ⚠️ La clé « SUPABASE » fait fonctionner tous les e-mails du site : **ne pas y toucher**.
>
> Pour les tests : jamais d'adresse en `@example.com` ou `@exemple.com`, Resend les rejette — c'est
> l'origine exacte de l'impression que « les e-mails ne fonctionnent plus ».

---

## 3. Vercel — variables d'environnement 🤝

**Où** : `https://vercel.com` → projet `bibble-ai` → Settings → Environment Variables

- [ ] **Ajouter** `ADMIN_EMAIL` (Production) — absente aujourd'hui, le portail d'administration est
      donc inutilisable en production. Me préciser l'adresse à utiliser.
- [ ] **Vérifier** `NEXT_PUBLIC_APP_URL` = `https://www.bibble-ai.com` (Production). Sans valeur, les
      clients sont renvoyés vers `localhost` après un paiement.
- [ ] **Supprimer** `RESEND_API_KEY` — plus utilisée par le code (lié au §2)
- [ ] **Redéployer** après modification (Deployments → ⋯ → Redeploy) : les variables ne sont lues
      qu'au build

> 🤝 Alternative : un accès au projet Vercel et je m'en occupe.

Détail des URLs concernées : [supabase/urls-callback.md](./supabase/urls-callback.md).

---

## 4. Stripe — passage en production

Le compte live est **activé**. Il ne reste que la partie technique (recréer les 3 offres × 2
périodicités en live, créer le webhook de production, basculer les clés et les 12 variables de
tarif) — c'est mon travail, mais il me faut un accès.

- [ ] Me donner un **accès au dashboard Stripe** en mode live
- [ ] *(si vous préférez le faire vous-même)* Créer le webhook vers
      `https://www.bibble-ai.com/api/webhooks/stripe` avec les 4 événements listés dans
      [urls-callback.md §4](./supabase/urls-callback.md#4-stripe--urls-de-webhook), puis me
      transmettre le secret `whsec_…`
- [ ] Surveiller les e-mails de Stripe : des justificatifs sont parfois réclamés **après**
      l'activation (identité, adresse, RIB) et suspendent les virements sans réponse

---

## 5. Recette — à faire ensemble une fois le reste en place

- [ ] Me fournir **2 vraies adresses e-mail de test** (une Gmail, une Outlook)
- [ ] Tester l'inscription complète : réception de l'e-mail → confirmation → accès au tableau de bord
- [ ] Tester la réinitialisation de mot de passe de bout en bout
- [ ] Vérifier que les e-mails n'arrivent pas en spam sur les deux messageries

---

## 6. Supabase — offre à dimensionner (décision, pas urgent)

Le projet tourne sur le **plan gratuit**, instance **Nano** : pas de sauvegarde restaurable à la
minute près, mise en pause après inactivité, ressources limitées, 30 e-mails/heure côté
authentification. Pour un site qui encaisse des paiements réels, le plan **Pro (25 $/mois)** est à
prévoir.

- [ ] Décider du passage au plan Pro (non bloquant pour le lancement)

---

## Déjà vérifié, rien à faire

Domaine `bibble-ai.com` : redirection vers `www` en place (308). Authentification e-mail complète :
DKIM, SPF et DMARC (`p=reject`) tous configurés. Site URL et Redirect URLs Supabase correctement
renseignées. SMTP Resend actif et fonctionnel.
