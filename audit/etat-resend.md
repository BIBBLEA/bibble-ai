# État des lieux — Resend

> Audit du 2026-08-04 (branche `fix-stripe-resend`) — équipe Resend `lealaref6`
> Objectif : faire fonctionner les e-mails d'inscription et de réinitialisation de mot de passe.

## Configuration constatée

| Élément | Valeur | Statut |
|---|---|---|
| Plan | Free — 3 000 e-mails transactionnels/mois (≈100/jour) | ⚠️ |
| Domaine | `bibble-ai.com` — **Verified**, région `eu-west-1`, créé il y a ~13 jours | OK |
| Clé API « SUPABASE » | Full access, créée il y a 14 j, **utilisée il y a 1 j** (SMTP Supabase) | OK |
| Clé API « Vercel Integration » | Sending access, créée il y a 8 j, **aucune activité** | ⚠️ orpheline |
| Intégration Vercel | **Connectée** (Settings → Integrations) — à l'origine de la clé ci-dessus et de la variable `RESEND_API_KEY` | ⚠️ |
| Intégration Supabase | **Non connectée** — le SMTP a été configuré manuellement dans Supabase, ce qui fonctionne | OK |
| Fournisseur DNS du domaine | **Infomaniak** (détecté par Resend) | — |
| Enregistrements DNS | DKIM (`resend._domainkey`), MX + TXT SPF (`send`) — tous *Verified* | OK |
| DMARC (`_dmarc.bibble-ai.com`) | `v=DMARC1; p=reject;` | OK |
| Accès de l'équipe | `lealaref6@gmail.com` **Admin** · `sadoukasepsilon@gmail.com` (dév) **Member** | OK |
| MFA | **Désactivée sur les deux comptes** | ⚠️ |
| Facturation | Réservée aux administrateurs (« managed by your team's admins ») | — |

## Historique des envois (logs Resend, 15 derniers jours)

| Période | Événement | Cause |
|---|---|---|
| il y a ~13 j | Série de **403** `POST /emails` | Expéditeur `onboarding@resend.dev` (domaine de test Resend : envoi limité à sa propre adresse) — avant vérification du domaine |
| il y a 12–13 j | **200** ×2 → e-mails **Delivered** (« Confirm your email address », « Reset your password ») | Domaine vérifié + expéditeur passé à `noreply@bibble-ai.com` → la chaîne fonctionne |
| il y a ~13 h | **422** ×2 `POST /emails` | Tests d'inscription avec **`vous@example.com`** — Resend rejette les adresses `example.com` (`validation_error`) |

## Constat principal

**L'intégration Resend est opérationnelle.** Le domaine est vérifié, la clé SMTP est active et les derniers e-mails réels ont été délivrés. L'impression que « les mails ne marchent pas » vient du dernier test effectué avec une adresse fictive (`vous@example.com`), rejetée par Resend — le compte utilisateur a probablement été créé côté Supabase mais l'e-mail de confirmation n'est jamais parti, laissant un compte inconfirmable.

## Ce qu'il manque par rapport à l'objectif

1. **Refaire les tests avec de vraies adresses e-mail** (Gmail, Outlook…) — jamais `@example.com`.
2. **La clé `RESEND_API_KEY` sur Vercel (« Vercel Integration ») est orpheline** : plus aucun code ne l'utilise depuis les reverts du flux forgot-password. Soit la réutiliser dans le nouveau flux de reset, soit s'appuyer uniquement sur le SMTP Supabase (recommandé, un seul canal d'envoi) et la révoquer — en **déconnectant aussi l'intégration Vercel**, faute de quoi la clé et la variable seront recréées.
3. **Délivrabilité** : rien à corriger. SPF, DKIM et DMARC sont tous en place (vérification DNS directe du 2026-08-04 : `_dmarc.bibble-ai.com` renvoie `v=DMARC1; p=reject;`).
4. **Plan Free (100 e-mails/jour)** : correct pour le lancement ; prévoir l'upgrade si volume d'inscriptions > ~50/jour (confirmation + reset + renvois). L'upgrade passe par un administrateur de l'équipe.
5. **Sécurité du compte** : activer la MFA sur les deux comptes. Ce compte peut envoyer au nom de `bibble-ai.com` ; sa compromission permettrait d'usurper la marque.

> Précision : il n'y a **pas de « suppression list » à purger** dans ce compte. Les échecs sur
> `vous@example.com` sont des refus de validation à l'envoi (422), pas des bounces — aucune adresse
> n'a donc été blacklistée.
