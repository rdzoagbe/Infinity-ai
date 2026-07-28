import os
import sys
import tempfile
import time
from pathlib import Path

import pytest

# Environment must be set before the app modules import settings.
_TMP = tempfile.mkdtemp(prefix="infinity-test-")
os.environ["INFINITY_STORAGE_DIR"] = _TMP
os.environ["INFINITY_AUTH_MODE"] = "optional"
os.environ["SUPABASE_JWT_SECRET"] = "test-secret-for-pytest-0123456789abcdef"
os.environ["INFINITY_RATE_LIMIT_PER_MINUTE"] = "1000"  # rate-limit has its own test
os.environ["INFINITY_ADMIN_TOKEN"] = "test-admin-token"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


JWT_SECRET = os.environ["SUPABASE_JWT_SECRET"]
ALICE_ID = "11111111-1111-1111-1111-111111111111"
BOB_ID = "22222222-2222-2222-2222-222222222222"


def make_token(sub: str, exp_offset: int = 3600) -> str:
    import jwt

    return jwt.encode(
        {"sub": sub, "aud": "authenticated", "exp": int(time.time()) + exp_offset, "role": "authenticated"},
        JWT_SECRET,
        algorithm="HS256",
    )


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def alice():
    return {"Authorization": f"Bearer {make_token(ALICE_ID)}"}


@pytest.fixture(scope="session")
def bob():
    return {"Authorization": f"Bearer {make_token(BOB_ID)}"}


def make_wav(path: Path, seconds: float = 2.0, freq: int = 440, rate: int = 44100, channels: int = 2, amplitude: float = 0.5):
    """Write a sine WAV without external dependencies."""
    import math
    import struct
    import wave

    with wave.open(str(path), "w") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        total = int(seconds * rate)
        for i in range(total):
            value = int(amplitude * 32767 * math.sin(2 * math.pi * freq * i / rate))
            frames += struct.pack("<h", value) * channels
        w.writeframes(bytes(frames))
    return path


@pytest.fixture()
def wav_file(tmp_path):
    return make_wav(tmp_path / "test.wav")
