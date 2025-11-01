import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DataCollectionService } from './services/dataCollection.js';
import { VideoStreamService } from './services/videoStream.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const dataCollection = new DataCollectionService();
const videoStream = new VideoStreamService(io);

// API Routes

// Create a new session
app.post('/api/sessions', (req, res) => {
  const { objective, metadata } = req.body;
  const session = dataCollection.createSession(objective, metadata);
  res.json(session);
});

// Get session by ID
app.get('/api/sessions/:sessionId', (req, res) => {
  const session = dataCollection.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  const sessions = dataCollection.getAllSessions();
  res.json(sessions);
});

// Add a message to a session
app.post('/api/sessions/:sessionId/messages', (req, res) => {
  const { sessionId } = req.params;
  const { sender, content, videoFrameId } = req.body;
  
  const message = dataCollection.addMessage(sessionId, {
    sender,
    content,
    videoFrameId
  });
  
  if (!message) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(message);
});

// Get messages for a session
app.get('/api/sessions/:sessionId/messages', (req, res) => {
  const messages = dataCollection.getMessages(req.params.sessionId);
  if (!messages) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(messages);
});

// Add a label to an interaction
app.post('/api/labels', (req, res) => {
  const { sessionId, messageId, labelType, labelData } = req.body;
  
  const label = dataCollection.addLabel(sessionId, messageId, {
    labelType,
    labelData
  });
  
  if (!label) {
    return res.status(404).json({ error: 'Session or message not found' });
  }
  
  res.json(label);
});

// Get labels for a session
app.get('/api/sessions/:sessionId/labels', (req, res) => {
  const labels = dataCollection.getLabels(req.params.sessionId);
  if (!labels) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(labels);
});

// Export dataset
app.get('/api/export/:sessionId', (req, res) => {
  const dataset = dataCollection.exportDataset(req.params.sessionId);
  if (!dataset) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(dataset);
});

// Export all datasets
app.get('/api/export', (req, res) => {
  const datasets = dataCollection.exportAllDatasets();
  res.json(datasets);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Start streaming video to the connected client
  videoStream.addClient(socket);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    videoStream.removeClient(socket);
  });
  
  // Handle video recording requests
  socket.on('start-recording', (data) => {
    const { sessionId } = data;
    videoStream.startRecording(sessionId, socket.id);
  });
  
  socket.on('stop-recording', () => {
    videoStream.stopRecording(socket.id);
  });
  
  // Handle message with video frame association
  socket.on('message-sent', (data) => {
    const { sessionId, message } = data;
    const frameId = videoStream.getCurrentFrameId(socket.id);
    
    // Store message with associated video frame
    dataCollection.addMessage(sessionId, {
      ...message,
      videoFrameId: frameId
    });
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for video streaming`);
});

