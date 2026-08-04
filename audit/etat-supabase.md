# État des lieux — Supabase

> Audit du 2026-08-04 (branche `fix-stripe-resend`) — projet Supabase `ixalcjbunskraviicnum`
> Objectifs : sécuriser crédits / routes API / webhooks Stripe + faire fonctionner les e-mails d'inscription et de réinitialisation de mot de passe.

## Configuration constatée

| Élément | Valeur | Statut |
|---|---|---|
| Organisation | `lealaref6@gmail.com` — **plan Free**, 2 membres (Owner + compte de développement en **Developer**) | ⚠️ |
| Droits du compte de développement | **Developer** = lecture seule sur la configuration Auth : l'édition des templates et des Redirect URLs est refusée (« You need additional permissions »). Le rôle **Administrator** est nécessaire pour intervenir | ⚠️ |
| Projet | `lealaref6@gmail.com's Project` (ref `ixalcjbunskraviicnum`), instance **Nano**, `eu-west-1` | OK |
| Site URL (Auth) | `https://www.bibble-ai.com` | OK |
| Redirect URLs | `https://bibble-ai-kappa.vercel.app/**`, `https://www.bibble-ai.com/**`, `http://localhost:3000/**` | OK |
| Provider Email | Activé (seul provider actif) | OK |
| Inscriptions | Autorisées | OK |
| Confirm email | **Activé** (confirmation obligatoire avant connexion) | OK |
| SMTP personnalisé | **Activé** → `smtp.resend.com:465`, user `resend`, mot de passe enregistré | OK |
| Expéditeur | `BIBBLE AI <noreply@bibble-ai.com>` | OK |
| Intervalle min. par utilisateur | 60 s | OK |
| Rate limit e-mails | 30 e-mails/h (défaut) | ⚠️ |
| Utilisateurs | 9 comptes, tous avec dernière connexion réussie (juillet 2026) | OK |

## Constat principal

**La chaîne d'envoi Supabase → Resend fonctionne.** Les logs Resend montrent des e-mails de confirmation et de reset délivrés (statut `Delivered`) les 22–23 juillet. Les échecs récents (il y a ~13 h) sont des erreurs **422** causées par des tests d'inscription effectués avec l'adresse fictive `vous@example.com`, que Resend rejette (domaine de test interdit). Voir `etat-resend.md`.

## Ce qu'il manque par rapport à l'objectif

1. **Aucun flux « mot de passe oublié » côté application.** Le code (`/api/auth/forgot-password`, `/auth/update-password`, lien sur la page login) a été supprimé par des reverts les 2–3 août (`baa348d`, `02649d9`, `a7e6962`). La page `/login` n'a aucun lien de réinitialisation. → À réimplémenter, de préférence via `supabase.auth.resetPasswordForEmail()` (l'e-mail partira automatiquement par le SMTP Resend déjà configuré, sans dépendre de la clé API Resend côté Vercel).
2. **Templates d'e-mails par défaut, en anglais** (« Confirm your email address », « Reset your password »). À traduire/brander en français dans Authentication → Emails → Templates.
3. **Rate limit 30 e-mails/h** : suffisant pour le lancement, mais à surveiller ; à augmenter si campagne d'acquisition (configurable maintenant que le SMTP custom est actif).
4. **Plan Free / instance Nano en production** : pas de PITR, pause possible après inactivité, ressources limitées. Décision à prendre (le SaaS encaissera des paiements réels).
5. **RLS non audité en détail** dans cette passe — à vérifier avant lancement (les routes API utilisent la `service_role key`, qui contourne RLS).

## Références utiles

- SMTP : Dashboard → Authentication → Emails → SMTP Settings
- Templates : Dashboard → Authentication → Emails → Templates
- Rate limits : Dashboard → Authentication → Rate Limits
