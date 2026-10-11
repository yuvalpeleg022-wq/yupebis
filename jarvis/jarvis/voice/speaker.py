"""Speaker verification: JARVIS reacts only to the enrolled voice (SpeechBrain ECAPA)."""
from __future__ import annotations

import itertools

import numpy as np

from ..config import MODELS_DIR, VOICEPRINT_FILE


class SpeakerVerifier:
    def __init__(self, log):
        self.log = log
        self.model = None
        self.embedding: np.ndarray | None = None
        self.auto_threshold = 0.35
        self.load_voiceprint()

    @property
    def enrolled(self) -> bool:
        return self.embedding is not None

    def load_voiceprint(self):
        if VOICEPRINT_FILE.exists():
            d = np.load(VOICEPRINT_FILE)
            self.embedding = d["embedding"]
            self.auto_threshold = min(float(d["threshold"]), 0.42)

    def load_model(self):
        import torch  # noqa: F401
        try:
            from speechbrain.inference.speaker import EncoderClassifier
        except ImportError:  # speechbrain < 1.0
            from speechbrain.pretrained import EncoderClassifier
        kwargs = {}
        try:  # Windows can't create symlinks without developer mode
            from speechbrain.utils.fetching import LocalStrategy
            kwargs["local_strategy"] = LocalStrategy.COPY
        except ImportError:
            pass
        self.log("loading voice-ID model…")
        self.model = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb", savedir=str(MODELS_DIR / "ecapa"),
            run_opts={"device": "cpu"}, **kwargs)
        self.log("voice-ID ready")

    def embed(self, audio: np.ndarray) -> np.ndarray:
        import torch
        with torch.no_grad():
            e = self.model.encode_batch(torch.from_numpy(audio.astype(np.float32)).unsqueeze(0))
        v = e.squeeze().cpu().numpy()
        return v / (np.linalg.norm(v) + 1e-9)

    def enroll(self, samples: list[np.ndarray]) -> float:
        embs = [self.embed(s) for s in samples]
        mean = np.mean(embs, axis=0)
        mean /= np.linalg.norm(mean) + 1e-9
        pair = [float(np.dot(a, b)) for a, b in itertools.combinations(embs, 2)]
        # your own samples agree with each other at ~avg; accept somewhat less than that
        threshold = float(np.clip(np.mean(pair) - 0.28, 0.22, 0.42))
        np.savez(VOICEPRINT_FILE, embedding=mean, threshold=threshold)
        self.embedding, self.auto_threshold = mean, threshold
        return threshold

    def threshold_for(self, cfg: dict) -> float:
        t = (cfg.get("speaker") or {}).get("threshold")
        return float(t) if t is not None else self.auto_threshold

    def verify(self, audio: np.ndarray, threshold: float | None) -> tuple[bool, float]:
        score = float(np.dot(self.embed(audio), self.embedding))
        return score >= (threshold if threshold is not None else self.auto_threshold), score
