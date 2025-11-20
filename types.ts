export interface Project {
  id: string;
  name: string;
  duration: string;
  size: string;
  status: 'completed' | 'processing' | 'error';
  type: 'wav' | 'mp3' | 'aiff';
}

export interface ChordPrediction {
  timestamp: number;
  formattedTime: string;
  chord: string;
  confidence: number;
}

export interface WaveformData {
  time: number;
  amplitude: number;
}
