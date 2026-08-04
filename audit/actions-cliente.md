# Actions à réaliser par la cliente

> Document du 2026-08-04 — branche `fix-stripe-resend`
> Regroupe **tout ce qui ne peut pas être fait depuis le code** : accès administratifs, comptes
> tiers, DNS, variables d'environnement. Le reste (pages, routes, sécurité) est de mon côté.

## Comment lire ce document

| Pictogramme | Signification |
|---|---|
| 🔴 | Bloquant pour le lancement — à lancer sans attendre |
| 🟠 | Nécessaire au bon fonctionnement des e-mails |
| 🟡 | Confort / qualité, peut attendre |
| 🤝 | Alternative possible : me donner l'accès et je m'en charge |

---

## 1. ✅ Stripe — activation du compte en production

**Fait.** L'activation du compte live (informations société, identité, IBAN) a été effectuée par la
cliente. Ce point n'est donc plus bloquant — c'était le délai le plus long du projet.

**Ce qu'il reste à faire, de mon côté** (dès que j'ai accès au compte en mode live) :

- recréer les 3 offres × 2 périodicités en mode live et récupérer les 6 identifiants de tarif ;
- créer le webhook de production vers `https://www.bibble-ai.com/api/webhooks/stripe`
  (voir [urls-callback.md §4](./supabase/urls-callback.md#4-stripe--urls-de-webhook)) ;
- basculer les clés et les 12 variables de tarif sur Vercel (Production).

**Ce dont j'ai besoin de vous** : soit un accès au dashboard Stripe, soit — si vous préférez créer
le webhook vous-même — le secret de signature `whsec_…` affiché à sa création.

> ⚠️ À surveiller : Stripe demande parfois des justificatifs complémentaires **après** l'activation
> (vérification d'identité, justificatif d'adresse, RIB). Ces demandes arrivent par e-mail et
> suspendent les virements si elles restent sans réponse.

---

## 2. 🟠 Supabase — templates d'e-mails en français

**Pourquoi** : les e-mails envoyés aujourd'hui sont les modèles Supabase **par défaut, en anglais**
(« Confirm your email address »), sans logo ni identité visuelle.

**Où** : `https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/templates`

**Quoi** : coller les 6 modèles HTML fournis dans
[`audit/email-templates/`](./supabase/email-templates/README.md). La marche à suivre détaillée (quel fichier
dans quel onglet, quel objet d'e-mail) est dans le README de ce dossier.

Vérifier au passage le réglage **Email OTP Expiration** (Authentication → Providers → Email) :
il doit valoir **3600 secondes**, valeur annoncée dans le texte des e-mails.

> 🤝 Si vous préférez, transmettez-moi un accès au projet Supabase et je pose les templates
> moi-même — c'est une manipulation de copier-coller un peu fastidieuse (6 onglets).

---

## 3. 🟠 Resend — ménage et délivrabilité

**Où** : `https://resend.com` (équipe `lealaref6`)

J'ai un accès à cette équipe, avec le rôle **Member** — vérifié le 2026-08-04. Cela change la
répartition : **l'essentiel du ménage Resend est de mon côté**, il ne reste que deux points pour vous.

### 🤝 Ce que je peux faire moi-même (rien n'est fait à ce stade, j'attends votre feu vert)

| Action | Détail |
|---|---|
| **Révoquer la clé API « Vercel Integration »** | Créée il y a 8 jours, **jamais utilisée** (colonne « Last used » : *No activity*). Les e-mails partent par le SMTP configuré dans Supabase, qui s'appuie sur l'autre clé — « SUPABASE », utilisée il y a 1 jour, **à ne surtout pas toucher**. |
| **Déconnecter l'intégration Vercel** | Settings → Integrations → *Revoke access*. C'est cette intégration qui a créé la clé ci-dessus **et** poussé la variable `RESEND_API_KEY` dans Vercel. La révoquer sans la déconnecter reviendrait à la voir réapparaître. |
| **Passer le TLS en « Enforced »** | Le domaine est en TLS *opportuniste* (chiffrement tenté, non garanti). Le mode *enforced* impose une connexion chiffrée. À valider ensemble : dans de très rares cas, un serveur de réception mal configuré refuse alors le message. |

À noter : l'intégration officielle Resend ↔ Supabase n'est **pas** utilisée (le SMTP a été configuré
à la main dans Supabase, ce qui fonctionne parfaitement). Rien à changer de ce côté.

### 🔑 Ce qui reste de votre côté (réservé au rôle Admin)

| Action | Détail |
|---|---|
| **Activer la double authentification (MFA)** | Aucun des deux comptes de l'équipe n'a la MFA activée. Ce compte peut envoyer des e-mails au nom de `bibble-ai.com` : c'est une cible de choix pour l'hameçonnage. À activer sur votre compte administrateur en priorité. |
| **Facturation / changement de plan** | Réservé aux administrateurs de l'équipe (« Billing details are managed by your team's admins »). Plan actuel : **Free** — 3 000 e-mails transactionnels par mois, ~100 par jour. Suffisant pour le lancement ; à surveiller au-delà de ~50 inscriptions quotidiennes, chaque inscription pouvant consommer plusieurs e-mails (confirmation + renvoi + réinitialisation). |

**Important pour les tests** : ne jamais utiliser d'adresse en `@example.com` ou `@exemple.com`.
Resend les rejette systématiquement — c'est l'origine exacte de l'impression que « les e-mails ne
fonctionnent plus ». Utiliser de vraies adresses (Gmail, Outlook…).

---

## 4. 🟡 DNS — DMARC déjà en place, une amélioration possible

**Où** : dans la zone DNS du domaine `bibble-ai.com`, chez **Infomaniak** (fournisseur DNS identifié
par Resend).

L'authentification des e-mails est **complète**. Interrogation DNS du 2026-08-04 :

| Enregistrement | Valeur constatée |
|---|---|
| DKIM (`resend._domainkey`) | Clé publique posée — *Verified* côté Resend |
| SPF de l'expéditeur (`send.bibble-ai.com`) | `v=spf1 include:…amazonses.com ~all` — *Verified* |
| SPF du domaine racine (`bibble-ai.com`) | `v=spf1 -all` |
| **DMARC** (`_dmarc.bibble-ai.com`) | **`v=DMARC1; p=reject;`** |

Le DMARC existe donc déjà, avec la politique **la plus stricte qui soit** (`p=reject` : tout e-mail
prétendant venir de `bibble-ai.com` sans authentification valide est rejeté par le destinataire).
Les e-mails Resend passent malgré cela grâce à la signature DKIM au nom de `bibble-ai.com` — les
messages « Delivered » du 22–23 juillet le confirment.

### La seule amélioration à envisager : recevoir les rapports

L'enregistrement ne comporte pas de champ `rua`, c'est-à-dire **aucune adresse de rapport**.
Conséquence : la configuration est très stricte, mais totalement aveugle. Si l'authentification
venait à casser un jour (changement de prestataire e-mail, clé DKIM retirée, nouvel outil d'envoi
oublié), les messages seraient **rejetés purement et simplement** chez le destinataire, sans que
personne ne soit prévenu.

Valeur suggérée :

```
Type   : TXT
Nom    : _dmarc
Valeur : v=DMARC1; p=reject; rua=mailto:contact@bibble-ai.com
```

Seul le champ `rua` est ajouté : la politique reste identique, rien ne change pour les envois
actuels, mais un rapport agrégé hebdomadaire arrivera dans la boîte indiquée.

> ⚠️ Point de vigilance lié à `p=reject` : **tout nouvel outil qui enverrait des e-mails au nom de
> `bibble-ai.com` (facturation, newsletter, CRM, formulaire de contact) devra être authentifié
> avant sa mise en service**, sans quoi ses messages seront rejetés — pas mis en spam, rejetés.
> Le SPF du domaine racine est d'ailleurs `-all`, c'est-à-dire « ce domaine n'envoie rien
> directement » : la configuration ne tolère aucun envoi improvisé.

> 🤝 Faisable par moi si j'ai un accès au panneau Infomaniak (zone DNS uniquement).

---

## 5. 🟠 Vercel — variables d'environnement

**Où** : `https://vercel.com` → projet `bibble-ai` → Settings → Environment Variables

| Variable | Action |
|---|---|
| `NEXT_PUBLIC_APP_URL` | **Vérifier** qu'elle vaut `https://www.bibble-ai.com` en Production. Sans elle, les retours de paiement pointent vers `localhost`. |
| `ADMIN_EMAIL` | **Ajouter** (Production) — absente aujourd'hui, le portail d'administration est donc inutilisable en production. |
| `RESEND_API_KEY` | **Supprimer** — plus utilisée par le code (voir §3). |

Après modification : redéployer le projet (Deployments → ⋯ → Redeploy), les variables ne sont lues
qu'au moment du build.

Détail complet des URLs concernées : [urls-callback.md](./supabase/urls-callback.md).

> 🤝 Faisable par moi avec un accès au projet Vercel.

---

## 6. 🟡 Domaine — redirection de l'apex

Vérifier que `https://bibble-ai.com` (sans `www`) redirige bien vers `https://www.bibble-ai.com`.

Sans cette redirection, un visiteur arrivé sur l'adresse sans `www` se retrouve déconnecté au retour
d'un lien e-mail : les sessions ne sont pas partagées entre les deux domaines.

Réglage dans Vercel → Settings → Domains (ajouter `bibble-ai.com` avec l'option « Redirect to
www.bibble-ai.com »).

---

## 7. 🟡 Supabase — dimensionnement de l'offre

Le projet tourne aujourd'hui sur le **plan gratuit**, instance **Nano**. Conséquences :

- pas de sauvegarde restaurable à la minute près (PITR) ;
- projet mis en pause après une période d'inactivité ;
- ressources limitées (une instance Nano ne tient pas une charge sérieuse) ;
- limite de 30 e-mails/heure côté authentification.

Pour un site qui va encaisser des paiements réels, le passage au plan **Pro (25 $/mois)** est à
prévoir. Ce n'est pas bloquant pour le lancement, mais c'est une décision à prendre en connaissance
de cause.

---

## 8. Ce dont j'ai besoin de votre part pour avancer

| Élément | Pourquoi | Statut |
|---|---|---|
| Confirmation du domaine canonique (`www.bibble-ai.com`) | Toute la configuration des liens en dépend | ⬜ |
| Accès Stripe en mode live **ou** le secret du webhook `whsec_…` | Créer les tarifs live et le webhook de production (§1) | ⬜ |
| Feu vert pour le ménage Resend (§3) | Révocation de la clé et de l'intégration Vercel — je ne touche à rien sans votre accord | ⬜ |
| Adresse à utiliser pour `ADMIN_EMAIL` | Accès au portail d'administration | ⬜ |
| Adresse de contact à afficher en pied des e-mails | Aujourd'hui `contact@bibble-ai.com` est utilisé par défaut dans les modèles — à confirmer ou à corriger | ⬜ |
| 2 vraies adresses e-mail de test (une Gmail, une Outlook) | Recette du parcours d'inscription et de réinitialisation | ⬜ |

---

## Ordre conseillé

1. **Cette semaine** : templates d'e-mails (§2), MFA + décision sur le ménage Resend (§3),
   variables Vercel (§5). Le DNS (§4) n'appelle aucune action obligatoire.
2. **Dans la foulée** : passage en production Stripe — le compte étant activé (§1), il ne reste que
   la partie technique, de mon côté.
3. **Avant lancement** : redirection de domaine (§6), décision sur l'offre Supabase (§7).
