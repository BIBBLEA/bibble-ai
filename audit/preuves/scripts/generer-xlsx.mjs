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
    faille: "Un client peut s'attribuer des crédits gratuits",
    abus:
      "Toute personne inscrite peut, depuis la console de son navigateur et en une seule ligne, " +
      "porter son solde à 9 999 crédits et passer son compte en plan Pro. Aucun outil ni " +
      "compétence particulière n'est nécessaire : la clé qui le permet est publiée dans le code " +
      "du site.",
    consequence:
      "L'abonnement perd toute valeur : chacun peut générer autant de vidéos qu'il veut sans " +
      "payer. Chaque vidéo produite est facturée à l'entreprise par HeyGen.",
    gravite: "Critique",
    emplacement: "supabase/migrations/001_initial_schema.sql:186-188",
    reference: "B0.1",
    script: "01-rls-escalade-credits.mjs",
    avant:
      "❌ EXPLOITÉ — le solde passe de 2 à 9 999 crédits et le plan de « starter » à « pro » " +
      "(code de sortie 1)",
    preuveAvant: "À exécuter — nécessite la base locale",
    correctif:
      "Interdire au client de modifier lui-même les colonnes « crédits » et « plan » : seules " +
      "les fonctions du serveur pourront y toucher.",
    apres: "✅ BLOQUÉ — 0 ligne modifiée, le solde reste à 2 crédits (code de sortie 0)",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Un client peut accéder aux vidéos d'un autre client",
    abus:
      "Un compte connecté peut demander le téléchargement ou le statut de la vidéo d'un autre " +
      "client. Les deux routes concernées n'ont jamais vérifié à qui appartient la vidéo " +
      "demandée.",
    consequence:
      "Fuite de contenus clients : script publicitaire, avatar choisi, message commercial. " +
      "Confidentialité rompue entre clients, y compris entre concurrents d'un même secteur.",
    gravite: "Élevée",
    emplacement:
      "src/app/api/video-download/route.ts:53-102 ; src/app/api/video-status/route.ts:85-121",
    reference: "B2.1 / B2.2",
    script: "02-idor-videos.mjs",
    avant:
      "❌ EXPLOITÉ — la demande portant sur la vidéo d'autrui reçoit la même réponse que sur sa " +
      "propre vidéo : aucun refus (code de sortie 1)",
    preuveAvant: "À exécuter — nécessite la base locale et l'application lancée",
    correctif:
      "Vérifier que la vidéo demandée appartient à la personne connectée, avant tout traitement " +
      "et avant tout appel au prestataire vidéo.",
    apres: "✅ BLOQUÉ — les deux routes répondent « accès refusé » (403) (code de sortie 0)",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Une notification de paiement rejouée crédite deux fois",
    abus:
      "Stripe renvoie automatiquement une notification lorsqu'il ne reçoit pas de confirmation — " +
      "ce que l'application provoque elle-même en signalant une erreur. Chaque renvoi réattribue " +
      "le plein montant de crédits du plan.",
    consequence:
      "Des crédits distribués en double, voire en boucle, sans paiement correspondant. " +
      "L'historique des crédits comporte des lignes fantômes : les comptes ne tombent plus juste.",
    gravite: "Critique",
    emplacement: "src/app/api/webhooks/stripe/route.ts:46-296",
    reference: "B3.1 / B3.2",
    script: "03-idempotence-webhook.mjs",
    avant:
      "❌ EXPLOITÉ — le même événement envoyé deux fois produit 2 attributions de crédits au " +
      "lieu d'une (code de sortie 1)",
    preuveAvant: "À exécuter — nécessite la base locale et l'application lancée",
    correctif:
      "Enregistrer l'identifiant de chaque notification traitée et ignorer immédiatement toute " +
      "répétition.",
    apres: "✅ BLOQUÉ — une seule attribution malgré le renvoi (code de sortie 0)",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "La date de début d'abonnement enregistrée est fausse",
    abus:
      "Ce n'est pas un abus volontaire mais une erreur de programmation : la date de début " +
      "d'abonnement reçoit la date de fin. Toutes les périodes enregistrées durent donc zéro jour.",
    consequence:
      "Impossible de savoir depuis quand un client est abonné. Tout calcul de renouvellement, de " +
      "remboursement au prorata ou de relance repose sur une donnée fausse.",
    gravite: "Moyenne",
    emplacement: "src/app/api/webhooks/stripe/route.ts:36-44",
    reference: "B3.3",
    script: "04-periode-abonnement.mjs",
    avant:
      "❌ EXPLOITÉ — pour une période allant du 01/08 au 01/09, la fonction renvoie 01/09 comme " +
      "début ET comme fin (code de sortie 1)",
    preuveAvant: "✔ Exécutée le 2026-08-04 — résultat conforme (aucun prérequis)",
    correctif: "Utiliser la date de début là où la date de début est attendue.",
    apres: "✅ BLOQUÉ — début 01/08 et fin 01/09, deux dates distinctes (code de sortie 0)",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Une référence tarifaire manquante fausse l'attribution des crédits",
    abus:
      "Les six tarifs sont reliés aux plans par une table de correspondance. Si une référence " +
      "n'est pas renseignée, son entrée devient vide ; plusieurs références manquantes se " +
      "remplacent alors les unes les autres et la table se mélange, sans le moindre signal.",
    consequence:
      "Constaté à l'exécution : la table tombe à 4 entrées au lieu de 6 et l'entrée vide vaut " +
      "15 crédits, le quota du plan Pro. Un abonné Starter peut donc recevoir le quota Pro — ou, " +
      "à l'inverse, un client payant ne rien recevoir pendant que le paiement est considéré " +
      "comme traité.",
    gravite: "Élevée",
    emplacement: "src/lib/stripe.ts (PLAN_CREDITS) ; src/app/api/webhooks/stripe/route.ts:20-30",
    reference: "B3.5",
    script: "05-mapping-price-ids.mjs",
    avant:
      "❌ EXPLOITÉ — 4 entrées au lieu de 6, l'entrée vide vaut 15 crédits ; un tarif inconnu " +
      "obtient une réponse « traité » sans qu'aucun crédit ne soit attribué (code de sortie 1)",
    preuveAvant: "✔ Exécutée le 2026-08-04 — résultat conforme (volet « table de correspondance »)",
    correctif:
      "Écarter les références vides à la construction de la table, et signaler bruyamment tout " +
      "tarif inconnu au lieu de l'ignorer silencieusement.",
    apres:
      "✅ BLOQUÉ — aucune entrée vide dans la table, et un tarif inconnu déclenche une alerte " +
      "(code de sortie 0)",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
  {
    faille: "Cinq vidéos peuvent être générées avec un seul crédit",
    abus:
      "En lançant plusieurs générations au même instant, toutes lisent le solde avant que la " +
      "première ne l'ait diminué. Toutes passent le contrôle et toutes aboutissent. Avec 1 " +
      "crédit, 5 requêtes simultanées produisent 5 vidéos.",
    consequence:
      "Chaque vidéo excédentaire est facturée à l'entreprise par le prestataire sans " +
      "contrepartie. L'abus ne demande aucune compétence : il suffit de cliquer plusieurs fois.",
    gravite: "Critique",
    emplacement: "src/app/api/generate-video/route.ts:98-181",
    reference: "B1.3 / B1.6",
    script: "06-course-credits.mjs",
    avant:
      "❌ EXPLOITÉ — 5 vidéos lancées, 1 seul crédit débité, 4 vidéos offertes " +
      "(code de sortie 1)",
    preuveAvant: "À exécuter — nécessite la base locale",
    correctif:
      "Débiter le crédit en une opération unique et indivisible en base, avant l'appel au " +
      "prestataire, et le rembourser si la génération échoue.",
    apres: "✅ BLOQUÉ — 1 vidéo lancée, les 4 autres requêtes refusées (code de sortie 0)",
    preuveApres: "En attente du correctif",
    statut: "À corriger",
  },
];

const COLONNES = [
  { cle: "numero", titre: "N°", largeur: 5 },
  { cle: "faille", titre: "Faille", largeur: 34 },
  { cle: "abus", titre: "Ce qu'une personne peut en faire", largeur: 52 },
  { cle: "consequence", titre: "Conséquence pour l'entreprise", largeur: 48 },
  { cle: "gravite", titre: "Gravité", largeur: 11 },
  { cle: "emplacement", titre: "Emplacement dans le code", largeur: 40 },
  { cle: "reference", titre: "Réf. plan", largeur: 11 },
  { cle: "script", titre: "Script de preuve", largeur: 28 },
  { cle: "commande", titre: "Commande à exécuter", largeur: 46 },
  { cle: "avant", titre: "Résultat attendu AVANT correctif", largeur: 46 },
  { cle: "preuveAvant", titre: "Preuve AVANT", largeur: 34 },
  { cle: "correctif", titre: "Correctif prévu", largeur: 46 },
  { cle: "apres", titre: "Résultat attendu APRÈS correctif", largeur: 42 },
  { cle: "preuveApres", titre: "Preuve APRÈS", largeur: 26 },
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
titre.value = "bibble-ai — failles constatées, preuves et correctifs";
titre.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
titre.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.entete } };
titre.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
feuille.getRow(1).height = 30;

feuille.mergeCells(2, 1, 2, COLONNES.length);
const sousTitre = feuille.getCell(2, 1);
sousTitre.value =
  "Chaque faille dispose d'un script qui l'exploite réellement. Le même script, rejoué après " +
  "correction, doit échouer à l'exploiter : c'est la preuve. Les scripts s'exécutent sur une " +
  "copie locale du site — jamais sur le site en ligne.";
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

  ligne.height = 108;
});

feuille.autoFilter = {
  from: { row: 3, column: 1 },
  to: { row: 3 + FAILLES.length, column: COLONNES.length },
};

// ============================================
// Feuille 2 — Comment rejouer les preuves
// ============================================
const modeEmploi = classeur.addWorksheet("Mode d'emploi");
modeEmploi.getColumn(1).width = 6;
modeEmploi.getColumn(2).width = 34;
modeEmploi.getColumn(3).width = 96;

modeEmploi.mergeCells(1, 1, 1, 3);
const titre2 = modeEmploi.getCell(1, 1);
titre2.value = "Comment rejouer les preuves";
titre2.font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
titre2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COULEURS.entete } };
titre2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
modeEmploi.getRow(1).height = 30;

const ETAPES = [
  [
    "Principe",
    "Chaque faille est exploitée pour de bon par un script. Le script se termine par « ❌ EXPLOITÉ » " +
      "tant que la faille est présente, et par « ✅ BLOQUÉ » une fois le correctif appliqué. La " +
      "preuve tient dans ce basculement, obtenu avec exactement la même commande.",
  ],
  [
    "Où cela s'exécute",
    "Sur une copie du site installée sur un poste de travail, avec une base de données vierge créée " +
      "à partir des fichiers du projet. Ni le site en ligne, ni la base réelle, ni le compte Stripe " +
      "ne sont sollicités : un garde-fou dans les scripts refuse toute cible autre que locale.",
  ],
  [
    "Aucun compte tiers requis",
    "Les notifications de paiement sont fabriquées et signées localement. Aucune vidéo n'est " +
      "commandée au prestataire, donc aucune facturation n'est déclenchée par les tests.",
  ],
  [
    "1. Préparer",
    "npx supabase init puis npx supabase start — installe une base locale à partir des fichiers du " +
      "projet. Copier audit/preuves/.env.preuves.example en .env.preuves et y coller les deux clés " +
      "affichées.",
  ],
  [
    "2. Lancer le site en local",
    "npm run dev, dans un second terminal.",
  ],
  [
    "3. Capturer l'état AVANT",
    "node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/run-all.mjs avant\n" +
      "Les six scripts s'exécutent et leurs sorties horodatées sont archivées dans " +
      "audit/preuves/resultats/avant/, avec un récapitulatif.",
  ],
  [
    "4. Figer le point de départ",
    "git tag preuve-avant — repère posé sur la version non corrigée, pour que la démonstration " +
      "reste rejouable même après les correctifs.",
  ],
  [
    "5. Corriger",
    "Les correctifs sont appliqués dans l'ordre du plan : d'abord les crédits gratuits, puis les " +
      "crédits multiples, puis l'accès aux vidéos, puis les notifications de paiement.",
  ],
  [
    "6. Capturer l'état APRÈS",
    "node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/run-all.mjs apres\n" +
      "Les six lignes doivent être passées de ❌ à ✅. C'est le livrable de recette.",
  ],
  [
    "Lecture des résultats",
    "Code 0 = ✅ la faille n'est plus exploitable. Code 1 = ❌ la faille est exploitable. " +
      "Code 2 = ⚠️ le test n'a pas pu conclure (un prérequis manquait).",
  ],
];

ETAPES.forEach(([intitule, texte], index) => {
  const ligne = modeEmploi.getRow(index + 3);
  ligne.getCell(2).value = intitule;
  ligne.getCell(2).font = { bold: true, color: { argb: "FF1F3864" } };
  ligne.getCell(2).alignment = { vertical: "top", wrapText: true, indent: 1 };
  ligne.getCell(3).value = texte;
  ligne.getCell(3).alignment = { vertical: "top", wrapText: true, indent: 1 };
  ligne.height = 58;
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
