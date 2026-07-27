# HeyGen V3 API Configuration - Final Working Config

## V3 Video Generation - CONFIRMED WORKING FORMAT

```json
POST https://api.heygen.com/v3/videos
{
  "type": "avatar",
  "avatar_id": "<LOOK_ID>",
  "script": "Text to speak",
  "voice_id": "<VOICE_ID>",
  "aspect_ratio": "9:16",
  "fit": "cover"
}
```

### For studio_avatar (avatar_iii only):
```json
{
  "type": "avatar",
  "avatar_id": "Daphne_public_1",
  "script": "...",
  "voice_id": "...",
  "aspect_ratio": "9:16",
  "fit": "cover",
  "engine": {"type": "avatar_iii"}
}
```

### For photo_avatar (supports avatar_iv by default):
```json
{
  "type": "avatar",
  "avatar_id": "fd6814ecc5e143cd899e615a80eaa2dc",
  "script": "...",
  "voice_id": "...",
  "aspect_ratio": "9:16",
  "fit": "cover"
}
```

## Video Status - V3 endpoint
```
GET https://api.heygen.com/v3/videos/<video_id>
```

## Selected Avatars (Mix of photo_avatar with avatar_iv + studio_avatar with avatar_iii)

### Photo Avatars (HIGHEST QUALITY - avatar_iv/v):
| Name | Look ID | Gender | Type | Orientation |
|------|---------|--------|------|-------------|
| Yara Modern Lecture Hall | fd6814ecc5e143cd899e615a80eaa2dc | female | photo_avatar | landscape |
| Yara Corporate Presenter | ec41ec0d62e949c4be8a8d9265a0fb46 | female | photo_avatar | landscape |
| Ursula | (from group edb929f6fe25...) | female | photo_avatar | - |
| Sofia | (from group 96b78b4296a0...) | female | photo_avatar | - |

### Studio Avatars (avatar_iii - need engine: {"type": "avatar_iii"}):
| Name | Look ID | Gender | Orientation | Preview Image |
|------|---------|--------|-------------|---------------|
| Daphne Grey Blazer | Daphne_public_1 | female | portrait | https://files2.heygen.ai/avatar/v3/180f7fceee0f4548acead17f466c267c_63120/preview |
| Daphne Grey Suit | Daphne_public_2 | female | portrait | https://files2.heygen.ai/avatar/v3/9381fce758084f1fb970fe1d8d9142ac_63130/preview |
| Emery Red Blazer | Emery_public_1 | female | landscape | https://files2.heygen.ai/avatar/v3/4cd52c19d0e0449fa38af0a8b210881c_62710/preview |
| Freja White Blazer | Freja_public_1 | female | landscape | https://files2.heygen.ai/avatar/v3/5ea97a1a6cbf4a96b5ee910aa8f4f08d_62450/preview |
| Diora Green Blazer | Diora_public_1 | female | landscape | https://files2.heygen.ai/avatar/v3/5d2f0d4aa6bb480cbfe2895e4cb0e7db_62960/preview |
| Bryce Black T-shirt | Bryce_public_5 | male | landscape | https://files2.heygen.ai/avatar/v3/a159e97bd1074405884694913633ea7f_63060/preview |
| Minho Blue Shirt | Minho_public_6 | male | landscape | https://files2.heygen.ai/avatar/v3/df3547166a564b6796fc0ca56bd9d4d1_62250/preview |
| Iker Black Blazer | Iker_public_1 | male | landscape | https://files2.heygen.ai/avatar/v3/868ae49a6a114b7da763734935cc3e13_61690/preview |

## Selected French Voices (Dynamic/Professional)

### Female:
| Name | Voice ID | Style |
|------|----------|-------|
| Gaëlle | 67375f26ab6e44ce8569cea3840ef594 | Natural |
| Sylvie - Professional | 64cc0b129ac34e04a521cb4627126923 | Professional |
| Denise - Friendly | 5531756441d34f408e7e60821f2e52a6 | Friendly/Dynamic |
| Ariane - Natural | 0e051caf8e0947a18870ee24bbbfce36 | Natural |

### Male (Dynamic/Energetic):
| Name | Voice ID | Style |
|------|----------|-------|
| Étienne Moreau - Excited 🤩 | b6e858811f584a9f910dc9a6daab7750 | Excited/Dynamic |
| Fabrice - Friendly | ced64f6c3e56455692a04e6106db9dde | Friendly/Dynamic |
| Yves - Newscaster | 5c0956259f3d4c659573a3a3898699ef | Newscaster/Professional |
| Antoine - Natural | 51ce3a14b89947bcb6c13d5e5062331a | Natural |

## Key Notes:
- Studio avatars (Daphne, Emery, Freja, etc.) ONLY support avatar_iii → must pass `"engine": {"type": "avatar_iii"}`
- Photo avatars (Yara, Ursula, Sofia) support avatar_iv/v → no engine needed (defaults to avatar_iv)
- v3 does NOT support `"test": true` parameter
- v3 uses `script` (not `input_text`) and `voice_id` at the TOP level
- v3 video status: GET /v3/videos/{video_id}
