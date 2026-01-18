// Chat window logic
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const connectionStatus = document.getElementById('connectionStatus');

// Zoom state - tracked locally for UI feedback
let isZoomWaiting = false;  // Waiting for user to specify zoom range

// Send message
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  chatInput.value = '';
  sendBtn.disabled = true;

  const loadingEl = showLoading();

  try {
    // Check current phase
    const currentPhase = await window.electronAPI.getAIPhase();

    if (currentPhase === 'zoom_waiting') {
      // Phase 3: User specified zoom range, AI extracts it
      const response = await window.electronAPI.sendChatMessage(text);
      loadingEl.remove();

      // Check for ZOOM_REQUEST in response
      const zoomMatch = response.message.match(/\[ZOOM_REQUEST:(\d+:\d{2})-(\d+:\d{2})\]/);

      if (zoomMatch) {
        const startTime = parseTimestamp(zoomMatch[1]);
        const endTime = parseTimestamp(zoomMatch[2]);

        // Reset phase to normal
        await window.electronAPI.setAIPhase('normal');
        isZoomWaiting = false;
        updateZoomButton();

        // Execute zoom
        await executeZoom(startTime, endTime);
      } else {
        // AI didn't understand, show response and stay in zoom_waiting
        addMessage(response.message, 'ai');
      }
    } else {
      // Normal phase: regular question
      const response = await window.electronAPI.sendChatMessage(text);
      loadingEl.remove();
      addMessage(response.message, 'ai');
    }

  } catch (err) {
    loadingEl.remove();
    addMessage(`Error: ${err.message}`, 'system');
    // Reset phase on error
    await window.electronAPI.setAIPhase('normal');
    isZoomWaiting = false;
    updateZoomButton();
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// Execute zoom (capture grid and send to AI)
async function executeZoom(startTime, endTime) {
  const loadingEl = showLoading();

  try {
    const response = await window.electronAPI.sendZoomChatMessage(
      'Analyze this zoomed range in detail.',
      startTime,
      endTime
    );

    loadingEl.remove();
    addMessage(response.message, 'ai');
  } catch (err) {
    loadingEl.remove();
    addMessage(`Zoom error: ${err.message}`, 'system');
  }
}

// Zoom button - start zoom dialog with phase management
async function startZoomDialog() {
  // Phase 1: Set phase to zoom_asking
  await window.electronAPI.setAIPhase('zoom_asking');

  addMessage('Zoom', 'user');
  sendBtn.disabled = true;
  const loadingEl = showLoading();

  try {
    // AI will ask which part to zoom (zoom_asking phase)
    const response = await window.electronAPI.sendChatMessage(
      'User wants to zoom. Ask which part.'
    );

    loadingEl.remove();
    addMessage(response.message, 'ai');

    // Phase 2: Now waiting for user to specify range
    await window.electronAPI.setAIPhase('zoom_waiting');
    isZoomWaiting = true;
    updateZoomButton();

  } catch (err) {
    loadingEl.remove();
    addMessage(`Error: ${err.message}`, 'system');
    await window.electronAPI.setAIPhase('normal');
    isZoomWaiting = false;
    updateZoomButton();
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// Update zoom button appearance based on state
function updateZoomButton() {
  const zoomBtn = document.getElementById('zoomBtn');
  if (isZoomWaiting) {
    zoomBtn.style.background = '#7c5cff';
    zoomBtn.style.color = 'white';
    zoomBtn.title = 'Waiting for zoom range...';
  } else {
    zoomBtn.style.background = '#0f3460';
    zoomBtn.style.color = '#7c5cff';
    zoomBtn.title = 'Zoom to time range';
  }
}

// Cancel zoom mode
async function cancelZoom() {
  await window.electronAPI.setAIPhase('normal');
  isZoomWaiting = false;
  updateZoomButton();
  addMessage('Zoom cancelled.', 'system');
}

// Format seconds to M:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Parse timestamp string to seconds
function parseTimestamp(timeStr) {
  const parts = timeStr.split(/[:時間分秒]/).filter(p => p !== '');
  if (parts.length === 3) {
    // HH:MM:SS or X時間Y分Z秒
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS or X分Y秒
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 1) {
    // Just seconds
    return parseInt(parts[0]);
  }
  return 0;
}

// Convert timestamps in text to clickable links
function linkifyTimestamps(text) {
  let result = text;

  // Process range patterns first (e.g., "0-3分", "15-20分")
  result = result.replace(/(\d+)[-〜~](\d+)(分|秒)(あたり|頃)?/g, (match, start, end, unit) => {
    const multiplier = unit === '分' ? 60 : 1;
    const startSec = parseInt(start) * multiplier;
    return `<a href="#" class="timestamp-link" data-seconds="${startSec}">${match}</a>`;
  });

  // Process hour-minute ranges (e.g., "1時間30分-2時間")
  result = result.replace(/(\d+)時間(\d+)?分?[-〜~](\d+)時間(\d+)?分?/g, (match, h1, m1) => {
    const startSec = parseInt(h1) * 3600 + (parseInt(m1) || 0) * 60;
    return `<a href="#" class="timestamp-link" data-seconds="${startSec}">${match}</a>`;
  });

  // Process standalone hour-minute (e.g., "1時間30分") - avoid already linked
  result = result.replace(/(?<!data-seconds="\d+">)(\d+)時間(\d+)?分?(?![^<]*<\/a>)/g, (match, hours, mins) => {
    const seconds = parseInt(hours) * 3600 + (parseInt(mins) || 0) * 60;
    return `<a href="#" class="timestamp-link" data-seconds="${seconds}">${match}</a>`;
  });

  // Process standard timestamps (e.g., "1:23:45", "12:34") - avoid already linked
  result = result.replace(/(?<!data-seconds="\d+">)(\d{1,2}):(\d{2})(:(\d{2}))?(?![^<]*<\/a>)/g, (match, p1, p2, p3, p4) => {
    let seconds;
    if (p4 !== undefined) {
      // HH:MM:SS
      seconds = parseInt(p1) * 3600 + parseInt(p2) * 60 + parseInt(p4);
    } else {
      // MM:SS
      seconds = parseInt(p1) * 60 + parseInt(p2);
    }
    return `<a href="#" class="timestamp-link" data-seconds="${seconds}">${match}</a>`;
  });

  return result;
}

// Add message to chat
function addMessage(text, type) {
  const msgEl = document.createElement('div');
  msgEl.className = `message ${type}`;

  // For AI messages, convert timestamps to clickable links
  if (type === 'ai') {
    msgEl.innerHTML = linkifyTimestamps(text);
    // Add click handlers for timestamp links
    msgEl.querySelectorAll('.timestamp-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const seconds = parseInt(link.dataset.seconds);
        window.electronAPI.seekToTimestamp(seconds);
      });
    });
  } else {
    msgEl.textContent = text;
  }

  if (type !== 'system') {
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    msgEl.appendChild(timestamp);
  }

  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show loading indicator
function showLoading() {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'message ai loading';
  loadingEl.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(loadingEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return loadingEl;
}

// Event listeners
sendBtn.addEventListener('click', () => sendMessage());

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  // ESC to cancel zoom mode
  if (e.key === 'Escape' && isZoomWaiting) {
    cancelZoom();
  }
});

// Zoom button
const zoomBtn = document.getElementById('zoomBtn');
zoomBtn.addEventListener('click', () => {
  if (isZoomWaiting) {
    // Already waiting - cancel
    cancelZoom();
  } else {
    startZoomDialog();
  }
});

// Focus input on load
chatInput.focus();
