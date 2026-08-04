import Stripe from "stripe";
import {
  COMPTE_A,
  clientAdmin,
  exigerAppEnLigne,
  indetermine,
  log,
  seConnecter,
  titre,
  variable,
  verdict,
} from "./_lib.mjs";

// ============================================
// PREUVE 03 — Absence d'idempotence du webhook Stripe
// ============================================
// Faille visée : audit/plan-implementation.md § B3.1 et B3.2
// Origine      : src/app/api/webhooks/stripe/route.ts:46-296
//
// Le handler vérifie correctement la signature, mais ne mémorise jamais les
// `event.id` déjà traités. Stripe rejoue un événement lorsqu'il ne reçoit pas de
// 2xx — ce que le handler provoque lui-même en répondant 500 sur exception
// (route.ts:299-305). Chaque rejeu réattribue le plein montant de crédits du
// plan et duplique la ligne dans `credit_transactions`.
//
// Méthode : le même événement, avec le même `event.id`, est posté deux fois avec
// une signature valide. La signature est fabriquée localement par la librairie
// Stripe (`generateTestHeaderString`) : aucun appel réseau vers Stripe, aucun
// compte nécessaire. L'événement choisi, `customer.subscription.updated`, est
// traité par le handler sans aucun appel à l'API Stripe.
// ============================================

const ID_EVENEMENT = "evt_preuve_rejeu_idempotence";
const ID_ABONNEMENT = "sub_preuve_rejeu_idempotence";

titre("03 — Rejeu d'un événement Stripe : double attribution de crédits");

const base = await exigerAppEnLigne();
const secret = variable("STRIPE_WEBHOOK_SECRET");
const priceId = variable("STRIPE_PRICE_GROWTH_MONTHLY");
const priceIdPrecedent = variable("STRIPE_PRICE_STARTER_MONTHLY");

if (!priceId || !priceIdPrecedent) {
  indetermine(
    "STRIPE_PRICE_GROWTH_MONTHLY et STRIPE_PRICE_STARTER_MONTHLY doivent être définis," +
      " avec les mêmes valeurs que celles vues par l'application"
  );
}

const { user } = await seConnecter(COMPTE_A);
const admin = clientAdmin();

// --- État de départ : solde à zéro, journal vierge pour cette référence ---
await admin.from("profiles").update({ credits: 0, plan: "starter" }).eq("id", user.id);
await admin.from("credit_transactions").delete().eq("reference_id", ID_ABONNEMENT);
log(`Compte A (${user.id}) remis à 0 crédit, plan « starter »`);

// --- Construction de l'événement ---
const maintenant = Math.floor(Date.now() / 1000);
const evenement = {
  id: ID_EVENEMENT,
  object: "event",
  api_version: "2026-06-24.dahlia",
  created: maintenant,
  livemode: false,
  pending_webhooks: 0,
  request: { id: null, idempotency_key: null },
  type: "customer.subscription.updated",
  data: {
    object: {
      id: ID_ABONNEMENT,
      object: "subscription",
      status: "active",
      customer: "cus_preuve_rejeu",
      metadata: { supabase_user_id: user.id },
      items: {
        object: "list",
        data: [
          {
            id: "si_preuve_rejeu",
            object: "subscription_item",
            price: { id: priceId, object: "price" },
            current_period_start: maintenant,
            current_period_end: maintenant + 30 * 24 * 3600,
          },
        ],
      },
    },
    // Prix précédent différent → le handler y voit un changement de plan et crédite
    previous_attributes: {
      items: { data: [{ price: { id: priceIdPrecedent } }] },
    },
  },
};

const corps = JSON.stringify(evenement);
const signature = Stripe.webhooks.generateTestHeaderString({ payload: corps, secret });

log(`Événement forgé : ${evenement.type} — id ${ID_EVENEMENT}`);
log("Signature calculée localement (aucun appel réseau vers Stripe)");

async function envoyer(numero) {
  const reponse = await fetch(`${base}/api/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": signature },
    body: corps,
  });
  const texte = await reponse.text();
  log(`Envoi n°${numero} → HTTP ${reponse.status} ${texte}`);
  if (reponse.status === 400) {
    indetermine(
      "signature refusée : le STRIPE_WEBHOOK_SECRET du script diffère de celui de l'application"
    );
  }
}

log("");
await envoyer(1);
const { credits: soldeApres1 } = (
  await admin.from("profiles").select("credits").eq("id", user.id).single()
).data;
log(`  solde après le 1er envoi : ${soldeApres1} crédits`);

await envoyer(2);
const { credits: soldeApres2 } = (
  await admin.from("profiles").select("credits").eq("id", user.id).single()
).data;
log(`  solde après le 2e envoi (même événement) : ${soldeApres2} crédits`);

const { data: transactions } = await admin
  .from("credit_transactions")
  .select("id, amount, description, created_at")
  .eq("reference_id", ID_ABONNEMENT)
  .order("created_at", { ascending: true });

log("");
log(`Lignes dans credit_transactions pour cet abonnement : ${transactions.length}`);
for (const [index, t] of transactions.entries()) {
  log(`  ${index + 1}. ${t.created_at} — ${t.amount >= 0 ? "+" : ""}${t.amount} — ${t.description}`);
}

verdict(
  transactions.length > 1,
  `le même événement rejoué a produit ${transactions.length} attributions de crédits` +
    " au lieu d'une seule — un rejeu Stripe recrédite un abonné indéfiniment",
  "le rejeu du même événement n'a produit qu'une seule attribution"
);
