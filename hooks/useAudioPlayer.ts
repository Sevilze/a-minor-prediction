import { useRef, useState, useCallback, useEffect } from "react";
import api from "../services/api";

interface UseAudioPlayerProps {
  projectId: string | null;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

export function useAudioPlayer({
  projectId,
  onTimeUpdate,
  onEnded,
  onError,
}: UseAudioPlayerProps): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const urlExpiryRef = useRef<number>(0);
  const currentProjectIdRef = useRef<string | null>(null);

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
        onError?.(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  useEffect(() => {
    if (projectId !== currentProjectIdRef.current) {
      currentProjectIdRef.current = projectId;
      setAudioUrl(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setError(null);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    }
  }, [projectId]);

  const ensureAudioLoaded = useCallback(async (): Promise<boolean> => {
    if (!projectId) return false;

    const needsNewUrl = !audioUrl || Date.now() > urlExpiryRef.current;

    if (needsNewUrl) {
      const url = await loadAudioUrl(projectId);
      if (!url) return false;
      setAudioUrl(url);

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = "auto";

        audioRef.current.addEventListener("timeupdate", () => {
          const time = audioRef.current?.currentTime ?? 0;
          setCurrentTime(time);
          onTimeUpdate?.(time);
        });

        audioRef.current.addEventListener("loadedmetadata", () => {
          setDuration(audioRef.current?.duration ?? 0);
        });

        audioRef.current.addEventListener("ended", () => {
          setIsPlaying(false);
          onEnded?.();
        });

        audioRef.current.addEventListener("error", () => {
          const errorMsg = "Failed to play audio";
          setError(errorMsg);
          setIsPlaying(false);
          onError?.(errorMsg);
        });
      }

      audioRef.current.src = url;
      await audioRef.current.load();
    }

    return true;
  }, [projectId, audioUrl, loadAudioUrl, onTimeUpdate, onEnded, onError]);

  const play = useCallback(async () => {
    const loaded = await ensureAudioLoaded();
    if (!loaded || !audioRef.current) return;

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
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
    };
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    play,
    pause,
    toggle,
    seek,
    setVolume,
  };
}
