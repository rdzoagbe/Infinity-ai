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
        "size_bytes": _safe_int(fmt.get("size")),
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
    duration = metadata.get("duration_seconds")
    sample_rate = metadata.get("sample_rate")
    bitrate = metadata.get("bitrate")
    readiness = "Ready for v10 mastering" if metadata.get("ffmpeg_available") else "Metadata only; FFmpeg missing"
    return {
        "file_id": file_id,
        "filename": filename,
        "duration_seconds": duration,
        "sample_rate": sample_rate,
        "channels": metadata.get("channels"),
        "bitrate": bitrate,
        "codec": metadata.get("codec"),
        "format_name": metadata.get("format_name"),
        "ffmpeg_available": metadata.get("ffmpeg_available"),
        "demucs_available": metadata.get("demucs_available"),
        "readiness": readiness,
        "quality_flags": {
            "duration_ok": bool(duration and duration > 5),
            "sample_rate_ok": bool(sample_rate and sample_rate >= 44100),
            "bitrate_ok": bool((bitrate or 0) >= 192000) if bitrate else None,
            "stereo_or_mono_detected": metadata.get("channels") in (1, 2),
        },
        **traits,
        "note": "Infinity v10 analysis. FFprobe/mutagen metadata is real; BPM/key/genre remain heuristic until Librosa/Essentia integration.",
    }


PLATFORM_LUFS: dict[str, int] = {
    "spotify": -14,
    "apple": -16,
    "apple_music": -16,
    "youtube": -14,
    "soundcloud": -10,
    "tidal": -14,
    "amazon": -14,
    "deezer": -15,
    "streaming": -14,
}


def _lufs_for_platform(platform: str) -> int:
    key = (platform or "spotify").lower().replace(" ", "_").replace("-", "_")
    return PLATFORM_LUFS.get(key, -14)


def clean_vocals_with_ffmpeg(input_path: Path, output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "FFmpeg not available in this environment."}

    cleaned_wav = output_dir / "vocals-cleaned.wav"
    cleaned_mp3 = output_dir / "vocals-cleaned.mp3"

    filters = [
        "highpass=f=80",
        "lowpass=f=16000",
        "afftdn=nf=-20",
        "equalizer=f=7000:t=q:w=2.0:g=-3",
        "acompressor=threshold=-18dB:ratio=2.5:attack=10:release=100:makeup=2",
        "loudnorm=I=-16:TP=-1.5:LRA=8",
    ]

    cmd = ["ffmpeg", "-y", "-i", str(input_path), "-af", ",".join(filters), "-ar", "44100", "-ac", "2", str(cleaned_wav)]
    code, _stdout, stderr = run_command(cmd, timeout=300)
    if code != 0:
        return {"status": "failed", "stderr": stderr[-2000:]}

    mp3_cmd = ["ffmpeg", "-y", "-i", str(cleaned_wav), "-codec:a", "libmp3lame", "-b:a", "320k", str(cleaned_mp3)]
    mp3_code, _, _ = run_command(mp3_cmd, timeout=120)

    return {
        "status": "completed",
        "wav": str(cleaned_wav),
        "wav_exists": cleaned_wav.exists(),
        "mp3": str(cleaned_mp3) if mp3_code == 0 else None,
        "mp3_exists": cleaned_mp3.exists() if mp3_code == 0 else False,
        "filter_chain": ",".join(filters),
        "steps": [
            "low-end rumble removal (80 Hz high-pass)",
            "high-frequency rolloff (16 kHz low-pass)",
            "AI noise floor reduction (afftdn −20 dB)",
            "de-essing at 7 kHz (−3 dB notch)",
            "light vocal compression (2.5:1 ratio)",
            "loudness normalization (−16 LUFS / −1.5 dBTP)",
        ],
    }


def clean_full_mix_with_ffmpeg(input_path: Path, output_dir: Path) -> dict:
    """Clean a fully-mixed song (beat + vocals already together)."""
    output_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "FFmpeg not available in this environment."}

    cleaned_wav = output_dir / "mix-cleaned.wav"
    cleaned_mp3 = output_dir / "mix-cleaned.mp3"

    filters = [
        "highpass=f=30",                               # remove sub-bass rumble
        "lowpass=f=18000",                             # gentle top-end rolloff
        "afftdn=nf=-20",                               # noise floor reduction
        "equalizer=f=7000:t=q:w=1.5:g=-2",            # light de-essing
        "acompressor=threshold=-18dB:ratio=1.8:attack=15:release=150:makeup=1.5",
        "loudnorm=I=-16:TP=-1.5:LRA=10",
    ]

    cmd = ["ffmpeg", "-y", "-i", str(input_path), "-af", ",".join(filters), "-ar", "44100", "-ac", "2", str(cleaned_wav)]
    code, _stdout, stderr = run_command(cmd, timeout=300)
    if code != 0:
        return {"status": "failed", "stderr": stderr[-2000:]}

    mp3_cmd = ["ffmpeg", "-y", "-i", str(cleaned_wav), "-codec:a", "libmp3lame", "-b:a", "320k", str(cleaned_mp3)]
    mp3_code, _, _ = run_command(mp3_cmd, timeout=120)

    return {
        "status": "completed",
        "wav": str(cleaned_wav),
        "wav_exists": cleaned_wav.exists(),
        "mp3": str(cleaned_mp3) if mp3_code == 0 else None,
        "mp3_exists": cleaned_mp3.exists() if mp3_code == 0 else False,
        "filter_chain": ",".join(filters),
        "steps": [
            "sub-bass rumble removal (30 Hz high-pass)",
            "gentle top-end rolloff (18 kHz low-pass)",
            "noise floor reduction (afftdn −20 dB)",
            "light de-essing at 7 kHz (−2 dB)",
            "gentle mix compression (1.8:1 ratio)",
            "loudness normalization (−16 LUFS / −1.5 dBTP)",
        ],
    }


def enhance_mix_with_ffmpeg(
    input_path: Path,
    output_dir: Path,
    presence_boost: bool = True,
    reverb_amount: float = 0.2,
    stereo_width: float = 1.3,
    bus_compress: bool = True,
) -> dict:
    """Apply mix bus enhancements (EQ, reverb, stereo, compression) to a single file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "FFmpeg not available in this environment."}

    enhanced_wav = output_dir / "enhanced.wav"
    enhanced_mp3 = output_dir / "enhanced.mp3"

    rv = max(0.0, min(1.0, float(reverb_amount)))
    sw = max(1.0, min(2.5, float(stereo_width)))

    filters = []
    if presence_boost:
        filters += [
            "equalizer=f=3500:t=q:w=1.0:g=1.5",  # subtle presence lift
            "treble=g=1.2:f=12000",                 # air shelf
        ]
    if rv > 0.05:
        delay_ms = round(40 + rv * 160)
        decay = round(0.15 + rv * 0.45, 2)
        filters.append(f"aecho=0.8:0.88:{delay_ms}:{decay}")
    if sw > 1.0:
        filters.append(f"extrastereo=m={sw:.1f}")
    if bus_compress:
        filters.append("acompressor=threshold=-12dB:ratio=2:attack=5:release=80:makeup=1.2")
    filters.append("alimiter=limit=0.95")

    af = ",".join(filters)
    cmd = ["ffmpeg", "-y", "-i", str(input_path), "-af", af, "-ar", "44100", "-ac", "2", str(enhanced_wav)]
    code, _stdout, stderr = run_command(cmd, timeout=300)
    if code != 0:
        return {"status": "failed", "stderr": stderr[-2000:]}

    mp3_cmd = ["ffmpeg", "-y", "-i", str(enhanced_wav), "-codec:a", "libmp3lame", "-b:a", "320k", str(enhanced_mp3)]
    mp3_code, _, _ = run_command(mp3_cmd, timeout=120)

    return {
        "status": "completed",
        "presence_boost": presence_boost,
        "reverb_amount": rv,
        "stereo_width": sw,
        "bus_compress": bus_compress,
        "wav": str(enhanced_wav),
        "wav_exists": enhanced_wav.exists(),
        "mp3": str(enhanced_mp3) if mp3_code == 0 else None,
        "mp3_exists": enhanced_mp3.exists() if mp3_code == 0 else False,
    }


def mix_vocal_beat_with_ffmpeg(
    vocal_path: Path,
    beat_path: Path,
    output_dir: Path,
    vocal_gain: float = 1.0,
    beat_gain: float = 0.85,
    vocal_presence_boost: bool = True,
    beat_stereo_width: float = 1.5,
    bus_compress: bool = True,
    reverb_amount: float = 0.2,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "FFmpeg not available in this environment."}

    vg = max(0.0, min(2.0, float(vocal_gain)))
    bg = max(0.0, min(2.0, float(beat_gain)))
    sw = max(1.0, min(3.0, float(beat_stereo_width)))
    rv = max(0.0, min(1.0, float(reverb_amount)))
    mixed_wav = output_dir / "mixed.wav"
    mixed_mp3 = output_dir / "mixed.mp3"

    # Vocal chain: volume → optional presence & air EQ → optional reverb
    vocal_filters = [f"volume={vg}"]
    if vocal_presence_boost:
        vocal_filters += [
            "equalizer=f=3500:t=q:w=1.0:g=2.5",  # presence cut-through
            "treble=g=1.5:f=12000",                 # air shelf
        ]
    if rv > 0.05:
        delay_ms = round(40 + rv * 160)          # 40ms (tight room) → 200ms (large hall)
        decay = round(0.15 + rv * 0.45, 2)       # 0.15 (subtle) → 0.60 (lush)
        vocal_filters.append(f"aecho=0.8:0.88:{delay_ms}:{decay}")
    vocal_chain = f"[0:a]{','.join(vocal_filters)}[v]"

    # Beat chain: volume → optional stereo widening
    beat_filters = [f"volume={bg}"]
    if sw > 1.0:
        beat_filters.append(f"extrastereo=m={sw:.1f}")
    beat_chain = f"[1:a]{','.join(beat_filters)}[b]"

    # Mix bus: amix → optional bus compression → true-peak limiter
    mix_filters = ["amix=inputs=2:duration=longest:normalize=0"]
    if bus_compress:
        mix_filters.append("acompressor=threshold=-12dB:ratio=2:attack=5:release=80:makeup=1.2")
    mix_filters.append("alimiter=limit=0.95")
    mix_chain = f"[v][b]{','.join(mix_filters)}[out]"

    filter_complex = f"{vocal_chain};{beat_chain};{mix_chain}"
    cmd = [
        "ffmpeg", "-y",
        "-i", str(vocal_path),
        "-i", str(beat_path),
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-ar", "44100", "-ac", "2",
        str(mixed_wav),
    ]
    code, _stdout, stderr = run_command(cmd, timeout=600)
    if code != 0:
        return {"status": "failed", "stderr": stderr[-2000:]}

    mp3_cmd = ["ffmpeg", "-y", "-i", str(mixed_wav), "-codec:a", "libmp3lame", "-b:a", "320k", str(mixed_mp3)]
    mp3_code, _, _ = run_command(mp3_cmd, timeout=180)

    return {
        "status": "completed",
        "vocal_gain": vg,
        "beat_gain": bg,
        "vocal_presence_boost": vocal_presence_boost,
        "beat_stereo_width": sw,
        "bus_compress": bus_compress,
        "wav": str(mixed_wav),
        "wav_exists": mixed_wav.exists(),
        "mp3": str(mixed_mp3) if mp3_code == 0 else None,
        "mp3_exists": mixed_mp3.exists() if mp3_code == 0 else False,
    }


def _genre_filters(genre_key: str, intensity: float) -> tuple[list[str], float, float, float]:
    """Return (eq_filters, compress_ratio, compress_threshold_db, stereo_width) per genre."""
    i = intensity

    if genre_key == "trap":
        # Deep sub punch + bright airy top + aggressive glue
        return (
            [
                f"bass=g={3.5 * i:.1f}:f=65",               # sub punch at 65 Hz
                f"equalizer=f=200:t=q:w=1.2:g={-1.5 * i:.2f}",  # mud cut
                f"equalizer=f=3500:t=q:w=1.0:g={1.5 * i:.2f}",  # presence
                f"treble=g={2.5 * i:.2f}:f=10000",            # airy highs
            ],
            4.0, -16.0, 1.5,
        )

    if genre_key == "drill":
        # Heavy sub, dark mids, punchy & unforgiving
        return (
            [
                f"bass=g={4.5 * i:.1f}:f=55",               # deep sub at 55 Hz
                f"equalizer=f=150:t=q:w=1.0:g={1.5 * i:.2f}",   # body/kick weight
                f"equalizer=f=3000:t=q:w=1.5:g={-2.5 * i:.2f}", # cut harshness
                f"equalizer=f=9000:t=q:w=1.0:g={-1.5 * i:.2f}", # dark top-end
            ],
            5.0, -14.0, 1.2,
        )

    if genre_key == "afrobeat":
        # Warm low-mids, percussive punch, vocal presence, groove
        return (
            [
                f"equalizer=f=80:t=q:w=0.9:g={2.0 * i:.2f}",    # kick/bass punch
                f"equalizer=f=280:t=q:w=1.0:g={2.0 * i:.2f}",   # warmth / low-mid groove
                f"equalizer=f=4000:t=q:w=1.0:g={2.0 * i:.2f}",  # vocal & percussion presence
                f"treble=g={1.2 * i:.2f}:f=10000",               # subtle air
            ],
            2.5, -20.0, 1.35,
        )

    if genre_key == "house":
        # Pumping kick energy, driving low end, bright & energetic
        return (
            [
                f"equalizer=f=85:t=q:w=0.8:g={3.0 * i:.2f}",    # kick weight
                f"equalizer=f=500:t=q:w=1.5:g={-1.0 * i:.2f}",  # boxiness cut
                f"equalizer=f=3500:t=q:w=1.0:g={1.5 * i:.2f}",  # energy & presence
                f"treble=g={2.0 * i:.2f}:f=10000",               # sparkle
            ],
            3.5, -15.0, 1.4,
        )

    if genre_key == "gospel":
        # Vocal warmth, choir presence, transparent dynamics, full & rich
        return (
            [
                f"equalizer=f=200:t=q:w=1.0:g={1.8 * i:.2f}",   # vocal warmth
                f"equalizer=f=800:t=q:w=1.5:g={-1.0 * i:.2f}",  # boxy cut
                f"equalizer=f=4000:t=q:w=0.9:g={2.5 * i:.2f}",  # vocal presence & clarity
                f"treble=g={2.0 * i:.2f}:f=11000",               # choir air
            ],
            2.0, -22.0, 1.25,
        )

    if genre_key == "cinematic":
        # Wide stereo, musical dynamics preserved, orchestral space
        return (
            [
                "highpass=f=40",                                   # clean sub (tighter)
                f"equalizer=f=120:t=q:w=1.0:g={-1.0 * i:.2f}",  # tame low rumble
                f"equalizer=f=2500:t=q:w=1.2:g={1.0 * i:.2f}",  # detail
                f"treble=g={2.5 * i:.2f}:f=12000",               # spacious air
            ],
            1.6, -28.0, 1.6,
        )

    if genre_key == "soul":
        # Vintage warmth, smooth midrange, silky highs
        return (
            [
                f"equalizer=f=120:t=q:w=0.9:g={1.5 * i:.2f}",   # warm bass
                f"equalizer=f=350:t=q:w=1.0:g={2.0 * i:.2f}",   # vintage low-mid warmth
                f"equalizer=f=4500:t=q:w=0.9:g={1.8 * i:.2f}",  # vocal silk
                f"treble=g={1.0 * i:.2f}:f=10000",               # smooth top
            ],
            2.2, -22.0, 1.2,
        )

    # Default: Custom AI adaptive — balanced for all genres
    return (
        [
            f"equalizer=f=90:t=q:w=1.0:g={1.2 * i:.2f}",
            f"equalizer=f=3200:t=q:w=1.1:g={1.3 * i:.2f}",
            f"treble=g={1.5 * i:.2f}:f=11000",
        ],
        2.4, -20.0, 1.3,
    )


def render_master_with_ffmpeg(input_path: Path, output_dir: Path, mode: str, strength: int, platform: str = "spotify", air_boost: bool = False) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "ffmpeg/ffprobe not found", "install_hint": "Install FFmpeg locally or keep Railway Dockerfile with apt-get ffmpeg."}

    safe_strength = max(0, min(100, int(strength)))
    intensity = safe_strength / 100
    genre_key = (mode or "custom").lower().strip()
    # Normalise common spellings
    genre_key = "afrobeat" if "afro" in genre_key else genre_key
    genre_key = "cinematic" if genre_key not in {"trap", "drill", "afrobeat", "house", "gospel", "soul", "experimental"} and "custom" not in genre_key else genre_key

    target_lufs = _lufs_for_platform(platform)
    wav_path = output_dir / "mastered.wav"
    mp3_path = output_dir / "mastered.mp3"
    preview_path = output_dir / "mastered-preview.mp3"

    genre_eq, compress_ratio, compress_threshold, stereo_width = _genre_filters(genre_key, intensity)

    makeup = round(1.0 + intensity * 1.2, 2)
    limit = round(0.91 + intensity * 0.07, 3)

    filters: list[str] = [
        "highpass=f=30",                                          # remove sub-bass rumble
        "lowpass=f=19000",                                        # gentle top rolloff
        *genre_eq,                                                # genre-specific EQ shaping
        "equalizer=f=8000:t=q:w=1.5:g=-1.5",                    # de-ess / sibilance control (always on)
        *(["treble=g=2.5:f=12000"] if air_boost else []),        # extra brightness if requested
        # Transparent soft-knee compression — musical, not robotic
        f"acompressor=threshold={compress_threshold:.1f}dB:ratio={compress_ratio}:attack=20:release=200:knee=4:makeup={makeup}",
        f"extrastereo=m={stereo_width:.2f}",                     # genre-tuned stereo width
        f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11",             # streaming loudness (LRA=11 keeps dynamics)
        f"alimiter=limit={limit}",                               # true-peak ceiling
    ]
    audio_filter = ",".join(filters)

    wav_cmd = ["ffmpeg", "-y", "-i", str(input_path), "-af", audio_filter, "-ar", "44100", "-ac", "2", str(wav_path)]
    code, _stdout, stderr = run_command(wav_cmd, timeout=60 * 10)
    if code != 0:
        return {"status": "failed", "stderr": stderr[-4000:], "command": " ".join(wav_cmd)}

    mp3_cmd = ["ffmpeg", "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-b:a", "320k", str(mp3_path)]
    mp3_code, _, mp3_stderr = run_command(mp3_cmd, timeout=60 * 5)

    preview_cmd = ["ffmpeg", "-y", "-i", str(wav_path), "-t", "30", "-codec:a", "libmp3lame", "-b:a", "192k", str(preview_path)]
    preview_code, _, preview_stderr = run_command(preview_cmd, timeout=60 * 3)

    outputs: dict = {"wav": str(wav_path), "wav_exists": wav_path.exists()}
    if mp3_code == 0:
        outputs["mp3"] = str(mp3_path)
        outputs["mp3_exists"] = mp3_path.exists()
    else:
        outputs["mp3_error"] = mp3_stderr[-2000:]
    if preview_code == 0:
        outputs["preview_mp3"] = str(preview_path)
        outputs["preview_exists"] = preview_path.exists()
    else:
        outputs["preview_error"] = preview_stderr[-2000:]

    return {
        "status": "completed",
        "mode": mode,
        "genre": genre_key,
        "platform": platform,
        "strength": safe_strength,
        "target_lufs": target_lufs,
        "filter_chain": audio_filter,
        "steps": [
            "sub-bass cleanup (30 Hz HPF)",
            f"genre EQ — {genre_key.title()} shaping",
            "sibilance control (8 kHz, always on)",
            "transparent soft-knee compression",
            "stereo widening",
            "streaming loudness normalisation",
            "true-peak limiting",
            "WAV + 320k MP3 + 30s preview render",
        ],
        "outputs": outputs,
    }


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
        return {"status": "skipped", "reason": "ZIP stem packages are already grouped audio assets; upload a mixed MP3/WAV/FLAC for Demucs separation."}

    if not has_demucs():
        return {"status": "skipped", "reason": "Demucs is not installed in the backend environment.", "install_hint": "cd backend; .\\.venv\\Scripts\\python.exe -m pip install -r requirements-demucs.txt", "expected_outputs": ["vocals.wav", "drums.wav", "bass.wav", "other.wav"]}

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

    return {"status": "completed", "model": model, "command": " ".join(used_command or []), "stems": discovered, "note": "Infinity v10 stem separation complete with Demucs."}


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
