"""Run with:  cd server && APP_KEY=test python -m pytest -q"""

import io
import json
import os

import pytest
from flask import Flask

os.environ.setdefault("APP_KEY", "test")
import main  # noqa: E402

INSTALL = "a" * 32
HEADERS = {"X-App-Key": "test", "X-Install-Id": INSTALL}


class FakeBackend:
    def __init__(self):
        self.docs = {}
        self.blobs = {}
        self.models = {}
        self.counts = {}
        self.errors = []

    def bump(self, install_id, kind):
        self.counts[(install_id, kind)] = self.counts.get((install_id, kind), 0) + 1
        return self.counts[(install_id, kind)]

    def save_error(self, record):
        self.errors.append(record)

    def clip_exists(self, doc_id):
        return doc_id in self.docs

    def get_model(self, species, fv):
        return self.models.get((species, fv))

    def save_clip(self, doc_id, path, data, record, content_type="audio/mp4"):
        self.blobs[path] = data
        self.docs[doc_id] = record

    def add_label(self, doc_id, label):
        if doc_id not in self.docs:
            return False
        self.docs[doc_id]["labels"].append(label)
        self.docs[doc_id]["labelled"] = True
        return True

    def delete_install(self, install_id):
        gone = [k for k, v in self.docs.items() if v["installId"] == install_id]
        for k in gone:
            self.blobs.pop(self.docs[k]["storagePath"], None)
            del self.docs[k]
        return len(gone)


@pytest.fixture
def client():
    fake = FakeBackend()
    main._backend = fake
    app = Flask("t")
    app.add_url_rule("/<path:p>", "ingest", lambda p: main.ingest(__import__("flask").request), methods=["GET", "POST", "DELETE"])
    with app.test_client() as c:
        c.fake = fake
        yield c


def post_clip(client, clip_id="dog-1760000000000", species="dog", data=b"x" * 5000, headers=HEADERS):
    meta = {"clipId": clip_id, "species": species, "soundCount": 3, "pattern": "rapid", "chosenContext": "door", "evil": "<script>"}
    return client.post(
        "/clips",
        data={"meta": json.dumps(meta), "clip": (io.BytesIO(data), "c.m4a", "audio/mp4")},
        headers=headers,
        content_type="multipart/form-data",
    )


def test_rejects_bad_key(client):
    r = post_clip(client, headers={"X-App-Key": "nope", "X-Install-Id": INSTALL})
    assert r.status_code == 401


def test_rejects_bad_install_id(client):
    r = post_clip(client, headers={"X-App-Key": "test", "X-Install-Id": "../../etc"})
    assert r.status_code == 400


def test_clip_saved_and_meta_cleaned(client):
    r = post_clip(client)
    assert r.status_code == 201
    doc = client.fake.docs[f"{INSTALL}_dog-1760000000000"]
    assert doc["storagePath"] == f"clips/dog/{INSTALL}/dog-1760000000000.m4a"
    assert doc["meta"]["soundCount"] == 3 and "evil" not in doc["meta"]
    assert post_clip(client).get_json()["duplicate"] is True


def test_species_must_match_clip_id(client):
    assert post_clip(client, clip_id="cat-1760000000000", species="dog").status_code == 400


def test_size_limits(client):
    assert post_clip(client, data=b"x" * 10).status_code == 400
    assert post_clip(client, data=b"x" * 1_100_000).status_code == 413


def test_label_flow(client):
    post_clip(client)
    body = {"clipId": "dog-1760000000000", "context": "door", "moods": ["alert"], "comment": " postman ", "rating": "up"}
    r = client.post("/labels", json=body, headers=HEADERS)
    assert r.status_code == 200
    label = client.fake.docs[f"{INSTALL}_dog-1760000000000"]["labels"][0]
    assert label["comment"] == "postman" and label["moods"] == ["alert"]
    assert client.post("/labels", json={**body, "clipId": "dog-1"}, headers=HEADERS).status_code == 400
    assert client.post("/labels", json={**body, "clipId": "dog-1760000000001"}, headers=HEADERS).status_code == 404
    assert client.post("/labels", json={**body, "moods": ["<b>"]}, headers=HEADERS).status_code == 400


def test_delete_me(client):
    post_clip(client)
    post_clip(client, clip_id="cat-1760000000001", species="cat")
    r = client.delete("/me", headers=HEADERS)
    assert r.get_json()["deleted"] == 2
    assert client.fake.docs == {} and client.fake.blobs == {}


def test_accepts_expo_fetch_multipart(client):
    """Same bytes Expo's fetch builds from FormData with an expo-file-system File."""
    b = "----ExpoFetchFormBoundary0123456789abcdef"
    meta = json.dumps({"clipId": "dog-1760000000002", "species": "dog"})
    body = (
        f"--{b}\r\ncontent-disposition: form-data; name=\"meta\"\r\n\r\n{meta}\r\n"
        f"--{b}\r\ncontent-disposition: form-data; name=\"clip\"; filename=\"dog-1760000000002.m4a\"\r\n"
        f"content-type: audio/mp4\r\n\r\n"
    ).encode() + b"x" * 4000 + f"\r\n--{b}--\r\n".encode()
    r = client.post("/clips", data=body, headers={**HEADERS, "Content-Type": f"multipart/form-data; boundary={b}"})
    assert r.status_code == 201
    assert f"clips/dog/{INSTALL}/dog-1760000000002.m4a" in client.fake.blobs


def test_wav_with_features_and_guess(client):
    wav = b"RIFF" + b"\x00" * 4 + b"WAVE" + b"x" * 3000
    meta = {
        "clipId": "dog-1760000000003", "species": "dog", "format": "wav", "featureVersion": "f1",
        "features": [0.1, -2.5, 3] , "guess": {"context": "door", "confidence": 0.71, "source": "pet", "x": "<b>"},
    }
    r = client.post(
        "/clips",
        data={"meta": json.dumps(meta), "clip": (io.BytesIO(wav), "c.wav", "audio/wav")},
        headers=HEADERS, content_type="multipart/form-data",
    )
    assert r.status_code == 201
    doc = client.fake.docs[f"{INSTALL}_dog-1760000000003"]
    assert doc["storagePath"].endswith(".wav")
    assert doc["meta"]["features"] == [0.1, -2.5, 3.0]
    assert doc["meta"]["guess"] == {"context": "door", "source": "pet", "confidence": 0.71}


def test_bad_features_dropped(client):
    meta = {"clipId": "dog-1760000000004", "species": "dog", "features": ["a", 1]}
    client.post("/clips", data={"meta": json.dumps(meta), "clip": (io.BytesIO(b"x" * 500), "c.m4a")},
                headers=HEADERS, content_type="multipart/form-data")
    assert "features" not in client.fake.docs[f"{INSTALL}_dog-1760000000004"]["meta"]


def test_model_endpoint(client):
    assert client.get("/model?species=dog&fv=f1", headers=HEADERS).status_code == 204
    client.fake.models[("dog", "f1")] = {"version": "v7", "contexts": ["door"]}
    r = client.get("/model?species=dog&fv=f1", headers=HEADERS)
    assert r.status_code == 200 and r.get_json()["version"] == "v7"
    assert client.get("/model?species=dog&fv=f1&have=v7", headers=HEADERS).status_code == 204
    assert client.get("/model?species=fish&fv=f1", headers=HEADERS).status_code == 400


def test_privacy_page_needs_no_key(client):
    r = client.get("/privacy")
    assert r.status_code == 200 and b"privacy policy" in r.data.lower()
    assert r.headers["Content-Type"].startswith("text/html")


def test_error_reports(client):
    r = client.post("/errors", json={"message": "boom", "stack": "x" * 9000, "fatal": True, "platform": "android"}, headers=HEADERS)
    assert r.status_code == 201
    rec = client.fake.errors[0]
    assert rec["message"] == "boom" and len(rec["stack"]) == 6000 and rec["fatal"] is True
    assert client.post("/errors", json={"stack": "no message"}, headers=HEADERS).status_code == 400


def test_daily_limits(client):
    main.DAILY_LIMITS["errors"] = 2
    try:
        codes = [client.post("/errors", json={"message": "m"}, headers=HEADERS).status_code for _ in range(3)]
        assert codes == [201, 201, 429]
    finally:
        main.DAILY_LIMITS["errors"] = 50
