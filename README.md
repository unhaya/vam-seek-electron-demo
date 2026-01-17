# VAM Seek Electron Demo

A local video player with 2D thumbnail seeking. Now with experimental AI chat.

## The Idea

Video analysis with AI is expensive. A 10-minute video at 1fps = 600 frames = 600 API calls. That adds up fast.

What if we compressed the entire video into a single image? A 2D grid of thumbnails, like a contact sheet. One image, one API call, full video context.

That's what this does.

## How It Works

1. Load a video
2. The app generates a thumbnail grid (e.g., 8 columns × 6 rows = 48 frames)
3. You ask Claude about the video
4. Claude sees the entire grid as one image and can reference any timestamp

The grid is small (~1500×660px) so it fits within vision model limits. 48 frames covering a whole video gives you the gist without bankrupting your API budget.

## Quick Start

```bash
git clone https://github.com/unhaya/vam-seek-electron-demo.git
cd vam-seek-electron-demo
npm install
npm start
```

You'll need an Anthropic API key. Go to AI > Settings (or Ctrl+,) to configure.

## Features

- **AI Chat** - Ask about video content. "What happens at the end?" "Where does the scene change?"
- **2D Thumbnail Grid** - Click any cell to seek. The original VAM Seek use case.
- **Folder Browser** - Built-in tree view so you don't alt-tab to Explorer
- **Settings persist** - Remembers your last folder, grid config, etc.

## Limitations

This is a prototype. The AI accuracy depends heavily on:
- Video complexity (simple scenes work better)
- Grid resolution (more cells = more detail but bigger image)
- What you're asking (scene changes are easier than reading text)

Don't expect miracles. But for many videos, "good enough" beats "600 API calls."

## Why

I wanted to ask Claude about videos without:
- Uploading to cloud services
- Running local models (my GPU is sad)
- Spending $10 per video on API calls

Turns out a thumbnail grid captures more than you'd think.

## Requirements

- Node.js 18+
- Anthropic API key

## Project Structure

```
src/
├── main/
│   ├── main.js        # Electron main, file ops
│   └── ai-service.js  # Claude API calls
├── renderer/
│   ├── app.js         # Grid generation, UI
│   ├── chat.js        # Chat window logic
│   └── lib/vam-seek.js
└── preload/
    └── preload.js     # IPC bridge
```

## Related

- [VAM Seek](https://github.com/unhaya/vam-seek) - The core 2D seeking library (vanilla JS, no deps)

---

*Built because I got tired of opening File Explorer and VLC in two windows. A player should browse. An explorer should seek.*
