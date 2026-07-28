from __future__ import annotations

from dataclasses import dataclass
from typing import Any


MASTERING_TARGETS: dict[str, dict[str, float | str]] = {
    "pop": {"lufs": -10.0, "true_peak": -1.0, "character": "clear, bright, vocal-forward"},
    "edm": {"lufs": -8.0, "true_peak": -1.0, "character": "wide, loud, controlled low end"},
    "hip-hop": {"lufs": -9.0, "true_peak": -1.0, "character": "punchy drums, solid bass, vocal clarity"},
    "afrobeat": {"lufs": -9.0, "true_peak": -1.0, "character": "warm groove, vocal presence, clean percussion"},
    "rock": {"lufs": -10.0, "true_peak": -1.0, "character": "punch, guitars, controlled cymbals"},
    "gospel": {"lufs": -11.0, "true_peak": -1.0, "character": "warm vocals, choir clarity, preserved emotion"},
    "cinematic": {"lufs": -14.0, "true_peak": -1.0, "character": "dynamic, wide, orchestral depth"},
    "acoustic": {"lufs": -14.0, "true_peak": -1.0, "character": "natural, intimate, transparent"},
    "podcast": {"lufs": -16.0, "true_peak": -1.0, "character": "speech clarity, consistent loudness"},
    "broadcast": {"lufs": -23.0, "true_peak": -1.0, "character": "broadcast compliant"},
}

FREQUENCY_BANDS: list[dict[str, Any]] = [
    {"name": "Sub bass", "range": "20-60Hz", "risk": "rumble or weak foundation"},
    {"name": "Bass", "range": "60-120Hz", "risk": "kick and bass masking"},
    {"name": "Low mids", "range": "200-400Hz", "risk": "mud and boxiness"},
    {"name": "Mids", "range": "500Hz-2kHz", "risk": "nasality or weak body"},
    {"name": "Presence", "range": "2-5kHz", "risk": "harshness or weak intelligibility"},
    {"name": "Sibilance", "range": "6-10kHz", "risk": "sibilance and brittle vocals"},
    {"name": "Air", "range": "10-18kHz", "risk": "missing openness or excessive hiss"},
]

PLUGIN_TRANSLATION: dict[str, str] = {
    "TDR Nova": "Dynamic EQ and resonance control decisions",
    "TDR Kotelnikov": "Transparent bus compression decisions",
    "Valhalla Supermassive": "Genre-aware ambience and delay design targets",
    "LoudMax": "Limiter and true-peak ceiling decisions",
    "Voxengo SPAN": "Spectral balance and reference comparison report",
    "Youlean Loudness Meter": "LUFS, true-peak, and loudness compliance verification",
}


def normalize_genre(value: str | None) -> str:
    text = (value or "").strip().lower().replace("_", "-")
    aliases = {
        "rap": "hip-hop",
        "hiphop": "hip-hop",
        "hip hop": "hip-hop",
        "afrobeats": "afrobeat",
        "house": "edm",
        "dance": "edm",
        "score": "cinematic",
        "orchestral": "cinematic",
        "voice": "podcast",
        "speech": "podcast",
    }
    return aliases.get(text, text or "pop")


def target_for_genre(genre: str | None) -> dict[str, float | str]:
    normalized = normalize_genre(genre)
    return MASTERING_TARGETS.get(normalized, MASTERING_TARGETS["pop"])


def _flag(condition: bool, severity: str, issue: str, action: str) -> dict[str, str] | None:
    if not condition:
        return None
    return {"severity": severity, "issue": issue, "recommended_action": action}


def build_quality_flags(analysis: dict[str, Any]) -> list[dict[str, str]]:
    flags: list[dict[str, str]] = []
    lufs = analysis.get("integrated_lufs")
    true_peak = analysis.get("true_peak_dbtp")
    lra = analysis.get("lra")
    sample_rate = analysis.get("sample_rate") or 0
    bitrate = analysis.get("bitrate") or 0
    channels = analysis.get("channels")

    candidates = [
        _flag(true_peak is not None and float(true_peak) > -1.0, "critical", "True peak exceeds -1 dBTP", "Lower limiter ceiling and re-check intersample peaks."),
        _flag(lufs is not None and float(lufs) > -7.0, "high", "Master is likely over-limited", "Reduce limiter input and preserve more dynamic range."),
        _flag(lra is not None and float(lra) < 3.0, "medium", "Low loudness range", "Use lighter bus compression or restore transient punch."),
        _flag(sample_rate and int(sample_rate) < 44100, "medium", "Sample rate below release standard", "Render final WAV at 44.1kHz or higher."),
        _flag(bitrate and int(bitrate) < 192000, "medium", "Low source bitrate", "Use a higher-quality source file before mastering."),
        _flag(channels not in (1, 2, None), "low", "Unexpected channel layout", "Check downmix and mono compatibility before export."),
    ]
    flags.extend([item for item in candidates if item])
    return flags


def build_frequency_balance_report(analysis: dict[str, Any]) -> dict[str, Any]:
    return {
        "bands_to_review": FREQUENCY_BANDS,
        "detected_risks": [
            "Check 200-400Hz for mud before applying warmth.",
            "Check 2-5kHz for harshness before adding vocal presence.",
            "Check 6-10kHz for sibilance before adding air.",
        ],
        "current_limits": "Detailed per-band energy requires Librosa/Essentia spectral analysis in the next DSP phase.",
    }


def build_mix_plan(analysis: dict[str, Any]) -> dict[str, Any]:
    genre = normalize_genre(analysis.get("estimated_genre") or analysis.get("genre"))
    return {
        "goal": "Create a clean, balanced, emotionally natural mix before mastering.",
        "genre": genre,
        "steps": [
            "Establish gain staging around -18 dBFS average level.",
            "Correct phase and mono-compatibility issues before EQ.",
            "Remove noise, hum, rumble, and unwanted room build-up.",
            "Apply dynamic EQ for mud, harshness, and sibilance only where needed.",
            "Improve vocal intelligibility without over-brightening the mix.",
            "Tighten kick and bass relationship while preserving groove.",
            "Use transparent compression and avoid pumping artifacts.",
            "Apply tasteful ambience while keeping vocals clear.",
        ],
    }


def build_master_plan(analysis: dict[str, Any]) -> dict[str, Any]:
    genre = normalize_genre(analysis.get("estimated_genre") or analysis.get("genre"))
    target = target_for_genre(genre)
    return {
        "genre": genre,
        "target_lufs": target["lufs"],
        "true_peak_ceiling": target["true_peak"],
        "character": target["character"],
        "steps": [
            "Match tonal balance to genre expectation and reference material where available.",
            "Use broad EQ moves after surgical correction, not before.",
            "Apply transparent compression with 2-4 dB gain reduction as a default ceiling.",
            "Use limiter to reach target loudness without clipping or audible distortion.",
            "Verify translation across phone, car, headphones, Bluetooth, TV, and studio monitors.",
        ],
    }


def build_elite_engineering_report(analysis: dict[str, Any]) -> dict[str, Any]:
    return {
        "system": "Infinity AI Elite Mixing and Mastering Engineer",
        # Snapshot of key measurements only — embedding the full analysis dict
        # creates a circular reference once this report is attached back to it.
        "analysis_summary": {
            k: analysis.get(k)
            for k in ("integrated_lufs", "true_peak_dbtp", "lra", "duration_seconds", "sample_rate", "channels")
        },
        "mix_plan": build_mix_plan(analysis),
        "master_plan": build_master_plan(analysis),
        "quality_flags": build_quality_flags(analysis),
        "frequency_balance_report": build_frequency_balance_report(analysis),
        "plugin_translation": PLUGIN_TRANSLATION,
        "deliverables": [
            "fully_mixed_version",
            "fully_mastered_version",
            "mix_notes",
            "loudness_report",
            "frequency_balance_report",
            "plugin_settings_used",
            "improvement_recommendations",
        ],
    }
