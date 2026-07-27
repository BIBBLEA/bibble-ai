# HeyGen API v3 - Key Parameters for Bibble AI

## aspect_ratio
- Supported values: '16:9', '9:16', '4:5', '5:4', '1:1', 'auto'
- Defaults to '16:9'
- 'auto' preserves the source's aspect ratio

## fit
- 'cover': scales to fill the frame (may crop edges)
- 'contain': scales to fit entirely within the frame (may show background)
- When omitted, server picks best option
- **For 9:16 fix: use fit: "cover" to ensure avatar fills the full vertical frame**

## background
- BackgroundSetting type - allows setting background for the video
- Need to check what format this takes (color, image, etc.)

## remove_background
- Boolean - removes avatar background

## Key fix for 9:16 bug:
Current payload sends aspect_ratio: "9:16" but doesn't set fit.
Solution: Add `fit: "cover"` to ensure the avatar fills the entire frame without bands.

## For "Mise en scène" feature:
The `background` parameter can be used to set custom backgrounds/scenes.
Need to check BackgroundSetting schema for exact format.
