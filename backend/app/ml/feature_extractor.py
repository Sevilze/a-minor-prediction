import numpy as np
import librosa
import soundfile as sf
from io import BytesIO
from typing import Tuple, Optional

from ..config import get_settings

settings = get_settings()


class AudioFeatureExtractor:
    def __init__(
        self,
        sample_rate: int = None,
        n_mels: int = None,
        n_fft: int = None,
        hop_length: int = None,
    ):
        self.sample_rate = sample_rate or settings.sample_rate
        self.n_mels = n_mels or settings.n_mels
        self.n_fft = n_fft or settings.n_fft
        self.hop_length = hop_length or settings.hop_length
        self.segment_duration = settings.segment_duration

    def load_audio(self, filepath: str) -> Tuple[np.ndarray, int]:
        audio, sr = sf.read(filepath)
        if len(audio.shape) > 1:
            audio = np.mean(audio, axis=1)
        if sr != self.sample_rate:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=self.sample_rate)
        return audio, self.sample_rate

    def load_audio_from_bytes(self, data: bytes) -> Tuple[np.ndarray, int]:
        audio, sr = sf.read(BytesIO(data))
        if len(audio.shape) > 1:
            audio = np.mean(audio, axis=1)
        if sr != self.sample_rate:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=self.sample_rate)
        return audio, self.sample_rate

    def extract_mel_spectrogram(self, audio: np.ndarray) -> np.ndarray:
        mel_spec = librosa.feature.melspectrogram(
            y=audio,
            sr=self.sample_rate,
            n_mels=self.n_mels,
            n_fft=self.n_fft,
            hop_length=self.hop_length,
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        return mel_spec_db

    def get_segment_features(
        self, audio: np.ndarray, start_time: float, duration: float = None
    ) -> Optional[np.ndarray]:
        duration = duration or self.segment_duration
        start_sample = int(start_time * self.sample_rate)
        end_sample = int((start_time + duration) * self.sample_rate)
        if start_sample < 0 or end_sample > len(audio):
            return None
        segment = audio[start_sample:end_sample]
        if len(segment) < int(duration * self.sample_rate * 0.9):
            return None
        return self.extract_mel_spectrogram(segment)


def get_audio_duration(audio: np.ndarray, sample_rate: int = None) -> float:
    sample_rate = sample_rate or settings.sample_rate
    return len(audio) / sample_rate


def generate_waveform_data(
    audio: np.ndarray, num_points: int = 150, sample_rate: int = None
) -> list:
    sample_rate = sample_rate or settings.sample_rate
    duration = len(audio) / sample_rate
    samples_per_point = len(audio) // num_points

    waveform_data = []
    for i in range(num_points):
        start_idx = i * samples_per_point
        end_idx = min(start_idx + samples_per_point, len(audio))
        segment = audio[start_idx:end_idx]

        rms = np.sqrt(np.mean(segment**2))
        amplitude = min(100, max(5, rms * 1000))

        time_point = (i / num_points) * duration
        waveform_data.append(
            {"time": round(time_point, 2), "amplitude": round(amplitude, 2)}
        )

    return waveform_data


def estimate_bpm(audio: np.ndarray, sample_rate: int = None) -> int:
    sample_rate = sample_rate or settings.sample_rate
    try:
        tempo, _ = librosa.beat.beat_track(y=audio, sr=sample_rate)
        if isinstance(tempo, np.ndarray):
            tempo = tempo[0]
        return int(round(tempo))
    except Exception:
        return 120
