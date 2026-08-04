# Modèles d'e-mails Bibble AI — mode d'emploi

> 2026-08-04
> Ces 6 fichiers HTML remplacent les modèles Supabase par défaut, aujourd'hui en anglais et sans
> aucune mise en forme.
> Voir aussi : [actions-cliente.md](../../actions-cliente.md) · [urls-callback.md](../urls-callback.md)

## ⚠️ À lire avant toute manipulation — quand coller ces modèles

Les liens de ces modèles utilisent le **nouveau format `token_hash`** (voir
[Le format des liens](#le-format-des-liens--token_hash) plus bas). Ils s'adressent à une route
`/api/auth/callback` capable de traiter ce format, livrée par la mise en production en cours.

**Attendre la mise en production avant de coller** : collés trop tôt, les liens mèneraient vers une
page d'erreur de connexion, et plus aucune inscription ne pourrait être confirmée. Une fois la mise
en production faite, coller les modèles dans la foulée : c'est le seul ordre qui n'interrompt jamais
le service.

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

- identité visuelle du site (fond sombre, violet Bibble AI) — **aucune image** : les modèles reposent
  uniquement sur du texte et des couleurs, ce qui évite les cadres vides dans les messageries qui
  bloquent le chargement des images par défaut ;
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
| `{{ .SiteURL }}` | L'adresse du site, telle que réglée dans **Site URL** (voir ci-dessous) |
| `{{ .TokenHash }}` | Le jeton unique et personnel de l'utilisateur, à usage unique |
| `{{ .TokenHashNew }}` | Le second jeton, côté nouvelle adresse (modèle *Change email address* uniquement) |
| `{{ .Email }}` | L'adresse e-mail actuelle du compte |
| `{{ .NewEmail }}` | La nouvelle adresse demandée (modèle *Change email address* uniquement) |
| `{{ .Token }}` | Le code numérique (modèle *Reauthentication* uniquement) — **8 chiffres** selon le réglage *Email OTP length* du projet, vérifié le 2026-08-04 |

Supprimer ou modifier l'une de ces balises **casse l'e-mail** : le lien de confirmation ne
fonctionnerait plus.

### Le format des liens : `token_hash`

Cinq modèles sur six contiennent un lien construit ainsi (la partie après `type=` change d'un modèle
à l'autre) :

```
{{ .SiteURL }}/api/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
```

Ce lien apparaît **deux fois** par modèle — une fois dans le bouton, une fois en dessous sous forme
de lien à recopier. Les deux doivent rester identiques.

| Modèle | `type` attendu | Destination après validation |
|---|---|---|
| `01-confirmation-inscription.html` | `signup` | tableau de bord |
| `02-mot-de-passe-oublie.html` | `recovery` | formulaire de nouveau mot de passe |
| `03-changement-adresse-email.html` | `email_change` | page « Mon compte », changement confirmé |
| `04-lien-de-connexion.html` | `magiclink` | tableau de bord |
| `06-invitation.html` | `invite` | tableau de bord |

Le modèle `05-code-de-confirmation.html` ne contient aucun lien : il affiche un code à saisir à la
main. Rien n'y a changé.

### Cas particulier du changement d'adresse

Le réglage **Secure email change** (Authentication → Providers → Email) est actif par défaut : le
même message part alors vers **l'ancienne et la nouvelle adresse**, et le changement ne prend effet
qu'une fois les **deux** liens ouverts. Chaque boîte a son propre jeton — `{{ .TokenHash }}` pour
l'adresse actuelle, `{{ .TokenHashNew }}` pour la nouvelle. Le modèle `03` contient donc deux
boutons, libellés par adresse, et le destinataire clique sur celui qui correspond à la boîte où il
lit le message.

Ne pas retirer l'un des deux boutons tant que *Secure email change* est activé : le changement
resterait bloqué à mi-parcours. À l'inverse, désactiver ce réglage permettrait de n'en garder qu'un,
au prix d'un affaiblissement — n'importe qui ayant pris la main sur une session ouverte pourrait
alors détourner le compte en changeant l'adresse sans que le titulaire en soit averti.

**Pourquoi ce format.** L'ancien lien `{{ .ConfirmationURL }}` reposait sur un mécanisme (dit
« PKCE ») qui exige d'ouvrir l'e-mail **dans le navigateur exact ayant servi à l'inscription** :
une moitié de la clé y reste stockée localement. S'inscrire sur ordinateur puis ouvrir le message
depuis son téléphone, ou depuis un autre navigateur, échouait donc systématiquement. Le format
`token_hash` transporte le jeton complet dans le lien : il fonctionne depuis n'importe quel appareil
et n'importe quelle messagerie, y compris celles qui ouvrent les liens dans leur propre navigateur
intégré.

**Ce format suppose la nouvelle version de `/api/auth/callback`** — d'où l'avertissement en tête de
ce document sur l'ordre des opérations.

---

## Points à vérifier avant de coller

1. **Site URL** — Authentication → URL Configuration → champ **Site URL**. Il doit valoir
   exactement `https://www.bibble-ai.com`, **sans barre oblique finale** : c'est cette valeur qui
   remplace `{{ .SiteURL }}` dans les liens. Une barre oblique en trop produirait une adresse en
   `…com//api/auth/callback`, refusée par le site.
2. **Adresse de contact** — les modèles affichent `contact@bibble-ai.com` en pied de page.
   Si ce n'est pas la bonne adresse, la remplacer partout (recherche/remplacement dans les 6 fichiers).
3. **Durée de validité** — les textes annoncent « ce lien est valable 1 heure ». Cela correspond au
   réglage **Email OTP Expiration = 3600 secondes** (Authentication → Providers → Email).
   Toute autre valeur impose de corriger cette phrase dans les modèles concernés.
4. **Aucune image** — les modèles ne chargent ni logo ni illustration. Rien à héberger, rien à
   maintenir accessible : l'e-mail s'affiche à l'identique même quand la messagerie bloque les
   images.

---

## Tester après avoir collé

1. Créer un compte de test sur `https://www.bibble-ai.com/login` avec **une vraie adresse**
   (Gmail ou Outlook) — **jamais** une adresse en `@example.com` ou `@exemple.com` :
   Resend les rejette et aucun e-mail ne partira.
2. Vérifier la réception, l'affichage (bouton violet, accents corrects) et le fonctionnement
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

## Historique — la correction « ouverture sur un autre appareil »

Une première version de ces modèles utilisait le lien `{{ .ConfirmationURL }}` fourni par défaut
par Supabase. Ce lien **échouait dès que l'e-mail était ouvert ailleurs que dans le navigateur de
l'inscription** : s'inscrire sur ordinateur puis ouvrir le message depuis son téléphone ne
fonctionnait pas. Le cas est loin d'être marginal — c'est même le comportement le plus courant.

Les modèles présents dans ce dossier sont la **version corrigée** : liens au format `token_hash`,
sans dépendance au navigateur d'origine. Design, textes et objets d'e-mail sont restés identiques,
seule l'adresse des liens a changé.

Si une version antérieure a déjà été collée dans Supabase, il suffit de recoller ces fichiers
par-dessus — après la mise en production, comme rappelé en tête de ce document.
