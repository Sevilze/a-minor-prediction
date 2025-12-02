import json
from typing import Dict


class ChordVocabulary:
    ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    ROOT_ALIASES = {
        "Db": "C#",
        "Eb": "D#",
        "Fb": "E",
        "Gb": "F#",
        "Ab": "G#",
        "Bb": "A#",
        "Cb": "B",
    }
    QUALITIES = ["maj", "min", "dim", "aug", "7", "maj7", "min7", "dim7"]

    def __init__(self):
        self.chord_to_idx: Dict[str, int] = {"N": 0}
        self.idx_to_chord: Dict[int, str] = {0: "N"}
        idx = 1
        for root in self.ROOTS:
            for quality in self.QUALITIES:
                chord = f"{root}{quality}"
                self.chord_to_idx[chord] = idx
                self.idx_to_chord[idx] = chord
                idx += 1
        self.num_classes = len(self.chord_to_idx)

    def normalize_chord(self, chord: str) -> str:
        if not chord or chord in ["N", "X", ""]:
            return "N"
        for alias, canonical in self.ROOT_ALIASES.items():
            if chord.startswith(alias):
                chord = canonical + chord[len(alias) :]
                break
        root = None
        for r in sorted(self.ROOTS, key=len, reverse=True):
            if chord.startswith(r):
                root = r
                break
        if not root:
            return "N"
        suffix = chord[len(root) :].lower()
        if "maj7" in suffix or "M7" in chord[len(root) :]:
            quality = "maj7"
        elif "min7" in suffix or "m7" in suffix:
            quality = "min7"
        elif "dim7" in suffix:
            quality = "dim7"
        elif "7" in suffix:
            quality = "7"
        elif "dim" in suffix:
            quality = "dim"
        elif "aug" in suffix:
            quality = "aug"
        elif "min" in suffix or "m" in suffix:
            quality = "min"
        else:
            quality = "maj"
        return f"{root}{quality}"

    def encode(self, chord: str) -> int:
        normalized = self.normalize_chord(chord)
        return self.chord_to_idx.get(normalized, 0)

    def decode(self, idx: int) -> str:
        return self.idx_to_chord.get(idx, "N")

    def save(self, filepath: str):
        with open(filepath, "w") as f:
            json.dump(
                {
                    "chord_to_idx": self.chord_to_idx,
                    "idx_to_chord": {str(k): v for k, v in self.idx_to_chord.items()},
                },
                f,
            )

    @classmethod
    def load(cls, filepath: str) -> "ChordVocabulary":
        vocab = cls()
        with open(filepath, "r") as f:
            data = json.load(f)
        vocab.chord_to_idx = data["chord_to_idx"]
        vocab.idx_to_chord = {int(k): v for k, v in data["idx_to_chord"].items()}
        vocab.num_classes = len(vocab.chord_to_idx)
        return vocab
