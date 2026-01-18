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

https://github.com/user-attachments/assets/77fb3661-4667-47d6-a4f1-3bae18653c51

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
- Clickable timestamps: AI returns `[1:23]` → click to jump

**In Development:**
- AI controls time granularity to answer your question
- You ask: "When does the red car appear?"
- AI scans the overview grid, spots something at ~2:00
- AI requests a zoomed grid (2s intervals) for 1:30-2:30
- AI returns the exact timestamp: `[2:07]`

The AI decides what resolution it needs. You just ask.

## Also Included

- Folder browser with tree view
- 2D thumbnail seeking
- Resizable panels
- Settings persistence

## Requirements

- Node.js 18+
- Anthropic API key

## Security

Your API key is stored locally in Electron's userData directory (plain JSON). It never leaves your machine—API calls go directly from your app to Anthropic.

**Note:** This is a research prototype. For production use, store your API key in environment variables (`.env` file with dotenv) instead of the settings UI. This prevents plaintext storage and keeps secrets out of version control.

## In Development: Whisper Integration

**Grid + Transcript = Complete Video Search**

Currently, visual-only analysis misses audio content. Whisper integration would enable:

- Timestamped transcript (SRT/VTT format)
- Combined input: grid image + plain text with timestamps
- AI searches both visual frames AND spoken words

**Example query:** "When do they mention the budget?"
- Grid shows: meeting room, presentation charts
- Transcript shows: `[3:45] "The budget for Q2 is..."`
- AI returns: `[3:45]` with visual + audio context

**Technical path:** transformers.js v3 now supports WebGPU, enabling up to 100x speedup over WASM. Whisper-tiny/base can transcribe faster than real-time on local GPU. The infrastructure is ready—grid timestamps align with transcript timestamps.

## Known Challenges

Honest assessment of what needs work, with planned solutions:

- **Recursive zoom control**: When AI requests a zoomed grid, context grows and can confuse the model. *Solution: Sliding window context—drop or replace old overview images when sending detailed grids. Keep token usage constant.*

- **Recursion limits**: AI could request infinite zooms. *Solution: Max-depth limits and confidence thresholds in code.*

- **Answer verification**: Users can't verify AI reasoning. *Solution: Require AI to return cell coordinates (e.g., Row 3, Col 5) alongside timestamps. Highlight referenced cells in UI with red border.*

- **Secure key storage**: Plain JSON in userData is vulnerable. *Solution: Migrate to Electron's safeStorage API (uses OS-level encryption: Windows DPAPI, macOS Keychain, Linux Libsecret). For development, environment variables are acceptable.*

## Related

- [VAM Seek](https://github.com/unhaya/vam-seek) - The core 2D seeking library (vanilla JS, no deps)
