/**
 * Native app state — electron-store
 * Persists: gateway URL, auth token, preferences, last chat messages.
 */
const Store = require('electron-store');

const store = new Store({ name: 'hyperclaw-macos' });

const DEFAULTS = {
  gatewayUrl: 'http://localhost:18789',
  authToken: '',
  launchAtLogin: false,
  notifications: true,
  chatMessages: [],
  lastSessionId: null,
  modelId: '',
  thinkingLevel: 'none'
};

function get(key) {
  return store.get(key, DEFAULTS[key]);
}

function set(key, val) {
  store.set(key, val);
}

function getGatewayUrl() {
  const u = get('gatewayUrl') || DEFAULTS.gatewayUrl;
  return u.replace(/\/$/, '');
}

function getWsUrl() {
  return getGatewayUrl().replace(/^http/, 'ws');
}

function getAuthToken() {
  return get('authToken') || '';
}

function getChatMessages() {
  const msgs = get('chatMessages');
  return Array.isArray(msgs) ? msgs : [];
}

function setChatMessages(msgs) {
  const limited = Array.isArray(msgs) ? msgs.slice(-200) : [];
  set('chatMessages', limited);
}

function appendChatMessage(msg) {
  const msgs = getChatMessages();
  msgs.push(msg);
  setChatMessages(msgs);
}

function getModelId() {
  return get('modelId') || '';
}

function setModelId(val) {
  set('modelId', val);
}

function getThinkingLevel() {
  return get('thinkingLevel') || 'none';
}

function setThinkingLevel(val) {
  set('thinkingLevel', val);
}

module.exports = {
  get,
  set,
  getGatewayUrl,
  getWsUrl,
  getAuthToken,
  getChatMessages,
  setChatMessages,
  appendChatMessage,
  getModelId,
  setModelId,
  getThinkingLevel,
  setThinkingLevel,
  DEFAULTS
};
