-- ============================================
-- MIGRATION 002 : RLS renforcé + Table site_settings + Admin
-- ============================================

-- ============================================
-- RENFORCEMENT RLS : Bloquer tout accès non authentifié
-- Les policies existantes couvrent SELECT/UPDATE/INSERT pour l'utilisateur.
-- On ajoute les policies manquantes pour garantir un blocage total.
-- ============================================

-- profiles : empêcher INSERT direct (seul le trigger handle_new_user doit insérer)
-- Pas de policy INSERT = bloqué par défaut avec RLS activé ✓

-- video_generations : empêcher UPDATE/DELETE par l'utilisateur (seul le service_role peut modifier)
-- Pas de policy UPDATE/DELETE = bloqué par défaut avec RLS activé ✓

-- credit_transactions : empêcher INSERT/UPDATE/DELETE par l'utilisateur
-- Pas de policy INSERT/UPDATE/DELETE = bloqué par défaut avec RLS activé ✓

-- subscriptions : empêcher INSERT/UPDATE/DELETE par l'utilisateur
-- Pas de policy INSERT/UPDATE/DELETE = bloqué par défaut avec RLS activé ✓

-- ============================================
-- TABLE : site_settings (Panneau Admin - Gestion contenu dynamique)
-- Permet de modifier les textes de la landing page, bannières, CTA
-- ============================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activer RLS (personne ne peut lire/écrire sauf via service_role)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Pas de policy = seul le service_role_key peut accéder à cette table
-- L'admin portal utilise le service_role côté serveur

-- ============================================
-- DONNÉES INITIALES : site_settings
-- ============================================
INSERT INTO public.site_settings (key, value, description) VALUES
  ('hero_title', 'Créez des Ads avec des avatars IA humains.', 'Titre principal de la landing page'),
  ('hero_subtitle', 'Générez des vidéos publicitaires professionnelles en quelques secondes. Choisissez un avatar, écrivez votre script, et laissez l''IA créer votre publicité vidéo au format TikTok, YouTube ou Instagram.', 'Sous-titre de la landing page'),
  ('cta_button_text', 'Créer mon premier avatar vendeur', 'Texte du bouton CTA principal'),
  ('cta_button_link', '/login', 'Lien du bouton CTA principal'),
  ('promo_banner_enabled', 'false', 'Activer/désactiver le bandeau promo (true/false)'),
  ('promo_banner_text', '', 'Texte du bandeau promotionnel'),
  ('promo_banner_link', '', 'Lien du bandeau promotionnel')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Trigger updated_at pour site_settings
-- ============================================
CREATE TRIGGER set_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
