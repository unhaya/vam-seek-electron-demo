# VAM Seek Electron Demo v2.0.0

A desktop video player demo built with Electron, showcasing the [VAM Seek](https://github.com/unhaya/vam-seek) library for 2D thumbnail grid video seeking.

## What's New in v2.0.0

- **Auto-restore last folder** - Automatically opens the previously used folder on startup
- **Compact grid header** - Collapse button and settings (Col/Sec/Scroll) in a single row
- **Flat tree view** - Removed folder indentation for cleaner look

https://github.com/user-attachments/assets/bfa93f6e-9a75-4d6f-b6a0-52814098b6c2

## How to Use

1. **Open Folder** - Click the "Open Folder" button to select a folder containing video files
2. **Select Video** - Click on a video file in the left tree view to load it
3. **Seek with Grid** - Click any thumbnail in the right grid panel to jump to that time
4. **Adjust Settings** - Use the dropdown menus to change grid columns, seconds per cell, and scroll behavior
5. **Right-click Video** - Change aspect ratio (Original / Fit to Height)
6. **Resize Panels** - Drag the panel borders to resize, click arrows to collapse/expand

All settings are automatically saved and restored on next launch.

## Features

- Folder tree view for browsing local video files
- 2D thumbnail grid for visual video seeking (powered by VAM Seek)
- Resizable and collapsible panels
- Supports MP4, WebM files (MOV, AVI, MKV shown in tree but playback depends on codec)

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

## The Story: Why the Tree View?

I was tired of the "Context Switching Hell."

Before this, I was using a massive 100k-line Python application I built. But as I used it, I realized I only needed one thing to be truly productive: **The Tree View integrated with the Player.**

For years, I had to jump back and forth between the OS File Explorer and the Video Player.
- "Where was that file?" (Switch to Explorer)
- "Let's check the scene." (Switch to Player)
- "Not this one." (Switch back to Explorer)

**Why should they be separate?** A player should be able to explore. An explorer should be able to seek.

So, I stripped away everything else from that 100k-line beast and extracted only the "Essence" into this Electron demo. This integrated Tree View isn't just a UI feature—it's my answer to the frustration of broken workflows.

It's not part of the core VAM Seek logic, but it's the best way to experience how fast video discovery *should* be.

## Related

- [VAM Seek](https://github.com/unhaya/vam-seek) - The core library for 2D video seeking
