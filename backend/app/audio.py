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


def measure_lufs(input_path: Path) -> dict:
    """Measure integrated loudness (LUFS), true peak, and LRA via ffmpeg loudnorm."""
    if not has_ffmpeg():
        return {}
    code, _stdout, stderr = run_command(
        ["ffmpeg", "-y", "-i", str(input_path), "-af", "loudnorm=print_format=json", "-f", "null", "/dev/null"],
        timeout=180,
    )
    try:
        start = stderr.rfind("\n{")
        if start == -1:
            start = stderr.rfind("{")
        end = stderr.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(stderr[start:end])
            return {
                "integrated_lufs": round(float(data["input_i"]), 1),
                "true_peak_dbtp": round(float(data["input_tp"]), 1),
                "lra": round(float(data["input_lra"]), 1),
            }
    except Exception:
        pass
    return {}


def analyze_dynamics_via_astats(path: Path) -> dict:
    """Measure RMS, crest factor, dynamic range, and noise floor via ffmpeg astats."""
    if not has_ffmpeg():
        return {}
    code, stdout, stderr = run_command(
        ["ffmpeg", "-y", "-i", str(path), "-af", "astats=metadata=1:reset=1,ametadata=print:file=-", "-f", "null", "/dev/null"],
        timeout=120,
    )
    # astats prints to stderr
    output = stderr + stdout
    def _extract(key: str) -> float | None:
        for line in output.splitlines():
            if key in line and "=" in line:
                try:
                    return float(line.split("=")[-1].strip())
                except ValueError:
                    pass
        return None

    rms_level = _extract("RMS_level")
    rms_peak = _extract("RMS_peak")
    crest_factor = _extract("Crest_factor")
    flat_factor = _extract("Flat_factor")
    peak_level = _extract("Peak_level")
    noise_floor = _extract("Noise_floor")

    result = {}
    if rms_level is not None:
        result["rms_db"] = round(rms_level, 1)
    if crest_factor is not None:
        result["crest_factor_db"] = round(crest_factor, 1)
    if peak_level is not None:
        result["peak_db"] = round(peak_level, 1)
    if noise_floor is not None:
        result["noise_floor_db"] = round(noise_floor, 1)
    if rms_level is not None and noise_floor is not None and noise_floor < 0:
        result["dynamic_range_db"] = round(rms_level - noise_floor, 1)
    return result


def analyze_spectral_balance(path: Path) -> dict:
    """Measure energy in 7 frequency bands using bandpass filters + astats."""
    if not has_ffmpeg():
        return {}

    bands = [
        ("sub",       "20",   "60"),
        ("bass",      "60",   "250"),
        ("low_mid",   "250",  "500"),
        ("mid",       "500",  "2000"),
        ("upper_mid", "2000", "5000"),
        ("presence",  "5000", "10000"),
        ("air",       "10000","20000"),
    ]

    filters_parts = []
    outputs = []
    for name, low, high in bands:
        tag = f"[{name}]"
        outputs.append(tag)
        filters_parts.append(
            f"[0:a]bandpass=f={(int(low)+int(high))//2}:width_type=h:width={int(high)-int(low)}{tag}"
        )

    result = {}
    for name, low, high in bands:
        center = (int(low) + int(high)) // 2
        width = int(high) - int(low)
        code, _out, stderr = run_command(
            ["ffmpeg", "-y", "-i", str(path),
             "-af", f"bandpass=f={center}:width_type=h:width={width},astats=metadata=1:reset=1,ametadata=print:file=-",
             "-f", "null", "/dev/null"],
            timeout=60,
        )
        combined = stderr + _out
        rms = None
        for line in combined.splitlines():
            if "RMS_level" in line and "=" in line:
                try:
                    rms = float(line.split("=")[-1].strip())
                    break
                except ValueError:
                    pass
        result[name] = round(rms, 1) if rms is not None else None

    return result


def build_processing_decisions(lufs: dict, dynamics: dict, spectral: dict, genre_key: str) -> dict:
    """Map real measurements to actionable processing decisions with plain-language explanations."""
    problems = []
    decisions = []

    integrated_lufs = lufs.get("integrated_lufs")
    true_peak = lufs.get("true_peak_dbtp")
    lra = lufs.get("lra")
    rms_db = dynamics.get("rms_db")
    crest_factor = dynamics.get("crest_factor_db")
    dynamic_range = dynamics.get("dynamic_range_db")
    noise_floor = dynamics.get("noise_floor_db")

    # --- Loudness & dynamics problems ---
    if integrated_lufs is not None and integrated_lufs < -20:
        problems.append({"band": "loudness", "severity": "high", "description": f"Track is very quiet at {integrated_lufs} LUFS — will sound weak on streaming platforms", "value": integrated_lufs})
        decisions.append({"processor": "Loudness", "action": "Gain stage boost", "reason": f"Input level at {integrated_lufs} LUFS needs to be raised before mastering chain", "value": f"{integrated_lufs} → target −14 LUFS"})

    if true_peak is not None and true_peak > -1.0:
        problems.append({"band": "peak", "severity": "high", "description": f"True peak at {true_peak} dBTP exceeds −1 dBTP — clipping risk on streaming encoders", "value": true_peak})
        decisions.append({"processor": "True-Peak Limiter", "action": "Ceiling set to −1.0 dBTP", "reason": f"Peak at {true_peak} dBTP would cause inter-sample distortion after streaming codec re-encode", "value": f"{true_peak} dBTP → −1.0 dBTP"})

    if lra is not None and lra < 3.0:
        problems.append({"band": "dynamics", "severity": "medium", "description": f"Loudness range only {lra} LU — track may sound flat and lifeless", "value": lra})
        decisions.append({"processor": "Bus Compressor", "action": "Lighter ratio (1.5:1) to restore punch", "reason": f"LRA of {lra} LU is over-compressed; backing off will reveal transient detail", "value": f"{lra} LU measured"})

    if crest_factor is not None and crest_factor < 8.0:
        problems.append({"band": "transients", "severity": "medium", "description": f"Low crest factor ({crest_factor} dB) — transients may be over-compressed", "value": crest_factor})

    if noise_floor is not None and noise_floor > -50.0:
        problems.append({"band": "noise", "severity": "low", "description": f"Elevated noise floor at {noise_floor} dB — background hiss present", "value": noise_floor})
        decisions.append({"processor": "Noise Reduction", "action": "Spectral denoising (−20 dB NR)", "reason": f"Noise floor at {noise_floor} dB will become audible in quiet passages", "value": f"{noise_floor} dB floor"})

    # --- Spectral balance problems ---
    sub = spectral.get("sub")
    bass = spectral.get("bass")
    low_mid = spectral.get("low_mid")
    mid = spectral.get("mid")
    upper_mid = spectral.get("upper_mid")
    presence = spectral.get("presence")
    air = spectral.get("air")

    if sub is not None and sub > -20:
        problems.append({"band": "sub (20-60 Hz)", "severity": "medium", "description": f"Heavy sub-bass energy at {sub} dB may overwhelm small speakers and cause masking", "value": sub})
        decisions.append({"processor": "High-Pass Filter", "action": f"High-pass at 30 Hz, sub shelf cut", "reason": f"Sub at {sub} dB will cause pumping on earbuds and cheap speakers", "value": f"{sub} dB measured"})

    if low_mid is not None and bass is not None and low_mid > bass + 3:
        problems.append({"band": "low-mid (250-500 Hz)", "severity": "medium", "description": f"Low-mid buildup at {low_mid} dB causes boxy, muffled sound", "value": low_mid})
        decisions.append({"processor": "EQ", "action": f"Cut −2 to −3 dB around 300-400 Hz", "reason": f"Low-mid at {low_mid} dB vs bass at {bass} dB creates boxy buildup that masks clarity", "value": f"−{round(low_mid - bass - 1, 1)} dB at 350 Hz"})

    if presence is not None and upper_mid is not None and presence > upper_mid + 4:
        problems.append({"band": "presence (5-10 kHz)", "severity": "medium", "description": f"Harsh presence peak at {presence} dB — will cause ear fatigue", "value": presence})
        decisions.append({"processor": "De-esser / EQ", "action": "Notch −1.5 dB at 7-8 kHz", "reason": f"Presence at {presence} dB vs upper-mid at {upper_mid} dB creates harsh sibilance", "value": f"{presence} dB measured"})

    if air is not None and air < -40:
        problems.append({"band": "air (10-20 kHz)", "severity": "low", "description": f"Dull top-end at {air} dB — track lacks openness and sparkle", "value": air})
        decisions.append({"processor": "Air EQ", "action": "High-shelf boost +1.5 dB at 12 kHz", "reason": f"Air band at {air} dB is thin — adding subtle high-shelf lift will open the top-end", "value": f"{air} dB measured"})

    # --- Genre-specific decisions ---
    genre_decisions = {
        "trap": {"processor": "Sub EQ", "action": "Boost at 60 Hz, cut mud at 200 Hz", "reason": "Trap genre needs defined 808 sub punch with a clean upper-bass", "value": None},
        "drill": {"processor": "Sub EQ", "action": "Boost at 55 Hz, darken top above 9 kHz", "reason": "Drill uses deep sliding 808 sub — upper-mid cut keeps it heavy not harsh", "value": None},
        "afrobeat": {"processor": "Mid EQ", "action": "Lift 280 Hz for warmth, 4 kHz for vocal presence", "reason": "Afrobeat groove sits in the low-mid warmth with percussive high-mid energy", "value": None},
        "gospel": {"processor": "Dynamics", "action": "Preserve choir dynamics (light 2:1 compression)", "reason": "Gospel relies on emotional swells — heavy compression kills the choir lift", "value": None},
        "cinematic": {"processor": "Stereo Width", "action": "Expand stereo to ×1.6 for orchestral depth", "reason": "Cinematic music needs a wide, enveloping soundstage", "value": None},
        "soul": {"processor": "Saturation", "action": "Subtle tape warmth on bass and vocals", "reason": "Soul music benefits from vintage harmonic coloring — keeps it organic not digital", "value": None},
    }
    if genre_key in genre_decisions:
        decisions.append(genre_decisions[genre_key])

    return {
        "problems": problems,
        "decisions": decisions,
        "summary": f"Found {len(problems)} issue(s). Applied {len(decisions)} processing decision(s).",
    }


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
    lufs = measure_lufs(path)
    dynamics = analyze_dynamics_via_astats(path)
    spectral = analyze_spectral_balance(path)
    genre_key = traits.get("estimated_genre", "custom").lower().split()[0]
    processing = build_processing_decisions(lufs, dynamics, spectral, genre_key)
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
        **lufs,
        "dynamics": dynamics,
        "spectral_balance": spectral,
        "processing_decisions": processing,
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


# Genre-driven loudness energy targets (Pop/EDM/Hip-Hop run hotter, Acoustic/Cinematic stay dynamic)
GENRE_LUFS: dict[str, float] = {
    "trap": -9.0,
    "drill": -8.5,
    "afrobeat": -9.0,
    "house": -8.0,
    "gospel": -12.0,
    "cinematic": -14.0,
    "soul": -11.0,
    "experimental": -11.0,
    "custom": -10.0,
}


def _genre_lufs(genre_key: str) -> float:
    return GENRE_LUFS.get(genre_key, -10.0)


def _frequency_balance_report(genre_key: str, low_eq: float, mid_eq: float, high_eq: float, air_boost: bool) -> dict:
    genre_low_mid = {
        "trap": "Sub punch boosted at 65 Hz, mud cut at 200 Hz",
        "drill": "Deep sub at 55 Hz, kick body lifted at 150 Hz",
        "afrobeat": "Kick/bass punch at 80 Hz, groove warmth at 280 Hz",
        "house": "Kick weight at 85 Hz, boxiness cut at 500 Hz",
        "gospel": "Vocal warmth at 200 Hz, boxy cut at 800 Hz",
        "cinematic": "Low rumble tamed below 120 Hz",
        "soul": "Warm bass at 120 Hz, vintage low-mid lift at 350 Hz",
    }.get(genre_key, "Balanced low end, gentle 90 Hz lift")

    genre_high_mid = {
        "trap": "Presence lift at 3.5 kHz, airy sparkle at 10 kHz",
        "drill": "Harshness cut at 3 kHz, dark top-end at 9 kHz",
        "afrobeat": "Vocal & percussion presence at 4 kHz",
        "house": "Energy lift at 3.5 kHz, sparkle at 10 kHz",
        "gospel": "Choir presence at 4 kHz, air at 11 kHz",
        "cinematic": "Detail lift at 2.5 kHz, spacious air at 12 kHz",
        "soul": "Vocal silk at 4.5 kHz, smooth top at 10 kHz",
    }.get(genre_key, "Presence lift at 3.2 kHz, air at 11 kHz")

    return {
        "low (20-250Hz)": (genre_low_mid + (f", user low EQ {low_eq:+.1f} dB" if abs(low_eq) > 0.5 else "")),
        "mid (250Hz-4kHz)": (f"User mid EQ {mid_eq:+.1f} dB" if abs(mid_eq) > 0.5 else "Untouched — left for genre EQ"),
        "high-mid/high (4-20kHz)": (genre_high_mid
                                     + (", extra brightness" if air_boost else "")
                                     + (f", user high EQ {high_eq:+.1f} dB" if abs(high_eq) > 0.5 else "")),
        "sibilance (8kHz)": "De-essed −1.5 dB (always on)",
    }


def _build_mix_notes(genre_key: str, mode: str, safe_strength: int, compress_ratio: float, compress_threshold: float,
                      stereo_width: float, warmth_label: str, target_lufs: float, platform: str,
                      measured: dict) -> str:
    measured_lufs = measured.get("integrated_lufs")
    measured_tp = measured.get("true_peak_dbtp")
    measured_lra = measured.get("lra")
    result_line = (
        f"Measured result: {measured_lufs} LUFS integrated, {measured_tp} dBTP true peak, {measured_lra} LU dynamic range."
        if measured_lufs is not None else
        "Loudness measurement unavailable for this render."
    )
    return (
        f"{mode} master at {safe_strength}% strength. "
        f"Applied {genre_key}-tuned EQ shaping, {warmth_label.lower()}, "
        f"transparent compression at {compress_ratio}:1 (threshold {compress_threshold:.0f} dB), "
        f"stereo width x{stereo_width:.2f}. "
        f"Targeted {target_lufs:.1f} LUFS / -1 dBTP for {platform}. "
        f"{result_line}"
    )


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
        "highpass=f=80",                                                    # aggressive rumble removal (80 Hz)
        "lowpass=f=18000",                                                  # gentle top-end rolloff
        "afftdn=nf=-25:nr=15",                                              # strong broadband noise reduction
        "agate=threshold=0.012:ratio=6:attack=10:release=300",              # cut room reverb tails between phrases
        "equalizer=f=200:t=q:w=1.0:g=-3",                                  # room resonance cut at 200 Hz
        "equalizer=f=400:t=q:w=1.0:g=-2",                                  # room resonance cut at 400 Hz
        "equalizer=f=7000:t=q:w=1.5:g=-2",                                 # light de-essing
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
            "rumble removal (80 Hz high-pass — stronger than before)",
            "gentle top-end rolloff (18 kHz low-pass)",
            "strong broadband noise reduction (afftdn −25 dB / 15 dB NR)",
            "room reverb tail gate (agate — cuts echo between phrases)",
            "room resonance cut at 200 Hz (−3 dB)",
            "room resonance cut at 400 Hz (−2 dB)",
            "de-essing at 7 kHz (−2 dB)",
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
        # Gains ~2x previous so differences are clearly audible at 72% strength
        return (
            [
                f"bass=g={7.0 * i:.1f}:f=65",                    # sub punch at 65 Hz (~5 dB at 72%)
                f"equalizer=f=200:t=q:w=1.2:g={-3.0 * i:.2f}",  # mud cut (~−2.2 dB)
                f"equalizer=f=3500:t=q:w=1.0:g={3.0 * i:.2f}",  # presence (~2.2 dB)
                f"treble=g={5.0 * i:.2f}:f=10000",               # airy highs (~3.6 dB)
            ],
            4.0, -16.0, 1.5,
        )

    if genre_key == "drill":
        # Heavy sub, dark mids, punchy & unforgiving
        return (
            [
                f"bass=g={9.0 * i:.1f}:f=55",                    # deep sub at 55 Hz (~6.5 dB at 72%)
                f"equalizer=f=150:t=q:w=1.0:g={3.0 * i:.2f}",   # body/kick weight (~2.2 dB)
                f"equalizer=f=3000:t=q:w=1.5:g={-5.0 * i:.2f}", # cut harshness (~−3.6 dB)
                f"equalizer=f=9000:t=q:w=1.0:g={-3.0 * i:.2f}", # dark top-end (~−2.2 dB)
            ],
            5.0, -14.0, 1.2,
        )

    if genre_key == "afrobeat":
        # Warm low-mids, percussive punch, vocal presence, groove
        return (
            [
                f"equalizer=f=80:t=q:w=0.9:g={4.0 * i:.2f}",    # kick/bass punch (~2.9 dB)
                f"equalizer=f=280:t=q:w=1.0:g={4.0 * i:.2f}",   # warmth / low-mid groove (~2.9 dB)
                f"equalizer=f=4000:t=q:w=1.0:g={4.0 * i:.2f}",  # vocal & percussion presence (~2.9 dB)
                f"treble=g={2.5 * i:.2f}:f=10000",               # subtle air (~1.8 dB)
            ],
            2.5, -20.0, 1.35,
        )

    if genre_key == "house":
        # Pumping kick energy, driving low end, bright & energetic
        return (
            [
                f"equalizer=f=85:t=q:w=0.8:g={6.0 * i:.2f}",    # kick weight (~4.3 dB)
                f"equalizer=f=500:t=q:w=1.5:g={-2.0 * i:.2f}",  # boxiness cut (~−1.4 dB)
                f"equalizer=f=3500:t=q:w=1.0:g={3.0 * i:.2f}",  # energy & presence (~2.2 dB)
                f"treble=g={4.0 * i:.2f}:f=10000",               # sparkle (~2.9 dB)
            ],
            3.5, -15.0, 1.4,
        )

    if genre_key == "gospel":
        # Vocal warmth, choir presence, transparent dynamics, full & rich
        return (
            [
                f"equalizer=f=200:t=q:w=1.0:g={3.5 * i:.2f}",   # vocal warmth (~2.5 dB)
                f"equalizer=f=800:t=q:w=1.5:g={-2.0 * i:.2f}",  # boxy cut (~−1.4 dB)
                f"equalizer=f=4000:t=q:w=0.9:g={5.0 * i:.2f}",  # vocal presence & clarity (~3.6 dB)
                f"treble=g={4.0 * i:.2f}:f=11000",               # choir air (~2.9 dB)
            ],
            2.0, -22.0, 1.25,
        )

    if genre_key == "cinematic":
        # Wide stereo, musical dynamics preserved, orchestral space
        return (
            [
                "highpass=f=40",                                   # clean sub (tighter)
                f"equalizer=f=120:t=q:w=1.0:g={-2.0 * i:.2f}",  # tame low rumble (~−1.4 dB)
                f"equalizer=f=2500:t=q:w=1.2:g={2.0 * i:.2f}",  # detail (~1.4 dB)
                f"treble=g={5.0 * i:.2f}:f=12000",               # spacious air (~3.6 dB)
            ],
            1.6, -28.0, 1.6,
        )

    if genre_key == "soul":
        # Vintage warmth, smooth midrange, silky highs
        return (
            [
                f"equalizer=f=120:t=q:w=0.9:g={3.0 * i:.2f}",   # warm bass (~2.2 dB)
                f"equalizer=f=350:t=q:w=1.0:g={4.0 * i:.2f}",   # vintage low-mid warmth (~2.9 dB)
                f"equalizer=f=4500:t=q:w=0.9:g={3.5 * i:.2f}",  # vocal silk (~2.5 dB)
                f"treble=g={2.0 * i:.2f}:f=10000",               # smooth top (~1.4 dB)
            ],
            2.2, -22.0, 1.2,
        )

    # Default: Custom AI adaptive — balanced for all genres
    return (
        [
            f"equalizer=f=90:t=q:w=1.0:g={2.5 * i:.2f}",
            f"equalizer=f=3200:t=q:w=1.1:g={2.5 * i:.2f}",
            f"treble=g={3.0 * i:.2f}:f=11000",
        ],
        2.4, -20.0, 1.3,
    )


def render_style_preview_with_ffmpeg(input_path: Path, output_dir: Path, mode: str, strength: int, warmth: float = 0.3) -> dict:
    """Fast 30-second style preview — genre EQ + saturation + basic normalization only, no full master render."""
    output_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "FFmpeg not available"}

    preview_path = output_dir / "style-preview.mp3"
    safe_strength = max(0, min(100, int(strength)))
    intensity = safe_strength / 100
    genre_key = (mode or "custom").lower().strip()
    genre_key = "afrobeat" if "afro" in genre_key else genre_key
    genre_key = "cinematic" if genre_key not in {"trap", "drill", "afrobeat", "house", "gospel", "soul", "experimental"} and "custom" not in genre_key else genre_key

    genre_eq, compress_ratio, compress_threshold, stereo_width = _genre_filters(genre_key, intensity)
    makeup = round(1.0 + intensity * 1.0, 2)
    safe_warmth = max(0.0, min(1.0, float(warmth)))
    pre_drive = round(1.0 + safe_warmth * 1.5, 2)
    sat_threshold = round(max(0.15, 0.55 - safe_warmth * 0.4), 3)

    filters: list[str] = [
        "highpass=f=30",
        "lowpass=f=19000",
        *genre_eq,
        *(([f"volume={pre_drive}", f"asoftclip=type=tanh:threshold={sat_threshold}"] if safe_warmth > 0.03 else [])),
        "equalizer=f=8000:t=q:w=1.5:g=-1.5",
        f"acompressor=threshold={compress_threshold:.1f}dB:ratio={compress_ratio}:attack=20:release=200:knee=4:makeup={makeup}",
        f"extrastereo=m={stereo_width:.2f}",
        "loudnorm=I=-14:TP=-1.5:LRA=11",
        "alimiter=limit=0.95",
    ]
    cmd = [
        "ffmpeg", "-y", "-i", str(input_path),
        "-t", "30",
        "-af", ",".join(filters),
        "-codec:a", "libmp3lame", "-b:a", "192k",
        str(preview_path),
    ]
    code, _stdout, stderr = run_command(cmd, timeout=120)
    if code != 0:
        return {"status": "failed", "stderr": stderr[-2000:]}
    return {
        "status": "completed",
        "mode": mode,
        "genre": genre_key,
        "preview_mp3": str(preview_path),
        "preview_exists": preview_path.exists(),
    }


def render_master_with_ffmpeg(input_path: Path, output_dir: Path, mode: str, strength: int, platform: str = "spotify", air_boost: bool = False, warmth: float = 0.0, low_eq: float = 0.0, mid_eq: float = 0.0, high_eq: float = 0.0) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "ffmpeg/ffprobe not found", "install_hint": "Install FFmpeg locally or keep Railway Dockerfile with apt-get ffmpeg."}

    safe_strength = max(0, min(100, int(strength)))
    intensity = safe_strength / 100
    genre_key = (mode or "custom").lower().strip()
    # Normalise common spellings
    genre_key = "afrobeat" if "afro" in genre_key else genre_key
    genre_key = "cinematic" if genre_key not in {"trap", "drill", "afrobeat", "house", "gospel", "soul", "experimental"} and "custom" not in genre_key else genre_key

    # Blend platform streaming target with genre energy target — louder genres (EDM/Trap)
    # push closer to their commercial loudness, while staying tied to the platform's reference
    platform_lufs = _lufs_for_platform(platform)
    genre_lufs = _genre_lufs(genre_key)
    target_lufs = round((platform_lufs + genre_lufs) / 2, 1)
    wav_path = output_dir / "mastered.wav"
    mp3_path = output_dir / "mastered.mp3"
    preview_path = output_dir / "mastered-preview.mp3"

    genre_eq, compress_ratio, compress_threshold, stereo_width = _genre_filters(genre_key, intensity)

    makeup = round(1.0 + intensity * 1.2, 2)
    # True-peak ceiling ~ -1 dBTP (0.891 linear), opening slightly with strength
    limit = round(0.89 + intensity * 0.04, 3)

    safe_warmth = max(0.0, min(1.0, float(warmth)))
    # Push signal into the saturation curve, then let loudnorm fix the level.
    # pre_drive boosts up to 2.5x so even quiet signals hit the clipper hard.
    pre_drive = round(1.0 + safe_warmth * 1.5, 2)
    # Lower threshold = more saturation (0.55 at 0% → 0.15 at 100%)
    sat_threshold = round(max(0.15, 0.55 - safe_warmth * 0.4), 3)

    filters: list[str] = [
        "highpass=f=30",                                          # remove sub-bass rumble
        "lowpass=f=19000",                                        # gentle top rolloff
        *genre_eq,                                                # genre-specific EQ shaping
        # Analog warmth: boost signal INTO tanh clipper, loudnorm corrects output level
        *(
            [f"volume={pre_drive}", f"asoftclip=type=tanh:threshold={sat_threshold}"]
            if safe_warmth > 0.03 else []
        ),
        *(([f"equalizer=f=100:t=q:w=0.8:g={low_eq:.1f}"] if abs(low_eq) > 0.5 else []) +
          ([f"equalizer=f=1000:t=q:w=1.0:g={mid_eq:.1f}"] if abs(mid_eq) > 0.5 else []) +
          ([f"equalizer=f=10000:t=q:w=1.0:g={high_eq:.1f}"] if abs(high_eq) > 0.5 else [])),
        "equalizer=f=8000:t=q:w=1.5:g=-1.5",                    # de-ess / sibilance control (always on)
        *(["treble=g=2.5:f=12000"] if air_boost else []),        # extra brightness if requested
        # Transparent soft-knee compression — musical, not robotic
        f"acompressor=threshold={compress_threshold:.1f}dB:ratio={compress_ratio}:attack=20:release=200:knee=4:makeup={makeup}",
        f"extrastereo=m={stereo_width:.2f}",                     # genre-tuned stereo width
        f"loudnorm=I={target_lufs}:TP=-1.0:LRA=11",             # streaming loudness (LRA=11 keeps dynamics)
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

    warmth_label = (
        "heavy tube drive" if safe_warmth >= 0.7
        else "moderate tape warmth" if safe_warmth >= 0.4
        else "subtle analog warmth" if safe_warmth > 0.03
        else "off (clean digital)"
    )

    # Real loudness measurement of the finished master, for the loudness report
    loudness_report = measure_lufs(wav_path) if wav_path.exists() else {}
    frequency_balance = _frequency_balance_report(genre_key, low_eq, mid_eq, high_eq, air_boost)
    mix_notes = _build_mix_notes(genre_key, mode, safe_strength, compress_ratio, compress_threshold,
                                  stereo_width, warmth_label, target_lufs, platform, loudness_report)

    return {
        "status": "completed",
        "mode": mode,
        "genre": genre_key,
        "platform": platform,
        "strength": safe_strength,
        "warmth": safe_warmth,
        "low_eq": low_eq,
        "mid_eq": mid_eq,
        "high_eq": high_eq,
        "target_lufs": target_lufs,
        "filter_chain": audio_filter,
        "loudness_report": loudness_report,
        "frequency_balance": frequency_balance,
        "mix_notes": mix_notes,
        "steps": [
            "sub-bass cleanup (30 Hz HPF)",
            f"genre EQ — {genre_key.title()} tonal shaping (EQ + compression character)",
            f"analog saturation — {warmth_label} (tanh soft-clip)",
            f"user EQ — low {low_eq:+.1f} dB · mid {mid_eq:+.1f} dB · high {high_eq:+.1f} dB",
            "sibilance control (8 kHz, always on)",
            "transparent soft-knee compression",
            "stereo widening",
            "streaming loudness normalisation",
            "true-peak limiting (-1 dBTP)",
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


def separate_stems_with_ffmpeg(input_path: Path, stems_dir: Path) -> dict:
    """FFmpeg Mid/Side stem separation — single-pass, memory-efficient.
    Vocals = center/mid channel (L+R)/2. Instrumental = side channel (L-R)/2.
    Single ffmpeg process halves memory vs two sequential runs.
    """
    stems_dir.mkdir(parents=True, exist_ok=True)
    if not has_ffmpeg():
        return {"status": "skipped", "reason": "FFmpeg not available"}

    vocal_out = stems_dir / "vocals.wav"
    instrumental_out = stems_dir / "instrumental.wav"

    # Single pass: split into mid (vocals) and side (instrumental) channels simultaneously.
    # [0:a] → pan filter for vocals → loudnorm → vocals.wav
    # [0:a] → pan filter for instrumental → loudnorm → instrumental.wav
    vocal_filter = "pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1,equalizer=f=90:t=h:width_type=h,equalizer=f=9000:t=l:width_type=h,loudnorm=I=-14:TP=-1"
    instr_filter = "pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0,loudnorm=I=-14:TP=-1"

    code, _stdout, stderr = run_command(
        [
            "ffmpeg", "-y", "-i", str(input_path),
            "-filter_complex", f"[0:a]{vocal_filter}[v];[0:a]{instr_filter}[i]",
            "-map", "[v]", "-ar", "44100", str(vocal_out),
            "-map", "[i]", "-ar", "44100", str(instrumental_out),
        ],
        timeout=120,
    )

    if code != 0 or not vocal_out.exists() or not instrumental_out.exists():
        return {"status": "failed", "stderr": stderr[-2000:]}

    return {
        "status": "completed",
        "method": "ffmpeg-ms-singlepass",
        "stems": {
            "vocals": {"path": str(vocal_out), "exists": True, "size_bytes": vocal_out.stat().st_size},
            "instrumental": {"path": str(instrumental_out), "exists": True, "size_bytes": instrumental_out.stat().st_size},
        },
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
