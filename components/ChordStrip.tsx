import React, { useRef, useEffect } from 'react';
import { ChordPrediction } from '../types';

interface ChordStripProps {
  chords: ChordPrediction[];
  currentTime: number;
  onChordClick: (timestamp: number) => void;
  bpm: number;
  timeSignature: number;
}

export const ChordStrip: React.FC<ChordStripProps> = ({ chords, currentTime, onChordClick, bpm, timeSignature }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active chord
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeIndex = chords.findIndex(
        (c, i) => currentTime >= c.timestamp && (i === chords.length - 1 || currentTime < chords[i + 1].timestamp)
      );
      
      if (activeIndex !== -1) {
        const activeElement = scrollContainerRef.current.children[activeIndex] as HTMLElement;
        if (activeElement) {
          scrollContainerRef.current.scrollTo({
            left: activeElement.offsetLeft - scrollContainerRef.current.clientWidth / 2 + activeElement.clientWidth / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentTime, chords]);

  // Calculate measure duration in seconds
  const secondsPerMeasure = (60 / bpm) * timeSignature;

  return (
    <div className="w-full bg-background-dark border-t border-white/10 p-4 md:p-6">
      <h3 className="text-white text-sm md:text-base font-bold leading-tight mb-3 md:mb-4 flex items-center gap-2">
        Predicted Chord Progression
        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] md:text-xs font-normal">AI Generated</span>
      </h3>
      
      <div 
        ref={scrollContainerRef}
        className="relative w-full overflow-x-auto pb-2 hide-scrollbar flex gap-2 scroll-smooth"
      >
        {chords.map((chord, index) => {
          const isActive = currentTime >= chord.timestamp && (index === chords.length - 1 || currentTime < chords[index + 1].timestamp);
          
          // Calculate which bar/measure this chord falls into (1-based index)
          const measureNumber = Math.floor(chord.timestamp / secondsPerMeasure) + 1;
          
          // Determine if this chord starts exactly on a measure boundary (for visual emphasis)
          const isMeasureStart = Math.abs(chord.timestamp % secondsPerMeasure) < 0.1;

          let confidenceColor = "text-green-400";
          if (chord.confidence < 90) confidenceColor = "text-yellow-400";
          if (chord.confidence < 80) confidenceColor = "text-red-400";

          return (
            <div
              key={`${chord.chord}-${chord.timestamp}`}
              onClick={() => onChordClick(chord.timestamp)}
              className={`
                relative flex flex-col items-center flex-shrink-0 w-20 md:w-28 p-2 md:p-3 rounded-lg border transition-all duration-300 cursor-pointer group
                ${isActive 
                  ? 'bg-primary/20 border-primary scale-105 shadow-[0_0_20px_rgba(19,127,236,0.15)] z-10' 
                  : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'}
              `}
            >
              {/* Musical Bar Indicator */}
              <div className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 rounded bg-background-dark border border-white/10 text-[9px] font-mono text-white/40 ${isActive ? 'text-primary border-primary/30' : ''}`}>
                 Bar {measureNumber}
              </div>

              {/* Measure Start Left Border Accent */}
              {isMeasureStart && (
                 <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${isActive ? 'bg-primary/50' : 'bg-white/10'}`}></div>
              )}

              <p className={`mt-2 text-[10px] md:text-xs ${isActive ? 'text-white/80' : 'text-white/50'}`}>{chord.formattedTime}</p>
              <p className={`text-2xl md:text-4xl font-bold text-white my-1 md:my-2 ${isActive ? 'scale-110' : ''} transition-transform`}>
                {chord.chord}
              </p>
              <p className={`text-[10px] md:text-sm font-medium ${confidenceColor}`}>
                {chord.confidence}%
              </p>
            </div>
          );
        })}
        
        {/* Padding for end of scroll */}
        <div className="w-4 flex-shrink-0" />
      </div>
    </div>
  );
};