# Preuves — avant et après correctifs

Chaque faille relevée dans l'audit dispose d'un script qui **l'exploite réellement**. Le même
script, rejoué après le correctif, doit échouer à l'exploiter. La preuve n'est donc pas une capture
d'écran : c'est une commande, reproductible par n'importe qui, qui donne deux résultats opposés
avant et après.

```
❌ EXPLOITÉ — un utilisateur authentifié s'est attribué 9999 crédits …   (code de sortie 1)
✅ BLOQUÉ   — la modification de `credits` est refusée par la base       (code de sortie 0)
```

## Ce qui est démontré

| # | Faille | Plan | Script | Prérequis |
|---|---|---|---|---|
| 1 | Un utilisateur s'attribue des crédits illimités avec la clé publique du site | B0.1 | `01-rls-escalade-credits.mjs` | base |
| 2 | Tout compte authentifié accède aux vidéos d'un autre | B2.1 / B2.2 | `02-idor-videos.mjs` | base + app |
| 3 | Un événement Stripe rejoué recrédite l'abonné | B3.1 / B3.2 | `03-idempotence-webhook.mjs` | base + app |
| 4 | La date de début d'abonnement enregistrée est la date de fin | B3.3 | `04-periode-abonnement.mjs` | aucun |
| 5 | Le mapping des Price IDs s'effondre ; un paiement peut ne créditer personne | B3.5 | `05-mapping-price-ids.mjs` | base (+ app pour le 2ᵉ volet) |
| 6 | 5 vidéos générées avec un seul crédit | B1.3 / B1.6 | `06-course-credits.mjs` | base |

## Version tableur

`failles-et-correctifs.xlsx` reprend ces six failles en langage non technique, avec pour chacune
l'abus possible, la conséquence pour l'entreprise, la commande de preuve, le résultat attendu avant
et après correctif, et l'état d'avancement. Une seconde feuille explique comment rejouer les
preuves.

Régénération après modification des scripts :

```bash
npm i -D exceljs && node audit/preuves/scripts/generer-xlsx.mjs
# ou, sans toucher aux dépendances du projet :
EXCELJS_PATH=/chemin/vers/exceljs/excel.js node audit/preuves/scripts/generer-xlsx.mjs
```

## Aucun compte tiers n'est nécessaire

- **Stripe** : les événements sont forgés et signés localement avec
  `Stripe.webhooks.generateTestHeaderString()`. La vérification de signature est un calcul HMAC :
  aucun appel réseau, aucune clé réelle, aucun compte sandbox.
- **HeyGen** : aucun appel n'est facturé. La preuve n°6 reproduit la séquence de la route plutôt que
  de l'appeler, précisément pour ne pas déclencher cinq générations payantes (voir la note en tête
  du script).
- **Supabase de production** : jamais visé. Les failles sont dans les migrations du dépôt, donc
  reproductibles sur une base neuve — c'est même la démonstration la plus propre, puisqu'elle prouve
  que le défaut est dans le livrable et non dans un réglage accidentel du tableau de bord.

Un garde-fou refuse toute cible non locale (`exigerCibleLocale` dans `scripts/_lib.mjs`) : ces
scripts modifient des soldes et ne doivent pas viser une base réelle.

## Mise en place

```bash
# 1. Pile Supabase locale, migrations du dépôt appliquées
npx supabase init          # si supabase/config.toml n'existe pas encore
npx supabase start         # affiche l'anon key et la service_role key

# 2. Variables des scripts
cp audit/preuves/.env.preuves.example audit/preuves/.env.preuves
#   → y coller les deux clés affichées par « supabase start »

# 3. Variables de l'application (mêmes valeurs, plus celles du reste du projet)
#   .env.local doit reprendre SUPABASE_URL, les deux clés, STRIPE_WEBHOOK_SECRET
#   et les six STRIPE_PRICE_* du fichier ci-dessus.

# 4. Application, dans un second terminal
npm run dev
```

## Exécution

```bash
# Toutes les preuves, sorties archivées et récapitulatif généré
node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/run-all.mjs avant

# Une preuve isolée
node --env-file=audit/preuves/.env.preuves audit/preuves/scripts/01-rls-escalade-credits.mjs
```

Les sorties horodatées sont écrites dans `resultats/avant/` puis `resultats/apres/`, avec un
`RECAPITULATIF.md` par phase.

## Ordre à respecter

La preuve « avant » doit être capturée **sur le code non corrigé**. Une fois un correctif appliqué,
l'état vulnérable n'est plus reproductible autrement qu'en revenant en arrière dans l'historique :

1. Jouer `run-all.mjs avant` sur le code actuel et archiver les sorties.
2. Poser un repère git sur ce commit (`git tag preuve-avant`) pour que la démonstration reste
   rejouable indéfiniment.
3. Appliquer les correctifs (B0 → B1 → B2 → B3).
4. Rejouer `run-all.mjs apres` : chaque script doit passer de ❌ à ✅.

## Codes de sortie

| Code | Signification |
|---|---|
| `0` | ✅ **BLOQUÉ** — la faille n'est pas exploitable (état attendu après correctif) |
| `1` | ❌ **EXPLOITÉ** — la faille est exploitable (état attendu avant correctif) |
| `2` | ⚠️ **INDÉTERMINÉ** — un prérequis manque, rien n'a pu être conclu |
