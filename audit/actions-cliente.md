# Actions de configuration à réaliser

> 2026-08-04 — branche `fix-stripe-resend`
> Périmètre : ce qui ne peut pas être fait depuis le code (comptes tiers, variables
> d'environnement, interfaces d'administration).
> 🤝 = réalisable côté développement, sous réserve d'un accès ou d'un accord.

---

## 1. ✅ Supabase — templates d'e-mails en français — fait

Les six modèles français sont collés dans Supabase et les parcours ont été validés en conditions
réelles (inscription, mot de passe oublié, changement d'adresse). Les e-mails partaient jusque-là
avec les modèles Supabase par défaut, en anglais et sans mise en forme.

**Où** : `https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/templates`
**Source** : les 6 modèles HTML restent versionnés dans
[`supabase/email-templates/`](./supabase/email-templates/README.md) — toute retouche future se fait
là, puis se recolle dans l'onglet correspondant.

Une seule décision reste ouverte :

- [ ] Confirmer l'adresse de contact affichée en pied des e-mails (`contact@bibble-ai.com` par défaut)

Le compte de développement est passé **Administrator** le 2026-08-04, ce qui a permis de mettre à
jour les Redirect URLs et les modèles sans manipulation de votre part.

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

## 3. ✅ Vercel — variables d'environnement — fait

**Où** : `https://vercel.com` → projet `bibble-ai` → Settings → Environment Variables

Fait le 2026-08-04.

- [x] **Ajouter** `ADMIN_EMAIL` (Production) = `lealaref6@gmail.com` — le portail d'administration
      est de nouveau utilisable. Le code compare cette valeur à l'e-mail de l'utilisateur connecté :
      changer l'adresse de ce compte ferait perdre l'accès admin.
- [x] **Vérifier** `NEXT_PUBLIC_APP_URL` = `https://www.bibble-ai.com` (Production)
- [x] **Vérifier** `SUPABASE_SERVICE_ROLE_KEY` (Production) — présente, la suppression de compte RGPD
      est opérante
- [x] **Supprimer** `RESEND_API_KEY` — plus utilisée par aucun code
- [x] **Redéployer** — les variables ne sont lues qu'au build

⚠️ `RESEND_API_KEY` **réapparaîtra** au prochain déploiement tant que l'intégration Vercel n'est pas
déconnectée côté Resend : c'est elle qui pousse la variable. Voir §2.

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

## 5. ✅ Recette e-mails — faite

Inscription, réinitialisation de mot de passe et changement d'adresse ont été testés de bout en bout
sur le site en production : e-mails reçus, liens fonctionnels, accès au tableau de bord.

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
