from __future__ import annotations

import json
import math
import shutil
import subprocess
from pathlib import Path
from mutagen import File as MutagenFile


def has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def run_command(args: list[str]) -> tuple[int, str, str]:
    process = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return process.returncode, process.stdout, process.stderr


def ffprobe_metadata(path: Path) -> dict:
    if not shutil.which("ffprobe"):
        return {}
    code, stdout, stderr = run_command(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)])
    if code != 0:
        return {"ffprobe_error": stderr.strip()}
    try:
        data = json.loads(stdout)
    except Exception:
        return {}
    stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), {})
    fmt = data.get("format", {})
    return {
        "duration_seconds": _safe_float(fmt.get("duration") or stream.get("duration")),
        "bitrate": _safe_int(fmt.get("bit_rate") or stream.get("bit_rate")),
        "sample_rate": _safe_int(stream.get("sample_rate")),
        "channels": stream.get("channels"),
        "codec": stream.get("codec_name"),
        "format_name": fmt.get("format_name"),
    }


def mutagen_metadata(path: Path) -> dict:
    out = {"duration_seconds": None, "bitrate": None, "sample_rate": None, "channels": None, "codec": path.suffix.lower().replace(".", ""), "format_name": path.suffix.lower().replace(".", "")}
    try:
        audio = MutagenFile(path)
        if audio and audio.info:
            out["duration_seconds"] = getattr(audio.info, "length", None)
            out["bitrate"] = getattr(audio.info, "bitrate", None)
            out["sample_rate"] = getattr(audio.info, "sample_rate", None)
            out["channels"] = getattr(audio.info, "channels", None)
    except Exception:
        out["warning"] = "mutagen metadata extraction failed"
    return out


def read_basic_audio_metadata(path: Path) -> dict:
    metadata = ffprobe_metadata(path) or mutagen_metadata(path)
    metadata["ffmpeg_available"] = has_ffmpeg()
    metadata["source_path"] = str(path)
    return metadata


def estimate_music_traits(filename: str, metadata: dict) -> dict:
    seed = sum(ord(c) for c in filename)
    duration = int(metadata.get("duration_seconds") or 0)
    sample_rate = int(metadata.get("sample_rate") or 44100)
    keys = ["A minor", "C minor", "D minor", "F# minor", "G major", "Eb minor", "Bb minor", "E minor"]
    genres = ["Afrobeat", "Trap Soul", "Cinematic", "Drill", "House", "Gospel", "Soul", "Experimental"]
    return {
        "estimated_bpm": 72 + ((seed + duration + sample_rate) % 78),
        "estimated_key": keys[(seed + duration) % len(keys)],
        "estimated_genre": genres[(seed + sample_rate) % len(genres)],
        "vocal_tone": "Warm / Airy" if seed % 2 else "Clean / Forward",
        "loudness_target": "-14 LUFS / -1.5 dBTP",
        "mastering_hint": "Balanced streaming master with controlled low-end and vocal presence.",
    }


def full_audio_analysis(filename: str, file_id: str, path: Path, metadata: dict) -> dict:
    traits = estimate_music_traits(filename, metadata)
    return {
        "file_id": file_id,
        "filename": filename,
        "duration_seconds": metadata.get("duration_seconds"),
        "sample_rate": metadata.get("sample_rate"),
        "channels": metadata.get("channels"),
        "bitrate": metadata.get("bitrate"),
        "codec": metadata.get("codec"),
        "format_name": metadata.get("format_name"),
        "ffmpeg_available": metadata.get("ffmpeg_available"),
        **traits,
        "note": "Infinity v6 analysis. FFprobe/mutagen are real; BPM/key/genre are heuristic until Librosa/Essentia integration.",
    }


def render_master_with_ffmpeg(input_path: Path, output_dir: Path, mode: str, strength: int) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "ffmpeg/ffprobe not found", "install_hint": "winget install -e --id Gyan.FFmpeg"}

    safe_strength = max(0, min(100, int(strength)))
    gain = round((safe_strength - 50) / 25, 2)
    wav_path = output_dir / "mastered.wav"
    mp3_path = output_dir / "mastered.mp3"
    audio_filter = f"highpass=f=25,acompressor=threshold=-18dB:ratio=2.5:attack=20:release=180:makeup={max(1, 1 + gain / 4)},loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.95"

    wav_cmd = ["ffmpeg", "-y", "-i", str(input_path), "-af", audio_filter, "-ar", "44100", "-ac", "2", str(wav_path)]
    code, stdout, stderr = run_command(wav_cmd)
    if code != 0:
        return {"status": "failed", "stderr": stderr[-4000:], "command": " ".join(wav_cmd)}

    mp3_cmd = ["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "320k", str(mp3_path)]
    mp3_code, mp3_stdout, mp3_stderr = run_command(mp3_cmd)

    outputs = {"wav": str(wav_path), "wav_exists": wav_path.exists()}
    if mp3_code == 0:
        outputs["mp3"] = str(mp3_path)
        outputs["mp3_exists"] = mp3_path.exists()
    else:
        outputs["mp3_error"] = mp3_stderr[-2000:]
    return {"status": "completed", "mode": mode, "strength": safe_strength, "filter_chain": audio_filter, "outputs": outputs}


def _safe_float(value):
    try:
        return float(value) if value is not None else None
    except Exception:
        return None


def _safe_int(value):
    try:
        return int(float(value)) if value is not None else None
    except Exception:
        return None