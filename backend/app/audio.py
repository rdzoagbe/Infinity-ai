from pathlib import Path
from mutagen import File as MutagenFile


def read_basic_audio_metadata(path: Path) -> dict:
    metadata = {
        "duration_seconds": None,
        "bitrate": None,
        "sample_rate": None,
        "channels": None,
    }

    try:
        audio = MutagenFile(path)
        if audio and audio.info:
            metadata["duration_seconds"] = getattr(audio.info, "length", None)
            metadata["bitrate"] = getattr(audio.info, "bitrate", None)
            metadata["sample_rate"] = getattr(audio.info, "sample_rate", None)
            metadata["channels"] = getattr(audio.info, "channels", None)
    except Exception:
        metadata["warning"] = "Metadata extraction failed; backend processing can continue later."

    return metadata


def placeholder_analysis(filename: str, file_id: str, metadata: dict) -> dict:
    seed = sum(ord(char) for char in filename)
    keys = ["A minor", "C minor", "D minor", "F# minor", "G major", "Eb minor"]
    genres = ["Afrobeat", "Trap Soul", "Cinematic", "Drill", "House", "Gospel", "Experimental"]

    return {
        "file_id": file_id,
        "filename": filename,
        "duration_seconds": metadata.get("duration_seconds"),
        "sample_rate": metadata.get("sample_rate"),
        "channels": metadata.get("channels"),
        "estimated_bpm": 78 + (seed % 62),
        "estimated_key": keys[seed % len(keys)],
        "estimated_genre": genres[seed % len(genres)],
        "vocal_tone": "Warm / Airy" if seed % 2 else "Clean / Forward",
        "loudness_target": "-9.5 LUFS",
        "note": "Placeholder analysis. Real Librosa/Essentia analysis comes next.",
    }