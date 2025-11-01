const API_BASE_URL = 'http://localhost:3001/api';

export interface Session {
  id: string;
  objective: string;
  metadata: any;
  startTime: string;
  endTime: string | null;
  messages: Message[];
  labels: Label[];
  videoFrames: VideoFrame[];
  status: string;
}

export interface Message {
  id: string;
  sender: 'scientist' | 'robot';
  content: string;
  timestamp: string;
  videoFrameId?: string;
}

export interface Label {
  id: string;
  sessionId: string;
  messageId: string;
  labelType: string;
  labelData: any;
  timestamp: string;
}

export interface VideoFrame {
  id: string;
  timestamp: string;
  data?: string;
}

export class ApiService {
  private static async request(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Session methods
  static async createSession(objective: string, metadata?: any): Promise<Session> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ objective, metadata }),
    });
  }

  static async getSession(sessionId: string): Promise<Session> {
    return this.request(`/sessions/${sessionId}`);
  }

  static async getAllSessions(): Promise<Session[]> {
    return this.request('/sessions');
  }

  // Message methods
  static async addMessage(
    sessionId: string,
    sender: 'scientist' | 'robot',
    content: string,
    videoFrameId?: string
  ): Promise<Message> {
    return this.request(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ sender, content, videoFrameId }),
    });
  }

  static async getMessages(sessionId: string): Promise<Message[]> {
    return this.request(`/sessions/${sessionId}/messages`);
  }

  // Label methods
  static async addLabel(
    sessionId: string,
    messageId: string,
    labelType: string,
    labelData: any
  ): Promise<Label> {
    return this.request('/labels', {
      method: 'POST',
      body: JSON.stringify({ sessionId, messageId, labelType, labelData }),
    });
  }

  static async getLabels(sessionId: string): Promise<Label[]> {
    return this.request(`/sessions/${sessionId}/labels`);
  }

  // Export methods
  static async exportDataset(sessionId: string): Promise<any> {
    return this.request(`/export/${sessionId}`);
  }

  static async exportAllDatasets(): Promise<any> {
    return this.request('/export');
  }
}

