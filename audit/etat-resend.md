# État des lieux — Resend

> Audit du 2026-08-04 (branche `fix-stripe-resend`) — équipe Resend `lealaref6`
> Objectif : faire fonctionner les e-mails d'inscription et de réinitialisation de mot de passe.

## Configuration constatée

| Élément | Valeur | Statut |
|---|---|---|
| Plan | Free — 3 000 e-mails transactionnels/mois (≈100/jour) | ⚠️ |
| Domaine | `bibble-ai.com` — **Verified**, région `eu-west-1`, créé il y a ~13 jours | OK |
| Clé API « SUPABASE » | Full access, créée il y a 13 j, **utilisée il y a ~13 h** (SMTP Supabase) | OK |
| Clé API « Vercel Integration » | Sending access, créée il y a 8 j, **aucune activité** | ⚠️ orpheline |

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
2. **La clé `RESEND_API_KEY` sur Vercel (« Vercel Integration ») est orpheline** : plus aucun code ne l'utilise depuis les reverts du flux forgot-password. Soit la réutiliser dans le nouveau flux de reset, soit s'appuyer uniquement sur le SMTP Supabase (recommandé, un seul canal d'envoi) et la révoquer.
3. **Délivrabilité** : vérifier dans la config DNS que SPF/DKIM sont bien posés (statut « Verified » l'indique) et ajouter un enregistrement **DMARC** s'il n'existe pas.
4. **Plan Free (100 e-mails/jour)** : correct pour le lancement ; prévoir l'upgrade si volume d'inscriptions > ~50/jour (confirmation + reset + renvois).
5. Nettoyer la **suppression list** si des adresses de test y sont entrées (bounces sur `example.com`).
