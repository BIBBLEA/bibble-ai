# Preuves des correctifs

Démontrer chaque correctif par l'exécution : un script exploite la faille, le même script échoue à
l'exploiter une fois le correctif appliqué.

```
❌ EXPLOITÉ  code 1   faille présente
✅ BLOQUÉ    code 0   correctif effectif
⚠️ INDÉTERMINÉ code 2  prérequis manquant
```

## Correctifs démontrés

| # | Correctif démontré | Plan | Script | Prérequis |
|---|---|---|---|---|
| 1 | Réserver la modification des crédits et du plan au serveur | B0.1 | `01-rls-escalade-credits.mjs` | base |
| 2 | Vérifier la propriété d'une vidéo avant tout traitement | B2.1 / B2.2 | `02-idor-videos.mjs` | base + app |
| 3 | Ignorer les notifications de paiement déjà traitées | B3.1 / B3.2 | `03-idempotence-webhook.mjs` | base + app |
| 4 | Renseigner la date de début avec la date de début | B3.3 | `04-periode-abonnement.mjs` | aucun |
| 5 | Écarter les tarifs vides, signaler les tarifs inconnus | B3.5 | `05-mapping-price-ids.mjs` | base (+ app) |
| 6 | Débiter le crédit en une opération indivisible | B1.3 / B1.6 | `06-course-credits.mjs` | base |

`failles-et-correctifs.xlsx` reprend le tableau avec les résultats attendus et l'avancement.

## Portée

Exécuter sur une base locale créée depuis `supabase/migrations/`. Un garde-fou refuse toute cible
distante.

Aucun compte tiers requis : événements Stripe signés localement
(`generateTestHeaderString`), aucune génération HeyGen déclenchée.

## Mise en place

```bash
npx supabase init && npx supabase start
cp audit/preuves/.env.preuves.example audit/preuves/.env.preuves   # + les 2 clés affichées
npm run dev                                                        # second terminal
```

Reprendre les mêmes valeurs dans `.env.local`.

## Exécution

```bash
# Avant correctifs
node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/run-all.mjs avant
git tag preuve-avant

# Après correctifs
node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/run-all.mjs apres
```

Sorties horodatées et récapitulatif dans `resultats/avant/` puis `resultats/apres/`.

Capturer l'état « avant » sur le code non corrigé : le tag `preuve-avant` conserve ce point de
départ rejouable.

## Régénérer le tableur

```bash
npm i -D exceljs && node audit/preuves/scripts/generer-xlsx.mjs
# sans toucher aux dépendances :
EXCELJS_PATH=/chemin/vers/exceljs/excel.js node audit/preuves/scripts/generer-xlsx.mjs
```
