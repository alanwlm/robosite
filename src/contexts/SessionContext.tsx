import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiService, Session } from '../services/apiService';
import { videoStreamService } from '../services/videoStreamService';

interface SessionContextType {
  session: Session | null;
  createSession: (objective: string) => Promise<void>;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const createSession = async (objective: string) => {
    try {
      const newSession = await ApiService.createSession(objective, {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
      setSession(newSession);
      console.log('Session created:', newSession.id);
      
      // Automatically start recording when session is created
      startRecording();
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  };

  const startRecording = () => {
    if (session && !isRecording) {
      videoStreamService.startRecording(session.id);
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      videoStreamService.stopRecording();
      setIsRecording(false);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        createSession,
        isRecording,
        startRecording,
        stopRecording,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

