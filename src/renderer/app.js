// VAM Seek Player - Main Application

let currentFolder = null;
let vamInstance = null;
let currentVideoPath = null;

const video = document.getElementById('videoPlayer');
const gridContainer = document.getElementById('gridContainer');

// === 設定の永続化 ===
const STORAGE_KEY = 'vamSeekSettings';

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {
    treePanelWidth: 280,
    gridPanelWidth: 350,
    columns: 4,
    secondsPerCell: 7,
    scrollBehavior: 'center',
    aspectRatio: 'contain',
    treeCollapsed: false,
    gridCollapsed: false,
    lastFolderPath: null
  };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

const settings = loadSettings();

// === パネルリサイズ・折りたたみ機能 ===
const gridResizer = document.getElementById('gridResizer');
const gridPanel = document.getElementById('gridPanel');
const treeResizer = document.getElementById('treeResizer');
const treePanel = document.getElementById('treePanel');

let isResizingGrid = false;
let isResizingTree = false;

// 保存された設定を適用
treePanel.style.width = settings.treePanelWidth + 'px';
gridPanel.style.width = settings.gridPanelWidth + 'px';
video.style.objectFit = settings.aspectRatio;
document.getElementById('columnsSelect').value = settings.columns;
document.getElementById('secondsSelect').value = settings.secondsPerCell;
document.getElementById('scrollSelect').value = settings.scrollBehavior;

// グリッドパネルリサイズ
gridResizer.addEventListener('mousedown', (e) => {
  isResizingGrid = true;
  gridResizer.classList.add('resizing');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

// ツリーパネルリサイズ
treeResizer.addEventListener('mousedown', (e) => {
  isResizingTree = true;
  treeResizer.classList.add('resizing');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (isResizingGrid) {
    const containerRect = document.getElementById('main').getBoundingClientRect();
    const newWidth = containerRect.right - e.clientX;
    // 最小200px、最大900px
    if (newWidth >= 200 && newWidth <= 900) {
      gridPanel.style.width = newWidth + 'px';
    }
  } else if (isResizingTree) {
    const containerRect = document.getElementById('main').getBoundingClientRect();
    const newWidth = e.clientX - containerRect.left;
    // 最小200px、最大500px
    if (newWidth >= 200 && newWidth <= 500) {
      treePanel.style.width = newWidth + 'px';
    }
  }
});

document.addEventListener('mouseup', () => {
  if (isResizingGrid) {
    isResizingGrid = false;
    gridResizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // 設定を保存
    settings.gridPanelWidth = parseInt(gridPanel.style.width);
    saveSettings(settings);
  }
  if (isResizingTree) {
    isResizingTree = false;
    treeResizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // 設定を保存
    settings.treePanelWidth = parseInt(treePanel.style.width);
    saveSettings(settings);
  }
});

// ツリーパネル折りたたみ
const treeCollapseBtn = document.getElementById('treeCollapseBtn');
const treeExpandBtn = document.getElementById('treeExpandBtn');
let treeCollapsed = settings.treeCollapsed;

function setTreeCollapsed(collapsed, save = true) {
  treeCollapsed = collapsed;
  treePanel.classList.toggle('collapsed', collapsed);
  treeResizer.classList.toggle('hidden', collapsed);
  treeExpandBtn.classList.toggle('hidden', !collapsed);
  if (save) {
    settings.treeCollapsed = collapsed;
    saveSettings(settings);
  }
}

// 起動時の折りたたみ状態を適用
setTreeCollapsed(settings.treeCollapsed, false);

treeCollapseBtn.addEventListener('click', () => {
  setTreeCollapsed(true);
});

treeExpandBtn.addEventListener('click', () => {
  setTreeCollapsed(false);
});

// グリッドパネル折りたたみ
const gridCollapseBtn = document.getElementById('gridCollapseBtn');
const gridExpandBtn = document.getElementById('gridExpandBtn');
let gridCollapsed = settings.gridCollapsed;

function setGridCollapsed(collapsed, save = true) {
  gridCollapsed = collapsed;
  gridPanel.classList.toggle('collapsed', collapsed);
  gridResizer.classList.toggle('hidden', collapsed);
  gridExpandBtn.classList.toggle('hidden', !collapsed);
  if (save) {
    settings.gridCollapsed = collapsed;
    saveSettings(settings);
  }
}

// 起動時の折りたたみ状態を適用
setGridCollapsed(settings.gridCollapsed, false);

gridCollapseBtn.addEventListener('click', () => {
  setGridCollapsed(true);
});

gridExpandBtn.addEventListener('click', () => {
  setGridCollapsed(false);
});

// フォルダを開く
document.getElementById('openFolderBtn').addEventListener('click', async () => {
  const folder = await window.electronAPI.selectFolder();
  if (folder) {
    await openFolder(folder);
  }
});

// フォルダを開く共通処理
async function openFolder(folderPath) {
  currentFolder = folderPath;
  document.getElementById('currentPath').textContent = folderPath;
  settings.lastFolderPath = folderPath;
  saveSettings(settings);
  await loadTree(folderPath);
}

// 起動時に前回のフォルダを自動で開く
if (settings.lastFolderPath) {
  // フォルダが存在するか確認してから開く
  window.electronAPI.folderExists(settings.lastFolderPath).then(exists => {
    if (exists) {
      openFolder(settings.lastFolderPath);
    }
  });
}

// ツリーを読み込む
async function loadTree(folderPath) {
  const treeContainer = document.getElementById('treeContainer');
  treeContainer.innerHTML = '';

  const items = await window.electronAPI.readDirectory(folderPath);
  renderTree(items, treeContainer, 0);
}

// ツリーを描画
function renderTree(items, container, level) {
  for (const item of items) {
    const div = document.createElement('div');
    div.className = `tree-item ${item.isDirectory ? 'folder' : 'video'}`;
    div.style.paddingLeft = `${10 + level * 20}px`;
    div.textContent = item.name;
    div.dataset.path = item.path;
    div.dataset.isDirectory = item.isDirectory;

    if (item.isVideo) {
      div.addEventListener('click', () => loadVideo(item.path, item.name));
    } else if (item.isDirectory) {
      div.addEventListener('click', async () => {
        // 展開/折りたたみ
        const isExpanded = div.classList.contains('expanded');

        if (isExpanded) {
          div.classList.remove('expanded');
          const children = div.nextElementSibling;
          if (children && children.classList.contains('tree-children')) {
            children.remove();
          }
        } else {
          div.classList.add('expanded');
          const childItems = await window.electronAPI.readDirectory(item.path);
          const childContainer = document.createElement('div');
          childContainer.className = 'tree-children';
          renderTree(childItems, childContainer, level + 1);
          div.after(childContainer);
        }
      });
    }

    container.appendChild(div);
  }
}

// 動画を読み込む
function loadVideo(videoPath, videoName) {
  // 選択状態を更新
  document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
  document.querySelector(`[data-path="${CSS.escape(videoPath)}"]`)?.classList.add('selected');

  // Windowsパスをfile:// URLに変換（特殊文字をエンコード）
  // D:\Videos\動画 [test].mp4 → file:///D:/Videos/%E5%8B%95%E7%94%BB%20%5Btest%5D.mp4
  const normalizedPath = videoPath.replace(/\\/g, '/');
  const fileUrl = 'file:///' + normalizedPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  video.src = fileUrl;
  currentVideoPath = videoPath;

  // ヘッダーにファイル名を表示
  document.getElementById('currentFile').textContent = videoName;

  // 既存のVAMインスタンスを破棄
  if (vamInstance) {
    vamInstance.destroy();
    vamInstance = null;
  }
}

// AI用グリッド画像を生成（人間用グリッドとは独立）
async function captureGridForAI() {
  if (!video.duration || video.readyState < 2) return null;

  // 元の再生位置を保存
  const originalTime = video.currentTime;
  const wasPlaying = !video.paused;
  if (wasPlaying) video.pause();

  // AI用グリッド設定：固定8列、最大48セル（8x6）
  const AI_COLUMNS = 8;
  const AI_MAX_CELLS = 48;
  const CELL_WIDTH = 196;  // 196 * 8 = 1568px（API制限内）
  const CELL_HEIGHT = 110; // 16:9比率

  // 動画長に応じてセル数を決定
  const duration = video.duration;
  let secondsPerCell;
  if (duration <= 60) {
    secondsPerCell = 2;  // 1分以下：2秒/セル
  } else if (duration <= 300) {
    secondsPerCell = 5;  // 5分以下：5秒/セル
  } else if (duration <= 600) {
    secondsPerCell = 10; // 10分以下：10秒/セル
  } else if (duration <= 1800) {
    secondsPerCell = 30; // 30分以下：30秒/セル
  } else {
    secondsPerCell = 60; // それ以上：60秒/セル
  }

  let totalCells = Math.ceil(duration / secondsPerCell);
  if (totalCells > AI_MAX_CELLS) {
    totalCells = AI_MAX_CELLS;
    secondsPerCell = duration / AI_MAX_CELLS;
  }

  const rows = Math.ceil(totalCells / AI_COLUMNS);
  const gridWidth = AI_COLUMNS * CELL_WIDTH;
  const gridHeight = rows * CELL_HEIGHT;

  // Canvas作成
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = gridWidth;
  gridCanvas.height = gridHeight;
  const ctx = gridCanvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, gridWidth, gridHeight);

  // フレームキャプチャ用Canvas
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = CELL_WIDTH;
  frameCanvas.height = CELL_HEIGHT;
  const frameCtx = frameCanvas.getContext('2d');

  // 各セルにフレームを描画
  for (let i = 0; i < totalCells; i++) {
    const timestamp = i * secondsPerCell;
    if (timestamp >= duration) break;

    const col = i % AI_COLUMNS;
    const row = Math.floor(i / AI_COLUMNS);
    const x = col * CELL_WIDTH;
    const y = row * CELL_HEIGHT;

    // 現在のビデオフレームをキャプチャ
    video.currentTime = timestamp;
    await new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    });

    // フレームを描画
    frameCtx.drawImage(video, 0, 0, CELL_WIDTH, CELL_HEIGHT);
    ctx.drawImage(frameCanvas, x, y);

    // タイムスタンプラベル
    const timeLabel = formatTime(timestamp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x, y + CELL_HEIGHT - 18, 50, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(timeLabel, x + 4, y + CELL_HEIGHT - 5);
  }

  // 元の再生位置に戻す
  video.currentTime = originalTime;
  if (wasPlaying) video.play();

  return {
    base64: gridCanvas.toDataURL('image/jpeg', 0.8).split(',')[1],
    columns: AI_COLUMNS,
    rows: rows,
    secondsPerCell: secondsPerCell,
    totalCells: totalCells
  };
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// グリッドデータをAIに送信
function updateGridDataForAI() {
  if (!video.duration || !vamInstance) return;

  const columns = parseInt(document.getElementById('columnsSelect').value);
  const secondsPerCell = parseInt(document.getElementById('secondsSelect').value);
  const totalCells = Math.ceil(video.duration / secondsPerCell);

  // グリッド画像をbase64で取得
  const gridImage = captureGridAsBase64();

  const gridData = {
    duration: video.duration,
    columns: columns,
    secondsPerCell: secondsPerCell,
    totalCells: totalCells,
    rows: Math.ceil(totalCells / columns),
    videoName: document.getElementById('currentFile').textContent,
    gridImage: gridImage
  };

  window.electronAPI.updateGridData(gridData);
}

// 動画メタデータ読み込み完了時にVAM Seekを初期化
video.addEventListener('loadedmetadata', () => {
  if (typeof VAMSeek !== 'undefined') {
    // Destroy existing instance before creating new one (v1.3.4 - fix video switch oscillation)
    if (vamInstance) {
      vamInstance.destroy();
      vamInstance = null;
    }
    const scrollValue = document.getElementById('scrollSelect').value;
    vamInstance = VAMSeek.init({
      video: video,
      container: gridContainer,
      columns: parseInt(document.getElementById('columnsSelect').value),
      secondsPerCell: parseInt(document.getElementById('secondsSelect').value),
      autoScroll: scrollValue !== 'off',
      scrollBehavior: scrollValue === 'off' ? 'center' : scrollValue,
      onSeek: (time, cell) => {
        console.log(`Seeked to ${time.toFixed(2)}s`);
      },
      onError: (err) => {
        console.error('VAMSeek error:', err);
      }
    });

    // グリッドデータをAIサービスに送信
    updateGridDataForAI();
  }
});

// グリッド設定変更
document.getElementById('columnsSelect').addEventListener('change', (e) => {
  const value = parseInt(e.target.value);
  settings.columns = value;
  saveSettings(settings);
  if (vamInstance) {
    vamInstance.configure({ columns: value });
    updateGridDataForAI();
  }
});

document.getElementById('secondsSelect').addEventListener('change', (e) => {
  const value = parseInt(e.target.value);
  settings.secondsPerCell = value;
  saveSettings(settings);
  if (vamInstance) {
    vamInstance.configure({ secondsPerCell: value });
    updateGridDataForAI();
  }
});

// スクロール設定変更
document.getElementById('scrollSelect').addEventListener('change', (e) => {
  const value = e.target.value;
  settings.scrollBehavior = value;
  saveSettings(settings);
  if (vamInstance) {
    // Use setScrollMode() to safely switch modes (cancels ongoing animations)
    vamInstance.setScrollMode(value);
  }
});

// === 動画アスペクト比コンテキストメニュー ===
const contextMenu = document.getElementById('videoContextMenu');

// 起動時のアスペクト比設定をメニューに反映
document.querySelectorAll('.context-menu-item').forEach(item => {
  item.classList.toggle('active', item.dataset.aspect === settings.aspectRatio);
});

video.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
  contextMenu.classList.remove('hidden');
});

document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.add('hidden');
  }
});

document.querySelectorAll('.context-menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const aspect = item.dataset.aspect;
    video.style.objectFit = aspect;
    settings.aspectRatio = aspect;
    saveSettings(settings);

    // アクティブ状態を更新
    document.querySelectorAll('.context-menu-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    contextMenu.classList.add('hidden');
  });
});

// === AIチャットからのシーク処理 ===
window.electronAPI.onSeekToTimestamp((seconds) => {
  if (video.readyState >= 1) {
    video.currentTime = seconds;
    video.play();
  }
});

// === グリッドキャプチャリクエスト処理 ===
window.electronAPI.onGridCaptureRequest(async () => {
  if (!video.duration || video.readyState < 2) {
    window.electronAPI.sendGridCaptureResponse(null);
    return;
  }

  // AI専用グリッド画像を生成（人間用UIグリッドとは独立）
  const aiGrid = await captureGridForAI();
  if (!aiGrid) {
    window.electronAPI.sendGridCaptureResponse(null);
    return;
  }

  const gridData = {
    duration: video.duration,
    columns: aiGrid.columns,
    secondsPerCell: aiGrid.secondsPerCell,
    totalCells: aiGrid.totalCells,
    rows: aiGrid.rows,
    videoName: document.getElementById('currentFile').textContent,
    gridImage: aiGrid.base64
  };

  window.electronAPI.sendGridCaptureResponse(gridData);
});

// === ズームグリッド生成（特定時間範囲の高解像度グリッド） ===
async function captureZoomGridForAI(startTime, endTime) {
  if (!video.duration || video.readyState < 2) return null;
  if (startTime < 0 || endTime > video.duration || startTime >= endTime) return null;

  // 元の再生位置を保存
  const originalTime = video.currentTime;
  const wasPlaying = !video.paused;
  if (wasPlaying) video.pause();

  // ズームグリッド設定：固定8列、最大48セル
  const ZOOM_COLUMNS = 8;
  const ZOOM_MAX_CELLS = 48;
  const CELL_WIDTH = 196;
  const CELL_HEIGHT = 110;

  const zoomDuration = endTime - startTime;

  // ズーム範囲に応じて秒/セルを決定（より細かく）
  let secondsPerCell;
  if (zoomDuration <= 30) {
    secondsPerCell = 1;   // 30秒以下：1秒/セル
  } else if (zoomDuration <= 60) {
    secondsPerCell = 2;   // 1分以下：2秒/セル
  } else if (zoomDuration <= 180) {
    secondsPerCell = 5;   // 3分以下：5秒/セル
  } else if (zoomDuration <= 600) {
    secondsPerCell = 10;  // 10分以下：10秒/セル
  } else {
    secondsPerCell = 15;  // それ以上：15秒/セル
  }

  let totalCells = Math.ceil(zoomDuration / secondsPerCell);
  if (totalCells > ZOOM_MAX_CELLS) {
    totalCells = ZOOM_MAX_CELLS;
    secondsPerCell = zoomDuration / ZOOM_MAX_CELLS;
  }

  const rows = Math.ceil(totalCells / ZOOM_COLUMNS);
  const gridWidth = ZOOM_COLUMNS * CELL_WIDTH;
  const gridHeight = rows * CELL_HEIGHT;

  // Canvas作成
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = gridWidth;
  gridCanvas.height = gridHeight;
  const ctx = gridCanvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, gridWidth, gridHeight);

  // フレームキャプチャ用Canvas
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = CELL_WIDTH;
  frameCanvas.height = CELL_HEIGHT;
  const frameCtx = frameCanvas.getContext('2d');

  // 各セルにフレームを描画
  for (let i = 0; i < totalCells; i++) {
    const timestamp = startTime + (i * secondsPerCell);
    if (timestamp >= endTime) break;

    const col = i % ZOOM_COLUMNS;
    const row = Math.floor(i / ZOOM_COLUMNS);
    const x = col * CELL_WIDTH;
    const y = row * CELL_HEIGHT;

    // ビデオをシーク
    video.currentTime = timestamp;
    await new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    });

    // フレームを描画
    frameCtx.drawImage(video, 0, 0, CELL_WIDTH, CELL_HEIGHT);
    ctx.drawImage(frameCanvas, x, y);

    // タイムスタンプラベル
    const timeLabel = formatTime(timestamp);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x, y + CELL_HEIGHT - 18, 50, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(timeLabel, x + 4, y + CELL_HEIGHT - 5);
  }

  // 元の再生位置に戻す
  video.currentTime = originalTime;
  if (wasPlaying) video.play();

  return {
    base64: gridCanvas.toDataURL('image/jpeg', 0.8).split(',')[1],
    columns: ZOOM_COLUMNS,
    rows: rows,
    secondsPerCell: secondsPerCell,
    totalCells: totalCells,
    startTime: startTime,
    endTime: endTime
  };
}

// === ズームグリッドキャプチャリクエスト処理 ===
window.electronAPI.onZoomGridCaptureRequest(async (startTime, endTime) => {
  if (!video.duration || video.readyState < 2) {
    window.electronAPI.sendZoomGridCaptureResponse(null);
    return;
  }

  const zoomGrid = await captureZoomGridForAI(startTime, endTime);
  if (!zoomGrid) {
    window.electronAPI.sendZoomGridCaptureResponse(null);
    return;
  }

  const gridData = {
    duration: video.duration,
    columns: zoomGrid.columns,
    secondsPerCell: zoomGrid.secondsPerCell,
    totalCells: zoomGrid.totalCells,
    rows: zoomGrid.rows,
    videoName: document.getElementById('currentFile').textContent,
    gridImage: zoomGrid.base64,
    isZoom: true,
    zoomRange: {
      start: zoomGrid.startTime,
      end: zoomGrid.endTime
    }
  };

  window.electronAPI.sendZoomGridCaptureResponse(gridData);
});
