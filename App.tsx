import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Icon } from './components/Icon';
import { WaveformDisplay } from './components/WaveformDisplay';
import { ChordStrip } from './components/ChordStrip';
import { Project, ChordPrediction, WaveformData } from './types';
import api, { ApiProject, ApiChordPrediction, ApiWaveformData } from './services/api';
import authService, { AuthUser } from './services/auth';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { generateWaveformData } from './constants';

const mapApiProjectToProject = (apiProject: ApiProject): Project => ({
  id: apiProject.id,
  name: apiProject.name,
  duration: apiProject.duration,
  durationSeconds: apiProject.duration_seconds,
  size: apiProject.size,
  status: apiProject.status as 'completed' | 'processing' | 'error',
  type: apiProject.type as Project['type'],
  bpm: apiProject.bpm,
  timeSignature: apiProject.time_signature,
});

const mapApiChords = (chords: ApiChordPrediction[]): ChordPrediction[] =>
  chords.map(c => ({
    timestamp: c.timestamp,
    formattedTime: c.formatted_time,
    chord: c.chord,
    confidence: c.confidence,
  }));

const mapApiWaveform = (waveform: ApiWaveformData[]): WaveformData[] =>
  waveform.map(w => ({
    time: w.time,
    amplitude: w.amplitude,
  }));

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectData, setActiveProjectData] = useState<{
    chords: ChordPrediction[];
    waveform: WaveformData[];
  } | null>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const duration = activeProject?.durationSeconds || 0;
  const bpm = activeProject?.bpm || 120;
  const timeSignature = activeProject?.timeSignature || 4;
  const chords = activeProjectData?.chords || [];
  const waveformData = activeProjectData?.waveform || generateWaveformData(150);

  const audioPlayerRef = useRef<{
    seek: (time: number) => void;
    play: () => Promise<void>;
  } | null>(null);

  const handleTimeUpdate = useCallback((time: number) => {
    if (isLooping && time >= loopEnd) {
      audioPlayerRef.current?.seek(loopStart);
    } else {
      setCurrentTime(time);
    }
  }, [isLooping, loopStart, loopEnd]);

  const handleAudioEnded = useCallback(() => {
    if (isLooping) {
      audioPlayerRef.current?.seek(loopStart);
      audioPlayerRef.current?.play();
    }
  }, [isLooping, loopStart]);

  const audioPlayer = useAudioPlayer({
    projectId: activeProjectId,
    onTimeUpdate: handleTimeUpdate,
    onEnded: handleAudioEnded,
    onError: (err) => setError(err),
  });

  audioPlayerRef.current = audioPlayer;

  const isPlaying = audioPlayer.isPlaying;

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
    const loadProjects = async () => {
      if (backendStatus !== 'connected' || !authChecked) return;
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await api.listProjects();
        const mappedProjects = response.projects.map(p => ({
          id: p.id,
          name: p.name,
          duration: p.duration,
          size: p.size,
          status: p.status as 'completed' | 'processing' | 'error',
          type: p.type as Project['type'],
        }));
        setProjects(mappedProjects);
        
        if (mappedProjects.length > 0 && !activeProjectId) {
          setActiveProjectId(mappedProjects[0].id);
        }
      } catch (err) {
        setError('Failed to load projects');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProjects();
  }, [backendStatus, authChecked, user]);

  useEffect(() => {
    const loadProjectData = async () => {
      if (!activeProjectId || backendStatus !== 'connected') return;
      
      try {
        const response = await api.getProject(activeProjectId);
        const project = mapApiProjectToProject(response.project);
        
        setProjects(prev => prev.map(p => 
          p.id === activeProjectId ? { ...p, ...project } : p
        ));
        
        setActiveProjectData({
          chords: mapApiChords(response.chords),
          waveform: mapApiWaveform(response.waveform),
        });
        
        setCurrentTime(0);
        setLoopStart(0);
        setLoopEnd(response.project.duration_seconds);
      } catch (err) {
        console.error('Failed to load project data:', err);
      }
    };
    
    loadProjectData();
  }, [activeProjectId, backendStatus]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (backendStatus !== 'connected') {
      setError('Backend is not connected. Please start the server.');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const response = await api.uploadAudio(file);
      const project = mapApiProjectToProject(response.project);
      
      setProjects(prev => [project, ...prev]);
      setActiveProjectId(project.id);
      setActiveProjectData({
        chords: mapApiChords(response.chords),
        waveform: mapApiWaveform(response.waveform),
      });
      
      setCurrentTime(0);
      setLoopStart(0);
      setLoopEnd(response.project.duration_seconds);
      setIsSidebarOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [backendStatus]);

  const handleProjectDelete = useCallback(async (projectId: string) => {
    if (backendStatus !== 'connected') return;
    
    try {
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      if (activeProjectId === projectId) {
        const remaining = projects.filter(p => p.id !== projectId);
        setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) {
          setActiveProjectData(null);
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }, [activeProjectId, projects, backendStatus]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    audioPlayer.seek(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 8));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 1));

  const handleLogin = () => {
    window.location.href = api.getLoginUrl();
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setProjects([]);
    setActiveProjectId(null);
    setActiveProjectData(null);
  };

  return (
    <div className="flex flex-col h-full bg-background-dark text-white overflow-hidden font-display">
      <header className="flex flex-shrink-0 w-full items-center justify-between border-b border-white/10 px-4 md:px-6 py-3 bg-background-dark z-20 relative">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-1 -ml-2 text-white/80 hover:text-white"
          >
            <Icon name="menu" className="text-2xl" />
          </button>

          <div className="size-8 text-primary bg-primary/10 p-1.5 rounded-lg flex-shrink-0">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M13.8261 17.4264C16.7203 18.1174 20.2244 18.5217 24 18.5217C27.7756 18.5217 31.2797 18.1174 34.1739 17.4264C36.9144 16.7722 39.9967 15.2331 41.3563 14.1648L24.8486 40.6391C24.4571 41.267 23.5429 41.267 23.1514 40.6391L6.64374 14.1648C8.00331 15.2331 11.0856 16.7722 13.8261 17.4264Z" fill="currentColor"></path>
              <path clipRule="evenodd" d="M39.998 12.236C39.9944 12.2537 39.9875 12.2845 39.9748 12.3294C39.9436 12.4399 39.8949 12.5741 39.8346 12.7175C39.8168 12.7597 39.7989 12.8007 39.7813 12.8398C38.5103 13.7113 35.9788 14.9393 33.7095 15.4811C30.9875 16.131 27.6413 16.5217 24 16.5217C20.3587 16.5217 17.0125 16.131 14.2905 15.4811C12.0012 14.9346 9.44505 13.6897 8.18538 12.8168C8.17384 12.7925 8.16216 12.767 8.15052 12.7408C8.09919 12.6249 8.05721 12.5114 8.02977 12.411C8.00356 12.3152 8.00039 12.2667 8.00004 12.2612C8.00004 12.261 8 12.2607 8.00004 12.2612C8.00004 12.2359 8.0104 11.9233 8.68485 11.3686C9.34546 10.8254 10.4222 10.2469 11.9291 9.72276C14.9242 8.68098 19.1919 8 24 8C28.8081 8 33.0758 8.68098 36.0709 9.72276C37.5778 10.2469 38.6545 10.8254 39.3151 11.3686C39.9006 11.8501 39.9857 12.1489 39.998 12.236ZM4.95178 15.2312L21.4543 41.6973C22.6288 43.5809 25.3712 43.5809 26.5457 41.6973L43.0534 15.223C43.0709 15.1948 43.0878 15.1662 43.104 15.1371L41.3563 14.1648C43.104 15.1371 43.1038 15.1374 43.104 15.1371L43.1051 15.135L43.1065 15.1325L43.1101 15.1261L43.1199 15.1082C43.1276 15.094 43.1377 15.0754 43.1497 15.0527C43.1738 15.0075 43.2062 14.9455 43.244 14.8701C43.319 14.7208 43.4196 14.511 43.5217 14.2683C43.6901 13.8679 44 13.0689 44 12.2609C44 10.5573 43.003 9.22254 41.8558 8.2791C40.6947 7.32427 39.1354 6.55361 37.385 5.94477C33.8654 4.72057 29.133 4 24 4C18.867 4 14.1346 4.72057 10.615 5.94478C8.86463 6.55361 7.30529 7.32428 6.14419 8.27911C4.99695 9.22255 3.99999 10.5573 3.99999 12.2609C3.99999 13.1275 4.29264 13.9078 4.49321 14.3607C4.60375 14.6102 4.71348 14.8196 4.79687 14.9689C4.83898 15.0444 4.87547 15.1065 4.9035 15.1529C4.91754 15.1762 4.92954 15.1957 4.93916 15.2111L4.94662 15.223L4.95178 15.2312ZM35.9868 18.996L24 38.22L12.0131 18.996C12.4661 19.1391 12.9179 19.2658 13.3617 19.3718C16.4281 20.1039 20.0901 20.5217 24 20.5217C27.9099 20.5217 31.5719 20.1039 34.6383 19.3718C35.082 19.2658 35.5339 19.1391 35.9868 18.996Z" fill="currentColor" fillRule="evenodd"></path>
            </svg>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">ChordAI</h2>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' : 
              backendStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-xs text-white/50 hidden sm:inline">
              {backendStatus === 'connected' ? 'API Connected' : 
               backendStatus === 'checking' ? 'Connecting...' : 'API Offline'}
            </span>
          </div>
          <nav className="flex items-center gap-4 md:gap-6">
            <a href="#" className="hidden sm:block text-white/60 hover:text-white text-sm font-medium transition-colors">About</a>
            <a href="#" className="text-white/60 hover:text-white text-sm font-medium transition-colors">Help</a>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {user.picture_url ? (
                    <img src={user.picture_url} alt={user.name} className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-white/80 hidden md:inline">{user.name}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-white/60 hover:text-white text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : authChecked && backendStatus === 'connected' ? (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 rounded-lg bg-primary hover:bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors"
              >
                <Icon name="login" className="text-lg" />
                Sign In
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
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

        <Sidebar 
          projects={projects} 
          activeProjectId={activeProjectId} 
          onProjectSelect={(id) => {
            setActiveProjectId(id);
            setIsSidebarOpen(false);
          }}
          onProjectDelete={handleProjectDelete}
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isAuthenticated={!!user}
          onLoginClick={handleLogin}
        />

        <main className="flex flex-1 flex-col min-w-0 bg-background-dark relative">
          {!activeProject ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Icon name="library_music" className="text-6xl text-white/10 mb-4" />
              <h3 className="text-xl font-semibold text-white/60 mb-2">No Project Selected</h3>
              <p className="text-white/40 mb-6 max-w-md">
                Upload an audio file to analyze its chord progression using AI. 
                Supported formats: MP3, WAV, FLAC, AIFF, OGG, M4A.
              </p>
              {backendStatus === 'disconnected' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 max-w-md">
                  <p className="text-yellow-400 text-sm">
                    Backend server is not running. Start it with:
                  </p>
                  <code className="block mt-2 bg-black/30 rounded px-3 py-2 text-xs text-white/70 font-mono">
                    cd backend && python -m uvicorn app.main_aws:app --reload
                  </code>
                </div>
              )}
              {backendStatus === 'connected' && !user && authChecked && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 max-w-md">
                  <p className="text-white/80 text-sm mb-4">
                    Sign in to upload and analyze your audio files.
                  </p>
                  <button 
                    onClick={handleLogin}
                    className="flex items-center gap-2 mx-auto rounded-lg bg-primary hover:bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors"
                  >
                    <Icon name="login" className="text-lg" />
                    Sign in with Google
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col pt-4 px-4 pb-2 md:pt-8 md:px-8 md:pb-4 gap-4 md:gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <p className="tracking-tight text-xl md:text-3xl font-bold text-white truncate">{activeProject.name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-normal text-white/60">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          activeProject.status === 'completed' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]' :
                          activeProject.status === 'processing' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                        }`}></span>
                        {activeProject.status === 'completed' ? 'Analysis complete' :
                         activeProject.status === 'processing' ? 'Processing...' : 'Error'}
                      </span>
                      <span className="hidden md:inline text-white/20">-</span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5" title="Detected Tempo">
                         <Icon name="metronome" className="text-sm text-primary" />
                         <span className="text-white/90 font-mono font-medium">{bpm}</span>
                         <span className="text-[10px] uppercase tracking-wider">BPM</span>
                      </span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5" title="Detected Time Signature">
                         <Icon name="music_note" className="text-sm text-white/60" />
                         <span className="text-white/90 font-mono font-medium">{timeSignature}/4</span>
                         <span className="text-[10px] uppercase tracking-wider">Time</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none justify-center flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 md:px-4 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95">
                      <Icon name="content_copy" className="text-lg" /> 
                      <span className="hidden sm:inline">Copy Chords</span>
                      <span className="sm:hidden">Copy</span>
                    </button>
                    <button className="flex-1 md:flex-none justify-center flex items-center gap-2 rounded-lg bg-primary hover:bg-blue-600 px-3 py-2 md:px-4 text-sm font-semibold text-white transition-colors shadow-lg shadow-primary/20">
                      <Icon name="download" className="text-lg" /> 
                      <span className="hidden sm:inline">Export MIDI</span>
                      <span className="sm:hidden">Export</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col px-4 pb-4 md:px-8 min-h-0">
                <div className="flex-grow rounded-xl md:rounded-2xl bg-[#0b1117] border border-white/5 relative overflow-hidden group shadow-2xl">
                  
                  <div className="absolute inset-0 z-0">
                     <WaveformDisplay 
                       data={waveformData} 
                       isPlaying={isPlaying} 
                       bpm={bpm}
                       timeSignature={timeSignature}
                       zoomLevel={zoomLevel}
                       currentTime={currentTime}
                     />
                  </div>

                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-4 md:gap-8 pointer-events-none">
                    
                    <div className="absolute top-4 right-4 flex items-center bg-black/40 backdrop-blur-md rounded-lg border border-white/10 pointer-events-auto">
                      <button 
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 1}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-l-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Zoom Out"
                      >
                        <Icon name="zoom_out" className="text-xl" />
                      </button>
                      <div className="w-px h-4 bg-white/10"></div>
                      <button 
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 8}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-r-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        title="Zoom In"
                      >
                        <Icon name="zoom_in" className="text-xl" />
                      </button>
                    </div>

                    <button 
                      onClick={toggleLoop}
                      className={`pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-8 h-8 md:w-12 md:h-12 border transition-all transform hover:scale-105 active:scale-95 ${isLooping ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(19,127,236,0.5)]' : 'bg-black/30 backdrop-blur-md border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                      title="Toggle Loop"
                    >
                      <Icon name="repeat" className="text-lg md:text-2xl" />
                    </button>

                    <button 
                      onClick={() => skip(-10)}
                      className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-10 h-10 md:w-14 md:h-14 bg-black/30 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all transform hover:scale-105 active:scale-95"
                    >
                      <Icon name="replay_10" className="text-xl md:text-3xl text-white/90" />
                    </button>
                    
                    <button 
                      onClick={() => audioPlayer.toggle()}
                      disabled={duration === 0 || audioPlayer.isLoading}
                      className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-16 h-16 md:w-24 md:h-24 bg-white text-background-dark hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-95 pl-1 disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {audioPlayer.isLoading ? (
                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-full border-4 border-gray-300 border-t-gray-600 animate-spin" />
                      ) : (
                        <Icon name={isPlaying ? "pause" : "play_arrow"} filled className="text-4xl md:text-6xl" />
                      )}
                    </button>
                    
                    <button 
                      onClick={() => skip(10)}
                      className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-10 h-10 md:w-14 md:h-14 bg-black/30 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all transform hover:scale-105 active:scale-95"
                    >
                      <Icon name="forward_10" className="text-xl md:text-3xl text-white/90" />
                    </button>

                     <div className="w-8 md:w-12"></div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 px-4 py-4 md:px-6 md:py-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2 md:gap-4">
                      
                      <div className="flex items-center gap-1 md:gap-2">
                        <span className="text-[10px] md:text-xs font-mono font-medium text-white/80 w-8 md:w-10 text-right">{formatTime(currentTime)}</span>
                        <button 
                          onClick={setLoopIn}
                          className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                          title="Set Loop Start"
                        >
                          <Icon name="keyboard_tab_rtl" className="text-xs md:text-sm" />
                        </button>
                      </div>
                      
                      <div className="relative flex-1 h-6 group/slider flex items-center">
                        <div className="absolute w-full h-1 md:h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                          <div className="h-full bg-white/5 w-full origin-left scale-x-[0.8]" />
                        </div>

                        {isLooping && (
                          <div 
                            className="absolute h-1 md:h-1.5 bg-primary/30 rounded-full pointer-events-none z-10"
                            style={{ 
                              left: `${duration > 0 ? (loopStart / duration) * 100 : 0}%`, 
                              width: `${duration > 0 ? ((loopEnd - loopStart) / duration) * 100 : 0}%` 
                            }}
                          />
                        )}
                        
                        <div 
                          className="absolute h-1 md:h-1.5 bg-primary rounded-full pointer-events-none z-20" 
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                        
                        <input
                          type="range"
                          min="0"
                          max={duration || 1}
                          step="0.1"
                          value={currentTime}
                          onChange={handleSeek}
                          disabled={duration === 0}
                          className="absolute w-full h-full opacity-0 cursor-pointer z-30 disabled:cursor-not-allowed"
                        />
                        
                        <div 
                          className="absolute h-3 w-3 md:h-4 md:w-4 bg-white rounded-full shadow-md pointer-events-none transform -translate-x-1/2 transition-transform group-hover/slider:scale-125 z-20"
                          style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                        
                        {isLooping && duration > 0 && (
                            <>
                              <div className="absolute w-0.5 h-2 md:h-3 bg-white/50 z-10 pointer-events-none" style={{ left: `${(loopStart / duration) * 100}%` }} />
                              <div className="absolute w-0.5 h-2 md:h-3 bg-white/50 z-10 pointer-events-none" style={{ left: `${(loopEnd / duration) * 100}%` }} />
                            </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 md:gap-2">
                        <button 
                          onClick={setLoopOut}
                          className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                          title="Set Loop End"
                        >
                          <Icon name="keyboard_tab" className="text-xs md:text-sm" />
                        </button>
                        <span className="text-[10px] md:text-xs font-mono font-medium text-white/50 w-8 md:w-10">{formatTime(duration)}</span>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0">
                <ChordStrip 
                  chords={chords} 
                  currentTime={currentTime} 
                  onChordClick={(time) => setCurrentTime(time)}
                  bpm={bpm}
                  timeSignature={timeSignature}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;