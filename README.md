# VAM Seek Electron Demo v7.0

A desktop video player with **AI-powered video analysis**. Browse local videos, seek with a 2D thumbnail grid, and chat with Claude to understand video content.

## AI Video Analysis

Ask questions about your video and get answers based on the visual content:

- "What happens in this video?"
- "Where does the scene change?"
- "Find the part where..."

The AI sees your entire video as a thumbnail grid and can reference specific timestamps.

### Setup

1. **AI > Settings** (or `Ctrl+,`)
2. Enter your Anthropic API key
3. Select a model (Sonnet recommended for vision tasks)

### Usage

1. Load a video
2. **AI > Open Chat** (or `Ctrl+Shift+A`)
3. Ask anything about the video

The AI receives the current thumbnail grid as an image, so it can see and describe what's happening at any point in the video.

## Features

- **AI Chat** - Ask questions about video content using Claude Vision
- **Folder Browser** - Tree view for browsing local video files
- **2D Thumbnail Grid** - Visual video seeking powered by VAM Seek
- **Resizable Panels** - Drag borders to resize, click arrows to collapse
- **Auto-restore** - Remembers last folder and settings

## How to Use

1. **Open Folder** - Click "Open Folder" to select a folder with videos
2. **Select Video** - Click a video in the tree view to load it
3. **Seek with Grid** - Click any thumbnail to jump to that time
4. **Chat with AI** - Open chat and ask about the video content
5. **Adjust Settings** - Change grid columns, seconds per cell, scroll behavior
6. **Right-click Video** - Change aspect ratio

All settings are automatically saved and restored.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/unhaya/vam-seek-electron-demo.git
cd vam-seek-electron-demo

# Install dependencies
npm install

# Run the app
npm start
```

## Project Structure

```
vam-seek-electron-demo/
├── src/
│   ├── main/
│   │   └── main.js          # Electron main process
│   ├── renderer/
│   │   ├── index.html       # Main HTML
│   │   ├── app.js           # Renderer application logic
│   │   ├── lib/
│   │   │   └── vam-seek.js  # VAM Seek library
│   │   └── styles/
│   │       └── main.css     # Styles
│   └── preload/
│       └── preload.js       # IPC bridge
├── package.json
└── README.md
```

## How It Works

This demo integrates VAM Seek into an Electron application:

1. **Main Process** (`main.js`): Handles file system operations and folder dialogs
2. **Preload Script** (`preload.js`): Exposes safe IPC APIs to the renderer
3. **Renderer** (`app.js`): Initializes VAM Seek and manages the UI

### VAM Seek Integration

```javascript
// Initialize VAM Seek when video metadata is loaded
video.addEventListener('loadedmetadata', () => {
  vamInstance = VAMSeek.init({
    video: video,
    container: gridContainer,
    columns: 4,
    secondsPerCell: 15,
    onSeek: (time) => console.log(`Seeked to ${time}s`)
  });
});
```

## Requirements

- Node.js 18+
- npm or yarn

## Why the Tree View?

I got tired of switching between File Explorer and Video Player. Open a file, check the scene, not the one, go back to Explorer, repeat.

A player should browse. An explorer should seek. So I built both into one window.

## Related

- [VAM Seek](https://github.com/unhaya/vam-seek) - The core library for 2D video seeking
