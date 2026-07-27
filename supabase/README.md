# Configuration Supabase — AvatarAds

## Instructions de déploiement

### 1. Créer un projet Supabase

1. Rendez-vous sur [app.supabase.com](https://app.supabase.com)
2. Créez un nouveau projet
3. Notez l'**URL du projet** et la **clé anon** (Settings > API)
4. Notez la **Service Role Key** (Settings > API > service_role)

### 2. Exécuter la migration

Dans le **SQL Editor** de Supabase, exécutez le contenu du fichier :

```
supabase/migrations/001_initial_schema.sql
```

Cela créera :
- La table `profiles` (utilisateurs avec crédits et plan)
- La table `video_generations` (historique des vidéos générées)
- La table `credit_transactions` (journal complet des crédits)
- La table `subscriptions` (suivi des abonnements Stripe)
- Les triggers automatiques (création de profil, updated_at)
- Les politiques RLS (Row Level Security)

### 3. Configurer l'authentification

Dans **Authentication > Providers**, activez :
- Email/Password (activé par défaut)
- Google OAuth (optionnel, recommandé)

Dans **Authentication > URL Configuration** :
- Site URL : `http://localhost:3000` (dev) ou votre domaine de production
- Redirect URLs : `http://localhost:3000/api/auth/callback`

### 4. Mettre à jour le fichier .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Structure des tables

### profiles
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID utilisateur (= auth.users.id) |
| email | TEXT | Email |
| plan | TEXT | starter / growth / pro / null |
| credits | INTEGER | Solde de crédits actuel |
| stripe_customer_id | TEXT | ID client Stripe |
| stripe_subscription_id | TEXT | ID abonnement Stripe |

### video_generations
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique |
| user_id | UUID | Propriétaire |
| script | TEXT | Texte du script |
| format | TEXT | 9:16 ou 16:9 |
| status | TEXT | pending / processing / completed / failed |
| video_url | TEXT | URL de la vidéo finale |

### credit_transactions
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique |
| user_id | UUID | Utilisateur |
| type | TEXT | subscription_credit / usage_debit / manual_credit / expiration |
| amount | INTEGER | +N (crédit) ou -N (débit) |
| balance_after | INTEGER | Solde après opération |

### subscriptions
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | ID unique |
| user_id | UUID | Utilisateur |
| plan | TEXT | starter / growth / pro |
| credits_per_period | INTEGER | 2, 6 ou 15 |
| status | TEXT | active / canceled / past_due |
