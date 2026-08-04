import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ============================================
// Génère audit/preuves/failles-et-correctifs.xlsx
// ============================================
// exceljs n'est pas une dépendance du projet. Deux façons de l'exécuter :
//
//   npm i -D exceljs && node audit/preuves/scripts/generer-xlsx.mjs
//   EXCELJS_PATH=/chemin/vers/exceljs/excel.js node audit/preuves/scripts/generer-xlsx.mjs
// ============================================

// Un chemin absolu doit être converti en URL file:// pour l'import ESM sous Windows.
const source = process.env.EXCELJS_PATH
  ? pathToFileURL(process.env.EXCELJS_PATH).href
  : "exceljs";
const ExcelJS = (await import(source)).default;

const ici = path.dirname(fileURLToPath(import.meta.url));
const SORTIE = path.join(ici, "..", "failles-et-correctifs.xlsx");

const COMMANDE = "node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/";

const FAILLES = [
  {
    faille: "Attribution de crédits par l'utilisateur lui-même",
    abus:
      "Porter son solde à 9 999 crédits et passer en plan Pro depuis la console du navigateur, " +
      "avec la clé publiée dans le code du site.",
    consequence:
      "Vidéos illimitées sans paiement. Chaque vidéo produite est facturée par HeyGen.",
    gravite: "Critique",
    emplacement: "supabase/migrations/001_initial_schema.sql:186-188",
    reference: "B0.1",
    script: "01-rls-escalade-credits.mjs",
    avant: "❌ Solde porté à 9 999 crédits, plan « pro » — code 1",
    preuveAvant: "À exécuter — base locale requise",
    correctif: "Réserver la modification de « crédits » et « plan » au serveur.",
    apres: "✅ Modification refusée, solde inchangé — code 0",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Accès aux vidéos d'un autre client",
    abus:
      "Télécharger et suivre la vidéo d'un autre client à partir de son identifiant.",
    consequence:
      "Fuite de contenus clients : script publicitaire, avatar, message commercial.",
    gravite: "Élevée",
    emplacement:
      "src/app/api/video-download/route.ts:53-102 ; src/app/api/video-status/route.ts:85-121",
    reference: "B2.1 / B2.2",
    script: "02-idor-videos.mjs",
    avant: "❌ Réponses identiques sur sa vidéo et celle d'autrui — code 1",
    preuveAvant: "À exécuter — base locale et application requises",
    correctif: "Vérifier la propriété de la vidéo avant tout traitement.",
    apres: "✅ Accès refusé (403) sur la vidéo d'autrui — code 0",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Notification de paiement rejouée",
    abus:
      "Recevoir deux fois les crédits lorsque Stripe renvoie la notification — renvoi que " +
      "l'application déclenche elle-même en signalant une erreur.",
    consequence: "Crédits attribués sans paiement. Historique des crédits faussé.",
    gravite: "Critique",
    emplacement: "src/app/api/webhooks/stripe/route.ts:46-296",
    reference: "B3.1 / B3.2",
    script: "03-idempotence-webhook.mjs",
    avant: "❌ 2 attributions de crédits pour 1 événement — code 1",
    preuveAvant: "À exécuter — base locale et application requises",
    correctif: "Mémoriser les notifications traitées, ignorer les répétitions.",
    apres: "✅ 1 seule attribution malgré le renvoi — code 0",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Date de début d'abonnement erronée",
    abus: "Aucun abus : erreur de programmation.",
    consequence:
      "Périodes d'abonnement de durée nulle. Calculs de renouvellement et de prorata faussés.",
    gravite: "Moyenne",
    emplacement: "src/app/api/webhooks/stripe/route.ts:36-44",
    reference: "B3.3",
    script: "04-periode-abonnement.mjs",
    avant: "❌ Période du 01/08 au 01/09 → début = fin = 01/09 — code 1",
    preuveAvant: "✔ Exécutée le 2026-08-04 — conforme",
    correctif: "Renseigner la date de début avec la date de début.",
    apres: "✅ Début 01/08, fin 01/09 — code 0",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Table des tarifs incomplète",
    abus: "Aucun abus : défaut de construction déclenché par une référence tarifaire absente.",
    consequence:
      "Constaté à l'exécution : 4 entrées au lieu de 6, entrée vide à 15 crédits. Un abonné " +
      "Starter reçoit le quota Pro ; un tarif inconnu est accepté sans aucun crédit attribué.",
    gravite: "Élevée",
    emplacement: "src/lib/stripe.ts ; src/app/api/webhooks/stripe/route.ts:20-30",
    reference: "B3.5",
    script: "05-mapping-price-ids.mjs",
    avant: "❌ 4 entrées au lieu de 6, clé vide à 15 crédits — code 1",
    preuveAvant: "✔ Exécutée le 2026-08-04 — conforme",
    correctif: "Écarter les entrées vides, signaler tout tarif inconnu.",
    apres: "✅ Aucune entrée vide, tarif inconnu signalé — code 0",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Générations simultanées avec un seul crédit",
    abus: "Lancer cinq générations au même instant et obtenir cinq vidéos avec un crédit.",
    consequence: "Vidéos excédentaires facturées sans contrepartie. Aucune compétence requise.",
    gravite: "Critique",
    emplacement: "src/app/api/generate-video/route.ts:98-181",
    reference: "B1.3 / B1.6",
    script: "06-course-credits.mjs",
    avant: "❌ 5 vidéos lancées, 1 crédit débité — code 1",
    preuveAvant: "À exécuter — base locale requise",
    correctif:
      "Débiter le crédit en une opération indivisible avant l'appel au prestataire, rembourser " +
      "en cas d'échec.",
    apres: "✅ 1 vidéo lancée, 4 requêtes refusées — code 0",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
];

const COLONNES = [
  { cle: "numero", titre: "N°", largeur: 5 },
  { cle: "faille", titre: "Faille", largeur: 34 },
  { cle: "abus", titre: "Abus possible", largeur: 50 },
  { cle: "consequence", titre: "Impact", largeur: 46 },
  { cle: "gravite", titre: "Gravité", largeur: 11 },
  { cle: "emplacement", titre: "Emplacement dans le code", largeur: 40 },
  { cle: "reference", titre: "Réf. plan", largeur: 11 },
  { cle: "script", titre: "Script de preuve", largeur: 28 },
  { cle: "commande", titre: "Commande à exécuter", largeur: 46 },
  { cle: "avant", titre: "Attendu AVANT correctif", largeur: 42 },
  { cle: "preuveAvant", titre: "Preuve AVANT", largeur: 32 },
  { cle: "correctif", titre: "Correctif", largeur: 44 },
  { cle: "apres", titre: "Attendu APRÈS correctif", largeur: 40 },
  { cle: "preuveApres", titre: "Preuve APRÈS", largeur: 24 },
  { cle: "statut", titre: "Statut", largeur: 14 },
];

const COULEURS = {
  entete: "FF1F3864",
  Critique: "FFC00000",
  Élevée: "FFED7D31",
  Moyenne: "FFFFC000",
  bandeau: "FFF2F5FA",
};

const classeur = new ExcelJS.Workbook();
classeur.creator = "Audit bibble-ai";
classeur.created = new Date();

// ============================================
// Feuille 1 — Failles et preuves
// ============================================
const feuille = classeur.addWorksheet("Failles et preuves", {
  views: [{ state: "frozen", xSplit: 2, ySplit: 3 }],
  pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
});

feuille.mergeCells(1, 1, 1, COLONNES.length);
const titre = feuille.getCell(1, 1);
titre.value = "bibble-ai — failles, correctifs et preuves d'exécution";
titre.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
titre.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.entete } };
titre.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
feuille.getRow(1).height = 30;

feuille.mergeCells(2, 1, 2, COLONNES.length);
const sousTitre = feuille.getCell(2, 1);
sousTitre.value =
  "Démontrer chaque correctif par l'exécution : un script exploite la faille, le même script " +
  "échoue à l'exploiter une fois le correctif appliqué. Exécution sur copie locale, sans toucher " +
  "au site en ligne ni aux comptes Stripe et HeyGen.";
sousTitre.font = { size: 10, italic: true, color: { argb: "FF44546A" } };
sousTitre.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
feuille.getRow(2).height = 28;

const enTete = feuille.getRow(3);
COLONNES.forEach((colonne, index) => {
  const cellule = enTete.getCell(index + 1);
  cellule.value = colonne.titre;
  cellule.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  cellule.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.entete } };
  cellule.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cellule.border = { bottom: { style: "medium", color: { argb: "FF0F1F3D" } } };
  feuille.getColumn(index + 1).width = colonne.largeur;
});
enTete.height = 34;

FAILLES.forEach((faille, index) => {
  const donnees = {
    ...faille,
    numero: index + 1,
    commande: COMMANDE + faille.script,
  };
  const ligne = feuille.getRow(index + 4);
  COLONNES.forEach((colonne, colonneIndex) => {
    const cellule = ligne.getCell(colonneIndex + 1);
    cellule.value = donnees[colonne.cle];
    cellule.alignment = { vertical: "top", wrapText: true, indent: 1 };
    cellule.border = { bottom: { style: "thin", color: { argb: "FFD6DCE4" } } };
    if (index % 2 === 1) {
      cellule.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.bandeau } };
    }
  });

  ligne.getCell(1).alignment = { vertical: "top", horizontal: "center" };
  ligne.getCell(2).font = { bold: true };

  const gravite = ligne.getCell(5);
  gravite.alignment = { vertical: "top", horizontal: "center" };
  gravite.font = { bold: true, color: { argb: "FFFFFFFF" } };
  gravite.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COULEURS[faille.gravite] },
  };

  for (const colonne of [6, 8, 9]) {
    ligne.getCell(colonne).font = { name: "Consolas", size: 9 };
  }

  ligne.getCell(10).font = { color: { argb: "FFC00000" } };
  ligne.getCell(13).font = { color: { argb: "FF2E7D32" } };
  ligne.getCell(11).font = {
    bold: faille.preuveAvant.startsWith("✔"),
    color: { argb: faille.preuveAvant.startsWith("✔") ? "FF2E7D32" : "FF7F6000" },
  };
  ligne.getCell(15).font = { bold: true, color: { argb: "FFC00000" } };
  ligne.getCell(15).alignment = { vertical: "top", horizontal: "center" };

  ligne.height = 78;
});

feuille.autoFilter = {
  from: { row: 3, column: 1 },
  to: { row: 3 + FAILLES.length, column: COLONNES.length },
};

// ============================================
// Feuille 2 — Comment rejouer les preuves
// ============================================
const modeEmploi = classeur.addWorksheet("Protocole");
modeEmploi.getColumn(1).width = 6;
modeEmploi.getColumn(2).width = 34;
modeEmploi.getColumn(3).width = 96;

modeEmploi.mergeCells(1, 1, 1, 3);
const titre2 = modeEmploi.getCell(1, 1);
titre2.value = "Protocole";
titre2.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
titre2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.entete } };
titre2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
modeEmploi.getRow(1).height = 30;

const ETAPES = [
  ["Principe", "Exploiter la faille avant correctif, échouer à l'exploiter après. Même commande, deux résultats."],
  ["Portée", "Base locale créée depuis les fichiers du projet. Ni le site en ligne, ni la base réelle, ni le compte Stripe ne sont sollicités."],
  ["Comptes tiers", "Aucun. Notifications de paiement signées localement, aucune vidéo commandée au prestataire."],
  ["1. Préparer", "npx supabase init puis npx supabase start. Copier .env.preuves.example en .env.preuves, y coller les deux clés affichées."],
  ["2. Lancer l'application", "npm run dev, dans un second terminal."],
  ["3. Capturer l'avant", "run-all.mjs avant — sorties horodatées archivées dans resultats/avant/."],
  ["4. Figer le point de départ", "git tag preuve-avant — conserver la version non corrigée, rejouable."],
  ["5. Corriger", "Appliquer les correctifs dans l'ordre du plan."],
  ["6. Capturer l'après", "run-all.mjs apres — les six lignes doivent passer de ❌ à ✅."],
  ["Codes", "0 = ✅ faille non exploitable. 1 = ❌ faille exploitable. 2 = ⚠️ prérequis manquant."],
];

ETAPES.forEach(([intitule, texte], index) => {
  const ligne = modeEmploi.getRow(index + 3);
  ligne.getCell(2).value = intitule;
  ligne.getCell(2).font = { bold: true, color: { argb: "FF1F3864" } };
  ligne.getCell(2).alignment = { vertical: "top", wrapText: true, indent: 1 };
  ligne.getCell(3).value = texte;
  ligne.getCell(3).alignment = { vertical: "top", wrapText: true, indent: 1 };
  ligne.height = 42;
  if (index % 2 === 1) {
    for (const colonne of [2, 3]) {
      ligne.getCell(colonne).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COULEURS.bandeau },
      };
    }
  }
});

await classeur.xlsx.writeFile(SORTIE);
console.log(`Classeur écrit : ${SORTIE}`);
console.log(`${FAILLES.length} failles, ${COLONNES.length} colonnes, 2 feuilles.`);
