from __future__ import annotations

import importlib.util
import json
import math
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path
from mutagen import File as MutagenFile


def has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def has_demucs() -> bool:
    return shutil.which("demucs") is not None or importlib.util.find_spec("demucs") is not None


def run_command(args: list[str], timeout: int | None = None) -> tuple[int, str, str]:
    process = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
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
    metadata["demucs_available"] = has_demucs()
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
        "demucs_available": metadata.get("demucs_available"),
        **traits,
        "note": "Infinity v7 analysis. FFprobe/mutagen are real; BPM/key/genre are heuristic until Librosa/Essentia integration.",
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


def generate_prompt_sound(output_dir: Path, asset_id: str, prompt: str, intensity: int = 68, genre: str = "Cinematic", emotion: str = "Mystic") -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    safe_intensity = max(0, min(100, int(intensity)))
    seed = sum(ord(char) for char in f"{prompt}-{genre}-{emotion}")
    sample_rate = 44100
    duration = 4.0
    total_samples = int(sample_rate * duration)
    base_freq = 90 + (seed % 280)
    fifth = base_freq * 1.5
    octave = base_freq * 2
    lfo_rate = 0.12 + (safe_intensity / 100) * 0.7
    wav_path = output_dir / f"{asset_id}.wav"

    with wave.open(str(wav_path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        for i in range(total_samples):
            t = i / sample_rate
            attack = min(1.0, t / 0.35)
            release = min(1.0, max(0.0, (duration - t) / 0.9))
            envelope = attack * release
            lfo = 0.65 + 0.35 * math.sin(2 * math.pi * lfo_rate * t)
            pad = math.sin(2 * math.pi * base_freq * t)
            harmonic = math.sin(2 * math.pi * fifth * t + math.sin(2 * math.pi * 0.21 * t)) * 0.45
            shimmer = math.sin(2 * math.pi * octave * t) * 0.18
            pulse = math.sin(2 * math.pi * (base_freq / 4) * t) * (safe_intensity / 100) * 0.25
            left = (pad * 0.42 + harmonic * 0.34 + shimmer + pulse) * envelope * lfo * 0.55
            right = (pad * 0.38 + harmonic * 0.31 + shimmer * 0.7 - pulse) * envelope * (1.05 - (lfo * 0.2)) * 0.55
            wav.writeframes(struct.pack("<hh", int(max(-1, min(1, left)) * 32767), int(max(-1, min(1, right)) * 32767)))

    return {
        "asset_id": asset_id,
        "prompt": prompt,
        "genre": genre,
        "emotion": emotion,
        "intensity": safe_intensity,
        "duration_seconds": duration,
        "sample_rate": sample_rate,
        "path": str(wav_path),
        "filename": wav_path.name,
        "download_url": f"/api/v1/sound/assets/{asset_id}/download",
        "preview_url": f"/api/v1/sound/assets/{asset_id}/download",
        "note": "Backend-generated WAV using deterministic prompt synthesis. Replace with GPU model later.",
    }


def separate_stems_with_demucs(input_path: Path, stems_dir: Path, model: str = "htdemucs") -> dict:
    stems_dir.mkdir(parents=True, exist_ok=True)

    if input_path.suffix.lower() == ".zip":
        return {
            "status": "skipped",
            "reason": "ZIP stem packages are already grouped audio assets; upload a mixed MP3/WAV/FLAC for Demucs separation.",
        }

    if not has_demucs():
        return {
            "status": "skipped",
            "reason": "Demucs is not installed in the backend environment.",
            "install_hint": "cd backend; .\\.venv\\Scripts\\python.exe -m pip install -r requirements-demucs.txt",
            "expected_outputs": ["vocals.wav", "drums.wav", "bass.wav", "other.wav"],
        }

    demucs_root = stems_dir / "demucs_output"
    if demucs_root.exists():
        shutil.rmtree(demucs_root)
    demucs_root.mkdir(parents=True, exist_ok=True)

    commands = []
    if shutil.which("demucs"):
        commands.append(["demucs", "-n", model, "--out", str(demucs_root), str(input_path)])
    commands.append([sys.executable, "-m", "demucs", "-n", model, "--out", str(demucs_root), str(input_path)])

    last_error = ""
    used_command = None
    for command in commands:
        used_command = command
        try:
            code, stdout, stderr = run_command(command, timeout=60 * 30)
        except subprocess.TimeoutExpired:
            last_error = "Demucs timed out after 30 minutes. Try a shorter file or GPU environment."
            continue
        if code == 0:
            break
        last_error = stderr[-4000:]
    else:
        return {"status": "failed", "stderr": last_error, "command": " ".join(used_command or [])}

    discovered = {}
    for stem_name in ("vocals", "drums", "bass", "other"):
        matches = list(demucs_root.rglob(f"{stem_name}.wav"))
        if matches:
            target = stems_dir / f"{stem_name}.wav"
            shutil.copy2(matches[0], target)
            discovered[stem_name] = {"path": str(target), "exists": target.exists(), "size_bytes": target.stat().st_size if target.exists() else 0}

    if not discovered:
        return {"status": "failed", "reason": "Demucs finished but no stem WAV files were found.", "output_dir": str(demucs_root)}

    return {
        "status": "completed",
        "model": model,
        "command": " ".join(used_command or []),
        "stems": discovered,
        "note": "Infinity v7 real stem separation complete with Demucs.",
    }


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
