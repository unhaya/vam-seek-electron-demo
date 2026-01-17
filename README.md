# VAM Seek × AI

**Video analysis with AI is expensive. 10-minute video at 1fps = 600 API calls.**

**What if you compressed the entire video into one image?**

48 frames → 1 grid image → 1 API call. **~600x cheaper.**

## The Numbers

| Approach | API Calls | Cost (Claude Sonnet) |
|----------|-----------|----------------------|
| Traditional (1fps) | 600 | ~$1.80/video |
| Video-to-Grid | 1 | ~$0.003/video |

Real usage per query: **~2000 input tokens, ~500 output tokens**

## How It Works

1. Load a video
2. App generates 8×6 grid (~1568×660px)
3. Ask Claude anything
4. Claude sees the grid, references timestamps

That's it. No cloud upload, no FFmpeg server, no frame-by-frame processing.

https://github.com/user-attachments/assets/bfa93f6e-9a75-4d6f-b6a0-52814098b6c2

## Quick Start

```bash
git clone https://github.com/unhaya/vam-seek-electron-demo.git
cd vam-seek-electron-demo
npm install
npm start
```

1. **AI > Settings** (`Ctrl+,`) → Enter Anthropic API key
2. Load a video
3. **AI > Open Chat** (`Ctrl+Shift+A`)
4. Ask: "What happens in this video?"

## Why This Works

VAM Seek extracts frames client-side using Canvas API. No server needed.

The same thumbnail grid humans use to navigate becomes the input for AI vision. One image captures the entire video timeline.

## Limitations

- Fast motion between frames may be missed
- Small text unreadable at thumbnail resolution
- Audio-dependent content not captured

For scene changes, visual flow, "what happens when" questions — it works.

## Work in Progress: Adaptive Resolution

**Dual Grid Architecture**

Human grid (UI) and AI grid (analysis) are separate.

- Human: Browse with preferred columns/intervals
- AI: Fixed 8×6 grid, auto-adjusted density based on video length

**Current:**
- Auto grid density: 2s/cell for ≤1min, 60s/cell for 30min+

**In Development:**
- AI requests zoom on specific time ranges
- Pass 1: Full overview (48 frames)
- Pass 2: High-density capture on regions of interest

## Also Included

- Folder browser with tree view
- 2D thumbnail seeking
- Resizable panels
- Settings persistence

## Requirements

- Node.js 18+
- Anthropic API key

## Related

- [VAM Seek](https://github.com/unhaya/vam-seek) - The core 2D seeking library (vanilla JS, no deps)
