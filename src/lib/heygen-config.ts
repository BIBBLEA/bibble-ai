export type VideoFormat = "9:16" | "16:9";
export type AvatarType = "photo_avatar" | "studio_avatar";
export type AvatarOrientation = "portrait" | "landscape";
export type AvatarGender = "Femme" | "Homme";

export type AvatarOption = {
  id: string;
  name: string;
  gender: AvatarGender;
  style: string;
  type: AvatarType;
  orientation: AvatarOrientation;
  premium: boolean;
  preview: string;
};

export type VoiceOption = {
  id: string;
  name: string;
  language: string;
  gender: AvatarGender;
  preview: string;
};

export const AVATARS: AvatarOption[] = [
  {
    id: "fd6814ecc5e143cd899e615a80eaa2dc",
    name: "Yara",
    gender: "Femme",
    style: "Studio moderne",
    type: "photo_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://resource2.heygen.ai/public-avatars/Yara/first_frames/look_01.png",
  },
  {
    id: "ec41ec0d62e949c4be8a8d9265a0fb46",
    name: "Yara",
    gender: "Femme",
    style: "Corporate",
    type: "photo_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://resource2.heygen.ai/public-avatars/Yara/first_frames/look_05.png",
  },
  {
    id: "f0c45b92264e4b0c9d0a8f8768c62edb",
    name: "Ursula",
    gender: "Femme",
    style: "Cabinet",
    type: "photo_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://resource2.heygen.ai/public-avatars/Ursula/first_frames/look_01.png",
  },
  {
    id: "f18a356345ec4b0896a151a8103f0816",
    name: "Sofia",
    gender: "Femme",
    style: "Conférence",
    type: "photo_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://resource2.heygen.ai/public-avatars/Sofia/first_frames/look_01.png",
  },
  {
    id: "Daphne_public_1",
    name: "Daphne",
    gender: "Femme",
    style: "Blazer gris",
    type: "studio_avatar",
    orientation: "portrait",
    premium: true,
    preview:
      "https://files2.heygen.ai/avatar/v3/180f7fceee0f4548acead17f466c267c_63120/preview_target.webp",
  },
  {
    id: "Emery_public_1",
    name: "Emery",
    gender: "Femme",
    style: "Blazer rouge",
    type: "studio_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://files2.heygen.ai/avatar/v3/4cd52c19d0e0449fa38af0a8b210881c_62710/preview_target.webp",
  },
  {
    id: "Freja_public_1",
    name: "Freja",
    gender: "Femme",
    style: "Blazer blanc",
    type: "studio_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://files2.heygen.ai/avatar/v3/5ea97a1a6cbf4a96b5ee910aa8f4f08d_62450/preview_target.webp",
  },
  {
    id: "Bryce_public_5",
    name: "Bryce",
    gender: "Homme",
    style: "T-shirt noir",
    type: "studio_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://files2.heygen.ai/avatar/v3/a159e97bd1074405884694913633ea7f_63060/preview_target.webp",
  },
  {
    id: "Iker_public_1",
    name: "Iker",
    gender: "Homme",
    style: "Blazer noir",
    type: "studio_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://files2.heygen.ai/avatar/v3/868ae49a6a114b7da763734935cc3e13_61690/preview_target.webp",
  },
  {
    id: "Minho_public_6",
    name: "Minho",
    gender: "Homme",
    style: "Chemise bleue",
    type: "studio_avatar",
    orientation: "landscape",
    premium: true,
    preview:
      "https://files2.heygen.ai/avatar/v3/df3547166a564b6796fc0ca56bd9d4d1_62250/preview_target.webp",
  },
];

export const VOICES: VoiceOption[] = [
  {
    id: "67375f26ab6e44ce8569cea3840ef594",
    name: "Gaëlle",
    language: "Français",
    gender: "Femme",
    preview:
      "https://resource2.heygen.ai/text_to_speech/21e28514b7994f46b907b74914a3ca6e/67375f26ab6e44ce8569cea3840ef594/id=785acc2c-e49b-4de9-b899-ab21e298cff5.wav",
  },
  {
    id: "728ce6e94304471fae9cf02ad85ec9a2",
    name: "Élise",
    language: "Français",
    gender: "Femme",
    preview:
      "https://resource2.heygen.ai/text_to_speech/21e28514b7994f46b907b74914a3ca6e/728ce6e94304471fae9cf02ad85ec9a2/id=e468e22d-30c7-4bd8-8313-a8d4c5065287.wav",
  },
  {
    id: "64cc0b129ac34e04a521cb4627126923",
    name: "Sylvie",
    language: "Français",
    gender: "Femme",
    preview:
      "https://static.heygen.ai/voice_preview/40797bf6107f47c88aac07636e4633f9.wav",
  },
  {
    id: "0e051caf8e0947a18870ee24bbbfce36",
    name: "Ariane",
    language: "Français",
    gender: "Femme",
    preview:
      "https://static.heygen.ai/voice_preview/3f7b2cd2e2dc468fb2160728462d17cd.wav",
  },
  {
    id: "68c7001d8ff34d168d287e1bd7653041",
    name: "Etienne",
    language: "Anglais US",
    gender: "Homme",
    preview:
      "https://resource.heygen.ai/text_to_speech/wQmFavjvSJBGr2Z3QV589C.mp3",
  },
  {
    id: "722e1d3f97434f4ba5a7ee3e1a8538d2",
    name: "Marcel",
    language: "Français",
    gender: "Homme",
    preview:
      "https://resource2.heygen.ai/text_to_speech/21e28514b7994f46b907b74914a3ca6e/722e1d3f97434f4ba5a7ee3e1a8538d2/id=a52cbe0b-5d03-4821-a0d3-49b7b5cc8b94.wav",
  },
  {
    id: "ced64f6c3e56455692a04e6106db9dde",
    name: "Fabrice",
    language: "Français",
    gender: "Homme",
    preview:
      "https://static.heygen.ai/voice_preview/af486fe2ca8747538656025e556fac50.wav",
  },
  {
    id: "f8c69e517f424cafaecde32dde57096b",
    name: "Allison",
    language: "Anglais US",
    gender: "Femme",
    preview:
      "https://resource2.heygen.ai/text_to_speech/6825eafbb8004373baaa86a97bbb000d/f8c69e517f424cafaecde32dde57096b/id=e18a51e5-4ab2-4c7b-b248-48ad95992e13.wav",
  },
  {
    id: "f38a635bee7a4d1f9b0a654a31d050d2",
    name: "Brian",
    language: "Anglais US",
    gender: "Homme",
    preview:
      "https://resource.heygen.ai/text_to_speech/WpSDQvmLGXEqXZVZQiVeg6.mp3",
  },
  {
    id: "5c0956259f3d4c659573a3a3898699ef",
    name: "Yves",
    language: "Français",
    gender: "Homme",
    preview:
      "https://static.heygen.ai/voice_preview/5b17d0a01f6f45dab6cc7f3dd27decdd.wav",
  },
  {
    id: "51ce3a14b89947bcb6c13d5e5062331a",
    name: "Antoine",
    language: "Français",
    gender: "Homme",
    preview:
      "https://static.heygen.ai/voice_preview/276db23bd9804f549a94f13f1059e724.wav",
  },
];

export const STUDIO_AVATAR_IDS = new Set(
  AVATARS.filter((avatar) => avatar.type === "studio_avatar").map(
    (avatar) => avatar.id
  )
);

export const AVATAR_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  AVATARS.map((avatar) => [avatar.id, `${avatar.name} — ${avatar.style}`])
);

export function getCompatibleAvatars(format: VideoFormat) {
  if (format === "16:9") {
    return AVATARS.filter((avatar) => avatar.orientation === "landscape");
  }

  return AVATARS;
}

export const MAX_SCRIPT_WORDS = 65;
export const MAX_SCRIPT_CHARACTERS = 400;
