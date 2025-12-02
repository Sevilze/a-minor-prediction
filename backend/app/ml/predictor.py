import os
import torch
import numpy as np
from typing import List, Tuple, Optional

from .model import ChordCRNN
from .vocabulary import ChordVocabulary
from .feature_extractor import AudioFeatureExtractor
from ..config import get_settings

settings = get_settings()

_predictor: Optional["ChordPredictor"] = None


class ChordPredictor:
    def __init__(
        self, model_path: str = None, vocab_path: str = None, device: str = None
    ):
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        self.extractor = AudioFeatureExtractor()

        if vocab_path and os.path.exists(vocab_path):
            self.vocab = ChordVocabulary.load(vocab_path)
        else:
            self.vocab = ChordVocabulary()

        self.model = ChordCRNN(num_classes=self.vocab.num_classes)

        if model_path and os.path.exists(model_path):
            checkpoint = torch.load(
                model_path, map_location=self.device, weights_only=False
            )
            self.model.load_state_dict(checkpoint["model_state_dict"])
            print(f"[ChordAI] Model loaded from {model_path}")
        else:
            print(
                "[ChordAI] No model checkpoint found, using untrained model (demo mode)"
            )

        self.model.to(self.device)
        self.model.eval()

    def predict_segment(
        self, audio: np.ndarray, start_time: float, duration: float = 0.5
    ) -> Tuple[str, float]:
        features = self.extractor.get_segment_features(audio, start_time, duration)
        if features is None:
            return "N", 0.0

        features = (features - features.mean()) / (features.std() + 1e-8)
        features_tensor = (
            torch.FloatTensor(features).unsqueeze(0).unsqueeze(0).to(self.device)
        )

        with torch.no_grad():
            outputs = self.model(features_tensor)
            probs = torch.softmax(outputs, dim=1)
            confidence, predicted = probs.max(1)

        return self.vocab.decode(predicted.item()), confidence.item()

    def predict_audio(self, audio: np.ndarray, hop_duration: float = 2.0) -> List[dict]:
        duration = len(audio) / self.extractor.sample_rate
        predictions = []
        t = 0.0

        while t + hop_duration <= duration:
            chord, confidence = self.predict_segment(audio, t, hop_duration)
            mins = int(t // 60)
            secs = int(t % 60)
            predictions.append(
                {
                    "timestamp": t,
                    "formatted_time": f"{mins}:{secs:02d}",
                    "chord": chord,
                    "confidence": round(confidence * 100, 1),
                }
            )
            t += hop_duration

        return predictions


def load_model() -> ChordPredictor:
    global _predictor
    if _predictor is None:
        model_path = settings.model_checkpoint_path
        vocab_path = settings.vocab_path

        _predictor = ChordPredictor(
            model_path=str(model_path) if model_path.exists() else None,
            vocab_path=str(vocab_path) if vocab_path.exists() else None,
        )
    return _predictor


def get_predictor() -> ChordPredictor:
    global _predictor
    if _predictor is None:
        load_model()
    return _predictor
