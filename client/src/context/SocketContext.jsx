import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

const getSocketUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return url.replace(/\/api\/?$/, '');
};

const SOCKET_URL = getSocketUrl();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  const currentDocIdRef = useRef(null);

  // Initialize Socket connection when user session is active
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected to server:', socketInstance.id);
      
      // If we disconnected and reconnected, re-join the active document room
      if (currentDocIdRef.current) {
        socketInstance.emit('join-document', { documentId: currentDocIdRef.current });
      }
    });

    socketInstance.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[Socket] Disconnected from server:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      setConnected(false);
      console.error('[Socket] Connection or Auth error:', error.message);
      if (error.message.includes('Authentication error')) {
        showToast('Socket Authentication failed. Session might be expired.', 'error');
      }
    });

    // Handle presence and event broadcasts
    socketInstance.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    socketInstance.on('user-joined', (joinedUser) => {
      showToast(`${joinedUser.fullName} joined this document`, 'info');
    });

    socketInstance.on('user-left', (leftUser) => {
      showToast(`${leftUser.fullName} left this document`, 'info');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  // Operations: Join document room
  const joinDocument = (documentId, clientID = null) => {
    if (!socket) return;
    
    // If transitioning documents, leave the old one first
    if (currentDocIdRef.current && currentDocIdRef.current !== documentId) {
      leaveDocument(currentDocIdRef.current);
    }

    currentDocIdRef.current = documentId;
    socket.emit('join-document', { documentId, clientID });
  };

  // Operations: Leave document room
  const leaveDocument = (documentId) => {
    if (!socket) return;
    socket.emit('leave-document', { documentId });
    if (currentDocIdRef.current === documentId) {
      currentDocIdRef.current = null;
    }
    setOnlineUsers([]);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        onlineUsers,
        joinDocument,
        leaveDocument
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
