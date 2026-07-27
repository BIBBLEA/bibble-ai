# HeyGen API - Avatar Look IDs Research

## Key Finding
- The v3/videos endpoint requires LOOK IDs, NOT group IDs
- The v3/avatars endpoint returns GROUP IDs (not usable for video generation)
- The v3/avatars/looks endpoint with avatar_type=studio_avatar returns look IDs
- Pagination uses `next_token` but it doesn't seem to work via query params
- The working look ID from earlier: "74dd6e182f0d415ab740c1097d49304b" (Annie)

## Endpoint: GET /v3/avatars/looks?avatar_type=studio_avatar&limit=50
- Returns look IDs that work for video generation
- Page 1 contains: Aditya, Albert, Bryce, Daphne, Diora, Emery, Freja, Iker, Minho, Nadim
- has_more: true (need to paginate to find Annie, Sophie, Brandon, Caroline, Luca, Nico)
- next_token is returned but pagination via query param fails

## Working format for v3/videos:
```json
{
  "type": "avatar",
  "avatar_id": "<LOOK_ID>",  // NOT group ID!
  "script": "text here",
  "voice_id": "<voice_id>",
  "aspect_ratio": "9:16",
  "fit": "cover"
}
```

## Avatars from v3/avatars (GROUP IDs - DO NOT USE for video gen):
- Annie: e0e84faea390465896db75a83be45085
- Sophie: 879dfece0b1e43ba9793e0afe9170cd1
- Brandon: d08c85e6cff84d78b6dc41d83a2eccce
- Caroline: 977b1ab85dba4eefb159a6072677effd
- Luca: def4a48dba4c4f56b3aa8c828cb6760e
- Nico: 0f97b240e94a491aa47e27c0a038c7de

## Voices (confirmed working):
- Gaëlle (FR female): 67375f26ab6e44ce8569cea3840ef594
- Élise Laurent (FR female): 728ce6e94304471fae9cf02ad85ec9a2
- Etienne Lefebvre (FR male): 68c7001d8ff34d168d287e1bd7653041
- Marcel (FR male): 722e1d3f97434f4ba5a7ee3e1a8538d2
