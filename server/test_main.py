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
        self.photos = {}

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

    def save_photo(self, doc_id, path, data, record):
        self.blobs[path] = data
        self.photos[doc_id] = record

    def delete_photo(self, doc_id):
        rec = self.photos.pop(doc_id, None)
        if rec:
            self.blobs.pop(rec["storagePath"], None)
        return bool(rec)

    def delete_install(self, install_id):
        removed = 0
        for store in (self.docs, self.photos):
            gone = [k for k, v in store.items() if v["installId"] == install_id]
            for k in gone:
                self.blobs.pop(store[k]["storagePath"], None)
                del store[k]
            removed += len(gone)
        return removed


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


def _wav(seconds=0.6, rate=16000):
    import math
    import struct
    import wave

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        n = int(seconds * rate)
        w.writeframes(b"".join(struct.pack("<h", int(12000 * math.sin(i / 8) * (i % 4000 < 2000))) for i in range(n)))
    return buf.getvalue()


def _jpeg():
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (400, 500), (180, 140, 90)).save(buf, "JPEG")
    return buf.getvalue()


def post_video(client, meta, **files):
    data = {"meta": json.dumps(meta)}
    for k, (blob, name, ctype) in files.items():
        data[k] = (io.BytesIO(blob), name, ctype)
    return client.post("/video", data=data, headers=HEADERS, content_type="multipart/form-data")


def test_video_with_photo_and_sound(client):
    meta = {"text": "Eish, where is the biltong?", "petName": "Rex", "label": "🍖 Food", "species": "dog"}
    r = post_video(client, meta, photo=(_jpeg(), "p.jpg", "image/jpeg"), clip=(_wav(), "c.wav", "audio/wav"))
    assert r.status_code == 200, r.data[:200]
    assert r.headers["Content-Type"] == "video/mp4"
    assert r.data[4:8] == b"ftyp" and len(r.data) > 10_000


def test_video_names_the_store_for_the_phone(client, monkeypatch):
    import video

    seen = []
    real = video.render
    monkeypatch.setattr(video, "render", lambda out, **kw: (seen.append(kw["store"]), real(out, **kw))[1])
    for platform in ("ios", "android", None):
        meta = {"text": "Mrrp?", "petName": "Luna", "species": "cat", "platform": platform}
        assert post_video(client, meta).status_code == 200
    assert seen == ["App Store", "Google Play", "Google Play"]


def test_video_without_photo_or_sound(client):
    r = post_video(client, {"text": "Mrrp?", "petName": "Luna", "species": "cat"})
    assert r.status_code == 200 and r.data[4:8] == b"ftyp"


def test_video_needs_text(client):
    assert post_video(client, {"petName": "Rex"}).status_code == 400


def _camera_clip(seconds=3):
    import subprocess
    import tempfile

    import imageio_ffmpeg

    with tempfile.TemporaryDirectory() as d:
        out = os.path.join(d, "cam.mp4")
        subprocess.run(
            [imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-f", "lavfi", "-i", f"testsrc=size=720x1280:rate=30:duration={seconds}",
             "-c:v", "libx264", "-pix_fmt", "yuv420p", out],
            check=True,
        )
        return open(out, "rb").read()


def test_video_from_camera_clip(client):
    meta = {"text": "Tuna. Now.", "petName": "TumTum", "species": "cat"}
    r = post_video(client, meta, video=(_camera_clip(), "cam.mp4", "video/mp4"), clip=(_wav(1.0), "c.wav", "audio/wav"))
    assert r.status_code == 200, r.data[:200]
    assert r.data[4:8] == b"ftyp"



# ------------------------------------------------------------------ picked clips (/extract)
def _media(seconds=2.0, video=False, sound=True, fmt="mp4"):
    import subprocess
    import tempfile

    import imageio_ffmpeg

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, f"m.{fmt}")
        args = [ff, "-hide_banner", "-loglevel", "error", "-y"]
        if video:
            args += ["-f", "lavfi", "-i", f"color=c=black:s=64x64:d={seconds}"]
        if sound:
            args += ["-f", "lavfi", "-i", f"sine=frequency=600:duration={seconds}"]
        args += ["-metadata", "creation_time=2026-10-17T07:02:00Z", "-t", str(seconds)]
        if video:
            args += ["-c:v", "libx264", "-pix_fmt", "yuv420p"] if sound else ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-an"]
        if sound:
            args += ["-c:a", "aac"] if fmt in ("mp4", "m4a") else []
        subprocess.run(args + [out], check=True)
        return open(out, "rb").read()


def post_extract(client, data, **form):
    return client.post("/extract", data={"media": (io.BytesIO(data), "clip.bin", "application/octet-stream"), **form},
                       headers=HEADERS, content_type="multipart/form-data")


def test_extract_video_returns_16k_mono_wav_and_recording_time(client):
    r = post_extract(client, _media(2.0, video=True))
    assert r.status_code == 200, r.data[:200]
    assert r.data[:4] == b"RIFF" and r.data[8:12] == b"WAVE"
    import struct
    channels, rate = struct.unpack("<HI", r.data[22:28])
    assert channels == 1 and rate == 16000
    assert r.headers.get("X-Recorded-At") == "2026-10-17T07:02:00Z"
    assert r.headers.get("Cache-Control") == "no-store"


def test_extract_voice_note_and_trim(client):
    r = post_extract(client, _media(6.0, fmt="m4a"), start="1", seconds="2")
    assert r.status_code == 200
    samples = (len(r.data) - 44) // 2
    assert 1.8 * 16000 <= samples <= 2.2 * 16000


def test_extract_caps_length_at_30_seconds(client):
    r = post_extract(client, _media(1.0, fmt="m4a"), seconds="999")
    assert r.status_code == 200      # asking for more than 30 s is clamped, not an error


def test_extract_rejects_silent_video_garbage_and_huge(client):
    assert post_extract(client, _media(1.0, video=True, sound=False)).status_code == 422
    assert post_extract(client, b"not a media file at all " * 20).status_code == 422
    assert post_extract(client, b"x" * 10).status_code == 400
    big = b"x" * (main.MAX_MEDIA_BYTES + 10)
    assert post_extract(client, big).status_code == 413
    assert client.post("/extract", headers=HEADERS).status_code == 400


def test_extract_is_rate_limited(client, monkeypatch):
    monkeypatch.setitem(main.DAILY_LIMITS, "extracts", 1)
    assert post_extract(client, _media(0.5, fmt="m4a")).status_code == 200
    assert post_extract(client, _media(0.5, fmt="m4a")).status_code == 429


# --- Play tab photo challenge ----------------------------------------------

def _jpeg_with_gps(size=(64, 64)):
    """A small JPEG carrying EXIF with a GPS position, like a phone camera photo."""
    from PIL import Image

    img = Image.new("RGB", size, (200, 150, 90))
    exif = Image.Exif()
    exif[0x010F] = "PhoneMaker"  # camera make
    gps = exif.get_ifd(0x8825)
    gps[1] = "S"
    gps[2] = (33.0, 55.0, 12.0)
    gps[3] = "E"
    gps[4] = (18.0, 25.0, 30.0)
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif, quality=90)
    return buf.getvalue()


PHOTO_ID = "ph-dog-1760000000123"


def post_photo(client, data=None, headers=HEADERS, **meta_over):
    meta = {"photoId": PHOTO_ID, "species": "dog", "petKey": "p0123456789abcdef", "situation": "eating",
            "isPet": "yes", "size": "medium", "breedId": "golden", "breedConfirmed": True,
            "savedAt": "2026-10-20T10:00:00Z", "platform": "android", "lat": -33.9, "evil": "<b>"}
    meta.update(meta_over)
    return client.post(
        "/photo",
        data={"meta": json.dumps(meta), "photo": (io.BytesIO(_jpeg_with_gps() if data is None else data), "p.jpg", "image/jpeg")},
        headers=headers,
        content_type="multipart/form-data",
    )


def test_photo_needs_app_key_and_install_id(client):
    assert post_photo(client, headers={"X-App-Key": "nope", "X-Install-Id": INSTALL}).status_code == 401
    assert post_photo(client, headers={"X-App-Key": "test", "X-Install-Id": "bad"}).status_code == 400
    assert client.fake.photos == {}


def test_photo_saved_with_label_and_without_location(client):
    original = _jpeg_with_gps()
    assert b"Exif" in original
    r = post_photo(client, data=original)
    assert r.status_code == 201
    rec = client.fake.photos[f"{INSTALL}_{PHOTO_ID}"]
    assert rec["storagePath"] == f"photos/dog/{INSTALL}/{PHOTO_ID}.jpg"
    assert rec["label"] == {"situation": "eating", "isPet": "yes", "size": "medium", "breedId": "golden", "breedConfirmed": True}
    assert "lat" not in rec and "evil" not in rec and "-33.9" not in json.dumps(rec) and "<b>" not in json.dumps(rec)
    stored = client.fake.blobs[rec["storagePath"]]
    assert b"Exif" not in stored and b"PhoneMaker" not in stored
    from PIL import Image

    img = Image.open(io.BytesIO(stored))
    assert img.size == (64, 64) and not img.getexif()


def test_photo_only_jpeg_and_size_limited(client):
    assert post_photo(client, data=b"\x89PNG\r\n\x1a\n" + b"x" * 5000).status_code == 415
    assert post_photo(client, data=b"GIF89a" + b"x" * 5000).status_code == 415
    big = b"\xff\xd8\xff\xe0" + b"x" * 1_600_000
    assert post_photo(client, data=big).status_code == 413
    assert client.fake.photos == {}


def test_photo_meta_checked(client):
    assert post_photo(client, situation="bathroom").status_code == 400
    assert post_photo(client, species="cat").status_code == 400  # id says dog
    assert post_photo(client, photoId="../../x").status_code == 400


def test_photo_rate_limited(client):
    main.DAILY_LIMITS["photos"] = 1
    try:
        assert post_photo(client).status_code == 201
        assert post_photo(client).status_code == 429
    finally:
        main.DAILY_LIMITS["photos"] = 30


def test_delete_one_photo(client):
    post_photo(client)
    r = client.delete("/photo", json={"photoId": PHOTO_ID}, headers=HEADERS)
    assert r.status_code == 200 and r.get_json()["deleted"] is True
    assert client.fake.photos == {} and client.fake.blobs == {}
    assert client.delete("/photo", json={"photoId": PHOTO_ID}, headers=HEADERS).get_json()["deleted"] is False
    assert client.delete("/photo", json={"photoId": "nope"}, headers=HEADERS).status_code == 400


def test_delete_my_data_covers_photos(client):
    post_clip(client)
    post_photo(client)
    other = {"X-App-Key": "test", "X-Install-Id": "b" * 32}
    post_photo(client, headers=other)
    r = client.delete("/me", headers=HEADERS)
    assert r.get_json()["deleted"] == 2
    assert all(v["installId"] != INSTALL for v in client.fake.photos.values())
    assert len(client.fake.photos) == 1  # someone else's photo stays
    assert not any(INSTALL in k for k in client.fake.blobs)


def test_strip_jpeg_metadata_keeps_the_picture():
    data = _jpeg_with_gps((20, 10))
    clean = main.strip_jpeg_metadata(data)
    assert clean.startswith(b"\xff\xd8") and b"Exif" not in clean
    assert main.strip_jpeg_metadata(b"not a jpeg") is None
    assert main.strip_jpeg_metadata(b"\xff\xd8\xff\xe1\x00") is None
