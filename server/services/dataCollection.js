import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DataCollectionService {
  constructor() {
    this.sessions = new Map();
    this.dataDir = join(__dirname, '../data');
    this.ensureDataDirectory();
    this.loadExistingSessions();
  }

  ensureDataDirectory() {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    
    const subdirs = ['sessions', 'video_frames', 'exports'];
    subdirs.forEach(subdir => {
      const path = join(this.dataDir, subdir);
      if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
      }
    });
  }

  loadExistingSessions() {
    const sessionsFile = join(this.dataDir, 'sessions.json');
    if (existsSync(sessionsFile)) {
      try {
        const data = readFileSync(sessionsFile, 'utf-8');
        const sessions = JSON.parse(data);
        this.sessions = new Map(Object.entries(sessions));
        console.log(`Loaded ${this.sessions.size} existing sessions`);
      } catch (error) {
        console.error('Error loading sessions:', error);
      }
    }
  }

  persistSessions() {
    const sessionsFile = join(this.dataDir, 'sessions.json');
    const sessionsObj = Object.fromEntries(this.sessions);
    writeFileSync(sessionsFile, JSON.stringify(sessionsObj, null, 2));
  }

  createSession(objective, metadata = {}) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      objective,
      metadata,
      startTime: new Date().toISOString(),
      endTime: null,
      messages: [],
      labels: [],
      videoFrames: [],
      status: 'active'
    };

    this.sessions.set(sessionId, session);
    this.persistSessions();
    
    console.log(`Created new session: ${sessionId}`);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  addMessage(sessionId, messageData) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const message = {
      id: uuidv4(),
      ...messageData,
      timestamp: new Date().toISOString()
    };

    session.messages.push(message);
    this.persistSessions();
    
    console.log(`Added message to session ${sessionId}:`, message.id);
    return message;
  }

  getMessages(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : null;
  }

  addVideoFrame(sessionId, frameData) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const frameId = uuidv4();
    const frame = {
      id: frameId,
      timestamp: new Date().toISOString(),
      ...frameData
    };

    session.videoFrames.push(frame);
    
    // Save video frame data to disk
    if (frameData.data) {
      const framePath = join(this.dataDir, 'video_frames', `${frameId}.json`);
      writeFileSync(framePath, JSON.stringify(frame, null, 2));
    }

    this.persistSessions();
    return frame;
  }

  addLabel(sessionId, messageId, labelData) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const message = session.messages.find(m => m.id === messageId);
    if (!message) return null;

    const label = {
      id: uuidv4(),
      sessionId,
      messageId,
      ...labelData,
      timestamp: new Date().toISOString()
    };

    session.labels.push(label);
    this.persistSessions();
    
    console.log(`Added label to session ${sessionId}, message ${messageId}`);
    return label;
  }

  getLabels(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.labels : null;
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endTime = new Date().toISOString();
    session.status = 'completed';
    this.persistSessions();
    
    console.log(`Ended session: ${sessionId}`);
    return session;
  }

  exportDataset(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const dataset = {
      session: {
        id: session.id,
        objective: session.objective,
        startTime: session.startTime,
        endTime: session.endTime,
        metadata: session.metadata
      },
      interactions: session.messages.map(msg => {
        const labels = session.labels.filter(l => l.messageId === msg.id);
        const videoFrame = session.videoFrames.find(f => f.id === msg.videoFrameId);
        
        return {
          message: msg,
          labels,
          videoFrame: videoFrame ? {
            id: videoFrame.id,
            timestamp: videoFrame.timestamp,
            path: `video_frames/${videoFrame.id}.json`
          } : null
        };
      }),
      statistics: {
        totalMessages: session.messages.length,
        totalLabels: session.labels.length,
        totalVideoFrames: session.videoFrames.length,
        duration: session.endTime 
          ? new Date(session.endTime) - new Date(session.startTime)
          : null
      }
    };

    // Save export to disk
    const exportPath = join(this.dataDir, 'exports', `${sessionId}_export.json`);
    writeFileSync(exportPath, JSON.stringify(dataset, null, 2));
    
    console.log(`Exported dataset for session ${sessionId}`);
    return dataset;
  }

  exportAllDatasets() {
    const allDatasets = Array.from(this.sessions.values()).map(session => 
      this.exportDataset(session.id)
    );

    const masterExport = {
      exportTime: new Date().toISOString(),
      totalSessions: allDatasets.length,
      datasets: allDatasets
    };

    const exportPath = join(this.dataDir, 'exports', `all_sessions_${Date.now()}.json`);
    writeFileSync(exportPath, JSON.stringify(masterExport, null, 2));
    
    console.log(`Exported all ${allDatasets.length} datasets`);
    return masterExport;
  }
}

