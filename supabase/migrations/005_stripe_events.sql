-- ============================================
-- MIGRATION 005 : Journal des événements Stripe déjà traités
-- ============================================
-- Le webhook (src/app/api/webhooks/stripe/route.ts) vérifiait la signature de
-- chaque notification mais ne mémorisait jamais les `event.id` traités. Or
-- Stripe rejoue un événement tant qu'il n'obtient pas de réponse 2xx — et le
-- handler provoquait lui-même ces rejeux en répondant 500 sur exception. Chaque
-- rejeu réattribuait le plein montant de crédits du plan et dupliquait la ligne
-- correspondante dans credit_transactions.
--
-- Correctif : une table de déduplication. Le webhook y insère l'`event.id` en
-- tête de traitement ; la violation de clé primaire signale un rejeu, auquel on
-- répond 200 sans rien retraiter.
--
-- Preuve : audit/preuves/scripts/03-idempotence-webhook.mjs
-- ============================================

CREATE TABLE IF NOT EXISTS public.stripe_events (
  -- L'identifiant Stripe (evt_…) fait office de clé : c'est lui qui garantit
  -- l'unicité du traitement, aucune clé technique n'est utile ici.
  id TEXT PRIMARY KEY,
  type TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activer RLS, comme site_settings en 002 : aucune policy n'est déclarée, donc
-- ni anon ni authenticated ne peuvent lire ou écrire cette table. Seul le
-- service_role — qui contourne RLS et n'est utilisé que côté serveur, dans le
-- webhook — y accède. Un client capable d'y insérer des lignes pourrait sinon
-- réclamer par avance des événements à venir et empêcher leur traitement.
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Purge : requête d'exploitation pour ne pas conserver le journal indéfiniment.
-- Stripe cesse ses rejeux au bout de 3 jours ; une rétention de 90 jours laisse
-- une marge confortable pour l'analyse d'incident.
--   DELETE FROM public.stripe_events WHERE processed_at < NOW() - INTERVAL '90 days';
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON public.stripe_events(processed_at);
