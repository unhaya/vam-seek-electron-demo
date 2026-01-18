# VAM Seek × AI

**Video analysis with AI is expensive. 10-minute video at 1fps = 600 API calls.**

**What if you compressed the entire video into one image?**

48 frames → 1 grid image → 1 API call. **~600x cheaper.**

## The Numbers

| Approach | API Calls | Cost (Claude Sonnet) |
|----------|-----------|----------------------|
| Traditional (1fps) | 600 | ~$1.80/video |
| Video-to-Grid | 1 | ~$0.003/video |

Real usage per query: ~2000 input tokens, ~500 output tokens

https://github.com/user-attachments/assets/77fb3661-4667-47d6-a4f1-3bae18653c51

## Quick Start

```bash
git clone https://github.com/unhaya/vam-seek-ai.git
cd vam-seek-ai
npm install
npm start
```

**AI > Settings** (`Ctrl+,`) → Enter Anthropic API key

## How It Works

1. Load a video → App generates 8×6 grid (~1568×660px)
2. **AI > Open Chat** (`Ctrl+Shift+A`) → Ask anything
3. Claude sees the grid, references timestamps

The thumbnail grid humans use to navigate becomes AI's input. One image captures the entire timeline. No cloud upload, no FFmpeg server.

## Verification

AI returns timestamps AND grid coordinates:

```
Architecture diagram at [8:23] (Row 2, Col 5).
Prior context: [7:50] title slide "System Overview"
Following: [9:15] code examples
```

You see exactly which cell AI is referencing. Click to verify before trusting.

## Limitations

- Fast motion between frames may be missed
- Small text unreadable at thumbnail resolution
- Audio content not captured

For scene changes, visual flow, "what happens when" questions — it works.

## Features

- Folder browser with tree view
- 2D thumbnail seeking (VAM Seek core)
- Resizable panels
- Settings persistence
- Auto grid density: 2s/cell for short videos, 60s/cell for 30min+
- Clickable timestamps in AI responses

## Requirements

- Node.js 18+
- Anthropic API key

## Security

API key stored in Electron's userData (plain JSON). Never leaves your machine—calls go directly to Anthropic.

For production: use environment variables instead of settings UI.

## Future

**Adaptive Resolution**

Human grid (UI) and AI grid (analysis) are separate. Current: fixed density based on video length. Planned: AI requests zoomed grids for specific time ranges. Overview → detail → exact timestamp.

**Whisper Integration**

Grid + transcript for audio search. Example: "When do they mention the budget?" → AI returns `[3:45]` from transcript with visual context. Infrastructure ready, waiting for lighter local models.

## Known Challenges

- **Recursive zoom**: Context grows with each zoom request. Solution: sliding window, drop old images.
- **Recursion limits**: AI could request infinite zooms. Solution: max-depth limits.
- **Secure storage**: Plain JSON is vulnerable. Solution: Electron's safeStorage API.

## Related

- [VAM Seek](https://github.com/unhaya/vam-seek) - The core 2D seeking library (vanilla JS, no deps)
