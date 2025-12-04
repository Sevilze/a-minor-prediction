export interface AudioTrack {
  id: string;
  name: string;
  duration: string;
  durationSeconds: number;
  size: string;
  status: "completed" | "processing" | "error";
  type: "wav" | "mp3" | "aiff" | "flac" | "ogg" | "m4a";
  bpm: number;
  timeSignature: number;
  chords: ChordPrediction[];
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tracks: AudioTrack[];
}

export interface ChordPrediction {
  timestamp: number;
  formattedTime: string;
  chord: string;
  confidence: number;
}

export interface WaveformPoint {
  time: number;
  amplitude: number;
}

export interface PlaylistData {
  playlist: Playlist;
  activeTrackId: string | null;
}

export type BackendStatus = "connected" | "disconnected" | "checking";
