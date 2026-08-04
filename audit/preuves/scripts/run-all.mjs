import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// ============================================
// Exécute toutes les preuves et archive les sorties
// ============================================
//   node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/run-all.mjs avant
//   node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/run-all.mjs apres
// ============================================

const phase = process.argv[2];
if (!["avant", "apres"].includes(phase)) {
  console.error("Usage : node run-all.mjs <avant|apres>");
  process.exit(2);
}

const ici = path.dirname(fileURLToPath(import.meta.url));
const dossierSortie = path.join(ici, "..", "resultats", phase);

// Une phase déjà capturée ne doit pas être écrasée : rejouer « avant » après un
// correctif remplacerait la preuve de la faille par un résultat corrigé.
if (existsSync(path.join(dossierSortie, "RECAPITULATIF.md")) && !process.argv.includes("--force")) {
  console.error(`La phase « ${phase} » a déjà été capturée dans resultats/${phase}/.`);
  console.error("Ajouter --force pour l'écraser volontairement.");
  process.exit(2);
}

await mkdir(dossierSortie, { recursive: true });

const PREUVES = [
  { fichier: "01-rls-escalade-credits.mjs", intitule: "Escalade de crédits via RLS", reference: "B0.1" },
  { fichier: "02-idor-videos.mjs", intitule: "IDOR sur les vidéos", reference: "B2.1 / B2.2" },
  { fichier: "03-idempotence-webhook.mjs", intitule: "Rejeu du webhook Stripe", reference: "B3.1 / B3.2" },
  { fichier: "04-periode-abonnement.mjs", intitule: "Période d'abonnement erronée", reference: "B3.3" },
  { fichier: "05-mapping-price-ids.mjs", intitule: "Mapping des Price IDs", reference: "B3.5" },
  { fichier: "06-course-credits.mjs", intitule: "Course aux crédits", reference: "B1.3 / B1.6" },
];

const ETIQUETTES = {
  0: "✅ BLOQUÉ",
  1: "❌ EXPLOITÉ",
  2: "⚠️ INDÉTERMINÉ",
};

function executer(fichier) {
  return new Promise((resolve) => {
    const processus = spawn(process.execPath, [path.join(ici, fichier)], {
      env: process.env,
    });
    let sortie = "";
    processus.stdout.on("data", (bloc) => (sortie += bloc));
    processus.stderr.on("data", (bloc) => (sortie += bloc));
    processus.on("close", (code) => resolve({ code, sortie }));
  });
}

console.log(`Exécution des preuves — phase « ${phase} »`);
console.log(`Sorties archivées dans audit/preuves/resultats/${phase}/`);

const setup = await executer("00-setup.mjs");
await writeFile(path.join(dossierSortie, "00-setup.log"), setup.sortie);
if (setup.code !== 0) {
  console.error(setup.sortie);
  console.error("La préparation a échoué : aucune preuve n'a été jouée.");
  process.exit(2);
}
console.log("00-setup : jeu de données prêt");

const resultats = [];
for (const preuve of PREUVES) {
  const { code, sortie } = await executer(preuve.fichier);
  await writeFile(path.join(dossierSortie, preuve.fichier.replace(".mjs", ".log")), sortie);
  const etiquette = ETIQUETTES[code] ?? `code ${code}`;
  console.log(`${preuve.fichier.padEnd(30)} ${etiquette}`);
  resultats.push({ ...preuve, code, etiquette });
}

const horodatage = new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
const recapitulatif = [
  `# Résultats des preuves — phase « ${phase} »`,
  "",
  `Exécuté le ${horodatage}.`,
  "",
  "| # | Faille | Plan | Verdict | Sortie complète |",
  "|---|---|---|---|---|",
  ...resultats.map((r, i) => {
    const log = r.fichier.replace(".mjs", ".log");
    return `| ${i + 1} | ${r.intitule} | ${r.reference} | ${r.etiquette} | [${log}](./${log}) |`;
  }),
  "",
  "Codes de sortie : `0` = bloqué, `1` = exploité, `2` = indéterminé.",
  "",
].join("\n");

await writeFile(path.join(dossierSortie, "RECAPITULATIF.md"), recapitulatif);
console.log("");
console.log(`Récapitulatif : audit/preuves/resultats/${phase}/RECAPITULATIF.md`);
