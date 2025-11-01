import { useEffect, useRef, useState } from 'react';
import { ObjectiveHeader } from './components/ObjectiveHeader';
import { VideoFeed, VideoFeedRef } from './components/VideoFeed';
import { MessageInterface } from './components/MessageInterface';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { Slider } from './components/ui/slider';

const TOTAL_FRAMES = 332;

function AppContent() {
  const currentObjective = "Pick up the red cube from the table and place it in the blue container. Avoid obstacles and ensure precise gripper alignment.";
  const { session, createSession } = useSession();
  const videoFeedRef = useRef<VideoFeedRef>(null);
  const [currentFrame, setCurrentFrame] = useState(1);

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
      <div className="flex-shrink-0 relative z-30">
        <ObjectiveHeader objective={currentObjective} />
      </div>
      
      {/* Video Feed - Takes up proportional space */}
      <div className="flex-shrink-0 bg-gray-900 h-[40vh] md:h-[45vh] relative z-10">
        <div className="max-w-6xl mx-auto h-full">
          <VideoFeed 
            ref={videoFeedRef} 
            isLive={true} 
            onFrameChange={setCurrentFrame}
          />
        </div>
      </div>
      
      {/* Message Interface - Takes remaining space */}
      <div className="flex-1 min-h-0 relative z-10 flex flex-col">
        <MessageInterface videoFeedRef={videoFeedRef} />
        
        {/* Floating Video Slider */}
        <div className="absolute bottom-[90px] left-0 right-0 z-50 pointer-events-none">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl px-6 py-4 pointer-events-auto">
              <Slider
                value={[currentFrame]}
                onValueChange={(value) => setCurrentFrame(value[0])}
                onValueCommit={(value) => videoFeedRef.current?.setFrame(value[0])}
                min={1}
                max={TOTAL_FRAMES}
                step={1}
              />
            </div>
          </div>
        </div>
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
