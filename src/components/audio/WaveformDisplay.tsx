import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { WaveformPoint } from '../../types';

interface WaveformDisplayProps {
  data: WaveformPoint[];
  isPlaying: boolean;
  bpm: number;
  timeSignature: number;
  zoomLevel: number;
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  data,
  isPlaying,
  bpm,
  timeSignature,
  zoomLevel,
  currentTime,
  duration,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const visibleRange = useMemo(() => {
    if (zoomLevel <= 1 || duration === 0) {
      return { start: 0, end: duration || data.length };
    }

    const visibleDuration = duration / zoomLevel;
    let start = currentTime - visibleDuration / 2;
    let end = currentTime + visibleDuration / 2;

    if (start < 0) {
      start = 0;
      end = visibleDuration;
    }
    if (end > duration) {
      end = duration;
      start = Math.max(0, duration - visibleDuration);
    }

    return { start, end };
  }, [zoomLevel, currentTime, duration, data.length]);

  const calculateTimeFromPosition = useCallback((clientX: number) => {
    if (!containerRef.current || duration === 0) return 0;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    const { start, end } = visibleRange;
    const timeRange = end - start;
    return start + percentage * timeRange;
  }, [duration, visibleRange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onSeek || duration === 0) return;
    isDraggingRef.current = true;
    const time = calculateTimeFromPosition(e.clientX);
    onSeek(time);
  }, [onSeek, duration, calculateTimeFromPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !onSeek) return;
    const time = calculateTimeFromPosition(e.clientX);
    onSeek(time);
  }, [onSeek, calculateTimeFromPosition]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const beatMarkers = useMemo(() => {
    if (bpm <= 0) return [];

    const beatInterval = 60 / bpm;
    const measureInterval = beatInterval * timeSignature;
    const maxTime = duration || data[data.length - 1]?.time || 0;
    const markers: { time: number; isMeasure: boolean; measureNumber: number }[] = [];

    for (let t = 0; t <= maxTime; t += beatInterval) {
      const isMeasure =
        Math.abs(t % measureInterval) < 0.05 ||
        Math.abs((t % measureInterval) - measureInterval) < 0.05;
      const measureNumber = Math.floor(t / measureInterval) + 1;
      markers.push({ time: t, isMeasure, measureNumber });
    }

    return markers;
  }, [data, bpm, timeSignature, duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const { start, end } = visibleRange;
      const timeRange = end - start;
      const centerY = rect.height / 2;
      const maxAmplitude = rect.height * 0.42;

      const filteredMarkers = beatMarkers.filter(
        (m) => m.time >= start && m.time <= end
      );

      filteredMarkers.forEach((marker) => {
        const x = ((marker.time - start) / timeRange) * rect.width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.strokeStyle = marker.isMeasure
          ? 'rgba(255, 255, 255, 0.15)'
          : 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = marker.isMeasure ? 1 : 0.5;
        if (!marker.isMeasure) {
          ctx.setLineDash([3, 3]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (marker.isMeasure && zoomLevel > 1.5) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = '10px system-ui';
          ctx.fillText(`${marker.measureNumber}`, x + 4, 14);
        }
      });

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(rect.width, centerY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const visibleData = data.filter(
        (d) => d.time >= start && d.time <= end
      );

      if (visibleData.length < 2) return;

      const barWidth = Math.max(2, (rect.width / visibleData.length) * 0.7);

      const playedX = duration > 0
        ? ((currentTime - start) / timeRange) * rect.width
        : 0;

      visibleData.forEach((point) => {
        const x = ((point.time - start) / timeRange) * rect.width;
        const normalizedAmplitude = point.amplitude / 100;
        const height = normalizedAmplitude * maxAmplitude;

        const isPast = x <= playedX;

        const gradientTop = ctx.createLinearGradient(x, centerY - height, x, centerY);
        const gradientBottom = ctx.createLinearGradient(x, centerY, x, centerY + height);

        if (isPast) {
          gradientTop.addColorStop(0, 'rgba(19, 127, 236, 0.95)');
          gradientTop.addColorStop(1, 'rgba(168, 85, 247, 0.8)');
          gradientBottom.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
          gradientBottom.addColorStop(1, 'rgba(19, 127, 236, 0.15)');
        } else {
          gradientTop.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          gradientTop.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
          gradientBottom.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          gradientBottom.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
        }

        ctx.fillStyle = gradientTop;
        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, centerY - height, barWidth, height, 1);
        ctx.fill();

        ctx.fillStyle = gradientBottom;
        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, centerY, barWidth, height * 0.6, 1);
        ctx.fill();
      });

      if (duration > 0 && playedX > 0 && playedX < rect.width) {
        ctx.beginPath();
        ctx.moveTo(playedX, 0);
        ctx.lineTo(playedX, rect.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(playedX, centerY, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(playedX, centerY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#137fec';
        ctx.fill();
      }
    };

    if (isPlaying) {
      const animate = () => {
        draw();
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, visibleRange, beatMarkers, currentTime, duration, isPlaying, zoomLevel]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.style.width = `${rect.width}px`;
        canvasRef.current.style.height = `${rect.height}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (data.length === 0) {
    return (
      <div 
        ref={containerRef} 
        className="w-full h-full relative flex items-center justify-center"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end gap-1 h-24">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white/10 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.sin(i * 0.3) * 15 + Math.random() * 10}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/60 via-transparent to-background-dark/60 pointer-events-none" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full relative ${onSeek && duration > 0 ? 'cursor-pointer' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background-dark/60 via-transparent to-background-dark/60 pointer-events-none" />
    </div>
  );
};
