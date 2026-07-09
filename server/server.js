import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import { sanitizeQuery } from './middleware/sanitizeMiddleware.js';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import versionRoutes from './routes/versionRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { initSocket } from './socket.js';

// Load environment variables
dotenv.config();

// Centralized configuration validation
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY'];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.error(`[Fatal Error] Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io initialization with CORS setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:", "http://localhost:5000", "ws://localhost:5000", "http://localhost", "ws://localhost"]
    }
  } : false,
  crossOriginEmbedderPolicy: false
}));

const corsOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeQuery);

// Express rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', limiter);

// Base Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API server is running normally',
    timestamp: new Date()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/documents', versionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.io Connection & Authenticated Presence Logic
initSocket(io);

// Error handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const serverInstance = server.listen(PORT, () => {
  console.log(`[Server] running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('[Server] SIGTERM/SIGINT received. Shutting down gracefully...');
  serverInstance.close(() => {
    console.log('[Server] HTTP server closed.');
    mongoose.connection.close().then(() => {
      console.log('[Server] MongoDB connection closed.');
      process.exit(0);
    }).catch((err) => {
      console.error('[Server] Error during DB close:', err.message);
      process.exit(1);
    });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { io };
