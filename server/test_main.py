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

    def clip_exists(self, doc_id):
        return doc_id in self.docs

    def save_clip(self, doc_id, path, data, record):
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
