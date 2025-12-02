export interface Project {
  id: string;
  name: string;
  duration: string;
  durationSeconds?: number;
  size: string;
  status: "completed" | "processing" | "error";
  type: "wav" | "mp3" | "aiff" | "flac" | "ogg" | "m4a";
  bpm?: number;
  timeSignature?: number;
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

export interface ProjectData {
  project: Project;
  chords: ChordPrediction[];
  waveform: WaveformData[];
}
