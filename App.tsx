import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Icon } from './components/Icon';
import { WaveformDisplay } from './components/WaveformDisplay';
import { ChordStrip } from './components/ChordStrip';
import { PROJECTS, CHORDS, WAVEFORM_DATA, BPM, TIME_SIGNATURE } from './constants';

const App: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<string>(PROJECTS[1].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(8); // Start at 8s
  const [duration, setDuration] = useState(143); // 2:23 in seconds
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  
  // Loop State
  const [isLooping, setIsLooping] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(143);

  // Zoom State
  const [zoomLevel, setZoomLevel] = useState(1);

  const activeProject = PROJECTS.find(p => p.id === activeProjectId) || PROJECTS[0];
  
  // Audio Loop Logic
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setCurrentTime(prev => {
          // Handle Loop
          if (isLooping && prev >= loopEnd) {
            return loopStart;
          }

          // End of Track
          if (prev >= duration) {
            // If looping is on but we are somehow past loopEnd (or loopEnd is duration), loop back
            if (isLooping) return loopStart;
            
            setIsPlaying(false);
            return prev; // Stop at end
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, isLooping, loopStart, loopEnd]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skip = (amount: number) => {
    setCurrentTime(prev => {
      const next = prev + amount;
      // If looping, respect loop bounds when skipping forward/back? 
      // Usually skip ignores loop unless it lands inside? Let's keep simple clamping.
      return Math.min(Math.max(next, 0), duration);
    });
  };

  // Loop Setters
  const toggleLoop = () => {
    if (!isLooping) {
      // If enabling loop and current time is outside default bounds, reset bounds to track
      if (loopStart === 0 && loopEnd === duration) {
         // Standard enable
      }
    }
    setIsLooping(!isLooping);
  };

  const setLoopIn = () => {
    // Ensure start is before end
    const newStart = Math.min(currentTime, loopEnd - 1); // Min 1 sec loop
    setLoopStart(Math.max(0, newStart));
    if (!isLooping) setIsLooping(true);
  };

  const setLoopOut = () => {
    // Ensure end is after start
    const newEnd = Math.max(currentTime, loopStart + 1);
    setLoopEnd(Math.min(duration, newEnd));
    if (!isLooping) setIsLooping(true);
  };

  // Zoom Handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 8)); // Max zoom 8x
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 1)); // Min zoom 1x
  };

  return (
    <div className="flex flex-col h-full bg-background-dark text-white overflow-hidden font-display">
      {/* Header */}
      <header className="flex flex-shrink-0 w-full items-center justify-between border-b border-white/10 px-4 md:px-6 py-3 bg-background-dark z-20 relative">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Mobile Menu Button */}
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
          <nav className="flex items-center gap-4 md:gap-6">
            <a href="#" className="hidden sm:block text-white/60 hover:text-white text-sm font-medium transition-colors">About</a>
            <a href="#" className="text-white/60 hover:text-white text-sm font-medium transition-colors">Help</a>
          </nav>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Backdrop (Mobile) */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar 
          projects={PROJECTS} 
          activeProjectId={activeProjectId} 
          onProjectSelect={(id) => {
            setActiveProjectId(id);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex flex-1 flex-col min-w-0 bg-background-dark relative">
          
          {/* Content Header */}
          <div className="flex flex-col pt-4 px-4 pb-2 md:pt-8 md:px-8 md:pb-4 gap-4 md:gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-2">
                <p className="tracking-tight text-xl md:text-3xl font-bold text-white truncate">{activeProject.name}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-normal text-white/60">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]"></span>
                    Analysis complete
                  </span>
                  <span className="hidden md:inline text-white/20">•</span>
                  {/* Detected Tempo/BPM */}
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5" title="Detected Tempo">
                     <Icon name="metronome" className="text-sm text-primary" />
                     <span className="text-white/90 font-mono font-medium">{BPM}</span>
                     <span className="text-[10px] uppercase tracking-wider">BPM</span>
                  </span>
                  {/* Detected Time Signature */}
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5" title="Detected Time Signature">
                     <Icon name="music_note" className="text-sm text-white/60" />
                     <span className="text-white/90 font-mono font-medium">{TIME_SIGNATURE}/4</span>
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

          {/* Visualizer Area */}
          <div className="flex-1 flex flex-col px-4 pb-4 md:px-8 min-h-0">
            <div className="flex-grow rounded-xl md:rounded-2xl bg-[#0b1117] border border-white/5 relative overflow-hidden group shadow-2xl">
              
              {/* Graph Layer */}
              <div className="absolute inset-0 z-0">
                 <WaveformDisplay 
                   data={WAVEFORM_DATA} 
                   isPlaying={isPlaying} 
                   bpm={BPM}
                   timeSignature={TIME_SIGNATURE}
                   zoomLevel={zoomLevel}
                   currentTime={currentTime}
                 />
              </div>

              {/* Controls Overlay */}
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-4 md:gap-8 pointer-events-none">
                
                {/* Zoom Controls (Top Right) */}
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

                {/* Playback Controls (Center) */}
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
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-16 h-16 md:w-24 md:h-24 bg-white text-background-dark hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-95 pl-1"
                >
                  <Icon name={isPlaying ? "pause" : "play_arrow"} filled className="text-4xl md:text-6xl" />
                </button>
                
                <button 
                  onClick={() => skip(10)}
                  className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-10 h-10 md:w-14 md:h-14 bg-black/30 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all transform hover:scale-105 active:scale-95"
                >
                  <Icon name="forward_10" className="text-xl md:text-3xl text-white/90" />
                </button>

                 {/* Placeholder for symmetry */}
                 <div className="w-8 md:w-12"></div>
              </div>

              {/* Bottom Progress Bar */}
              <div className="absolute inset-x-0 bottom-0 px-4 py-4 md:px-6 md:py-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-2 md:gap-4">
                  
                  {/* Time & Loop In */}
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
                  
                  {/* Slider Container */}
                  <div className="relative flex-1 h-6 group/slider flex items-center">
                    {/* Track Background */}
                    <div className="absolute w-full h-1 md:h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                      {/* Buffered (fake) */}
                      <div className="h-full bg-white/5 w-full origin-left scale-x-[0.8]" />
                    </div>

                    {/* Loop Region Indicator */}
                    {isLooping && (
                      <div 
                        className="absolute h-1 md:h-1.5 bg-primary/30 rounded-full pointer-events-none z-10"
                        style={{ 
                          left: `${(loopStart / duration) * 100}%`, 
                          width: `${((loopEnd - loopStart) / duration) * 100}%` 
                        }}
                      />
                    )}
                    
                    {/* Active Progress */}
                    <div 
                      className="absolute h-1 md:h-1.5 bg-primary rounded-full pointer-events-none z-20" 
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                    
                    {/* Input Range */}
                    <input
                      type="range"
                      min="0"
                      max={duration}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      className="absolute w-full h-full opacity-0 cursor-pointer z-30"
                    />
                    
                    {/* Thumb Knob */}
                    <div 
                      className="absolute h-3 w-3 md:h-4 md:w-4 bg-white rounded-full shadow-md pointer-events-none transform -translate-x-1/2 transition-transform group-hover/slider:scale-125 z-20"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    />
                    
                    {/* Loop Loop Markers (Optional visuals for handle positions) */}
                    {isLooping && (
                        <>
                          <div className="absolute w-0.5 h-2 md:h-3 bg-white/50 z-10 pointer-events-none" style={{ left: `${(loopStart / duration) * 100}%` }} />
                          <div className="absolute w-0.5 h-2 md:h-3 bg-white/50 z-10 pointer-events-none" style={{ left: `${(loopEnd / duration) * 100}%` }} />
                        </>
                    )}
                  </div>

                  {/* Time & Loop Out */}
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

          {/* Chord Strip */}
          <div className="flex-shrink-0">
            <ChordStrip 
              chords={CHORDS} 
              currentTime={currentTime} 
              onChordClick={(time) => setCurrentTime(time)}
              bpm={BPM}
              timeSignature={TIME_SIGNATURE}
            />
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;