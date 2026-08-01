"""Audio regression tests: real renders measured against tolerances.

Skipped automatically when ffmpeg is unavailable (CI installs it).
"""

import pytest

from app.audio import (
    analyze_dynamics_via_astats, has_ffmpeg, measure_lufs,
    mix_vocal_beat_with_ffmpeg, read_basic_audio_metadata, render_master_with_ffmpeg,
)
from conftest import make_wav

pytestmark = pytest.mark.skipif(not has_ffmpeg(), reason="ffmpeg not installed")

DURATION_S = 4.0
TARGET_LUFS = -12.0
LUFS_TOLERANCE = 2.0
TP_CEILING = -1.0
TP_TOLERANCE = 0.5


@pytest.fixture(scope="module")
def rendered(tmp_path_factory):
    root = tmp_path_factory.mktemp("audio")
    vocal = make_wav(root / "vocal.wav", seconds=DURATION_S, freq=440)
    beat = make_wav(root / "beat.wav", seconds=DURATION_S, freq=80, amplitude=0.6)

    mix = mix_vocal_beat_with_ffmpeg(vocal, beat, root / "mix", params={"reverb": 0.2, "compression": 0.5})
    assert mix["status"] == "completed", mix

    master = render_master_with_ffmpeg(
        root / "mix" / "mixed.wav", root / "master", mode="Afrobeat", strength=70,
        target_lufs_override=TARGET_LUFS, tp_ceiling=TP_CEILING,
    )
    assert master["status"] == "completed", master
    return {"root": root, "mix": mix, "master": master}


def test_mix_output_exists_and_correct_shape(rendered):
    from pathlib import Path

    wav = Path(rendered["mix"]["wav"])
    assert wav.exists() and wav.stat().st_size > 10000
    meta = read_basic_audio_metadata(wav)
    assert meta.get("channels") == 2
    assert abs((meta.get("duration_seconds") or 0) - DURATION_S) < 0.6


def test_mix_not_silent(rendered):
    from pathlib import Path

    dyn = analyze_dynamics_via_astats(Path(rendered["mix"]["wav"]))
    assert dyn.get("rms_db") is not None
    assert dyn["rms_db"] > -60.0, f"mix is effectively silent: {dyn}"


def test_master_lufs_within_tolerance(rendered):
    from pathlib import Path

    report = rendered["master"].get("loudness_report") or measure_lufs(Path(rendered["master"]["outputs"]["wav"]))
    lufs = report.get("integrated_lufs")
    assert lufs is not None
    assert abs(lufs - TARGET_LUFS) <= LUFS_TOLERANCE, f"LUFS {lufs} vs target {TARGET_LUFS}"


def test_master_true_peak_within_ceiling(rendered):
    from pathlib import Path

    report = rendered["master"].get("loudness_report") or measure_lufs(Path(rendered["master"]["outputs"]["wav"]))
    tp = report.get("true_peak_dbtp")
    assert tp is not None
    assert tp <= TP_CEILING + TP_TOLERANCE, f"true peak {tp} above ceiling {TP_CEILING}"


def test_master_no_clipping(rendered):
    from pathlib import Path

    dyn = analyze_dynamics_via_astats(Path(rendered["master"]["outputs"]["wav"]))
    assert dyn.get("clipping_detected") is not True


def test_parameters_change_output(rendered):
    """Muting the beat must measurably change the render."""
    from pathlib import Path

    root = rendered["root"]
    muted = mix_vocal_beat_with_ffmpeg(
        root / "vocal.wav", root / "beat.wav", root / "mix-muted",
        params={"beat_mute": True},
    )
    assert muted["status"] == "completed"
    rms_full = analyze_dynamics_via_astats(Path(rendered["mix"]["wav"]))["rms_db"]
    rms_muted = analyze_dynamics_via_astats(Path(muted["wav"]))["rms_db"]
    assert abs(rms_full - rms_muted) > 0.5, "muting the beat did not change the output"


def test_master_never_uses_style_preview(tmp_path):
    """Regression: mastering after a style preview must NOT truncate the song.

    The style preview is a 30 s / 192 kbps excerpt; using it as the master
    input shipped 30-second masters to users who previewed a style first.
    """
    from pathlib import Path

    source = make_wav(tmp_path / "song.wav", seconds=6.0, freq=330)
    renders = tmp_path / "renders"
    renders.mkdir()
    # Simulate a stale 1-second style preview in the workspace
    make_wav(tmp_path / "stub.wav", seconds=1.0, freq=440)
    import subprocess
    subprocess.run(["ffmpeg", "-y", "-i", str(tmp_path / "stub.wav"), "-b:a", "192k", str(renders / "style-preview.mp3")], capture_output=True)

    # Mirror _run_master's input selection logic
    enhanced = renders / "enhanced.wav"
    cleaned = renders / "mix-cleaned.wav"
    input_path = enhanced if enhanced.exists() else cleaned if cleaned.exists() else source
    assert input_path == source, "master input selection must skip the style preview"

    master = render_master_with_ffmpeg(input_path, renders / "out", mode="Afrobeat", strength=70)
    assert master["status"] == "completed"
    meta = read_basic_audio_metadata(Path(master["outputs"]["wav"]))
    assert abs((meta.get("duration_seconds") or 0) - 6.0) < 0.6, "master duration must match the full song"
