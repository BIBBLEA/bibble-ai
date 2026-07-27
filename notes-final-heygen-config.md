# Final HeyGen Configuration - Working Setup

## Working API Endpoint: v2 (deprecated but works until 2026-10-13)
- POST https://api.heygen.com/v2/video/generate
- Status check: GET https://api.heygen.com/v1/video_status.get?video_id=XXX

## v2 Payload Format (CONFIRMED WORKING):
```json
{
  "video_inputs": [{
    "character": {
      "type": "avatar",
      "avatar_id": "Daphne_public_1",
      "avatar_style": "normal"
    },
    "voice": {
      "type": "text",
      "input_text": "Script text here",
      "voice_id": "67375f26ab6e44ce8569cea3840ef594"
    }
  }],
  "dimension": {"width": 1080, "height": 1920},
  "test": true
}
```

## Dimensions by format:
- 9:16 (portrait/TikTok): {"width": 1080, "height": 1920}
- 16:9 (landscape/YouTube): {"width": 1920, "height": 1080}

## 6 Selected Avatars (LOOK IDs - confirmed working):
| Name   | Gender | Look ID          | Preview Image URL |
|--------|--------|------------------|-------------------|
| Daphne | female | Daphne_public_1  | https://files2.heygen.ai/avatar/v3/180f7fceee0f4548acead17f466c267c_63120/preview_target.webp |
| Emery  | female | Emery_public_1   | https://files2.heygen.ai/avatar/v3/4cd52c19d0e0449fa38af0a8b210881c_62710/preview_target.webp |
| Freja  | female | Freja_public_1   | https://files2.heygen.ai/avatar/v3/5ea97a1a6cbf4a96b5ee910aa8f4f08d_62450/preview_target.webp |
| Bryce  | male   | Bryce_public_5   | https://files2.heygen.ai/avatar/v3/a159e97bd1074405884694913633ea7f_63060/preview_target.webp |
| Iker   | male   | Iker_public_1    | https://files2.heygen.ai/avatar/v3/868ae49a6a114b7da763734935cc3e13_61690/preview_target.webp |
| Minho  | male   | Minho_public_6   | https://files2.heygen.ai/avatar/v3/df3547166a564b6796fc0ca56bd9d4d1_62250/preview_target.webp |

## Voices (confirmed working):
| Name | Language | Gender | Voice ID |
|------|----------|--------|----------|
| Gaëlle | French | Female | 67375f26ab6e44ce8569cea3840ef594 |
| Élise Laurent | French | Female | 728ce6e94304471fae9cf02ad85ec9a2 |
| Etienne Lefebvre | French | Male | 68c7001d8ff34d168d287e1bd7653041 |
| Marcel | French | Male | 722e1d3f97434f4ba5a7ee3e1a8538d2 |
| Allison | English | Female | f8c69e517f424cafaecde32dde57096b |
| Chill Brian | English | Male | f38a635bee7a4d1f9b0a654a31d050d2 |

## Voice preview audio URLs:
- Gaëlle: https://resource2.heygen.ai/text_to_speech/21e28514b7994f46b907b74914a3ca6e/67375f26ab6e44ce8569cea3840ef594/id=785acc2c-e49b-4de9-b899-ab21e298cff5.wav
- Élise: https://resource2.heygen.ai/text_to_speech/21e28514b7994f46b907b74914a3ca6e/728ce6e94304471fae9cf02ad85ec9a2/id=e468e22d-30c7-4bd8-8313-a8d4c5065287.wav
- Etienne: https://resource.heygen.ai/text_to_speech/wQmFavjvSJBGr2Z3QV589C.mp3
- Marcel: https://resource2.heygen.ai/text_to_speech/21e28514b7994f46b907b74914a3ca6e/722e1d3f97434f4ba5a7ee3e1a8538d2/id=a52cbe0b-5d03-4821-a0d3-49b7b5cc8b94.wav
- Chill Brian: https://resource.heygen.ai/text_to_speech/WpSDQvmLGXEqXZVZQiVeg6.mp3

## Key Learnings:
1. v3/avatars returns GROUP IDs (NOT usable for video generation)
2. v3/avatars/looks?avatar_type=studio_avatar returns LOOK IDs (usable!)
3. v3/videos endpoint requires avatar_iv engine, but studio avatars only support avatar_iii
4. v2/video/generate works with studio_avatar look IDs and avatar_iii engine
5. v2 is deprecated but functional until Oct 2026
6. The "test: true" flag generates a watermarked video without consuming credits
