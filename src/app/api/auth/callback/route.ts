import { createServerClient } from "@supabase/ssr";
import type { AuthError, EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/** Motifs d'échec exposés à `/login?error=…` (mappés en messages par la page de connexion). */
type AuthErrorReason =
  | "missing_code"
  | "expired_link"
  | "pkce_missing"
  | "verification_failed";

/** Types d'OTP e-mail acceptés, restreints depuis le type de la librairie. */
type AllowedOtpType = Extract<
  EmailOtpType,
  "signup" | "recovery" | "email_change" | "magiclink" | "invite"
>;

const ALLOWED_OTP_TYPES: readonly AllowedOtpType[] = [
  "signup",
  "recovery",
  "email_change",
  "magiclink",
  "invite",
];

const DEFAULT_DESTINATION = "/dashboard";

/**
 * Classe une erreur Supabase en motif explicite.
 * Fonction pure, comparaisons insensibles à la casse.
 */
function classifyAuthError(error: AuthError): AuthErrorReason {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";
  const status = error.status;

  // PKCE d'abord : le message Supabase « invalid request: both auth code and
  // code verifier should be non-empty » contient aussi « invalid », qui serait
  // sinon capté par la règle « lien expiré » ci-dessous.
  if (
    code === "bad_code_verifier" ||
    message.includes("code verifier") ||
    message.includes("code_verifier")
  ) {
    return "pkce_missing";
  }

  // Lien expiré, déjà consommé, ou OTP invalide.
  if (
    status === 401 ||
    status === 403 ||
    code.includes("expired") ||
    code.includes("invalid") ||
    message.includes("expired") ||
    message.includes("invalid")
  ) {
    return "expired_link";
  }

  return "verification_failed";
}

/** Valide `type` contre la liste blanche ; renvoie `null` si absent ou inconnu. */
function parseOtpType(value: string | null): AllowedOtpType | null {
  return ALLOWED_OTP_TYPES.find((allowed) => allowed === value) ?? null;
}

/**
 * Valide le paramètre `next` : seuls les chemins internes sont acceptés.
 * Bloque les redirections ouvertes (`//evil.com`, `/\evil.com` que les
 * navigateurs normalisent en protocol-relative, et tout schéma explicite).
 */
function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith("/")) return DEFAULT_DESTINATION;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_DESTINATION;
  if (/(https?|javascript|data|vbscript):/i.test(next)) return DEFAULT_DESTINATION;
  return next;
}

/** Destination en cas de succès, selon le type de vérification. */
function successDestination(
  type: AllowedOtpType | null,
  next: string | null
): string {
  if (type === "recovery") return "/auth/update-password";
  if (type === "email_change") return "/dashboard/account?message=email_changed";
  // signup / magiclink / invite / flux `code` : `next` validé, sinon /dashboard.
  return sanitizeNext(next);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const rawType = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next");

  // Un lien de réinitialisation périmé doit ramener sur le parcours « mot de
  // passe oublié » et non sur la page de connexion : `/auth/update-password`
  // affiche l'écran « lien expiré » avec le bouton pour redemander un lien.
  // Le flux PKCE historique ne porte pas de `type` : on se rabat sur `next`,
  // que `resetPasswordForEmail` renseigne avec `/auth/update-password`.
  const isRecoveryFlow =
    rawType === "recovery" || sanitizeNext(next).startsWith("/auth/");

  const failure = (reason: AuthErrorReason) =>
    NextResponse.redirect(
      new URL(
        `${isRecoveryFlow ? "/auth/update-password" : "/login"}?error=${reason}`,
        request.url
      )
    );

  if (!code && !tokenHash) {
    return failure("missing_code");
  }

  // Méthode cookies : la destination finale dépend du résultat de la
  // vérification, mais `setAll` doit écrire sur une réponse existante au moment
  // de l'appel Supabase. On crée donc un « porteur » de cookies avec une URL
  // provisoire, puis on recopie ses cookies sur la réponse de redirection
  // finale (voir `applySessionCookies`).
  const cookieCarrier = NextResponse.redirect(
    new URL(DEFAULT_DESTINATION, request.url)
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieCarrier.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  /** Recopie les cookies de session posés par Supabase sur la réponse finale. */
  const applySessionCookies = (response: NextResponse) => {
    cookieCarrier.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  let error: AuthError | null = null;
  let otpType: AllowedOtpType | null = null;

  if (code) {
    // Flux PKCE historique, conservé pour les liens déjà envoyés.
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash) {
    // Flux `token_hash` (templates d'e-mails) : le type doit être connu.
    otpType = parseOtpType(rawType);
    if (!otpType) {
      return failure("verification_failed");
    }
    ({ error } = await supabase.auth.verifyOtp({
      type: otpType,
      token_hash: tokenHash,
    }));
  }

  if (error) {
    return failure(classifyAuthError(error));
  }

  return applySessionCookies(
    NextResponse.redirect(
      new URL(successDestination(otpType, next), request.url)
    )
  );
}
