import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { WaveformData } from '../types';

interface WaveformDisplayProps {
  data: WaveformData[];
  isPlaying: boolean;
  bpm: number;
  timeSignature: number;
  zoomLevel: number;
  currentTime: number;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({ 
  data, 
  isPlaying, 
  bpm, 
  timeSignature,
  zoomLevel,
  currentTime
}) => {
  
  // Add a simple animation effect by modifying data slightly if playing
  const displayData = useMemo(() => {
    return data.map(d => ({
      ...d,
      mirror: -d.amplitude 
    }));
  }, [data]);

  // Calculate visible domain based on zoom
  const xDomain = useMemo(() => {
    if (zoomLevel <= 1) return ['dataMin', 'dataMax'];

    const maxTime = data[data.length - 1]?.time || 0;
    const visibleDuration = maxTime / zoomLevel;
    
    // Center around currentTime
    let start = currentTime - (visibleDuration / 2);
    let end = currentTime + (visibleDuration / 2);

    // Clamp start
    if (start < 0) {
      start = 0;
      end = visibleDuration;
    }

    // Clamp end
    if (end > maxTime) {
      end = maxTime;
      start = Math.max(0, maxTime - visibleDuration);
    }

    return [start, end];
  }, [zoomLevel, currentTime, data]);

  // Generate grid markers for beats and measures
  const markers = useMemo(() => {
    const beatInterval = 60 / bpm;
    const measureInterval = beatInterval * timeSignature;
    const maxTime = data[data.length - 1]?.time || 0;
    
    const m = [];
    // Start from 0 up to max duration
    for (let t = 0; t <= maxTime; t += beatInterval) {
      // Check if this beat aligns with a measure start (allow small float tolerance)
      const isMeasure = Math.abs((t % measureInterval) - 0) < 0.05 || Math.abs((t % measureInterval) - measureInterval) < 0.05;
      m.push({ time: t, isMeasure });
    }
    return m;
  }, [data, bpm, timeSignature]);

  return (
    <div className="w-full h-full relative">
       {/* Background Grid/Lines simulation */}
       <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-full h-[1px] bg-white"></div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={displayData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorWave" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#137fec" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.8}/>
            </linearGradient>
            <linearGradient id="colorWaveMirror" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#137fec" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          {/* Apply the dynamic domain here */}
          <XAxis 
            dataKey="time" 
            hide 
            type="number" 
            domain={xDomain} 
            allowDataOverflow={true}
          />
          <YAxis hide domain={[-120, 120]} />
          
          <Tooltip cursor={false} content={() => null} />

          {/* Musical Grid Lines */}
          {markers.map((marker, i) => (
            <ReferenceLine
              key={`marker-${i}`}
              x={marker.time}
              stroke={marker.isMeasure ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)"}
              strokeDasharray={marker.isMeasure ? "" : "3 3"}
              strokeWidth={marker.isMeasure ? 1 : 0.5}
              ifOverflow="hidden" // Ensure lines don't bleed out if logic fails slightly
            />
          ))}

          <Area
            type="monotone"
            dataKey="amplitude"
            stroke="none"
            fill="url(#colorWave)"
            animationDuration={0} // Disable animation for smoother seeking/zooming
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="mirror"
            stroke="none"
            fill="url(#colorWaveMirror)"
            animationDuration={0} // Disable animation for smoother seeking/zooming
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r from-background-dark via-transparent to-background-dark pointer-events-none opacity-50`} />
    </div>
  );
};