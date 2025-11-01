import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

interface VideoFeedProps {
  isLive?: boolean;
  onFrameChange?: (frame: number) => void;
}

export interface VideoFeedRef {
  replay: () => void;
  skipToEnd: () => void;
  togglePause: () => void;
  isPaused: () => boolean;
  setFrame: (frame: number) => void;
  getCurrentFrame: () => number;
}

const TOTAL_FRAMES = 332;
const FPS = 20;
const FRAME_INTERVAL = 1000 / FPS;

export const VideoFeed = forwardRef<VideoFeedRef, VideoFeedProps>(({ isLive = true, onFrameChange }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrame, setCurrentFrame] = useState(1);
  const frameIndexRef = useRef(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);

  const updateFrame = (frame: number) => {
    frameIndexRef.current = frame;
    setCurrentFrame(frame);
    loadFrame(frame);
    if (onFrameChange) {
      onFrameChange(frame);
    }
  };

  const loadFrame = (frameNum: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameNumber = String(frameNum).padStart(4, '0');
    const img = new Image();
    img.src = `/videos/frames/frame_${frameNumber}.png`;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
  };

  const startPlayback = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    isPausedRef.current = false;
    frameIndexRef.current = 1;
    setCurrentFrame(1);
    loadFrame(1);

    intervalRef.current = setInterval(() => {
      if (frameIndexRef.current < TOTAL_FRAMES) {
        updateFrame(frameIndexRef.current + 1);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        isPausedRef.current = true;
      }
    }, FRAME_INTERVAL);
  };

  const skipToEnd = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isPausedRef.current = true;
    updateFrame(TOTAL_FRAMES);
  };

  const togglePause = () => {
    if (isPausedRef.current) {
      // Resume playback
      isPausedRef.current = false;
      intervalRef.current = setInterval(() => {
        if (frameIndexRef.current < TOTAL_FRAMES) {
          updateFrame(frameIndexRef.current + 1);
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          isPausedRef.current = true;
        }
      }, FRAME_INTERVAL);
    } else {
      // Pause playback
      isPausedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    replay: startPlayback,
    skipToEnd: skipToEnd,
    togglePause: togglePause,
    isPaused: () => isPausedRef.current,
    setFrame: (frame: number) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPausedRef.current = true;
      updateFrame(frame);
    },
    getCurrentFrame: () => frameIndexRef.current
  }));

  useEffect(() => {
    startPlayback();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="relative bg-gray-900 w-full h-full flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      
      <div className="absolute bottom-3 right-3 bg-black/60 text-white px-2.5 py-1 rounded text-xs font-mono">
        Frame: {currentFrame}/{TOTAL_FRAMES}
      </div>
    </div>
  );
});

VideoFeed.displayName = 'VideoFeed';
