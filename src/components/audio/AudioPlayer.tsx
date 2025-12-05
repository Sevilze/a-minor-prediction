import React from 'react';
import { Icon } from '../ui/Icon';
import { WaveformDisplay } from './WaveformDisplay';
import { ChordStrip } from './ChordStrip';
import { WaveformPoint, AudioTrack } from '../../types';
import { formatTime } from '../../utils/format';

interface AudioPlayerProps {
  track: AudioTrack;
  waveformData: WaveformPoint[];
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  loopStart: number;
  loopEnd: number;
  zoomLevel: number;
  onPlayToggle: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onToggleLoop: () => void;
  onSetLoopIn: () => void;
  onSetLoopOut: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onChordClick: (timestamp: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  waveformData,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  isLooping,
  loopStart,
  loopEnd,
  zoomLevel,
  onPlayToggle,
  onSeek,
  onSkip,
  onToggleLoop,
  onSetLoopIn,
  onSetLoopOut,
  onZoomIn,
  onZoomOut,
  onChordClick,
}) => {
  const bpm = track.bpm || 120;
  const timeSignature = track.timeSignature || 4;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    onSeek(time);
  };

  return (
    <>
      <div className="flex flex-col pt-4 px-4 pb-2 md:pt-8 md:px-8 md:pb-4 gap-4 md:gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="tracking-tight text-xl md:text-3xl font-bold text-white truncate font-sans">
              {track.name}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-normal text-white/60 font-sans">
              <span className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    track.status === 'completed'
                      ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]'
                      : track.status === 'processing'
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-red-400'
                  }`}
                />
                {track.status === 'completed'
                  ? 'Analysis complete'
                  : track.status === 'processing'
                  ? 'Processing...'
                  : 'Error'}
              </span>
              <span className="hidden md:inline text-white/20">-</span>
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5"
                title="Detected Tempo"
              >
                <Icon name="speed" className="text-sm text-primary" />
                <span className="text-white/90 font-mono font-medium">{bpm}</span>
                <span className="text-[10px] uppercase tracking-wider">BPM</span>
              </span>
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5"
                title="Detected Time Signature"
              >
                <Icon name="music_note" className="text-sm text-white/60" />
                <span className="text-white/90 font-mono font-medium">
                  {timeSignature}/4
                </span>
                <span className="text-[10px] uppercase tracking-wider">Time</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none justify-center flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 md:px-4 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95 font-sans">
              <Icon name="content_copy" className="text-lg" />
              <span className="hidden sm:inline">Copy Chords</span>
              <span className="sm:hidden">Copy</span>
            </button>
            <button className="flex-1 md:flex-none justify-center flex items-center gap-2 rounded-lg bg-primary hover:bg-blue-600 px-3 py-2 md:px-4 text-sm font-semibold text-white transition-colors shadow-lg shadow-primary/20 font-sans">
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
              duration={duration}
              onSeek={onSeek}
            />
          </div>

          <div className="absolute inset-0 z-10 flex items-center justify-center gap-4 md:gap-8 pointer-events-none">
            <div className="absolute top-4 right-4 flex items-center bg-black/40 backdrop-blur-md rounded-lg border border-white/10 pointer-events-auto">
              <button
                onClick={onZoomOut}
                disabled={zoomLevel <= 1}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-l-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Zoom Out"
              >
                <Icon name="zoom_out" className="text-xl" />
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button
                onClick={onZoomIn}
                disabled={zoomLevel >= 8}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-r-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Zoom In"
              >
                <Icon name="zoom_in" className="text-xl" />
              </button>
            </div>

            <button
              onClick={onToggleLoop}
              className={`pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-8 h-8 md:w-12 md:h-12 border transition-all transform hover:scale-105 active:scale-95 ${
                isLooping
                  ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(19,127,236,0.5)]'
                  : 'bg-black/30 backdrop-blur-md border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              title="Toggle Loop"
            >
              <Icon name="repeat" className="text-lg md:text-2xl" />
            </button>

            <button
              onClick={() => onSkip(-10)}
              className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-10 h-10 md:w-14 md:h-14 bg-black/30 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all transform hover:scale-105 active:scale-95"
            >
              <Icon name="replay_10" className="text-xl md:text-3xl text-white/90" />
            </button>

            <button
              onClick={onPlayToggle}
              disabled={duration === 0 || isLoading}
              className="pointer-events-auto flex flex-col shrink-0 items-center justify-center rounded-full w-16 h-16 md:w-24 md:h-24 bg-white text-background-dark hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 relative"
            >
              {isLoading ? (
                <>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
                  <div className="absolute -bottom-8 md:-bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[10px] md:text-xs font-medium text-white/70 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                      Loading audio...
                    </span>
                  </div>
                </>
              ) : (
                <Icon
                  name={isPlaying ? 'pause' : 'play_arrow'}
                  filled
                  className="text-4xl md:text-6xl pl-1"
                />
              )}
            </button>

            <button
              onClick={() => onSkip(10)}
              className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full w-10 h-10 md:w-14 md:h-14 bg-black/30 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all transform hover:scale-105 active:scale-95"
            >
              <Icon name="forward_10" className="text-xl md:text-3xl text-white/90" />
            </button>

            <div className="w-8 md:w-12" />
          </div>

          <div className="absolute inset-x-0 bottom-0 px-4 py-4 md:px-6 md:py-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-[10px] md:text-xs font-mono font-medium text-white/80 w-8 md:w-10 text-right">
                  {formatTime(currentTime)}
                </span>
                <button
                  onClick={onSetLoopIn}
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
                      width: `${
                        duration > 0 ? ((loopEnd - loopStart) / duration) * 100 : 0
                      }%`,
                    }}
                  />
                )}

                <div
                  className="absolute h-1 md:h-1.5 bg-primary rounded-full pointer-events-none z-20"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
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
                  style={{
                    left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />

                {isLooping && duration > 0 && (
                  <>
                    <div
                      className="absolute w-0.5 h-2 md:h-3 bg-white/50 z-10 pointer-events-none"
                      style={{ left: `${(loopStart / duration) * 100}%` }}
                    />
                    <div
                      className="absolute w-0.5 h-2 md:h-3 bg-white/50 z-10 pointer-events-none"
                      style={{ left: `${(loopEnd / duration) * 100}%` }}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={onSetLoopOut}
                  className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                  title="Set Loop End"
                >
                  <Icon name="keyboard_tab" className="text-xs md:text-sm" />
                </button>
                <span className="text-[10px] md:text-xs font-mono font-medium text-white/50 w-8 md:w-10">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        <ChordStrip
          chords={track.chords}
          currentTime={currentTime}
          onChordClick={onChordClick}
          bpm={bpm}
          timeSignature={timeSignature}
        />
      </div>
    </>
  );
};
