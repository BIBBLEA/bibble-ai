# Cartographie du Projet : Bibble AI

Ce document détaille l'architecture de l'intégration HeyGen dans le projet Bibble AI, le flux complet de génération de vidéos, et l'emplacement des différentes configurations.

## 1. Emplacements clés

### Où sont définis les avatars et les voix ?
Les avatars et les voix sont définis en dur dans le composant formulaire (côté client) pour un affichage immédiat sans délai de chargement.
- **Fichier** : `src/components/dashboard/video-generator.tsx`
- **Avatars** : Constante `AVATARS` (Lignes 6-56)
- **Voix** : Constante `VOICES` (Lignes 58-112)

### Où se fait l'appel API HeyGen ?
L'appel principal pour la génération de vidéo (POST) est effectué côté serveur via une route API Next.js.
- **Fichier** : `src/app/api/generate-video/route.ts`
- **Ligne** : ~165 (`fetch(`${HEYGEN_BASE_URL}/v3/videos`)`)

Le suivi du statut de la vidéo (GET) est effectué par une autre route API.
- **Fichier** : `src/app/api/video-status/route.ts`
- **Ligne** : ~54 (`fetch(`${HEYGEN_BASE_URL}/v3/videos/${videoId}`)`)

### Où se construit le payload V3 ?
Le payload est construit dans la route de génération, juste avant l'appel fetch.
- **Fichier** : `src/app/api/generate-video/route.ts`
- **Lignes** : ~145-155 (Objet `heygenPayload`)

## 2. Gestion des paramètres HeyGen V3

Dans le fichier `src/app/api/generate-video/route.ts` :

- **`aspect_ratio`** : Passé directement depuis le frontend ("9:16" ou "16:9") via la variable `format`. Injecté dans le payload à la racine.
- **`fit`** : Codé en dur à `"cover"` dans le payload pour garantir que l'avatar remplit bien l'écran.
- **`engine`** : Géré dynamiquement. Le backend vérifie si l'`avatarId` fait partie de la liste `STUDIO_AVATAR_IDS` (Daphne, Emery, etc.). Si oui, il ajoute `heygenPayload.engine = { type: "avatar_iii" }`. Pour les photo_avatars (Yara, Ursula, Sofia), l'engine est omis (utilise avatar_iv/v par défaut).
- **`avatar_id`** : Reçu du frontend et passé à la racine du payload V3.
- **`voice_id`** : Reçu du frontend et passé à la racine du payload V3.
- **`script`** : Reçu du frontend (nettoyé via `.trim()`) et passé à la racine du payload V3.

## 3. Parcours complet d'une génération

1. **Page UI** : `src/app/(dashboard)/dashboard/page.tsx`
   - Affiche le header avec les crédits et inclut le composant `VideoGenerator`.
   - Gère l'état de chargement et les messages de succès/erreur.

2. **Composant formulaire** : `src/components/dashboard/video-generator.tsx`
   - Permet à l'utilisateur de sélectionner un avatar, une voix, un format et d'écrire son script.
   - Valide la limite de 400 caractères.
   - Au clic sur "Générer", appelle la fonction `onGenerate` passée par la page parente.

3. **Action / Route API** : `src/app/api/generate-video/route.ts`
   - Vérifie l'authentification Supabase et le solde de crédits.
   - Construit le payload V3 (avec ou sans engine selon l'avatar).
   - Appelle `POST https://api.heygen.com/v3/videos`.
   - Déduit 1 crédit dans la table `profiles`.
   - Crée une entrée dans `video_generations` (status: "processing").
   - Crée une transaction dans `credit_transactions`.

4. **Suivi du statut (Polling)** : `src/app/(dashboard)/dashboard/history/page.tsx`
   - La page d'historique interroge régulièrement `GET /api/video-status?video_id=xxx`.
   - La route API `src/app/api/video-status/route.ts` appelle `GET https://api.heygen.com/v3/videos/{id}`.
   - Si le statut est `completed` ou `failed`, la base de données est mise à jour avec l'URL de la vidéo.

5. **Réponse affichée à l'utilisateur** : `src/app/(dashboard)/dashboard/history/page.tsx`
   - L'utilisateur voit sa vidéo passer de "En cours" à "Terminée".
   - Un bouton "Télécharger" ou "Voir" apparaît une fois la vidéo prête.

## 4. Fichiers utilitaires obsolètes

- **Fichier** : `src/lib/heygen.ts`
- **Statut** : OBSOLÈTE. Ce fichier contient d'anciennes fonctions d'appel API (v1/v2) qui ne sont plus utilisées par les routes API principales. Il a été conservé temporairement mais ne participe pas au flux V3 actuel.
