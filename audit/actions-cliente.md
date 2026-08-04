# Actions de configuration à réaliser

> 2026-08-04 — branche `fix-stripe-resend`
> Périmètre : ce qui ne peut pas être fait depuis le code (comptes tiers, variables
> d'environnement, interfaces d'administration).
> 🤝 = réalisable côté développement, sous réserve d'un accès ou d'un accord.

---

## 1. Supabase — templates d'e-mails en français 🤝

Les e-mails partants sont les modèles Supabase par défaut, **en anglais** (« Confirm your email
address »), sans logo ni identité visuelle.

**Où** : `https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/templates`
**Quoi** : les 6 modèles HTML sont dans [`supabase/email-templates/`](./supabase/email-templates/README.md)
— le README précise quel fichier va dans quel onglet, avec l'objet à saisir.

Le collage des 6 modèles est désormais pris en charge côté développement (voir ci-dessous). Une seule
décision reste de votre côté :

- [ ] Confirmer l'adresse de contact affichée en pied des e-mails (`contact@bibble-ai.com` par défaut)

### ✅ Droits du compte de développement — réglé

Le compte de développement est passé **Administrator** le 2026-08-04 (il était *Developer*, en
lecture seule : « You need additional permissions »). Les Redirect URLs ont été mises à jour dans la
foulée, et les modèles d'e-mails peuvent désormais être collés sans manipulation de votre part.

**Rien à faire ici** : le collage des 6 modèles est pris en charge, mais il doit attendre la mise en
production de la branche en cours. Les nouveaux liens (format `token_hash`) sont lus par une route
qui n'existe pas encore en ligne : les coller avant le déploiement rendrait les confirmations
d'inscription inopérantes.

---

## 2. Resend — clé API orpheline 🤝

**Où** : `https://resend.com` (équipe `lealaref6`)

- [ ] Donner l'accord pour révoquer la clé API « Vercel Integration » (créée il y a 8 jours, jamais
      utilisée) et déconnecter l'intégration Vercel qui l'a créée

> ⚠️ La clé « SUPABASE » fait fonctionner tous les e-mails du site : ne pas y toucher.
>
> Tests : jamais d'adresse en `@example.com` ou `@exemple.com`, Resend les rejette — origine exacte
> de l'impression que « les e-mails ne fonctionnent plus ».

---

## 3. Vercel — variables d'environnement 🤝

**Où** : `https://vercel.com` → projet `bibble-ai` → Settings → Environment Variables

- [ ] **Ajouter** `ADMIN_EMAIL` (Production) — absente, le portail d'administration est donc
      inutilisable en production ; l'adresse à utiliser reste à préciser
- [ ] **Vérifier** `NEXT_PUBLIC_APP_URL` = `https://www.bibble-ai.com` (Production). Sans valeur, le
      retour de paiement pointe vers `localhost`
- [ ] **Supprimer** `RESEND_API_KEY` — plus utilisée par le code (lié au §2)
- [ ] **Redéployer** après modification (Deployments → ⋯ → Redeploy) : les variables ne sont lues
      qu'au build

Détail des URLs concernées : [supabase/urls-callback.md](./supabase/urls-callback.md).

---

## 4. Stripe — passage en production

Le compte live est **activé**. Reste la partie technique : recréer les 3 offres × 2 périodicités en
live, créer le webhook de production, basculer les clés et les 12 variables de tarif. Un accès au
dashboard en mode live est nécessaire.

- [ ] Ouvrir un **accès au dashboard Stripe** en mode live
- [ ] *(alternative)* Créer le webhook vers `https://www.bibble-ai.com/api/webhooks/stripe` avec les
      4 événements listés dans
      [urls-callback.md §4](./supabase/urls-callback.md#4-stripe--urls-de-webhook), puis transmettre
      le secret `whsec_…`
- [ ] Surveiller les e-mails de Stripe : des justificatifs sont parfois réclamés **après**
      l'activation (identité, adresse, RIB) et suspendent les virements sans réponse

---

## 5. Recette — une fois la configuration en place

- [ ] Fournir **2 vraies adresses e-mail de test** (une Gmail, une Outlook)
- [ ] Tester l'inscription complète : réception de l'e-mail → confirmation → accès au tableau de bord
- [ ] Tester la réinitialisation de mot de passe de bout en bout
- [ ] Contrôler l'absence de classement en spam sur les deux messageries

---

## 6. Supabase — offre à dimensionner (décision, non urgent)

Plan **gratuit**, instance **Nano** : pas de sauvegarde restaurable à la minute près, mise en pause
après inactivité, ressources limitées, 30 e-mails/heure côté authentification. Pour un site qui
encaisse des paiements réels, le plan **Pro (25 $/mois)** est à prévoir.

- [ ] Trancher sur le passage au plan Pro (non bloquant pour le lancement)

---

## Déjà vérifié — rien à faire

Domaine `bibble-ai.com` : redirection vers `www` en place (308). Authentification e-mail complète :
DKIM, SPF et DMARC (`p=reject`) configurés. Site URL et Redirect URLs Supabase correctement
renseignées. SMTP Resend actif et fonctionnel.
