// AI Service - Claude API integration
const Anthropic = require('@anthropic-ai/sdk');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let client = null;
let apiKey = null;
let currentModel = 'claude-sonnet-4-5-20250929';

// Conversation state for prompt caching
let conversationHistory = [];  // Array of {role, content} messages
let cachedVideoHash = null;    // Hash of current video (to detect video change)
let cachedSystemPrompt = null; // System prompt for current conversation

// Phase state for zoom flow
// 'normal' | 'zoom_asking' | 'zoom_waiting'
let currentPhase = 'normal';

// Auto-zoom protection
const MAX_ZOOM_DEPTH = 2;  // Maximum auto-zoom requests per conversation
let zoomCount = 0;         // Current zoom count in session

// Settings file path
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'ai-settings.json');
}

// Load settings from file
function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load AI settings:', err);
  }
  return null;
}

// Save settings to file
function saveSettings() {
  try {
    const settingsPath = getSettingsPath();
    const data = JSON.stringify({
      apiKey: apiKey,
      model: currentModel
    }, null, 2);
    fs.writeFileSync(settingsPath, data, 'utf8');
  } catch (err) {
    console.error('Failed to save AI settings:', err);
  }
}

// Initialize from saved settings (call on app start)
function initFromSaved() {
  const settings = loadSettings();
  if (settings) {
    if (settings.apiKey) {
      apiKey = settings.apiKey;
      client = new Anthropic({ apiKey: settings.apiKey });
    }
    if (settings.model) {
      currentModel = settings.model;
    }
  }
}

// Initialize Anthropic client
function init(key, model) {
  apiKey = key;
  client = new Anthropic({ apiKey: key });
  if (model) {
    currentModel = model;
  }
  // Save to file
  saveSettings();
}

// Check if API is configured
function isConfigured() {
  return client !== null && apiKey !== null;
}

// Get current model
function getModel() {
  return currentModel;
}

// Set model
function setModel(model) {
  currentModel = model;
  // Save to file
  saveSettings();
}

// Get API key (for settings display)
function getApiKey() {
  return apiKey;
}

// Generate hash for video identification
function getVideoHash(gridData) {
  if (!gridData) return null;
  // Use video name + duration as unique identifier
  const identifier = `${gridData.videoName || ''}_${gridData.duration || 0}`;
  return crypto.createHash('md5').update(identifier).digest('hex');
}

// Clear conversation (call when video changes)
function clearConversation() {
  conversationHistory = [];
  cachedVideoHash = null;
  cachedSystemPrompt = null;
  currentPhase = 'normal';
  zoomCount = 0;  // Reset zoom counter
}

// Check if auto-zoom is allowed
function canAutoZoom() {
  return zoomCount < MAX_ZOOM_DEPTH;
}

// Increment zoom count (call when zoom is performed)
function incrementZoomCount() {
  zoomCount++;
  console.log(`[AI] Zoom count: ${zoomCount}/${MAX_ZOOM_DEPTH}`);
  return zoomCount;
}

// Set phase
function setPhase(phase) {
  currentPhase = phase;
  console.log(`[AI] Phase changed to: ${phase}`);
}

// Get current phase
function getPhase() {
  return currentPhase;
}

// Remove old zoom images from conversation history (sliding window)
// Keeps only the most recent zoom image to prevent context explosion
function pruneOldZoomImages() {
  // Find all messages containing zoom images (have [ZOOM: prefix in text)
  const zoomIndices = [];
  for (let i = 0; i < conversationHistory.length; i++) {
    const msg = conversationHistory[i];
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      // Check if this is a zoom message
      const hasZoomImage = msg.content.some(c => c.type === 'image');
      const hasZoomText = msg.content.some(c => c.type === 'text' && c.text && c.text.startsWith('[ZOOM:'));
      if (hasZoomImage && hasZoomText) {
        zoomIndices.push(i);
      }
    }
  }

  // Keep only the last zoom image, remove older ones
  // But keep the text, just remove the image
  if (zoomIndices.length > 1) {
    for (let i = 0; i < zoomIndices.length - 1; i++) {
      const idx = zoomIndices[i];
      const msg = conversationHistory[idx];
      // Replace image with text description
      const textContent = msg.content.find(c => c.type === 'text');
      if (textContent) {
        conversationHistory[idx] = {
          role: 'user',
          content: textContent.text + '\n[Image removed - see latest zoom]'
        };
      }
    }
    console.log(`[AI] Pruned ${zoomIndices.length - 1} old zoom image(s) from context`);
  }
}

// Build phase-specific system prompt
function buildSystemPrompt(gridData, phase, allowAutoZoom = false) {
  // Calculate video duration in minutes
  const durationMin = gridData ? Math.ceil(gridData.duration / 60) : 0;
  const totalCells = gridData?.totalCells || 0;
  const secPerCell = gridData?.secondsPerCell || 0;

  if (phase === 'zoom_asking') {
    return `動画のどの部分をズームしますか？時間を聞いてください。`;
  }

  if (phase === 'zoom_waiting') {
    return `ユーザーの回答から時間範囲を抽出し、[ZOOM_REQUEST:M:SS-M:SS]形式のみ出力。他は何も出力しない。`;
  }

  // Normal phase - clearly state video duration and grid structure
  let prompt = `${durationMin}分の動画。${totalCells}枚のフレーム、各${secPerCell}秒間隔。
各フレーム左下にタイムスタンプ表示。
回答はM:SS形式のみ（例: 1:07, 12:30）。「付近」「頃」禁止。
List timestamps in chronological order.`;

  // Add auto-zoom capability if allowed
  if (allowAutoZoom) {
    prompt += `
If you need higher resolution to answer accurately, output [ZOOM_AUTO:M:SS-M:SS] at the END of your response. Only use this for specific time ranges (max 2 min span). Do not zoom if the current grid is sufficient.`;
  }

  return prompt;
}

// Analyze video grid with Claude Vision (with prompt caching)
async function analyzeGrid(userMessage, gridData, overridePhase = null) {
  if (!isConfigured()) {
    throw new Error('API key not configured. Go to AI > Settings to set your Anthropic API key.');
  }

  // Check if video changed - if so, clear conversation
  const currentVideoHash = getVideoHash(gridData);
  if (currentVideoHash !== cachedVideoHash) {
    clearConversation();
    cachedVideoHash = currentVideoHash;
  }

  // Use override phase if provided, otherwise use current phase
  const effectivePhase = overridePhase || currentPhase;
  // Allow auto-zoom only if under limit and in normal phase
  const allowAutoZoom = canAutoZoom() && effectivePhase === 'normal';
  const systemPrompt = buildSystemPrompt(gridData, effectivePhase, allowAutoZoom);

  cachedSystemPrompt = systemPrompt;

  // Build message content for this turn
  let newUserContent;
  const isFirstMessage = conversationHistory.length === 0;

  if (isFirstMessage && gridData && gridData.gridImage) {
    // First message: include grid image with "jab" instruction
    // This primes the AI to understand its role before receiving the actual question
    const durationMin = Math.ceil(gridData.duration / 60);
    const totalCells = gridData.totalCells || 0;
    const jabText = `${durationMin}分の動画のグリッド画像（${totalCells}フレーム）。各フレーム左下にタイムスタンプ。\n\n質問: ${userMessage}`;

    newUserContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: gridData.gridImage
        },
        cache_control: { type: 'ephemeral' }  // Enable prompt caching
      },
      {
        type: 'text',
        text: jabText
      }
    ];
  } else if (isFirstMessage) {
    // First message but no image
    newUserContent = `[No grid image available]\n\n${userMessage}`;
  } else {
    // Follow-up message: text only (image is cached)
    newUserContent = userMessage;
  }

  // Add user message to history
  conversationHistory.push({ role: 'user', content: newUserContent });

  try {
    const response = await client.messages.create({
      model: currentModel,
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' }  // Cache system prompt too
        }
      ],
      messages: conversationHistory
    });

    const aiMessage = response.content[0].text;

    // Add assistant response to history
    conversationHistory.push({ role: 'assistant', content: aiMessage });

    // Log cache performance
    if (response.usage) {
      const cacheRead = response.usage.cache_read_input_tokens || 0;
      const cacheWrite = response.usage.cache_creation_input_tokens || 0;
      const inputTokens = response.usage.input_tokens || 0;
      console.log(`[AI] Tokens - Input: ${inputTokens}, Cache read: ${cacheRead}, Cache write: ${cacheWrite}`);
    }

    // Extract cell references if any (simple pattern matching)
    const cellPattern = /cell\s*(\d+)/gi;

    const cells = [];
    let match;
    while ((match = cellPattern.exec(aiMessage)) !== null) {
      cells.push(parseInt(match[1]));
    }

    return {
      message: aiMessage,
      cells: cells,
      cached: !isFirstMessage  // Indicate if this used cached context
    };
  } catch (err) {
    console.error('AI API error:', err);
    throw new Error(`AI request failed: ${err.message}`);
  }
}

// Analyze zoomed grid (higher resolution for specific time range)
// Uses sliding window: replaces previous zoom image to prevent context explosion
async function analyzeZoomGrid(userMessage, zoomGridData) {
  if (!isConfigured()) {
    throw new Error('API key not configured. Go to AI > Settings to set your Anthropic API key.');
  }

  if (!zoomGridData || !zoomGridData.gridImage) {
    throw new Error('No zoom grid data available');
  }

  // Build zoom-specific system prompt (simple)
  const zoomStart = formatTime(zoomGridData.zoomRange.start);
  const zoomEnd = formatTime(zoomGridData.zoomRange.end);
  const totalCells = zoomGridData.totalCells || 0;
  const secPerCell = zoomGridData.secondsPerCell.toFixed(1);

  const systemPrompt = `ズーム: ${zoomStart}-${zoomEnd}。${totalCells}枚、各${secPerCell}秒間隔。
各フレーム左下にタイムスタンプ表示。
回答はM:SS形式のみ。「付近」「頃」禁止。`;

  // Prune old zoom images before adding new one (sliding window)
  pruneOldZoomImages();

  // Build message with zoom image - include "jab" to prime AI
  const jabText = `ズーム: ${zoomStart}-${zoomEnd}のグリッド画像（${totalCells}フレーム）。各フレーム左下にタイムスタンプ。\n\n質問: ${userMessage}`;

  const zoomUserContent = [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: zoomGridData.gridImage
      }
    },
    {
      type: 'text',
      text: jabText
    }
  ];

  // Add to conversation history
  conversationHistory.push({ role: 'user', content: zoomUserContent });

  try {
    const response = await client.messages.create({
      model: currentModel,
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: systemPrompt
        }
      ],
      messages: conversationHistory
    });

    const aiMessage = response.content[0].text;

    // Add assistant response to history
    conversationHistory.push({ role: 'assistant', content: aiMessage });

    // Log usage
    if (response.usage) {
      const inputTokens = response.usage.input_tokens || 0;
      console.log(`[AI Zoom] Tokens - Input: ${inputTokens}`);
    }

    return {
      message: aiMessage,
      cells: [],
      isZoom: true,
      zoomRange: zoomGridData.zoomRange
    };
  } catch (err) {
    console.error('AI API error (zoom):', err);
    throw new Error(`AI request failed: ${err.message}`);
  }
}

// Helper to format seconds as M:SS
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

module.exports = {
  init,
  initFromSaved,
  isConfigured,
  getModel,
  setModel,
  getApiKey,
  analyzeGrid,
  analyzeZoomGrid,
  clearConversation,
  setPhase,
  getPhase,
  canAutoZoom,
  incrementZoomCount
};
