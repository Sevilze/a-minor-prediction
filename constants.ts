import { Project, ChordPrediction, WaveformData } from './types';

export const BPM = 120;
export const TIME_SIGNATURE = 4;

export const PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Jazzy Blues Riff.wav',
    duration: '1:15',
    size: '12.6 MB',
    status: 'completed',
    type: 'wav',
  },
  {
    id: '2',
    name: 'Acoustic Melody.mp3',
    duration: '2:23',
    size: '4.1 MB',
    status: 'completed',
    type: 'mp3',
  },
  {
    id: '3',
    name: 'Synthwave Loop.aiff',
    duration: '0:45',
    size: '8.2 MB',
    status: 'processing',
    type: 'aiff',
  },
  {
    id: '4',
    name: 'Rock Anthem Intro.wav',
    duration: '0:32',
    size: '5.4 MB',
    status: 'error',
    type: 'wav',
  },
];

export const CHORDS: ChordPrediction[] = [
  { timestamp: 0, formattedTime: '0:00', chord: 'Am', confidence: 98 },
  { timestamp: 4, formattedTime: '0:04', chord: 'G', confidence: 95 },
  { timestamp: 8, formattedTime: '0:08', chord: 'C', confidence: 99 },
  { timestamp: 12, formattedTime: '0:12', chord: 'Fmaj7', confidence: 92 },
  { timestamp: 16, formattedTime: '0:16', chord: 'Am', confidence: 97 },
  { timestamp: 20, formattedTime: '0:20', chord: 'G', confidence: 96 },
  { timestamp: 24, formattedTime: '0:24', chord: 'C', confidence: 88 },
  { timestamp: 28, formattedTime: '0:28', chord: 'E7', confidence: 75 },
  { timestamp: 32, formattedTime: '0:32', chord: 'Am', confidence: 94 },
  { timestamp: 36, formattedTime: '0:36', chord: 'Dm', confidence: 89 },
  { timestamp: 40, formattedTime: '0:40', chord: 'G7', confidence: 91 },
  { timestamp: 44, formattedTime: '0:44', chord: 'Cmaj7', confidence: 96 },
  { timestamp: 48, formattedTime: '0:48', chord: 'F', confidence: 93 },
  { timestamp: 52, formattedTime: '0:52', chord: 'Bdim', confidence: 82 },
];

// Generate smoother random waveform data
export const generateWaveformData = (points: number): WaveformData[] => {
  const data: WaveformData[] = [];
  let prev = 50;
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * 30;
    let val = prev + change;
    // Keep within bounds and ensure it looks like audio (center bias)
    if (val < 10) val = 10 + Math.random() * 10;
    if (val > 90) val = 90 - Math.random() * 10;
    
    // Add some periodic structure to look more like music
    const periodic = Math.sin(i / 5) * 20;
    
    data.push({
      time: i,
      amplitude: Math.max(5, Math.min(100, val + periodic)),
    });
    prev = val;
  }
  return data;
};

export const WAVEFORM_DATA = generateWaveformData(150);