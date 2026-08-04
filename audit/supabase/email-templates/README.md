# Modèles d'e-mails Bibble AI — mode d'emploi

> 2026-08-04
> Ces 6 fichiers HTML remplacent les modèles Supabase par défaut (aujourd'hui en anglais, sans logo).
> Voir aussi : [actions-cliente.md](../../actions-cliente.md) · [urls-callback.md](../urls-callback.md)

## Où coller les modèles

Dashboard Supabase → **Authentication** → **Emails** → onglet **Templates** :

`https://supabase.com/dashboard/project/ixalcjbunskraviicnum/auth/templates`

Chaque modèle a deux champs à remplir :

1. **Subject heading** → l'objet de l'e-mail (colonne « Objet » ci-dessous) ;
2. **Message body** → le contenu du fichier `.html` correspondant, **en totalité** : ouvrir le
   fichier dans un éditeur de texte, tout sélectionner (Ctrl+A), copier (Ctrl+C), puis remplacer
   entièrement le contenu du champ (Ctrl+A puis Ctrl+V).

Puis **Save** sur chaque onglet — la sauvegarde est indépendante d'un modèle à l'autre.

## Correspondance fichier ↔ onglet ↔ objet

| Onglet Supabase | Fichier à coller | Objet à saisir |
|---|---|---|
| **Confirm signup** | [`01-confirmation-inscription.html`](./01-confirmation-inscription.html) | `Confirmez votre adresse e-mail — Bibble AI` |
| **Reset password** | [`02-mot-de-passe-oublie.html`](./02-mot-de-passe-oublie.html) | `Réinitialisez votre mot de passe Bibble AI` |
| **Change email address** | [`03-changement-adresse-email.html`](./03-changement-adresse-email.html) | `Confirmez votre nouvelle adresse e-mail — Bibble AI` |
| **Magic link** | [`04-lien-de-connexion.html`](./04-lien-de-connexion.html) | `Votre lien de connexion Bibble AI` |
| **Reauthentication** | [`05-code-de-confirmation.html`](./05-code-de-confirmation.html) | `Votre code de confirmation Bibble AI` |
| **Invite user** | [`06-invitation.html`](./06-invitation.html) | `Vous êtes invité à rejoindre Bibble AI` |

### Priorités

- **Indispensables aujourd'hui** : *Confirm signup* et *Reset password* — ce sont les deux seuls
  e-mails réellement envoyés par le site. Le modèle *Confirm signup* sert aussi au **renvoi** de
  l'e-mail de confirmation (fonctionnalité en cours de développement).
- **Bientôt utilisé** : *Change email address* — dès la mise en ligne de la page « Mon compte ».
- **Par sécurité** : *Magic link*, *Reauthentication* et *Invite user* ne sont pas utilisés
  aujourd'hui, mais s'ils venaient à être activés un jour, l'utilisateur recevrait un e-mail en
  anglais aux couleurs de Supabase. Les remplacer maintenant évite cette mauvaise surprise.

---

## Ce que contiennent les modèles

- identité visuelle du site (fond sombre, violet Bibble AI, logo depuis `www.bibble-ai.com/logo.png`) ;
- textes en français, tutoiement exclu (vouvoiement, ton sobre) ;
- un bouton d'action **et** le lien en clair juste en dessous (certaines messageries d'entreprise
  bloquent les boutons) ;
- une mention de durée de validité, une phrase « vous n'êtes pas à l'origine de cette demande » et
  un pied de page avec mentions légales et politique de confidentialité ;
- un texte d'aperçu (visible dans la liste des messages avant ouverture).

Les modèles sont construits en tableaux HTML avec styles en ligne : c'est la seule technique qui
s'affiche correctement dans Gmail, Outlook, Apple Mail et sur mobile.

### Les balises `{{ ... }}` : ne pas y toucher

Ce sont des variables remplacées automatiquement par Supabase au moment de l'envoi :

| Variable | Remplacée par |
|---|---|
| `{{ .ConfirmationURL }}` | Le lien unique et personnel de l'utilisateur |
| `{{ .Email }}` | L'adresse e-mail du destinataire |
| `{{ .NewEmail }}` | La nouvelle adresse demandée (modèle *Change email address* uniquement) |
| `{{ .Token }}` | Le code à 6 chiffres (modèle *Reauthentication* uniquement) |

Supprimer ou modifier l'une de ces balises **casse l'e-mail** : le lien de confirmation ne
fonctionnerait plus.

---

## Points à vérifier avant de coller

1. **Adresse de contact** — les modèles affichent `contact@bibble-ai.com` en pied de page.
   Si ce n'est pas la bonne adresse, la remplacer partout (recherche/remplacement dans les 6 fichiers).
2. **Durée de validité** — les textes annoncent « ce lien est valable 1 heure ». Cela correspond au
   réglage **Email OTP Expiration = 3600 secondes** (Authentication → Providers → Email).
   Toute autre valeur impose de corriger cette phrase dans les modèles concernés.
3. **Logo** — chargé depuis `https://www.bibble-ai.com/logo.png`. Il doit rester accessible
   publiquement à cette adresse, sinon un cadre vide s'affichera (le texte de l'e-mail reste lisible :
   la mise en page ne dépend pas de l'image).

---

## Tester après avoir collé

1. Créer un compte de test sur `https://www.bibble-ai.com/login` avec **une vraie adresse**
   (Gmail ou Outlook) — **jamais** une adresse en `@example.com` ou `@exemple.com` :
   Resend les rejette et aucun e-mail ne partira.
2. Vérifier la réception, l'affichage (logo, bouton violet, accents corrects) et le fonctionnement
   du bouton.
3. Regarder aussi dans le dossier **spam / courrier indésirable** : l'authentification du domaine
   (SPF, DKIM, DMARC) est complète, un classement en spam viendrait donc du contenu ou de la
   réputation d'envoi, pas de la configuration DNS.
4. Refaire le test avec l'autre messagerie (Gmail *et* Outlook se comportent différemment).

---

## Options disponibles

### Personnaliser avec le prénom

Le prénom saisi à l'inscription peut être affiché en tête de l'e-mail. Il suffit d'insérer cette
ligne juste avant le premier paragraphe du modèle *Confirm signup* :

```html
<p style="margin:0 0 12px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif; font-size:16px; line-height:26px; color:#d4d4d8;">
  {{ if .Data.first_name }}Bonjour {{ .Data.first_name }},{{ else }}Bonjour,{{ end }}
</p>
```

Non inclus par défaut : les comptes créés avant l'ajout du champ prénom n'ont pas cette donnée, et
la formule de repli doit être testée avant mise en production.

### Notifications de sécurité

Supabase peut aussi envoyer un e-mail lors d'un **changement de mot de passe** ou d'un
**changement d'adresse** (« quelqu'un vient de modifier votre compte »). Ces notifications sont
désactivées aujourd'hui. Les activer suppose de fournir les deux modèles correspondants, dans le
même style — à demander si besoin.

---

## Évolution prévue — une modification à faire plus tard

Les liens actuels utilisent un mécanisme (dit « PKCE ») qui **échoue si l'e-mail est ouvert sur un
autre appareil que celui de l'inscription** : s'inscrire sur ordinateur puis ouvrir le message
depuis son téléphone ne fonctionne pas. C'est un problème connu, corrigé dans les développements en
cours côté application.

Une **version 2** des modèles *Confirm signup* et *Reset password* sera fournie au déploiement de
ce correctif. La modification se limitera à une ligne par modèle (l'adresse du lien) — design et
textes resteront identiques.

**Il n'y a rien à faire à ce sujet pour l'instant** : les modèles fournis ici fonctionnent avec le
site tel qu'il est aujourd'hui.
