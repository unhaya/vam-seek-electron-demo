# VAM Seek Electron Demo

A desktop video player demo built with Electron, showcasing the [VAM Seek](https://github.com/unhaya/vam-seek) library for 2D thumbnail grid video seeking.

![Screenshot](screenshot.png)

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
- Dark theme UI
- Supports MP4, WebM, MOV, AVI, MKV files

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

## Related

- [VAM Seek](https://github.com/unhaya/vam-seek) - The core library for 2D video seeking
