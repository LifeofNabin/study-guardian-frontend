// FILE: frontend/src/services/socketService.js
// ✅ ENHANCED: Socket utility with highlights support

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
let socket = null;

/**
 * Initialize socket connection
 */
export const initializeSocket = () => {
  if (socket) {
    if (socket.disconnected) socket.connect();
    return socket;
  }

  const token = localStorage.getItem('token');
  
  socket = io(SOCKET_URL, {
    path: '/socket.io',
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  });

  // Connection events
  socket.on('connect', () => {
    console.log('⚡️ Socket connected. ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected. Reason:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message);
  });

  return socket;
};

/**
 * Get current socket instance
 */
export const getSocket = () => socket || initializeSocket();

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = () => {
  return socket && socket.connected;
};

// ==========================================
// SESSION MANAGEMENT
// ==========================================

/**
 * Start study session
 */
export const startStudySession = (data) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('start-study-session', data);
    console.log('📤 Emitted: start-study-session', data);
  }
};

/**
 * Join a session
 */
export const joinSession = (sessionId) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('join-session', { sessionId });
    console.log('📤 Emitted: join-session', sessionId);
  }
};

/**
 * Leave a session
 */
export const leaveSession = (sessionId) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('leave-session', { sessionId });
    console.log('📤 Emitted: leave-session', sessionId);
  }
};

/**
 * End study session
 */
export const endStudySession = (sessionId) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('end-study-session', { sessionId });
    console.log('📤 Emitted: end-study-session', sessionId);
  }
};

// ==========================================
// METRICS & MONITORING
// ==========================================

/**
 * Send webcam metrics
 */
export const sendMetrics = (metrics) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('metrics', metrics);
    // console.log('📤 Emitted: metrics', metrics); // Uncomment for debugging
  }
};

/**
 * Send page change event
 */
export const sendPageChange = (data) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('page-change', data);
    console.log('📤 Emitted: page-change', data);
  }
};

// ==========================================
// HIGHLIGHTS (NOTIFICATIONS ONLY)
// ==========================================

/**
 * Notify about highlight creation (after HTTP save)
 * NOTE: This is just for real-time notifications to other users
 * The actual save happens via HTTP API
 */
export const notifyHighlightCreated = (data) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('highlight-created', {
      text: data.text?.substring(0, 100), // Send preview only
      page: data.page,
      color: data.color,
      timestamp: Date.now()
    });
    console.log('📤 Emitted: highlight-created notification', {
      page: data.page,
      textPreview: data.text?.substring(0, 50)
    });
  }
};

/**
 * Listen for new highlights from other users
 */
export const onNewHighlight = (callback) => {
  const s = getSocket();
  if (s) {
    s.on('new-highlight', (data) => {
      console.log('📥 Received: new-highlight', data);
      callback(data);
    });
  }
};

/**
 * Stop listening for new highlights
 */
export const offNewHighlight = () => {
  const s = getSocket();
  if (s) {
    s.off('new-highlight');
  }
};

// ==========================================
// INTERACTION TRACKING
// ==========================================

/**
 * Send interaction event
 */
export const sendInteraction = (type, data) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('interaction', { type, data });
    console.log('📤 Emitted: interaction', { type, data });
  }
};

/**
 * Send batch interactions
 */
export const sendBatchInteractions = (interactions) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('batch-interactions', { interactions });
    console.log('📤 Emitted: batch-interactions', interactions.length);
  }
};

// ==========================================
// EVENT LISTENERS
// ==========================================

/**
 * Listen for session updates
 */
export const onSessionUpdate = (callback) => {
  const s = getSocket();
  if (s) {
    s.on('session-update', (data) => {
      console.log('📥 Received: session-update', data);
      callback(data);
    });
  }
};

/**
 * Listen for highlight saved confirmation
 */
export const onHighlightSaved = (callback) => {
  const s = getSocket();
  if (s) {
    s.on('highlight-saved', (data) => {
      console.log('📥 Received: highlight-saved', data);
      callback(data);
    });
  }
};

/**
 * Listen for highlight errors
 */
export const onHighlightError = (callback) => {
  const s = getSocket();
  if (s) {
    s.on('highlight-error', (data) => {
      console.error('📥 Received: highlight-error', data);
      callback(data);
    });
  }
};

/**
 * Listen for metrics acknowledgment
 */
export const onMetricsAck = (callback) => {
  const s = getSocket();
  if (s) {
    s.on('metrics-ack', (data) => {
      console.log('📥 Received: metrics-ack', data);
      callback(data);
    });
  }
};

/**
 * Remove all event listeners
 */
export const removeAllListeners = () => {
  const s = getSocket();
  if (s) {
    s.removeAllListeners();
    console.log('🧹 Removed all socket listeners');
  }
};

// ==========================================
// ROOM MANAGEMENT (For Teachers/Admins)
// ==========================================

/**
 * Join a room (for teachers monitoring)
 */
export const joinRoom = (roomId) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('join-room', { roomId });
    console.log('📤 Emitted: join-room', roomId);
  }
};

/**
 * Leave a room
 */
export const leaveRoom = (roomId) => {
  const s = getSocket();
  if (s?.connected) {
    s.emit('leave-room', { roomId });
    console.log('📤 Emitted: leave-room', roomId);
  }
};

/**
 * Listen for room updates
 */
export const onRoomUpdate = (callback) => {
  const s = getSocket();
  if (s) {
    s.on('room-update', (data) => {
      console.log('📥 Received: room-update', data);
      callback(data);
    });
  }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get connection status
 */
export const getConnectionStatus = () => {
  if (!socket) return 'not-initialized';
  if (socket.connected) return 'connected';
  if (socket.disconnected) return 'disconnected';
  return 'unknown';
};

/**
 * Manually reconnect
 */
export const reconnect = () => {
  if (socket) {
    socket.connect();
    console.log('🔄 Attempting to reconnect socket...');
  } else {
    initializeSocket();
  }
};

/**
 * Get socket ID
 */
export const getSocketId = () => {
  return socket?.id || null;
};

// ==========================================
// EXPORT DEFAULT OBJECT
// ==========================================

export default {
  // Initialization
  initializeSocket,
  getSocket,
  disconnectSocket,
  isSocketConnected,
  
  // Session
  startStudySession,
  joinSession,
  leaveSession,
  endStudySession,
  
  // Metrics
  sendMetrics,
  sendPageChange,
  
  // Highlights
  notifyHighlightCreated,
  onNewHighlight,
  offNewHighlight,
  onHighlightSaved,
  onHighlightError,
  
  // Interactions
  sendInteraction,
  sendBatchInteractions,
  
  // Event Listeners
  onSessionUpdate,
  onMetricsAck,
  removeAllListeners,
  
  // Room Management
  joinRoom,
  leaveRoom,
  onRoomUpdate,
  
  // Utilities
  getConnectionStatus,
  reconnect,
  getSocketId
};