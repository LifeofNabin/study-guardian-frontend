/**
 * FILE PATH: frontend/src/services/socket.js
 * * Socket.IO client configuration and singleton management.
 * Handles authentication for WebSocket connection.
 */

import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

let socket = null;

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

  socket.on('connect', () => console.log('⚡️ Socket connected. ID:', socket.id));
  socket.on('disconnect', reason => console.log('🔌 Socket disconnected. Reason:', reason));
  socket.on('connect_error', err => console.error('❌ Socket connection error:', err.message));
  socket.on('auth_error', data => console.error('❌ Socket Authentication Error:', data.message));

  return socket;
};

export const getSocket = () => socket || initializeSocket();

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
