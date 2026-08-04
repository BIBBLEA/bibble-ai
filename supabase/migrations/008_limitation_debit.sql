-- ============================================
-- MIGRATION 008 : Limitation de débit applicative (B2.4)
-- ============================================
-- Aucune route de `src/app/api/` ne bornait le nombre d'appels d'un même
-- utilisateur. Rien n'empêchait donc de lancer cent générations vidéo en une
-- seconde (le débit de crédit est atomique depuis 004, mais il n'interdit pas
-- la rafale tant qu'il reste des crédits), de créer des centaines d'objets
-- chez Stripe via /api/stripe/checkout, ou de marteler la suppression de
-- compte.
--
-- Pourquoi la limitation vit en base et non en mémoire :
-- l'application tourne sur Vercel, en fonctions serverless. Un compteur en
-- mémoire appartiendrait à une instance : elles sont multiples, créées et
-- recyclées à la demande. Deux requêtes consécutives d'un même utilisateur
-- n'atterrissent pas sur la même instance, et un compteur y est remis à zéro à
-- chaque démarrage à froid. Le seul état partagé par toutes les instances est
-- PostgreSQL : le compteur y est donc écrit, et incrémenté par une fonction
-- atomique — même motif que `consume_credit` en 004, et pour la même raison :
-- lire puis écrire en deux temps laisse passer les rafales que le compteur est
-- justement censé bloquer.
-- ============================================

-- ============================================
-- TABLE : rate_limits
-- ============================================
-- Un compteur par (quota, sujet, fenêtre). Les fenêtres sont FIXES et alignées
-- sur l'époque Unix : `window_start` est déductible de l'horloge seule, donc la
-- clé primaire est calculable sans lecture préalable et l'incrément tient en un
-- seul INSERT ... ON CONFLICT.
--
-- Conséquence connue des fenêtres fixes : un appelant peut consommer son quota
-- en fin de fenêtre puis à nouveau dès la suivante, soit jusqu'à deux fois la
-- limite sur un intervalle à cheval. Une fenêtre glissante corrigerait ce
-- point au prix d'une ligne par appel à conserver et à agréger. Les quotas de
-- `src/lib/rate-limit.ts` sont choisis en tenant compte de ce facteur 2 : ils
-- restent largement au-dessus de l'usage réel même doublés.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  -- Nom du quota (« generation_video », « suppression_compte »…). Deux quotas
  -- distincts ne partagent jamais de compteur, même pour un même sujet.
  bucket TEXT NOT NULL,
  -- Clé de limitation, préfixée par sa nature : « user:<uuid> » ou « ip:<addr> ».
  -- Le préfixe évite toute collision entre les deux espaces de noms.
  subject TEXT NOT NULL,
  -- Début de la fenêtre, aligné : to_timestamp(floor(epoch / duree) * duree).
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject, window_start)
);

-- Activer RLS, comme stripe_events en 005 : aucune policy n'est déclarée, donc
-- ni anon ni authenticated ne peuvent lire ou écrire cette table malgré les
-- GRANT larges posés par 000. Seul le service_role — qui contourne RLS et
-- n'est utilisé que côté serveur — y accède. Sans cela un client muni de la
-- clé anon publiée dans le site pourrait :
--   * supprimer sa propre ligne et annuler la limitation qui le vise ;
--   * insérer une ligne saturée au nom d'un autre utilisateur et lui interdire
--     toute génération jusqu'à la fin de la fenêtre.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Sert la purge : les suppressions ne portent que sur `window_start`.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits(window_start);

-- ============================================
-- FONCTION : check_rate_limit
-- Compte un appel et dit s'il est autorisé.
--
-- Convention de retour (jsonb, jamais NULL, jamais d'exception métier),
-- alignée sur celle de 004 :
--   autorisé → {"allowed": true,  "reason": "ok",
--               "limit": <quota>, "remaining": <appels restants>,
--               "reset_at": <fin de fenêtre>, "retry_after": <secondes>}
--   refusé   → {"allowed": false, "reason": "rate_limited",
--               "limit": <quota>, "remaining": 0, ...}
--            → {"allowed": false, "reason": "invalid_quota", ...}
-- `retry_after` est calculé avec l'horloge de la base : l'appelant le recopie
-- tel quel dans l'en-tête Retry-After sans dépendre de l'heure de l'instance
-- serverless, qui peut dériver.
--
-- Le compteur n'est PAS incrémenté quand l'appel est refusé (clause WHERE du
-- DO UPDATE) : marteler la route ne repousse pas la réouverture, et la valeur
-- ne peut pas croître sans borne.
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket TEXT,
  p_subject TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
  v_retry_after INTEGER;
  v_count INTEGER;
BEGIN
  -- Garde-fou : un quota nul ou négatif fermerait la route sans le dire.
  -- On le signale plutôt que de l'appliquer silencieusement.
  IF p_limit IS NULL OR p_limit < 1
     OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'invalid_quota',
      'limit', p_limit,
      'remaining', 0,
      'reset_at', NOW(),
      'retry_after', 1
    );
  END IF;

  v_window_start := to_timestamp(
    FLOOR(EXTRACT(EPOCH FROM NOW()) / p_window_seconds) * p_window_seconds
  );
  v_reset_at := v_window_start + make_interval(secs => p_window_seconds);
  -- Au moins 1 : un Retry-After à 0 invite le client à repartir immédiatement.
  v_retry_after := GREATEST(
    CEIL(EXTRACT(EPOCH FROM (v_reset_at - NOW())))::INTEGER, 1
  );

  -- Incrément atomique. Deux appels simultanés sur la même clé : le premier
  -- insère ou verrouille la ligne, le second attend le COMMIT puis ré-évalue
  -- la clause `count < p_limit` sur la valeur à jour — jamais sur une valeur
  -- périmée. Si la clause est fausse, aucune ligne n'est mise à jour et le
  -- RETURNING ne rend rien : v_count reste NULL, l'appel est refusé.
  INSERT INTO public.rate_limits AS rl (bucket, subject, window_start, count)
  VALUES (p_bucket, p_subject, v_window_start, 1)
  ON CONFLICT (bucket, subject, window_start) DO UPDATE
    SET count = rl.count + 1
    WHERE rl.count < p_limit
  RETURNING rl.count INTO v_count;

  -- Purge opportuniste : une fois sur cent environ, pour ne pas payer un
  -- DELETE à chaque appel. Ne touche que des lignes dont la fenêtre est close
  -- depuis longtemps, donc jamais une ligne qu'une transaction concurrente
  -- incrémente. IMPÉRATIF : aucune fenêtre déclarée dans
  -- `src/lib/rate-limit.ts` ne doit dépasser cette rétention d'un jour.
  --
  -- Filet de sécurité si le trafic est trop faible pour que le tirage tombe,
  -- à passer en tâche planifiée ou à la main :
  --   DELETE FROM public.rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits
     WHERE window_start < NOW() - INTERVAL '1 day';
  END IF;

  IF v_count IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'rate_limited',
      'limit', p_limit,
      'remaining', 0,
      'reset_at', v_reset_at,
      'retry_after', v_retry_after
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'reason', 'ok',
    'limit', p_limit,
    'remaining', GREATEST(p_limit - v_count, 0),
    'reset_at', v_reset_at,
    'retry_after', v_retry_after
  );
END;
$$;

-- ============================================
-- DROITS D'EXÉCUTION
-- ============================================
-- Même précaution qu'en 004 : PostgreSQL accorde EXECUTE à PUBLIC sur toute
-- fonction créée, et le ALTER DEFAULT PRIVILEGES de 000 accorde en plus
-- ALL ON FUNCTIONS à anon et authenticated. Laisser ces droits rendrait la
-- limitation inopérante : une fonction SECURITY DEFINER appelable depuis le
-- navigateur permettrait de saturer soi-même le compteur d'un tiers, ou de
-- consommer le sien à vide — l'écriture que la RLS ci-dessus vient d'interdire
-- passerait alors par la fonction.
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;

-- Seul le serveur (clé service_role) appelle cette fonction.
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;
