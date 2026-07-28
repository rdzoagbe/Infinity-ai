"""Unit tests for the parametric chain and the technical release check."""

from app.chains import VOCAL_BEAT_DEFAULTS, build_vocal_beat_graph, normalize_vocal_beat_params
from app.release_check import build_qc_comparison, build_release_check


def test_normalize_clamps_out_of_range():
    p = normalize_vocal_beat_params({"vocal_gain": 99, "presence": -99, "warmth": 2, "beat_stereo_width": 0})
    assert p["vocal_gain"] == 2.0
    assert p["presence"] == -6.0
    assert p["warmth"] == 1.0
    assert p["beat_stereo_width"] == 1.0


def test_normalize_defaults_on_garbage():
    p = normalize_vocal_beat_params({"vocal_gain": "loud", "compression": None})
    assert p["vocal_gain"] == VOCAL_BEAT_DEFAULTS["vocal_gain"]
    assert p["compression"] == VOCAL_BEAT_DEFAULTS["compression"]


def test_graph_mute_and_modules():
    graph, report = build_vocal_beat_graph({"vocal_mute": True, "delay": 0.5, "reverb": 0.0, "compression": 0.0, "warmth": 0.0})
    modules = [r["module"] for r in report]
    assert "[0:a]volume=0.0" in graph  # muted vocal
    assert "Infinity Echo" in modules
    assert "Infinity Space" not in modules       # reverb off
    assert "Infinity Opto" not in modules        # compression off
    assert "Infinity Harmonics" not in modules   # warmth off
    assert modules[-1] == "Infinity Limiter"


def test_graph_full_chain_order():
    _, report = build_vocal_beat_graph({})
    modules = [r["module"] for r in report]
    assert modules.index("Infinity Clean") < modules.index("Infinity Opto") < modules.index("Infinity Limiter")


def test_release_check_unavailable_without_measurements():
    result = build_release_check({})
    statuses = {c["check"]: c["status"] for c in result["checks"]}
    assert statuses["loudness"] == "unavailable"
    assert statuses["true_peak"] == "unavailable"
    assert result["counts"]["unavailable"] >= 4


def test_release_check_pass_and_fail():
    analysis = {
        "integrated_lufs": -14.0, "true_peak_dbtp": -1.2, "lra": 6.0,
        "sample_rate": 44100, "channels": 2, "phase_correlation": 0.9,
        "dynamics": {"clipping_detected": False, "noise_floor_db": -70.0},
        "spectral_balance": {"bass": -20, "low_mid": -21, "presence": -25, "upper_mid": -24, "air": -30},
    }
    result = build_release_check(analysis)
    statuses = {c["check"]: c["status"] for c in result["checks"]}
    assert statuses["loudness"] == "pass"
    assert statuses["true_peak"] == "pass"
    assert statuses["clipping"] == "pass"
    assert statuses["stereo_compatibility"] == "pass"

    hot = build_release_check({**analysis, "true_peak_dbtp": 0.2, "integrated_lufs": -22.0})
    statuses_hot = {c["check"]: c["status"] for c in hot["checks"]}
    assert statuses_hot["true_peak"] == "fail"
    assert statuses_hot["loudness"] == "fail"


def test_qc_comparison_improvement():
    before = {"integrated_lufs": -22.0, "true_peak_dbtp": -0.2, "lra": 8.0, "dynamics": {}}
    after = {"integrated_lufs": -12.1, "true_peak_dbtp": -1.0, "lra": 6.0, "dynamics": {}}
    qc = build_qc_comparison(before, after, target_lufs=-12.0)
    rows = {r["metric"]: r for r in qc["rows"]}
    assert rows["integrated_lufs"]["improved"] is True
    assert rows["true_peak_dbtp"]["improved"] is True
    assert qc["new_problems"] == []


def test_qc_comparison_flags_new_problems():
    before = {"integrated_lufs": -20.0, "true_peak_dbtp": -2.0, "lra": 10.0, "dynamics": {}}
    after = {"integrated_lufs": -8.0, "true_peak_dbtp": -0.1, "lra": 1.0, "dynamics": {"clipping_detected": True}}
    qc = build_qc_comparison(before, after, target_lufs=-14.0)
    assert any("True peak" in p for p in qc["new_problems"])
    assert any("Clipping" in p for p in qc["new_problems"])
