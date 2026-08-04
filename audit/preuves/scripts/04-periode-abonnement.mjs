import { readFile } from "node:fs/promises";
import { indetermine, log, titre, verdict } from "./_lib.mjs";

// ============================================
// PREUVE 04 — Période d'abonnement erronée
// ============================================
// Faille visée : audit/plan-implementation.md § B3.3
// Origine      : src/app/api/webhooks/stripe/route.ts:36-44
//
//   return {
//     start: new Date(item.current_period_end * 1000).toISOString(),   ← devrait
//     end:   new Date(item.current_period_end * 1000).toISOString(),      être _start
//   };
//
// Conséquence : `subscriptions.current_period_start` reçoit la date de *fin* de
// période. Les deux bornes sont donc toujours identiques en base, et toute
// logique s'appuyant sur la date de début d'abonnement est fausse.
//
// Méthode : la fonction n'est pas exportée, elle est donc extraite du fichier
// source et exécutée telle quelle, avec un abonnement dont les deux bornes
// diffèrent d'un mois. Ce n'est pas une relecture du code : le code livré est
// réellement exécuté.
// ============================================

const CHEMIN = new URL("../../../src/app/api/webhooks/stripe/route.ts", import.meta.url);

titre("04 — Période d'abonnement : `current_period_start` reçoit la date de fin");

// Normalisation CRLF → LF : le dépôt est cloné avec des fins de ligne Windows
const source = (await readFile(CHEMIN, "utf8")).replace(/\r\n/g, "\n");
const correspondance = source.match(
  /function getSubscriptionPeriod\([^)]*\)\s*\{\n([\s\S]*?)\n\}/
);

if (!correspondance) {
  indetermine(
    "fonction getSubscriptionPeriod introuvable dans src/app/api/webhooks/stripe/route.ts" +
      " — le script doit être mis à jour si la fonction a été renommée"
  );
}

const corps = correspondance[1];
log("Code extrait de src/app/api/webhooks/stripe/route.ts :");
console.log("");
for (const ligne of corps.split("\n")) console.log(`    ${ligne}`);
console.log("");

const getSubscriptionPeriod = new Function("subscription", corps);

const debut = Math.floor(new Date("2026-08-01T00:00:00Z").getTime() / 1000);
const fin = Math.floor(new Date("2026-09-01T00:00:00Z").getTime() / 1000);

const abonnement = {
  items: {
    data: [{ current_period_start: debut, current_period_end: fin }],
  },
};

log(`Abonnement fourni en entrée :`);
log(`  current_period_start = ${new Date(debut * 1000).toISOString()}`);
log(`  current_period_end   = ${new Date(fin * 1000).toISOString()}`);

const resultat = getSubscriptionPeriod(abonnement);

log("");
log("Résultat renvoyé par la fonction :");
log(`  start = ${resultat.start}`);
log(`  end   = ${resultat.end}`);

const bornesIdentiques = resultat.start === resultat.end;
const debutFaux = resultat.start !== new Date(debut * 1000).toISOString();

verdict(
  bornesIdentiques || debutFaux,
  "la date de début renvoyée est la date de fin — les deux bornes écrites en base" +
    " sont identiques, la durée de la période est nulle",
  "la fonction renvoie bien la date de début et la date de fin distinctes"
);
