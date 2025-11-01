import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export interface VideoFrameData {
  frameId: string;
  timestamp: number;
  data: string; // base64 encoded image
  width: number;
  height: number;
}

export class VideoStreamService {
  private socket: Socket | null = null;
  private onFrameCallback: ((frame: VideoFrameData) => void) | null = null;
  private currentFrameId: string | null = null;
  private isRecording = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('Connected to video stream server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('video-frame', (frame: VideoFrameData) => {
        this.currentFrameId = frame.frameId;
        if (this.onFrameCallback) {
          this.onFrameCallback(frame);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from video stream server');
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onFrame(callback: (frame: VideoFrameData) => void) {
    this.onFrameCallback = callback;
  }

  startRecording(sessionId: string) {
    if (this.socket && !this.isRecording) {
      this.socket.emit('start-recording', { sessionId });
      this.isRecording = true;
      console.log('Started recording for session:', sessionId);
    }
  }

  stopRecording() {
    if (this.socket && this.isRecording) {
      this.socket.emit('stop-recording');
      this.isRecording = false;
      console.log('Stopped recording');
    }
  }

  getCurrentFrameId(): string | null {
    return this.currentFrameId;
  }

  sendMessage(sessionId: string, message: any) {
    if (this.socket) {
      this.socket.emit('message-sent', { sessionId, message });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const videoStreamService = new VideoStreamService();

