import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';

interface YouTubeEmbedProps {
  videoUrl: string;
  onPause?: (currentTime: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

export interface YouTubePlayerHandle {
  pause: () => void;
  play: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number) => void;
}

// Declare YT global from YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoaded = false;
let apiReady = false;
const apiReadyCallbacks: (() => void)[] = [];

function loadYouTubeAPI() {
  if (apiReady) return;
  if (apiLoaded) return;
  apiLoaded = true;

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = () => {
    apiReady = true;
    apiReadyCallbacks.forEach(cb => cb());
    apiReadyCallbacks.length = 0;
  };
}

function onAPIReady(cb: () => void) {
  if (apiReady) {
    cb();
  } else {
    apiReadyCallbacks.push(cb);
    loadYouTubeAPI();
  }
}

export const YouTubeEmbed = forwardRef<YouTubePlayerHandle, YouTubeEmbedProps>(
  ({ videoUrl, onPause, onTimeUpdate }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const timerRef = useRef<any>(null);

    // Keep callbacks in refs to avoid re-triggering useEffect on parent re-renders
    const onPauseRef = useRef(onPause);
    onPauseRef.current = onPause;

    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;

    const extractId = useCallback((url: string) => {
      const match = url.match(/[?&]v=([^&#]*)/) || url.match(/youtu\.be\/([^?&#]+)/);
      return match ? match[1] : url;
    }, []);

    const videoId = extractId(videoUrl);

    useImperativeHandle(ref, () => ({
      pause: () => {
        try {
          playerRef.current?.pauseVideo();
          const t = playerRef.current?.getCurrentTime() || 0;
          onPauseRef.current?.(t);
        } catch { /* ignore */ }
      },
      play: () => {
        try { playerRef.current?.playVideo(); } catch { /* ignore */ }
      },
      getCurrentTime: () => {
        try {
          return playerRef.current?.getCurrentTime() || 0;
        } catch {
          return 0;
        }
      },
      getDuration: () => {
        try {
          return playerRef.current?.getDuration() || 0;
        } catch {
          return 0;
        }
      },
      seekTo: (seconds: number) => {
        try {
          playerRef.current?.seekTo(seconds, true);
        } catch { /* ignore */ }
      }
    }));

    useEffect(() => {
      // Create a unique div id for this player instance
      const divId = `yt-player-${videoId}-${Date.now()}`;
      const el = document.createElement('div');
      el.id = divId;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(el);
      }

      onAPIReady(() => {
        if (!containerRef.current) return;
        playerRef.current = new window.YT.Player(divId, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
          },
          events: {
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                if (timerRef.current) clearInterval(timerRef.current);
                timerRef.current = setInterval(() => {
                  if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    try {
                      const t = playerRef.current.getCurrentTime() || 0;
                      onTimeUpdateRef.current?.(t);
                    } catch { /* ignore */ }
                  }
                }, 500);
              } else {
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
              }

              if (event.data === 2 || event.data === 0) {
                try {
                  const t = playerRef.current?.getCurrentTime() || 0;
                  onPauseRef.current?.(t);
                  onTimeUpdateRef.current?.(t);
                } catch { /* ignore */ }
              }
            }
          }
        });
      });

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        try { playerRef.current?.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      };
    }, [videoId]);

    return (
      <div
        ref={containerRef}
        className="relative w-full mb-8 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200/80"
        style={{ aspectRatio: '16 / 9', minHeight: '480px' }}
      />
    );
  }
);

YouTubeEmbed.displayName = 'YouTubeEmbed';
