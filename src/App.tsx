import { useEffect } from 'react';
import { ObjectiveHeader } from './components/ObjectiveHeader';
import { VideoFeed } from './components/VideoFeed';
import { MessageInterface } from './components/MessageInterface';
import { SessionProvider, useSession } from './contexts/SessionContext';

function AppContent() {
  const currentObjective = "Pick up the red cube from the table and place it in the blue container. Avoid obstacles and ensure precise gripper alignment.";
  const { session, createSession } = useSession();

  useEffect(() => {
    // Create a session on mount if one doesn't exist
    if (!session) {
      createSession(currentObjective).catch((error) => {
        console.error('Failed to create initial session:', error);
      });
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Objective Header - Compact */}
      <div className="flex-shrink-0">
        <ObjectiveHeader objective={currentObjective} />
      </div>
      
      {/* Video Feed - Takes up proportional space */}
      <div className="flex-shrink-0 bg-gray-900 h-[40vh] md:h-[45vh]">
        <div className="max-w-6xl mx-auto h-full">
          <VideoFeed isLive={true} />
        </div>
      </div>
      
      {/* Message Interface - Takes remaining space */}
      <div className="flex-1 min-h-0">
        <MessageInterface />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
