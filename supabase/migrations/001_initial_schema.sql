-- ============================================
-- AVATAR ADS SAAS - Schéma de base de données
-- Migration initiale : Tables utilisateurs, crédits, historique vidéos
-- ============================================

-- Extension UUID (déjà activée par défaut sur Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE : profiles (Utilisateurs)
-- Liée à auth.users via l'ID Supabase Auth
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  
  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  
  -- Plan & Crédits
  plan TEXT CHECK (plan IN ('starter', 'growth', 'pro')),
  credits INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide par stripe_customer_id
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- ============================================
-- TABLE : video_generations (Historique des vidéos)
-- ============================================
CREATE TABLE public.video_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- HeyGen
  heygen_video_id TEXT,
  
  -- Paramètres de génération
  script TEXT NOT NULL,
  avatar_id TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('9:16', '16:9')),
  
  -- Statut & Résultat
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC(5,2),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index pour récupérer l'historique d'un utilisateur rapidement
CREATE INDEX idx_video_generations_user_id ON public.video_generations(user_id);
CREATE INDEX idx_video_generations_status ON public.video_generations(status);

-- ============================================
-- TABLE : credit_transactions (Journal des crédits)
-- Traçabilité complète : attribution, consommation, expiration
-- ============================================
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Type de transaction
  type TEXT NOT NULL CHECK (type IN ('subscription_credit', 'usage_debit', 'manual_credit', 'expiration')),
  
  -- Montant (positif = crédit ajouté, négatif = crédit consommé)
  amount INTEGER NOT NULL,
  
  -- Solde après transaction
  balance_after INTEGER NOT NULL,
  
  -- Référence optionnelle
  description TEXT,
  reference_id TEXT, -- ID de la vidéo ou de la subscription Stripe
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour l'historique des transactions d'un utilisateur
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(type);

-- ============================================
-- TABLE : subscriptions (Suivi des abonnements Stripe)
-- ============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Stripe
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL,
  
  -- Plan
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'pro')),
  credits_per_period INTEGER NOT NULL,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
  
  -- Période
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- ============================================
-- FONCTION : Mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- FONCTION : Création automatique du profil à l'inscription
-- Se déclenche quand un nouvel utilisateur s'inscrit via Supabase Auth
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur la création d'un utilisateur auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies : profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policies : video_generations
CREATE POLICY "Users can view own videos"
  ON public.video_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own videos"
  ON public.video_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies : credit_transactions
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Policies : subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);
