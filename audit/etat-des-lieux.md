# État des lieux global — bibble-ai

> Synthèse du 2026-08-04 — branche `fix-stripe-resend`
> Détails par service : [Supabase](./etat-supabase.md) · [Resend](./etat-resend.md) · [Stripe](./etat-stripe.md)

## Contexte

SaaS de génération de vidéos avatar (Next.js + Supabase + HeyGen + Stripe), déployé sur Vercel
(`bibble-ai-kappa.vercel.app`, domaine cible `www.bibble-ai.com`). Deux missions :

1. **Sécurité** — corriger les vulnérabilités relevées par l'audit avant lancement.
2. **E-mails transactionnels** — fiabiliser inscription (confirmation) et réinitialisation de mot de passe.

## Synthèse : ce qui marche / ce qui manque

### ✅ Fonctionnel

| Domaine | Constat |
|---|---|
| Envoi d'e-mails | Chaîne Supabase → Resend **opérationnelle** : SMTP custom actif (`smtp.resend.com:465`, expéditeur `noreply@bibble-ai.com`), domaine `bibble-ai.com` vérifié, e-mails de confirmation et de reset délivrés les 22–23/07 |
| Inscription | `signUp` avec `emailRedirectTo` vers `/api/auth/callback` + « Confirm email » activé côté Supabase |
| Webhook Stripe (test) | Endpoint actif, 4 événements alignés avec le code, signature vérifiée, version API cohérente (`2026-06-24.dahlia`) |
| Auth des routes API | Toutes les routes vérifient le JWT utilisateur (`supabase.auth.getUser`) |

### 🔴 Bloquant / manquant

| # | Problème | Où |
|---|---|---|
| 1 | **Aucun flux « mot de passe oublié »** : code reverté (commits `baa348d`, `02649d9`, `a7e6962`), aucun lien sur `/login` | Code |
| 2 | **Compte Stripe live non activé** : tout est en sandbox, aucun paiement réel possible | Stripe |
| 3 | **Crédits non atomiques** : lecture-puis-écriture partout (`generate-video`, `lib/credits.ts`, admin) → course : N requêtes parallèles avec 1 crédit = N vidéos | Code |
| 4 | **Pas d'idempotence webhook** : un retry Stripe re-crédite au plein montant du plan | Code |
| 5 | **IDOR vidéos** : `/api/video-download` et `/api/video-status` renvoient l'URL/statut de n'importe quelle vidéo à tout utilisateur authentifié (propriété non vérifiée) | Code |

### ⚠️ À corriger / surveiller

| # | Problème | Où |
|---|---|---|
| 6 | Les échecs d'e-mails récents (422) viennent de **tests avec `vous@example.com`** — refaire les tests avec de vraies adresses | Process |
| 7 | Templates d'e-mails Supabase par défaut, **en anglais** | Supabase |
| 8 | Bug `getSubscriptionPeriod` : `current_period_start` = `current_period_end` | Code (`webhooks/stripe/route.ts:43-46`) |
| 9 | Clé `RESEND_API_KEY` sur Vercel **orpheline** (plus utilisée par le code) | Vercel/Resend |
| 10 | `ADMIN_EMAIL` absent des variables Vercel → panneau admin inopérant en prod (échoue fermé) ; contrôle admin par e-mail fragile | Vercel/Code |
| 11 | Aucun rate limiting applicatif sur les routes API (génération vidéo notamment) | Code |
| 12 | Supabase org **Free / instance Nano** en production ; RLS non audité en détail | Supabase |
| 13 | Webhook test pointe vers `bibble-ai-kappa.vercel.app` — le webhook live devra viser `www.bibble-ai.com` | Stripe |

## Conclusion

Le mythe « les mails ne marchent pas » est démonté : l'infrastructure d'envoi est saine, il manque
uniquement le **flux applicatif de reset** et des tests réalisés proprement. Les vrais chantiers sont
les correctifs de sécurité (crédits, IDOR, idempotence) et, côté cliente, l'**activation du compte
Stripe live** — préalable administratif à tout lancement.

Le déroulé des travaux est dans [plan-implementation.md](./plan-implementation.md).
