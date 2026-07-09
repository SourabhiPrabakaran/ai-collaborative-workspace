import jwt from 'jsonwebtoken';
import * as Y from 'yjs';
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror';
import { Schema } from 'prosemirror-model';
import * as awarenessProtocol from 'y-protocols/awareness';
import User from './models/User.js';
import Document from './models/Document.js';
import VersionHistory from './models/VersionHistory.js';
import { logActivity } from './utils/activityLogger.js';

// 1. Define server-side ProseMirror schema to parse and serialize TipTap JSON
const docSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      content: 'inline*',
      group: 'block',
      parseDOM: [{ tag: 'p' }],
      toDOM() { return ['p', 0]; }
    },
    text: {
      group: 'inline'
    },
    heading: {
      attrs: { level: { default: 1 } },
      content: 'inline*',
      group: 'block',
      defining: true,
      parseDOM: [
        { tag: 'h1', attrs: { level: 1 } },
        { tag: 'h2', attrs: { level: 2 } },
        { tag: 'h3', attrs: { level: 3 } }
      ],
      toDOM(node) { return ['h' + node.attrs.level, 0]; }
    },
    blockquote: {
      content: 'block+',
      group: 'block',
      defining: true,
      parseDOM: [{ tag: 'blockquote' }],
      toDOM() { return ['blockquote', 0]; }
    },
    code_block: {
      content: 'text*',
      group: 'block',
      code: true,
      defining: true,
      parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
      toDOM() { return ['pre', ['code', 0]]; }
    },
    horizontal_rule: {
      group: 'block',
      parseDOM: [{ tag: 'hr' }],
      toDOM() { return ['hr']; }
    },
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ul' }],
      toDOM() { return ['ul', 0]; }
    },
    ordered_list: {
      attrs: { order: { default: 1 } },
      content: 'list_item+',
      group: 'block',
      parseDOM: [{ tag: 'ol' }],
      toDOM(node) { return node.attrs.order === 1 ? ['ol', 0] : ['ol', { start: node.attrs.order }, 0]; }
    },
    list_item: {
      content: 'paragraph block*',
      defining: true,
      parseDOM: [{ tag: 'li' }],
      toDOM() { return ['li', 0]; }
    }
  },
  marks: {
    bold: {
      parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
      toDOM() { return ['strong']; }
    },
    italic: {
      parseDOM: [{ tag: 'em' }, { tag: 'i' }],
      toDOM() { return ['em']; }
    },
    underline: {
      parseDOM: [{ tag: 'u' }],
      toDOM() { return ['u']; }
    },
    strike: {
      parseDOM: [{ tag: 's' }, { tag: 'del' }],
      toDOM() { return ['s']; }
    },
    code: {
      parseDOM: [{ tag: 'code' }],
      toDOM() { return ['code']; }
    }
  }
});

// In-memory cookie parser
const parseCookies = (cookieString) => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((acc, curr) => {
    const [key, value] = curr.split('=').map(c => c.trim());
    if (key && value) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});
};

// In-memory presence map: documentId -> Array of socket user states { socketId, userId, fullName, email }
const presenceMap = new Map();

// In-memory Yjs sessions: documentId -> { ydoc, awareness, userCount, saveTimeout }
const yjsSessions = new Map();

let ioInstance = null;

export const sendLiveNotification = (userId, notification) => {
  if (ioInstance) {
    ioInstance.to(`user:${userId.toString()}`).emit('notification', notification);
  }
};

export const initSocket = (io) => {
  ioInstance = io;
  // Socket.io Authentication Middleware via secure HTTP-only cookie JWT
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      const token = cookies.token;

      if (!token) {
        return next(new Error('Authentication error: HTTP token cookie not found'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('Authentication error: User record not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired session token'));
    }
  });

  // Auto-snapshot creator with duplicate prevention and 10-minute cooldown
  const createAutoSnapshot = async (docId, contentJson, userId) => {
    try {
      const latest = await VersionHistory.findOne({ document: docId }).sort({ createdAt: -1 });
      const COOLDOWN_MS = 10 * 60 * 1000;

      if (latest) {
        const timeDiff = Date.now() - new Date(latest.createdAt).getTime();
        const contentUnchanged = JSON.stringify(contentJson) === JSON.stringify(latest.content);
        if (contentUnchanged || timeDiff < COOLDOWN_MS) {
          return;
        }
      }

      const docRecord = await Document.findById(docId);
      if (!docRecord) return;

      const versionCount = await VersionHistory.countDocuments({ document: docId });
      const versionNumber = versionCount + 1;

      await VersionHistory.create({
        document: docId,
        content: contentJson,
        createdBy: userId,
        version: versionNumber,
        description: 'Auto-saved snapshot'
      });

      await logActivity({
        workspace: docRecord.workspace,
        document: docId,
        user: userId,
        type: 'VERSION_CREATED',
        details: { versionNumber, autoSaved: true }
      });

      console.log(`[VersionHistory] Auto-created snapshot v${versionNumber} for document ${docId}`);
    } catch (err) {
      console.error('[VersionHistory] Error creating auto-snapshot:', err.message);
    }
  };

  // Helper function to persist a Y.Doc to MongoDB
  const persistDocState = async (docId, session) => {
    try {
      const contentJson = yDocToProsemirrorJSON(session.ydoc, 'default');
      await Document.findByIdAndUpdate(docId, { content: contentJson });
      console.log(`[Yjs] Successfully saved document ${docId} to MongoDB`);

      if (session.lastEditBy) {
        await createAutoSnapshot(docId, contentJson, session.lastEditBy);
      }
    } catch (err) {
      console.error(`[Yjs] Failed to save document ${docId} to MongoDB:`, err.message);
    }
  };

  // Helper function to manage users leaving document rooms
  const handleLeaveRoom = async (socket, docId) => {
    socket.leave(docId);

    if (presenceMap.has(docId)) {
      let usersInDoc = presenceMap.get(docId);
      usersInDoc = usersInDoc.filter((u) => u.socketId !== socket.id);
      
      if (usersInDoc.length === 0) {
        presenceMap.delete(docId);
      } else {
        presenceMap.set(docId, usersInDoc);
        
        socket.to(docId).emit('user-left', {
          socketId: socket.id,
          userId: socket.user._id.toString(),
          fullName: socket.user.fullName
        });

        const uniqueUsers = Array.from(
          new Map(usersInDoc.map(u => [u.userId, { userId: u.userId, fullName: u.fullName, email: u.email }])).values()
        );
        io.to(docId).emit('online-users', uniqueUsers);
      }
    }

    // Manage Yjs Document Session lifetimes
    const session = yjsSessions.get(docId);
    if (session) {
      // 1. Clean Yjs awareness details
      if (socket.yjsClientID && session.awareness) {
        try {
          awarenessProtocol.removeAwarenessStates(session.awareness, [socket.yjsClientID], socket);
          socket.to(docId).emit('yjs-awareness-remove', { documentId: docId, clientIds: [socket.yjsClientID] });
        } catch (err) {
          console.error('[Yjs] Awareness removal error:', err.message);
        }
      }

      // 2. Decrement session user count
      session.userCount -= 1;
      
      if (session.userCount <= 0) {
        if (session.saveTimeout) {
          clearTimeout(session.saveTimeout);
        }
        
        await persistDocState(docId, session);
        yjsSessions.delete(docId);
        console.log(`[Yjs] Disposed document from memory: ${docId}`);
      }
    }
  };

  // Connection Listener
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[Socket.io] Authenticated user connected: ${socket.user.fullName} (${socket.id})`);
    
    // Join personal user room for targeted notifications
    socket.join(`user:${userId}`);

    // Event: User joins document room
    socket.on('join-document', async ({ documentId, clientID }) => {
      if (!documentId) return;

      socket.documentId = documentId;
      if (clientID) {
        socket.yjsClientID = clientID;
      }
      socket.join(documentId);

      // 1. Maintain Presence Map
      if (!presenceMap.has(documentId)) {
        presenceMap.set(documentId, []);
      }
      
      const usersInDoc = presenceMap.get(documentId);
      if (!usersInDoc.some(u => u.socketId === socket.id)) {
        usersInDoc.push({
          socketId: socket.id,
          userId: socket.user._id.toString(),
          fullName: socket.user.fullName,
          email: socket.user.email
        });
      }

      socket.to(documentId).emit('user-joined', {
        socketId: socket.id,
        userId: socket.user._id.toString(),
        fullName: socket.user.fullName,
        email: socket.user.email
      });

      const uniqueUsers = Array.from(
        new Map(usersInDoc.map(u => [u.userId, { userId: u.userId, fullName: u.fullName, email: u.email }])).values()
      );
      io.to(documentId).emit('online-users', uniqueUsers);

      // 2. Initialize or retrieve Yjs collaborative session
      let session = yjsSessions.get(documentId);
      if (!session) {
        const ydoc = new Y.Doc();
        session = {
          ydoc,
          awareness: new awarenessProtocol.Awareness(ydoc),
          userCount: 0,
          saveTimeout: null
        };
        yjsSessions.set(documentId, session);

        // Load content state from MongoDB
        try {
          const docRecord = await Document.findById(documentId);
          if (docRecord) {
            let contentJson = docRecord.content;
            if (!contentJson || Object.keys(contentJson).length === 0 || (typeof contentJson === 'string' && contentJson === '{}')) {
              contentJson = { type: 'doc', content: [{ type: 'paragraph' }] };
            }

            const tempYdoc = prosemirrorJSONToYDoc(docSchema, contentJson, 'default');
            const stateUpdate = Y.encodeStateAsUpdate(tempYdoc);
            Y.applyUpdate(session.ydoc, stateUpdate);
            tempYdoc.destroy();
            
            console.log(`[Yjs] Initialized Y.Doc for document: ${documentId}`);
          }
        } catch (err) {
          console.error(`[Yjs] Error initializing Y.Doc for ${documentId}:`, err.message);
          try {
            const tempYdoc = prosemirrorJSONToYDoc(docSchema, { type: 'doc', content: [{ type: 'paragraph' }] }, 'default');
            const stateUpdate = Y.encodeStateAsUpdate(tempYdoc);
            Y.applyUpdate(session.ydoc, stateUpdate);
            tempYdoc.destroy();
          } catch (e) {
            console.error('[Yjs] Fallback parsing failed:', e.message);
          }
        }
      }

      session.userCount += 1;

      // 3. Send current room Yjs awareness updates to the newly connected client
      if (session.awareness) {
        try {
          const currentStatesVector = awarenessProtocol.encodeAwarenessUpdate(
            session.awareness,
            Array.from(session.awareness.getStates().keys())
          );
          socket.emit('yjs-awareness-update', { documentId, update: currentStatesVector });
        } catch (err) {
          console.error('[Yjs] Sync initial awareness failure:', err.message);
        }
      }
    });

    // Event: Leave document room
    socket.on('leave-document', async ({ documentId }) => {
      if (!documentId) return;
      await handleLeaveRoom(socket, documentId);
      socket.documentId = null;
    });

    // Event: Socket.io two-way Yjs Vector Synchronization handshakes
    socket.on('yjs-sync-step-1', ({ documentId, stateVector }) => {
      const session = yjsSessions.get(documentId);
      if (session) {
        try {
          const update = Y.encodeStateAsUpdate(session.ydoc, new Uint8Array(stateVector));
          socket.emit('yjs-sync-step-2', { documentId, update });

          const serverStateVector = Y.encodeStateVector(session.ydoc);
          socket.emit('yjs-request-updates', { documentId, stateVector: serverStateVector });
        } catch (err) {
          console.error('[Yjs] Step 1 sync failure:', err.message);
        }
      }
    });

    const handleYjsUpdateReceived = (session, documentId, update, userId) => {
      try {
        Y.applyUpdate(session.ydoc, new Uint8Array(update));
        if (userId) {
          session.lastEditBy = userId;
        }
        if (!session.saveTimeout) {
          session.saveTimeout = setTimeout(async () => {
            session.saveTimeout = null;
            await persistDocState(documentId, session);
          }, 5000);
        }
      } catch (err) {
        console.error('[Yjs] Update application failure:', err.message);
      }
    };

    socket.on('yjs-sync-step-2', ({ documentId, update }) => {
      const session = yjsSessions.get(documentId);
      if (session) {
        handleYjsUpdateReceived(session, documentId, update, socket.user._id);
        socket.to(documentId).emit('yjs-update', { documentId, update });
      }
    });

    socket.on('yjs-update', ({ documentId, update }) => {
      const session = yjsSessions.get(documentId);
      if (session) {
        handleYjsUpdateReceived(session, documentId, update, socket.user._id);
        socket.to(documentId).emit('yjs-update', { documentId, update });
      }
    });

    // Event: Yjs awareness presence vector tracking
    socket.on('yjs-awareness-update', ({ documentId, update }) => {
      const session = yjsSessions.get(documentId);
      if (session && session.awareness) {
        try {
          awarenessProtocol.applyAwarenessUpdate(session.awareness, new Uint8Array(update), socket);
          socket.to(documentId).emit('yjs-awareness-update', { documentId, update });
        } catch (err) {
          console.error('[Yjs] Awareness update routing failure:', err.message);
        }
      }
    });

    // Event: Connection disconnects (e.g. browser closes)
    socket.on('disconnect', async () => {
      console.log(`[Socket.io] User disconnected: ${socket.user.fullName} (${socket.id})`);
      if (socket.documentId) {
        await handleLeaveRoom(socket, socket.documentId);
      }
    });
  });
};

// Exported helper to apply a restored snapshot to an active in-memory Yjs session and broadcast it
export const restoreDocumentInSession = (documentId, restoredJson) => {
  const session = yjsSessions.get(documentId.toString());
  if (session) {
    try {
      session.ydoc.transact(() => {
        const xmlFragment = session.ydoc.get('default', Y.XmlFragment);
        if (xmlFragment.length > 0) {
          xmlFragment.delete(0, xmlFragment.length);
        }

        const tempYdoc = prosemirrorJSONToYDoc(docSchema, restoredJson, 'default');
        const stateUpdate = Y.encodeStateAsUpdate(tempYdoc);
        Y.applyUpdate(session.ydoc, stateUpdate);
        tempYdoc.destroy();
      });

      const update = Y.encodeStateAsUpdate(session.ydoc);
      ioInstance.to(documentId.toString()).emit('yjs-update', { documentId, update });
      console.log(`[Yjs] Broadcasted restored version for document ${documentId}`);
      return true;
    } catch (err) {
      console.error('[Yjs] Error executing Yjs session restore:', err.message);
    }
  }
  return false;
};
