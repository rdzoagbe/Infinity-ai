def analysis_capabilities() -> dict:
    """Honest capability report consumed by the frontend."""
    return {
        "measurements": {
            "loudness_lufs": "available",
            "true_peak": "available",
            "loudness_range": "available",
            "rms_crest_noise": "available",
            "spectral_balance_7band": "available",
            "phase_correlation": "available",
            "clipping_detection": "available",
        },
        "musical_traits": {
            "bpm_detection": "planned",
            "key_detection": "planned",
        },
        "stem_separation": {
            "demucs": "available_if_installed",
            "fallback": "mid-side approximation — not real AI separation",
        },
        "sound_generation": "experimental synthesised WAV textures (not a generative music model)",
    }
