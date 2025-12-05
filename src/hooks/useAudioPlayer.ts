import { useRef, useState, useCallback, useEffect } from "react";
import api from "../services/api";
import { generateWaveformFromAudio } from "../utils/waveform";
import { WaveformPoint } from "../types";

interface UseAudioPlayerProps {
  trackId: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onWaveformGenerated?: (waveform: WaveformPoint[]) => void;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  waveformData: WaveformPoint[];
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

export function useAudioPlayer({
  trackId,
  onTimeUpdate,
  onEnded,
  onError,
  onWaveformGenerated,
}: UseAudioPlayerProps): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformPoint[]>([]);
  const urlExpiryRef = useRef<number>(0);
  const currentTrackIdRef = useRef<string | null>(null);

  const updateTime = useCallback(() => {
    if (audioRef.current && isPlaying) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
  }, [isPlaying, onTimeUpdate]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateTime]);

  const loadAudioUrl = useCallback(
    async (id: string) => {
      if (!id) return null;

      try {
        setIsLoading(true);
        setError(null);
        const url = await api.getAudioUrl(id);
        urlExpiryRef.current = Date.now() + 55 * 60 * 1000;
        return url;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load audio";
        setError(message);
        setIsLoading(false);
        onError?.(message);
        return null;
      }
    },
    [onError]
  );

  useEffect(() => {
    if (trackId !== currentTrackIdRef.current) {
      const previousTrackId = currentTrackIdRef.current;
      currentTrackIdRef.current = trackId;
      setAudioUrl(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setError(null);
      setWaveformData([]);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      
      if (previousTrackId && !trackId) {
        if (audioRef.current) {
          audioRef.current = null;
        }
      }
    }
  }, [trackId]);

  const ensureAudioLoaded = useCallback(async (): Promise<boolean> => {
    if (!trackId) return false;
    
    if (trackId !== currentTrackIdRef.current) {
      return false;
    }

    const needsNewUrl = !audioUrl || Date.now() > urlExpiryRef.current;

    if (needsNewUrl) {
      const url = await loadAudioUrl(trackId);
      if (!url) return false;
      
      if (trackId !== currentTrackIdRef.current) {
        return false;
      }
      
      setAudioUrl(url);

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = "auto";

        audioRef.current.addEventListener("loadedmetadata", () => {
          setDuration(audioRef.current?.duration ?? 0);
        });

        audioRef.current.addEventListener("ended", () => {
          setIsPlaying(false);
          onEnded?.();
        });

        audioRef.current.addEventListener("error", (e) => {
          const audio = e.target as HTMLAudioElement;
          if (audio.src && audio.error?.code !== MediaError.MEDIA_ERR_ABORTED) {
            const errorMsg = "Failed to play audio";
            setError(errorMsg);
            setIsPlaying(false);
            onError?.(errorMsg);
          }
        });
      }

      audioRef.current.src = url;
      await audioRef.current.load();

      try {
        const waveform = await generateWaveformFromAudio(url);
        setWaveformData(waveform);
        onWaveformGenerated?.(waveform);
      } catch (err) {
        console.warn("Failed to generate waveform from audio:", err);
      }
    }

    return true;
  }, [trackId, audioUrl, loadAudioUrl, onEnded, onError, onWaveformGenerated]);

  const play = useCallback(async () => {
    const loaded = await ensureAudioLoaded();
    if (!loaded || !audioRef.current) {
      setIsLoading(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsLoading(false);
      setIsPlaying(true);
    } catch (err) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : "Playback failed";
      setError(message);
      onError?.(message);
    }
  }, [ensureAudioLoaded, onError]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    waveformData,
    play,
    pause,
    toggle,
    seek,
    setVolume,
  };
}
