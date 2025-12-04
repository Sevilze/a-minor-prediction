import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/layout/Header';
import { PlaylistSidebar } from './components/playlist/PlaylistSidebar';
import { AudioPlayer } from './components/audio/AudioPlayer';
import { Icon } from './components/ui/Icon';
import { AudioTrack, WaveformPoint, BackendStatus } from './types';
import api, { ApiAudioTrack, ApiChordPrediction } from './services/api';
import authService, { AuthUser } from './services/auth';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { generatePlaceholderWaveform } from './utils/waveform';

const mapApiTrackToAudioTrack = (
  apiTrack: ApiAudioTrack,
  chords: ApiChordPrediction[]
): AudioTrack => ({
  id: apiTrack.id,
  name: apiTrack.name,
  duration: apiTrack.duration,
  durationSeconds: apiTrack.duration_seconds,
  size: apiTrack.size,
  status: apiTrack.status as 'completed' | 'processing' | 'error',
  type: apiTrack.type as AudioTrack['type'],
  bpm: apiTrack.bpm,
  timeSignature: apiTrack.time_signature,
  chords: chords.map((c) => ({
    timestamp: c.timestamp,
    formattedTime: c.formatted_time,
    chord: c.chord,
    confidence: c.confidence,
  })),
});

const App: React.FC = () => {
  const [playlists, setPlaylists] = useState<
    { id: string; name: string; trackCount: number }[]
  >([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<{
    id: string;
    name: string;
    tracks: AudioTrack[];
  } | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<WaveformPoint[]>(
    generatePlaceholderWaveform(150)
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [isUploading, setIsUploading] = useState(false);
  const [, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const activeTrack = activePlaylist?.tracks.find((t) => t.id === activeTrackId);
  const duration = activeTrack?.durationSeconds || 0;

  const audioPlayerRef = useRef<{
    seek: (time: number) => void;
    play: () => Promise<void>;
  } | null>(null);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      if (isLooping && time >= loopEnd) {
        audioPlayerRef.current?.seek(loopStart);
      } else {
        setCurrentTime(time);
      }
    },
    [isLooping, loopStart, loopEnd]
  );

  const handleAudioEnded = useCallback(() => {
    if (isLooping) {
      audioPlayerRef.current?.seek(loopStart);
      audioPlayerRef.current?.play();
    }
  }, [isLooping, loopStart]);

  const handleWaveformGenerated = useCallback((waveform: WaveformPoint[]) => {
    setWaveformData(waveform);
  }, []);

  const audioPlayer = useAudioPlayer({
    trackId: activeTrackId,
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleAudioEnded,
    onError: (err) => setError(err),
    onWaveformGenerated: handleWaveformGenerated,
  });

  audioPlayerRef.current = audioPlayer;

  useEffect(() => {
    if (audioPlayer.waveformData.length > 0) {
      setWaveformData(audioPlayer.waveformData);
    }
  }, [audioPlayer.waveformData]);

  useEffect(() => {
    const initAuth = async () => {
      const callbackToken = authService.handleAuthCallback();
      if (callbackToken) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } else if (authService.isAuthenticated()) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
      setAuthChecked(true);
    };
    initAuth();
  }, []);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await api.healthCheck();
        setBackendStatus(health.status === 'ok' ? 'connected' : 'disconnected');
      } catch {
        setBackendStatus('disconnected');
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    const loadPlaylists = async () => {
      if (backendStatus !== 'connected' || !authChecked) return;
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await api.listPlaylists();
        const mappedPlaylists = response.playlists.map((p) => ({
          id: p.id,
          name: p.name,
          trackCount: p.track_count,
        }));
        setPlaylists(mappedPlaylists);

        if (mappedPlaylists.length > 0 && !activePlaylistId) {
          setActivePlaylistId(mappedPlaylists[0].id);
        }
      } catch (err) {
        setError('Failed to load playlists');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylists();
  }, [backendStatus, authChecked, user, activePlaylistId]);

  useEffect(() => {
    const loadPlaylist = async () => {
      if (!activePlaylistId || backendStatus !== 'connected') return;

      try {
        const response = await api.getPlaylist(activePlaylistId);
        const tracks = await Promise.all(
          response.tracks.map(async (t) => {
            try {
              const trackResponse = await api.getTrack(t.id);
              return mapApiTrackToAudioTrack(trackResponse.track, trackResponse.chords);
            } catch {
              return mapApiTrackToAudioTrack(t, []);
            }
          })
        );

        setActivePlaylist({
          id: response.playlist.id,
          name: response.playlist.name,
          tracks,
        });

        if (tracks.length > 0 && !activeTrackId) {
          setActiveTrackId(tracks[0].id);
          setLoopEnd(tracks[0].durationSeconds);
        }
      } catch (err) {
        console.error('Failed to load playlist:', err);
      }
    };

    loadPlaylist();
  }, [activePlaylistId, backendStatus, activeTrackId]);

  useEffect(() => {
    if (activeTrack) {
      setCurrentTime(0);
      setLoopStart(0);
      setLoopEnd(activeTrack.durationSeconds);
    }
  }, [activeTrackId, activeTrack]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (backendStatus !== 'connected') {
        setError('Backend is not connected. Please start the server.');
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const response = await api.uploadAudio(file, activePlaylistId || undefined);
        const track = mapApiTrackToAudioTrack(response.track, response.chords);

        if (activePlaylist) {
          setActivePlaylist((prev) =>
            prev
              ? {
                  ...prev,
                  tracks: [track, ...prev.tracks],
                }
              : null
          );
        }

        setActiveTrackId(track.id);
        setCurrentTime(0);
        setLoopStart(0);
        setLoopEnd(track.durationSeconds);
        setIsSidebarOpen(false);

        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === activePlaylistId
              ? { ...p, trackCount: p.trackCount + 1 }
              : p
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
        console.error('Upload error:', err);
      } finally {
        setIsUploading(false);
      }
    },
    [backendStatus, activePlaylistId, activePlaylist]
  );

  const handleTrackDelete = useCallback(
    async (trackId: string) => {
      if (backendStatus !== 'connected') return;

      try {
        await api.deleteTrack(trackId);

        if (activePlaylist) {
          const updatedTracks = activePlaylist.tracks.filter((t) => t.id !== trackId);
          setActivePlaylist((prev) =>
            prev ? { ...prev, tracks: updatedTracks } : null
          );

          if (activeTrackId === trackId) {
            setActiveTrackId(updatedTracks.length > 0 ? updatedTracks[0].id : null);
          }

          setPlaylists((prev) =>
            prev.map((p) =>
              p.id === activePlaylistId
                ? { ...p, trackCount: Math.max(0, p.trackCount - 1) }
                : p
            )
          );
        }
      } catch (err) {
        console.error('Delete error:', err);
      }
    },
    [activePlaylistId, activeTrackId, activePlaylist, backendStatus]
  );

  const handlePlaylistCreate = useCallback(
    async (name: string) => {
      if (backendStatus !== 'connected') return;

      try {
        const response = await api.createPlaylist(name);
        const newPlaylist = {
          id: response.playlist.id,
          name: response.playlist.name,
          trackCount: 0,
        };
        setPlaylists((prev) => [newPlaylist, ...prev]);
        setActivePlaylistId(newPlaylist.id);
      } catch (err) {
        console.error('Create playlist error:', err);
        setError('Failed to create playlist');
      }
    },
    [backendStatus]
  );

  const handlePlaylistRename = useCallback(
    async (playlistId: string, newName: string) => {
      if (backendStatus !== 'connected') return;

      try {
        await api.updatePlaylist(playlistId, newName);
        setPlaylists((prev) =>
          prev.map((p) => (p.id === playlistId ? { ...p, name: newName } : p))
        );
        if (activePlaylist?.id === playlistId) {
          setActivePlaylist((prev) => (prev ? { ...prev, name: newName } : null));
        }
      } catch (err) {
        console.error('Rename playlist error:', err);
      }
    },
    [backendStatus, activePlaylist]
  );

  const handlePlaylistDelete = useCallback(
    async (playlistId: string) => {
      if (backendStatus !== 'connected') return;

      try {
        await api.deletePlaylist(playlistId);
        setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));

        if (activePlaylistId === playlistId) {
          const remaining = playlists.filter((p) => p.id !== playlistId);
          setActivePlaylistId(remaining.length > 0 ? remaining[0].id : null);
          setActivePlaylist(null);
          setActiveTrackId(null);
        }
      } catch (err) {
        console.error('Delete playlist error:', err);
      }
    },
    [activePlaylistId, playlists, backendStatus]
  );

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    audioPlayer.seek(time);
  };

  const skip = (amount: number) => {
    const newTime = Math.min(Math.max(currentTime + amount, 0), duration);
    setCurrentTime(newTime);
    audioPlayer.seek(newTime);
  };

  const toggleLoop = () => setIsLooping(!isLooping);

  const setLoopIn = () => {
    const newStart = Math.min(currentTime, loopEnd - 1);
    setLoopStart(Math.max(0, newStart));
    if (!isLooping) setIsLooping(true);
  };

  const setLoopOut = () => {
    const newEnd = Math.max(currentTime, loopStart + 1);
    setLoopEnd(Math.min(duration, newEnd));
    if (!isLooping) setIsLooping(true);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev * 1.5, 8));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev / 1.5, 1));

  const handleLogin = () => {
    window.location.href = api.getLoginUrl();
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setPlaylists([]);
    setActivePlaylistId(null);
    setActivePlaylist(null);
    setActiveTrackId(null);
  };

  const handleChordClick = (timestamp: number) => {
    handleSeek(timestamp);
  };

  return (
    <div className="flex flex-col h-full bg-background-dark text-white overflow-hidden font-sans">
      <Header
        backendStatus={backendStatus}
        user={user}
        authChecked={authChecked}
        onMenuClick={() => setIsSidebarOpen(true)}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between">
          <p className="text-red-400 text-sm font-sans">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <Icon name="close" className="text-lg" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <PlaylistSidebar
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          activePlaylist={
            activePlaylist
              ? {
                  id: activePlaylist.id,
                  name: activePlaylist.name,
                  tracks: activePlaylist.tracks.map((t) => ({
                    id: t.id,
                    name: t.name,
                    duration: t.duration,
                    status: t.status,
                  })),
                }
              : null
          }
          activeTrackId={activeTrackId}
          onPlaylistSelect={(id) => {
            setActivePlaylistId(id);
            setActiveTrackId(null);
            setIsSidebarOpen(false);
          }}
          onPlaylistDelete={handlePlaylistDelete}
          onPlaylistRename={handlePlaylistRename}
          onPlaylistCreate={handlePlaylistCreate}
          onTrackSelect={(id) => {
            setActiveTrackId(id);
            setIsSidebarOpen(false);
          }}
          onTrackDelete={handleTrackDelete}
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isAuthenticated={!!user}
          onLoginClick={handleLogin}
        />

        <main className="flex flex-1 flex-col min-w-0 bg-background-dark relative">
          {!activeTrack ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Icon name="library_music" className="text-6xl text-white/10 mb-4" />
              <h3 className="text-xl font-semibold text-white/60 mb-2 font-sans">
                No Track Selected
              </h3>
              <p className="text-white/40 mb-6 max-w-md font-sans">
                Upload an audio file to analyze its chord progression using AI.
                Supported formats: MP3, WAV, FLAC, AIFF, OGG, M4A.
              </p>
              {backendStatus === 'disconnected' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 max-w-md">
                  <p className="text-yellow-400 text-sm font-sans">
                    Backend server is not running. Start it with:
                  </p>
                  <code className="block mt-2 bg-black/30 rounded px-3 py-2 text-xs text-white/70 font-mono">
                    cd backend && python -m uvicorn app.main:app --reload
                  </code>
                </div>
              )}
              {backendStatus === 'connected' && !user && authChecked && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 max-w-md">
                  <p className="text-white/80 text-sm mb-4 font-sans">
                    Sign in to upload and analyze your audio files.
                  </p>
                  <button
                    onClick={handleLogin}
                    className="flex items-center gap-2 mx-auto rounded-lg bg-primary hover:bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors font-sans"
                  >
                    <Icon name="login" className="text-lg" />
                    Sign in with Google
                  </button>
                </div>
              )}
            </div>
          ) : (
            <AudioPlayer
              track={activeTrack}
              waveformData={waveformData}
              isPlaying={audioPlayer.isPlaying}
              isLoading={audioPlayer.isLoading}
              currentTime={currentTime}
              duration={duration}
              isLooping={isLooping}
              loopStart={loopStart}
              loopEnd={loopEnd}
              zoomLevel={zoomLevel}
              onPlayToggle={() => audioPlayer.toggle()}
              onSeek={handleSeek}
              onSkip={skip}
              onToggleLoop={toggleLoop}
              onSetLoopIn={setLoopIn}
              onSetLoopOut={setLoopOut}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onChordClick={handleChordClick}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
