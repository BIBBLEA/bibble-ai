import Stripe from "stripe";
import { COMPTE_A, clientAdmin, log, seConnecter, titre, urlApp, verdict } from "./_lib.mjs";

// ============================================
// PREUVE 05 — Table des tarifs incomplète (B3.5)
// ============================================
// Démontrer le correctif : écarter les entrées vides et signaler tout tarif inconnu.
//
// Cible : src/lib/stripe.ts (PLAN_CREDITS) et src/app/api/webhooks/stripe/route.ts:20-30 —
//         `[process.env.X || ""]` produit la clé "" dès qu'une variable manque ; plusieurs
//         variables manquantes s'écrasent sur cette même clé. Un tarif inconnu sort en `break`
//         silencieux (route.ts:97-100).
// Méthode : volet A — charger le module livré avec 3 variables sur 6 (aucun prérequis)
//           volet B — poster un tarif inconnu au webhook (application en ligne)
//
// Avant : 4 entrées au lieu de 6, clé vide à 15 crédits ; tarif inconnu accepté sans crédit — code 1
// Après : aucune entrée vide, tarif inconnu signalé — code 0
// ============================================

titre("05 — Mapping des Price IDs : effondrement silencieux et paiement sans crédit");

// ============================================
// Volet A — construction du mapping avec des variables manquantes
// ============================================

log("Volet A — mapping construit avec 3 variables sur 6 renseignées");
log("");

// Les variables sont posées AVANT l'import du module, qui construit le mapping
// au chargement. Seules trois sont définies : les trois autres donneront "".
process.env.STRIPE_PRICE_STARTER_MONTHLY = "price_starter_mensuel";
process.env.STRIPE_PRICE_GROWTH_MONTHLY = "price_growth_mensuel";
process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_mensuel";
delete process.env.STRIPE_PRICE_STARTER_ANNUAL;
delete process.env.STRIPE_PRICE_GROWTH_ANNUAL;
delete process.env.STRIPE_PRICE_PRO_ANNUAL;

let PLAN_CREDITS;
try {
  // Node 24 exécute nativement les fichiers TypeScript : le module réellement
  // livré est chargé, ce n'est pas une reproduction.
  ({ PLAN_CREDITS } = await import("../../../src/lib/stripe.ts"));
  log("Module src/lib/stripe.ts chargé directement.");
} catch (erreur) {
  log(`Import direct impossible (${erreur.code ?? erreur.message}).`);
  log("Reproduction littérale des lignes de src/lib/stripe.ts :");
  PLAN_CREDITS = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || ""]: 2,
    [process.env.STRIPE_PRICE_STARTER_ANNUAL || ""]: 2,
    [process.env.STRIPE_PRICE_GROWTH_MONTHLY || ""]: 6,
    [process.env.STRIPE_PRICE_GROWTH_ANNUAL || ""]: 6,
    [process.env.STRIPE_PRICE_PRO_MONTHLY || ""]: 15,
    [process.env.STRIPE_PRICE_PRO_ANNUAL || ""]: 15,
  };
}

log("");
log("Mapping obtenu :");
for (const [cle, credits] of Object.entries(PLAN_CREDITS)) {
  const libelle = cle === "" ? '"" (clé vide)' : cle;
  log(`  ${libelle.padEnd(26)} → ${credits} crédits`);
}

const cleVide = Object.prototype.hasOwnProperty.call(PLAN_CREDITS, "");
const nbEntrees = Object.keys(PLAN_CREDITS).length;

log("");
log(`Entrées attendues : 6 — entrées réelles : ${nbEntrees}`);
if (cleVide) {
  log(`La clé vide "" existe et vaut ${PLAN_CREDITS[""]} crédits : les trois variables`);
  log("absentes se sont écrasées les unes les autres sur cette même clé, seule la");
  log("dernière déclarée subsiste.");
  log("Conséquences : un priceId vide ou absent est reconnu comme un plan valide, et");
  log(`le nombre de crédits qu'il attribue (${PLAN_CREDITS[""]}) est celui du dernier plan déclaré,`);
  log("sans rapport avec le plan réellement souscrit.");
}

const voletA = cleVide;

// ============================================
// Volet B — un priceId inconnu passe en 200 sans crédit
// ============================================

console.log("");
log("Volet B — webhook appelé avec un priceId inconnu");

let voletB = null;
const secret = process.env.STRIPE_WEBHOOK_SECRET;
const base = urlApp();

let appEnLigne = true;
try {
  await fetch(base, { signal: AbortSignal.timeout(5000) });
} catch {
  appEnLigne = false;
}

if (!appEnLigne || !secret) {
  log(
    `  volet non joué (${!appEnLigne ? "application injoignable" : "STRIPE_WEBHOOK_SECRET absent"})`
  );
} else {
  const { user } = await seConnecter(COMPTE_A);
  const admin = clientAdmin();
  await admin.from("profiles").update({ credits: 0 }).eq("id", user.id);

  const maintenant = Math.floor(Date.now() / 1000);
  const evenement = {
    id: "evt_preuve_price_inconnu",
    object: "event",
    api_version: "2026-06-24.dahlia",
    created: maintenant,
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_preuve_price_inconnu",
        object: "subscription",
        status: "active",
        customer: "cus_preuve_price_inconnu",
        metadata: { supabase_user_id: user.id },
        items: {
          object: "list",
          data: [
            {
              id: "si_preuve_price_inconnu",
              object: "subscription_item",
              price: { id: "price_absent_des_variables_denvironnement", object: "price" },
              current_period_start: maintenant,
              current_period_end: maintenant + 30 * 24 * 3600,
            },
          ],
        },
      },
      previous_attributes: { items: { data: [{ price: { id: "price_precedent" } }] } },
    },
  };

  const corps = JSON.stringify(evenement);
  const reponse = await fetch(`${base}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": Stripe.webhooks.generateTestHeaderString({ payload: corps, secret }),
    },
    body: corps,
  });

  const texte = await reponse.text();
  const { credits } = (
    await admin.from("profiles").select("credits").eq("id", user.id).single()
  ).data;

  log(`  priceId envoyé : price_absent_des_variables_denvironnement`);
  log(`  réponse du webhook : HTTP ${reponse.status} ${texte}`);
  log(`  solde du compte A après traitement : ${credits} crédits`);

  // Le défaut n'est pas l'absence de crédit — un tarif inconnu ne peut pas être
  // crédité — mais le fait que l'événement soit acquitté comme s'il avait été
  // traité. Un 200 est indistinguable d'un traitement nominal dans le tableau de
  // bord Stripe : l'incident est invisible. Un autre 2xx (202) évite le rejeu en
  // boucle tout en restant repérable.
  voletB = reponse.status === 200 && credits === 0;
  if (voletB) {
    log("  ⇒ Stripe considère l'événement comme traité ; l'abonné n'a rien reçu.");
  }
}

verdict(
  voletA || voletB === true,
  [
    voletA ? "le mapping s'effondre sur la clé vide dès qu'une variable manque" : null,
    voletB === true
      ? "un priceId inconnu obtient un 200 sans qu'aucun crédit ne soit attribué ni aucune alerte levée"
      : null,
  ]
    .filter(Boolean)
    .join(" ; "),
  "les clés vides sont filtrées et un priceId inconnu est signalé"
);
