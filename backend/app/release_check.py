"""Technical release check.

Replaces the former arbitrary "commercial readiness %" with per-dimension
checks calculated only from verified measurements. A dimension with no
measurement reports 'unavailable' — never a default score.

Statuses: pass | warning | fail | unavailable
"""


def _check(name: str, status: str, measured, explanation: str) -> dict:
    return {"check": name, "status": status, "measured": measured, "explanation": explanation}


def build_release_check(analysis: dict) -> dict:
    dynamics = analysis.get("dynamics") or {}
    spectral = analysis.get("spectral_balance") or {}
    checks: list[dict] = []

    # Loudness
    lufs = analysis.get("integrated_lufs")
    if lufs is None:
        checks.append(_check("loudness", "unavailable", None, "Integrated loudness could not be measured."))
    elif -16.5 <= lufs <= -8.0:
        checks.append(_check("loudness", "pass", f"{lufs} LUFS", "Within the common streaming delivery window (−16.5 to −8 LUFS)."))
    elif lufs < -20:
        checks.append(_check("loudness", "fail", f"{lufs} LUFS", "Very quiet — will sound weak next to commercial releases. Master to a louder target."))
    else:
        checks.append(_check("loudness", "warning", f"{lufs} LUFS", "Outside the common delivery window — check against your platform target."))

    # True peak
    tp = analysis.get("true_peak_dbtp")
    if tp is None:
        checks.append(_check("true_peak", "unavailable", None, "True peak could not be measured."))
    elif tp <= -1.0:
        checks.append(_check("true_peak", "pass", f"{tp} dBTP", "At or below −1 dBTP — safe for streaming encoders."))
    elif tp <= -0.3:
        checks.append(_check("true_peak", "warning", f"{tp} dBTP", "Above −1 dBTP — some lossy encoders may introduce inter-sample clipping."))
    else:
        checks.append(_check("true_peak", "fail", f"{tp} dBTP", "Too hot — will clip after lossy encoding. Lower the limiter ceiling."))

    # Clipping
    clipping = dynamics.get("clipping_detected")
    if clipping is None:
        checks.append(_check("clipping", "unavailable", None, "Clipping analysis unavailable."))
    elif clipping:
        checks.append(_check("clipping", "fail", f"{dynamics.get('samples_at_peak', '?')} samples at peak", "Flat-topped waveforms detected at full scale — audible distortion likely."))
    else:
        checks.append(_check("clipping", "pass", "none detected", "No flat-topped clipping found."))

    # Dynamics
    lra = analysis.get("lra")
    if lra is None:
        checks.append(_check("dynamics", "unavailable", None, "Loudness range could not be measured."))
    elif lra >= 4:
        checks.append(_check("dynamics", "pass", f"{lra} LU", "Healthy loudness range — the track breathes."))
    elif lra >= 2:
        checks.append(_check("dynamics", "warning", f"{lra} LU", "Compressed — acceptable for loud genres, flat for dynamic ones."))
    else:
        checks.append(_check("dynamics", "fail", f"{lra} LU", "Extremely compressed — transients and movement are being crushed."))

    # Noise
    noise = dynamics.get("noise_floor_db")
    if noise is None:
        checks.append(_check("noise", "unavailable", None, "Noise floor could not be measured."))
    elif noise <= -60:
        checks.append(_check("noise", "pass", f"{noise} dB", "Noise floor is inaudible at normal listening levels."))
    elif noise <= -50:
        checks.append(_check("noise", "warning", f"{noise} dB", "Slightly elevated noise floor — may be audible in quiet passages."))
    else:
        checks.append(_check("noise", "fail", f"{noise} dB", "Audible background noise — run noise reduction before release."))

    # Frequency balance (relational: worst offender among measured bands)
    freq_issues = []
    low_mid, bass = spectral.get("low_mid"), spectral.get("bass")
    presence, upper_mid = spectral.get("presence"), spectral.get("upper_mid")
    air = spectral.get("air")
    if low_mid is not None and bass is not None and low_mid > bass + 3:
        freq_issues.append("low-mid buildup (boxy)")
    if presence is not None and upper_mid is not None and presence > upper_mid + 4:
        freq_issues.append("harsh presence peak")
    if air is not None and air < -40:
        freq_issues.append("dull top end")
    if not spectral:
        checks.append(_check("frequency_balance", "unavailable", None, "Spectral analysis unavailable."))
    elif not freq_issues:
        checks.append(_check("frequency_balance", "pass", "no flags", "No major tonal imbalances across the 7 measured bands."))
    else:
        checks.append(_check("frequency_balance", "warning", ", ".join(freq_issues), "Tonal balance flags — see the detected problems list for exact bands."))

    # Stereo compatibility
    phase = analysis.get("phase_correlation")
    channels = analysis.get("channels")
    if channels == 1:
        checks.append(_check("stereo_compatibility", "pass", "mono source", "Mono file — no phase risk."))
    elif phase is None:
        checks.append(_check("stereo_compatibility", "unavailable", None, "Phase correlation could not be measured."))
    elif phase >= 0.5:
        checks.append(_check("stereo_compatibility", "pass", f"correlation {phase}", "Strong mono compatibility."))
    elif phase >= 0.0:
        checks.append(_check("stereo_compatibility", "warning", f"correlation {phase}", "Wide but watch mono playback — some cancellation possible."))
    else:
        checks.append(_check("stereo_compatibility", "fail", f"correlation {phase}", "Out-of-phase content — the mix may collapse or vanish in mono."))

    # Export readiness
    sr = analysis.get("sample_rate")
    if sr is None:
        checks.append(_check("export_readiness", "unavailable", None, "Sample rate unknown."))
    elif sr >= 44100:
        checks.append(_check("export_readiness", "pass", f"{sr} Hz, {channels or '?'}ch", "Meets distribution requirements (≥44.1 kHz)."))
    else:
        checks.append(_check("export_readiness", "warning", f"{sr} Hz", "Below 44.1 kHz — distributors may reject or upsample this."))

    counts = {"pass": 0, "warning": 0, "fail": 0, "unavailable": 0}
    for c in checks:
        counts[c["status"]] += 1

    return {
        "checks": checks,
        "counts": counts,
        "method": "Each check is a threshold on a real measurement of this file. Dimensions without a measurement report 'unavailable' — no defaults are substituted.",
    }


def build_qc_comparison(before: dict, after: dict, target_lufs: float | None = None) -> dict:
    """Before/after QC after a render: what improved, what regressed."""
    before_dyn = before.get("dynamics") or {}
    after_dyn = after.get("dynamics") or {}

    def row(metric, b, a, better):
        if b is None or a is None:
            return {"metric": metric, "before": b, "after": a, "delta": None, "improved": None}
        delta = round(a - b, 2)
        return {"metric": metric, "before": b, "after": a, "delta": delta, "improved": better(b, a)}

    tgt = target_lufs if target_lufs is not None else -14.0
    rows = [
        row("integrated_lufs", before.get("integrated_lufs"), after.get("integrated_lufs"),
            lambda b, a: abs(a - tgt) <= abs(b - tgt)),
        row("true_peak_dbtp", before.get("true_peak_dbtp"), after.get("true_peak_dbtp"),
            lambda b, a: (a <= -1.0) or (a <= b)),
        row("lra", before.get("lra"), after.get("lra"),
            lambda b, a: a >= min(b, 4.0) * 0.6),  # some LRA loss is expected when mastering louder
        row("noise_floor_db", before_dyn.get("noise_floor_db"), after_dyn.get("noise_floor_db"),
            lambda b, a: a <= b + 1.0),
        row("crest_factor_db", before_dyn.get("crest_factor_db"), after_dyn.get("crest_factor_db"),
            lambda b, a: a >= 6.0 or a >= b - 3.0),
    ]

    new_problems = []
    if (after.get("true_peak_dbtp") or -99) > -1.0:
        new_problems.append("True peak above −1 dBTP on the rendered master.")
    if after_dyn.get("clipping_detected"):
        new_problems.append("Clipping detected on the rendered master.")
    if (after.get("lra") is not None and before.get("lra") is not None
            and after["lra"] < before["lra"] * 0.4 and after["lra"] < 3):
        new_problems.append("Master lost most of its loudness range — consider a lower strength setting.")

    measured = [r for r in rows if r["improved"] is not None]
    return {
        "rows": rows,
        "new_problems": new_problems,
        "improved_count": sum(1 for r in measured if r["improved"]),
        "measured_count": len(measured),
    }
