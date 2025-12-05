import { WaveformPoint } from '../types';

export async function generateWaveformFromAudio(
  audioUrl: string,
  numPoints: number = 200
): Promise<WaveformPoint[]> {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  
  try {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPoint = Math.floor(channelData.length / numPoints);
    const duration = audioBuffer.duration;
    
    const waveformData: WaveformPoint[] = [];
    
    for (let i = 0; i < numPoints; i++) {
      const startIdx = i * samplesPerPoint;
      const endIdx = Math.min(startIdx + samplesPerPoint, channelData.length);
      
      let sum = 0;
      let max = 0;
      for (let j = startIdx; j < endIdx; j++) {
        const abs = Math.abs(channelData[j]);
        sum += abs * abs;
        if (abs > max) max = abs;
      }
      
      const rms = Math.sqrt(sum / (endIdx - startIdx));
      const amplitude = Math.min(100, Math.max(5, (rms + max * 0.5) * 80));
      
      const timePoint = (i / numPoints) * duration;
      waveformData.push({
        time: parseFloat(timePoint.toFixed(2)),
        amplitude: parseFloat(amplitude.toFixed(2)),
      });
    }
    
    return waveformData;
  } finally {
    await audioContext.close();
  }
}
