# Audit de l'intégration HeyGen : Bibble AI

Ce document présente un audit complet de l'intégration de l'API HeyGen dans le projet Bibble AI, incluant les fichiers concernés, les ressources utilisées et les points d'attention identifiés.

## 1. Fichiers concernés par HeyGen

L'intégration HeyGen s'articule autour de plusieurs fichiers clés, répartis entre le frontend et le backend :

| Fichier | Rôle |
|---------|------|
| `src/app/api/generate-video/route.ts` | Route API principale effectuant l'appel `POST /v3/videos` pour lancer la génération. |
| `src/app/api/video-status/route.ts` | Route API de polling effectuant l'appel `GET /v3/videos/{id}` pour vérifier l'état. |
| `src/components/dashboard/video-generator.tsx` | Composant client contenant les listes en dur des avatars et des voix, ainsi que le formulaire utilisateur. |
| `src/app/(dashboard)/dashboard/history/page.tsx` | Page client affichant l'historique et gérant le polling de l'état des vidéos. |
| `src/lib/heygen.ts` | Fichier utilitaire historique contenant d'anciennes fonctions d'appel API. |
| `next.config.ts` | Configuration Next.js autorisant les domaines d'images HeyGen (`files.heygen.ai`, etc.). |

## 2. Ressources utilisées

### Avatars actuellement configurés

Le projet utilise un mélange de deux types d'avatars HeyGen pour maximiser la qualité et le choix.

**Photo Avatars (Haute qualité - v4/v5)**
Ces avatars ne nécessitent pas de paramètre `engine` spécifique dans l'API v3.

| Nom | ID | Genre |
|-----|----|-------|
| Yara (Studio moderne) | `fd6814ecc5e143cd899e615a80eaa2dc` | Femme |
| Yara (Corporate) | `ec41ec0d62e949c4be8a8d9265a0fb46` | Femme |
| Ursula (Cabinet) | `f0c45b92264e4b0c9d0a8f8768c62edb` | Femme |
| Sofia (Conférence) | `f18a356345ec4b0896a151a8103f0816` | Femme |

**Studio Avatars (v3)**
Ces avatars nécessitent explicitement le paramètre `engine: { type: "avatar_iii" }` dans l'appel API.

| Nom | ID | Genre |
|-----|----|-------|
| Daphne | `Daphne_public_1` | Femme |
| Emery | `Emery_public_1` | Femme |
| Freja | `Freja_public_1` | Femme |
| Bryce | `Bryce_public_5` | Homme |
| Minho | `Minho_public_6` | Homme |
| Iker | `Iker_public_1` | Homme |

### Voix françaises dynamiques

Les voix sélectionnées sont exclusivement francophones, choisies pour leur dynamisme et leur professionnalisme.

| Nom | ID | Genre | Style |
|-----|----|-------|-------|
| Gaëlle | `67375f26ab6e44ce8569cea3840ef594` | Femme | Naturelle |
| Sylvie | `64cc0b129ac34e04a521cb4627126923` | Femme | Professionnelle |
| Denise | `5531756441d34f408e7e60821f2e52a6` | Femme | Dynamique |
| Ariane | `0e051caf8e0947a18870ee24bbbfce36` | Femme | Naturelle |
| Étienne | `b6e858811f584a9f910dc9a6daab7750` | Homme | Enthousiaste |
| Fabrice | `ced64f6c3e56455692a04e6106db9dde` | Homme | Dynamique |
| Yves | `5c0956259f3d4c659573a3a3898699ef` | Homme | Présentateur |
| Antoine | `51ce3a14b89947bcb6c13d5e5062331a` | Homme | Naturel |

## 3. Points d'attention et bugs potentiels

L'audit du code révèle plusieurs éléments nécessitant une attention particulière pour garantir la stabilité du système.

**Fichier utilitaire obsolète**
Le fichier `src/lib/heygen.ts` contient des fonctions (`generateVideo`, `getVideoStatus`) qui utilisent encore les anciennes API HeyGen v1 et v2. Bien que ces fonctions ne soient plus appelées par le flux principal (qui utilise directement `fetch` dans les routes API avec la v3), la présence de ce fichier peut prêter à confusion lors de futures maintenances. Il mélange des structures de payload obsolètes (`video_inputs`, `input_text`, `test: false`).

**Résidus d'anciens IDs dans l'historique**
Dans le fichier `src/app/(dashboard)/dashboard/history/page.tsx` (lignes 29-37), la constante `AVATAR_NAMES` contient encore une ancienne cartographie d'IDs vers des prénoms (`Maya`, `Priya`, etc.). Lors de l'affichage de l'historique, si l'ID d'un nouvel avatar v3 n'est pas présent dans ce dictionnaire, l'interface risque d'afficher l'ID brut au lieu du prénom de l'avatar.

**Gestion de l'orientation (Portrait/Paysage)**
L'API HeyGen v3 recadre automatiquement la vidéo selon le paramètre `aspect_ratio` (9:16 ou 16:9) et le paramètre `fit: "cover"`. Cependant, certains avatars ont une orientation préférentielle (ex: Daphne est conçue pour le portrait). Si un utilisateur demande un format 16:9 avec un avatar portrait, le résultat risque d'être fortement zoomé pour remplir l'écran, ce qui peut dégrader la qualité visuelle. Il n'y a actuellement pas de restriction empêchant ce croisement dans l'interface.

**Structure du Payload v3**
Les routes API principales ont été correctement migrées vers la v3. Le payload utilise bien la structure plate requise (`script` au lieu de `input_text`, `voice_id` à la racine) et omet le paramètre `test` qui provoquait des erreurs. La gestion conditionnelle de l'`engine` pour les `studio_avatar` est également en place et fonctionnelle.
