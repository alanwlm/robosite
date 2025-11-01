import { Video, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { videoStreamService, VideoFrameData } from '../services/videoStreamService';

interface VideoFeedProps {
  isLive?: boolean;
}

export function VideoFeed({ isLive = true }: VideoFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [connected, setConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [frameCount, setFrameCount] = useState(0);

  useEffect(() => {
    // Connect to video stream
    videoStreamService.connect()
      .then(() => {
        setConnected(true);
        
        // Set up frame handler
        videoStreamService.onFrame((frame: VideoFrameData) => {
          drawFrame(frame);
          setFrameCount(prev => prev + 1);
        });
      })
      .catch((error) => {
        console.error('Failed to connect to video stream:', error);
        setConnected(false);
      });

    // Update timestamp every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timeInterval);
      videoStreamService.disconnect();
    };
  }, []);

  const drawFrame = (frame: VideoFrameData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = frame.width;
      canvas.height = frame.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = frame.data;
  };

  return (
    <div className="relative bg-gray-900 w-full h-full flex items-center justify-center">
      {/* Video canvas */}
      {connected ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Video className="w-16 h-16 text-gray-600" />
          <p className="text-gray-500 text-sm">Connecting to video stream...</p>
        </div>
      )}
      
      {/* Live indicator */}
      {isLive && (
        <div className={`absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full ${
          connected ? 'bg-red-600' : 'bg-gray-600'
        } text-white`}>
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="text-xs">LIVE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="text-xs">OFFLINE</span>
            </>
          )}
        </div>
      )}
      
      {/* Timestamp overlay */}
      <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2.5 py-1 rounded text-xs font-mono">
        {currentTime.toLocaleTimeString()}
      </div>

      {/* Frame counter */}
      {connected && (
        <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded text-xs font-mono">
          Frame: {frameCount}
        </div>
      )}
    </div>
  );
}
