// VAM Seek Player - Main Application

let currentFolder = null;
let vamInstance = null;
let currentVideoPath = null;

const video = document.getElementById('videoPlayer');
const gridContainer = document.getElementById('gridContainer');

// === パネルリサイズ・折りたたみ機能 ===
const gridResizer = document.getElementById('gridResizer');
const gridPanel = document.getElementById('gridPanel');
const treeResizer = document.getElementById('treeResizer');
const treePanel = document.getElementById('treePanel');

let isResizingGrid = false;
let isResizingTree = false;

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
    // 最小200px、最大600px
    if (newWidth >= 200 && newWidth <= 600) {
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
  }
  if (isResizingTree) {
    isResizingTree = false;
    treeResizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// ツリーパネル折りたたみ
const treeCollapseBtn = document.getElementById('treeCollapseBtn');
const treeExpandBtn = document.getElementById('treeExpandBtn');
let treeCollapsed = false;

function setTreeCollapsed(collapsed) {
  treeCollapsed = collapsed;
  treePanel.classList.toggle('collapsed', collapsed);
  treeResizer.classList.toggle('hidden', collapsed);
  treeExpandBtn.classList.toggle('hidden', !collapsed);
}

treeCollapseBtn.addEventListener('click', () => {
  setTreeCollapsed(true);
});

treeExpandBtn.addEventListener('click', () => {
  setTreeCollapsed(false);
});

// グリッドパネル折りたたみ
const gridCollapseBtn = document.getElementById('gridCollapseBtn');
const gridExpandBtn = document.getElementById('gridExpandBtn');
let gridCollapsed = false;

function setGridCollapsed(collapsed) {
  gridCollapsed = collapsed;
  gridPanel.classList.toggle('collapsed', collapsed);
  gridResizer.classList.toggle('hidden', collapsed);
  gridExpandBtn.classList.toggle('hidden', !collapsed);
}

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
    currentFolder = folder;
    document.getElementById('currentPath').textContent = folder;
    await loadTree(folder);
  }
});

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
  document.getElementById('videoName').textContent = videoName;

  // 既存のVAMインスタンスを破棄
  if (vamInstance) {
    vamInstance.destroy();
    vamInstance = null;
  }
}

// 動画メタデータ読み込み完了時にVAM Seekを初期化
video.addEventListener('loadedmetadata', () => {
  if (typeof VAMSeek !== 'undefined') {
    vamInstance = VAMSeek.init({
      video: video,
      container: gridContainer,
      columns: parseInt(document.getElementById('columnsSelect').value),
      secondsPerCell: parseInt(document.getElementById('secondsSelect').value),
      onSeek: (time, cell) => {
        console.log(`Seeked to ${time.toFixed(2)}s`);
      },
      onError: (err) => {
        console.error('VAMSeek error:', err);
      }
    });
  }
});

// グリッド設定変更
document.getElementById('columnsSelect').addEventListener('change', (e) => {
  if (vamInstance) {
    vamInstance.configure({ columns: parseInt(e.target.value) });
  }
});

document.getElementById('secondsSelect').addEventListener('change', (e) => {
  if (vamInstance) {
    vamInstance.configure({ secondsPerCell: parseInt(e.target.value) });
  }
});
