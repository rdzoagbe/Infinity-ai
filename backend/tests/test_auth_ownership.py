"""Authentication, ownership isolation, upload validation, signed downloads."""

from conftest import make_token


def test_health_public(client):
    assert client.get("/health").status_code == 200


def test_expired_token_rejected(client):
    token = make_token("someone", exp_offset=-100)
    r = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_garbage_token_rejected(client):
    r = client.get("/api/v1/projects", headers={"Authorization": "Bearer not.a.jwt"})
    assert r.status_code == 401


def test_project_isolation(client, alice, bob):
    created = client.post("/api/v1/projects", json={"title": "Alice Song"}, headers=alice)
    assert created.status_code == 200
    project_id = created.json()["project_id"]

    alice_list = client.get("/api/v1/projects", headers=alice).json()["projects"]
    assert any(p["project_id"] == project_id for p in alice_list)

    bob_list = client.get("/api/v1/projects", headers=bob).json()["projects"]
    assert not any(p["project_id"] == project_id for p in bob_list)

    # Bob cannot delete Alice's project (404, not 403 — no id oracle)
    assert client.delete(f"/api/v1/projects/{project_id}", headers=bob).status_code == 404
    assert client.delete(f"/api/v1/projects/{project_id}", headers=alice).status_code == 200


def test_anonymous_client_scoping(client):
    a = {"X-Infinity-Client": "anonclientAAA1"}
    b = {"X-Infinity-Client": "anonclientBBB2"}
    project_id = client.post("/api/v1/projects", json={"title": "Anon Song"}, headers=a).json()["project_id"]
    ids_b = [p["project_id"] for p in client.get("/api/v1/projects", headers=b).json()["projects"]]
    assert project_id not in ids_b


def test_upload_and_file_ownership(client, alice, bob, wav_file):
    with open(wav_file, "rb") as fh:
        r = client.post("/api/v1/audio/upload", files={"file": ("test.wav", fh, "audio/wav")}, headers=alice)
    assert r.status_code == 200
    body = r.json()
    file_id = body["file"]["file_id"]
    assert body["file"]["user_id"]
    assert "sig=" in body["file"]["downloads"]["original"]

    assert client.get(f"/api/v1/files/{file_id}", headers=alice).status_code == 200
    assert client.get(f"/api/v1/files/{file_id}", headers=bob).status_code == 404


def test_upload_rejects_bad_extension(client, alice, wav_file):
    with open(wav_file, "rb") as fh:
        r = client.post("/api/v1/audio/upload", files={"file": ("test.exe", fh, "application/octet-stream")}, headers=alice)
    assert r.status_code == 400


def test_upload_rejects_wrong_magic_bytes(client, alice, tmp_path):
    fake = tmp_path / "fake.mp3"
    fake.write_bytes(b"\x00" * 4096)  # not an MP3 header
    with open(fake, "rb") as fh:
        r = client.post("/api/v1/audio/upload", files={"file": ("fake.mp3", fh, "audio/mpeg")}, headers=alice)
    assert r.status_code == 400
    assert "content" in r.json()["detail"].lower()


def test_signed_download_and_tampering(client, alice, wav_file):
    with open(wav_file, "rb") as fh:
        up = client.post("/api/v1/audio/upload", files={"file": ("test.wav", fh, "audio/wav")}, headers=alice).json()
    file_id = up["file"]["file_id"]
    signed = up["file"]["downloads"]["original"]

    # Signed URL works with zero auth
    assert client.get(signed).status_code == 200
    # Tampered signature is rejected
    tampered = signed.split("&sig=")[0] + "&sig=" + "0" * 32
    assert client.get(tampered).status_code == 404
    # Unsigned + unauthenticated is rejected
    assert client.get(f"/api/v1/files/{file_id}/download/original").status_code == 404
    # Owner with Bearer needs no signature
    assert client.get(f"/api/v1/files/{file_id}/download/original", headers=alice).status_code == 200


def test_job_ownership(client, alice, bob, wav_file):
    with open(wav_file, "rb") as fh:
        up = client.post("/api/v1/audio/upload", files={"file": ("test.wav", fh, "audio/wav")}, headers=alice).json()
    job_id = up["job"]["job_id"]
    assert client.get(f"/api/v1/jobs/{job_id}", headers=alice).status_code == 200
    assert client.get(f"/api/v1/jobs/{job_id}", headers=bob).status_code == 404


def test_file_deletion(client, alice, wav_file):
    with open(wav_file, "rb") as fh:
        up = client.post("/api/v1/audio/upload", files={"file": ("test.wav", fh, "audio/wav")}, headers=alice).json()
    file_id = up["file"]["file_id"]
    assert client.delete(f"/api/v1/files/{file_id}", headers=alice).status_code == 200
    assert client.get(f"/api/v1/files/{file_id}", headers=alice).status_code == 404


def test_account_data_deletion(client):
    me = {"Authorization": f"Bearer {make_token('33333333-3333-3333-3333-333333333333')}"}
    client.post("/api/v1/projects", json={"title": "Doomed"}, headers=me)
    r = client.delete("/api/v1/account", headers=me)
    assert r.status_code == 200
    assert client.get("/api/v1/projects", headers=me).json()["projects"] == []


def test_admin_overview_gated(client):
    assert client.get("/api/v1/admin/overview").status_code == 404
    assert client.get("/api/v1/admin/overview", headers={"X-Admin-Token": "wrong"}).status_code == 404
    r = client.get("/api/v1/admin/overview", headers={"X-Admin-Token": "test-admin-token"})
    assert r.status_code == 200
    body = r.json()
    assert "jobs" in body and "storage" in body and "capabilities" in body
