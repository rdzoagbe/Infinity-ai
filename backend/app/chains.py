"""Parametric vocal + beat processing chain.

Builds the ffmpeg filter graph for the vocal-and-beat mix from a validated
parameter set and reports every stage with its Infinity module name. These are
original processors implemented with ffmpeg primitives — not recreations of
any commercial plugin.

Module map
----------
Input Gain            volume (per track)
Infinity Clean        afftdn noise reduction + agate
High-pass             highpass 80 Hz
Infinity Dynamic EQ   corrective cuts (boxiness / nasal) + clarity band
Infinity De-Esser     two-band sibilance cut, amount-scaled
Infinity Opto         optical-style compressor, amount-scaled
Infinity Harmonics    tanh saturation, warmth-scaled
Infinity Air          presence bell + air shelf
Infinity Echo         1/8-note style slap delay send
Infinity Space        short-plate style reverb send (aecho approximation)
Mix Bus Compressor    2:1 glue on the sum
Infinity Limiter      final ceiling
"""


def _clamp(value, lo, hi, default):
    try:
        v = float(value)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, v))


VOCAL_BEAT_DEFAULTS = {
    "vocal_gain": 1.0,       # 0..2 linear
    "beat_gain": 0.85,       # 0..2 linear
    "vocal_mute": False,
    "beat_mute": False,
    "presence": 2.0,         # -6..+6 dB bell at 3.2 kHz
    "air": 1.8,              # 0..+6 dB shelf at 12 kHz
    "clarity": 0.0,          # -6..+6 dB bell at 1.8 kHz
    "warmth": 0.25,          # 0..1 saturation amount
    "deess": 0.5,            # 0..1 sibilance control amount
    "compression": 0.5,      # 0..1 → ratio 1.5..6
    "reverb": 0.2,           # 0..1 space send
    "delay": 0.0,            # 0..1 echo send
    "beat_stereo_width": 1.5,  # 1..3
    "bus_compress": True,
}


def normalize_vocal_beat_params(raw: dict) -> dict:
    """Clamp every parameter to its safe range; unknown keys are dropped."""
    d = VOCAL_BEAT_DEFAULTS
    return {
        "vocal_gain": _clamp(raw.get("vocal_gain"), 0.0, 2.0, d["vocal_gain"]),
        "beat_gain": _clamp(raw.get("beat_gain"), 0.0, 2.0, d["beat_gain"]),
        "vocal_mute": bool(raw.get("vocal_mute", d["vocal_mute"])),
        "beat_mute": bool(raw.get("beat_mute", d["beat_mute"])),
        "presence": _clamp(raw.get("presence"), -6.0, 6.0, d["presence"]),
        "air": _clamp(raw.get("air"), 0.0, 6.0, d["air"]),
        "clarity": _clamp(raw.get("clarity"), -6.0, 6.0, d["clarity"]),
        "warmth": _clamp(raw.get("warmth"), 0.0, 1.0, d["warmth"]),
        "deess": _clamp(raw.get("deess"), 0.0, 1.0, d["deess"]),
        "compression": _clamp(raw.get("compression"), 0.0, 1.0, d["compression"]),
        "reverb": _clamp(raw.get("reverb"), 0.0, 1.0, d["reverb"]),
        "delay": _clamp(raw.get("delay"), 0.0, 1.0, d["delay"]),
        "beat_stereo_width": _clamp(raw.get("beat_stereo_width"), 1.0, 3.0, d["beat_stereo_width"]),
        "bus_compress": bool(raw.get("bus_compress", d["bus_compress"])),
    }


def build_vocal_beat_graph(params: dict) -> tuple[str, list[dict]]:
    """Return (ffmpeg filter_complex, chain report) for the vocal+beat mix."""
    p = normalize_vocal_beat_params(params)
    report: list[dict] = []

    # ── Vocal chain ─────────────────────────────────────────────────────────
    vg = 0.0 if p["vocal_mute"] else p["vocal_gain"]
    vocal_filters = [f"volume={vg}"]
    report.append({"module": "Input Gain (vocal)", "params": {"gain": vg, "muted": p["vocal_mute"]}})

    vocal_filters += ["afftdn=nf=-22:nr=10", "agate=threshold=0.015:ratio=8:attack=5:release=250"]
    report.append({"module": "Infinity Clean", "params": {"noise_reduction_db": 10, "gate_ratio": 8}})

    vocal_filters.append("highpass=f=80:poles=2")
    report.append({"module": "High-pass", "params": {"frequency_hz": 80}})

    corrective = ["equalizer=f=200:t=q:w=1.0:g=-2.0", "equalizer=f=1000:t=q:w=1.5:g=-1.2"]
    if abs(p["clarity"]) > 0.25:
        corrective.append(f"equalizer=f=1800:t=q:w=1.2:g={p['clarity']:.1f}")
    vocal_filters += corrective
    report.append({"module": "Infinity Dynamic EQ", "params": {"boxy_cut_db": -2.0, "nasal_cut_db": -1.2, "clarity_db": round(p["clarity"], 1)}})

    if p["deess"] > 0.02:
        s_cut = round(-1.0 - p["deess"] * 3.5, 1)   # -1.0 .. -4.5 dB
        t_cut = round(-0.5 - p["deess"] * 2.5, 1)
        vocal_filters += [f"equalizer=f=7000:t=q:w=2.0:g={s_cut}", f"equalizer=f=9000:t=q:w=1.8:g={t_cut}"]
        report.append({"module": "Infinity De-Esser", "params": {"amount": p["deess"], "s_band_db": s_cut, "t_band_db": t_cut}})

    if p["compression"] > 0.02:
        ratio = round(1.5 + p["compression"] * 4.5, 1)      # 1.5 .. 6.0
        threshold = round(-14 - p["compression"] * 12, 1)   # -14 .. -26 dB
        makeup = round(1 + p["compression"] * 4, 1)
        vocal_filters.append(f"acompressor=threshold={threshold}dB:ratio={ratio}:attack=30:release=250:makeup={makeup}:knee=6")
        report.append({"module": "Infinity Opto", "params": {"amount": p["compression"], "ratio": ratio, "threshold_db": threshold, "makeup_db": makeup}})

    if p["warmth"] > 0.02:
        sat_threshold = round(max(0.25, 0.75 - p["warmth"] * 0.5), 3)
        vocal_filters.append(f"asoftclip=type=tanh:threshold={sat_threshold}")
        report.append({"module": "Infinity Harmonics", "params": {"warmth": p["warmth"], "threshold": sat_threshold}})

    air_filters = []
    if abs(p["presence"]) > 0.25:
        air_filters.append(f"equalizer=f=3200:t=q:w=0.9:g={p['presence']:.1f}")
    if p["air"] > 0.25:
        air_filters.append(f"treble=g={p['air']:.1f}:f=12000")
    if air_filters:
        vocal_filters += air_filters
        report.append({"module": "Infinity Air", "params": {"presence_db": round(p["presence"], 1), "air_db": round(p["air"], 1)}})

    if p["delay"] > 0.05:
        # slap/eighth style echo — fixed 240 ms, feedback scaled by amount
        decay = round(0.15 + p["delay"] * 0.35, 2)
        vocal_filters.append(f"aecho=0.8:0.85:240:{decay}")
        report.append({"module": "Infinity Echo", "params": {"amount": p["delay"], "time_ms": 240, "decay": decay}})

    if p["reverb"] > 0.05:
        delay_ms = round(40 + p["reverb"] * 120)
        decay = round(0.12 + p["reverb"] * 0.35, 2)
        vocal_filters.append(f"aecho=0.85:0.88:{delay_ms}:{decay}")
        report.append({"module": "Infinity Space", "params": {"amount": p["reverb"], "pre_delay_ms": delay_ms, "decay": decay}})

    vocal_chain = f"[0:a]{','.join(vocal_filters)}[v]"

    # ── Beat chain ──────────────────────────────────────────────────────────
    bg = 0.0 if p["beat_mute"] else p["beat_gain"]
    beat_filters = [f"volume={bg}"]
    report.append({"module": "Input Gain (beat)", "params": {"gain": bg, "muted": p["beat_mute"]}})
    if p["beat_stereo_width"] > 1.0:
        beat_filters.append(f"extrastereo=m={p['beat_stereo_width']:.1f}")
        report.append({"module": "Stereo Width (beat)", "params": {"width": round(p["beat_stereo_width"], 1)}})
    beat_chain = f"[1:a]{','.join(beat_filters)}[b]"

    # ── Mix bus ─────────────────────────────────────────────────────────────
    mix_filters = ["amix=inputs=2:duration=longest:normalize=0"]
    if p["bus_compress"]:
        mix_filters.append("acompressor=threshold=-12dB:ratio=2:attack=5:release=80:makeup=1.2")
        report.append({"module": "Mix Bus Compressor", "params": {"ratio": 2.0, "threshold_db": -12}})
    mix_filters.append("alimiter=limit=0.95")
    report.append({"module": "Infinity Limiter", "params": {"ceiling_linear": 0.95}})
    mix_chain = f"[v][b]{','.join(mix_filters)}[out]"

    return f"{vocal_chain};{beat_chain};{mix_chain}", report
