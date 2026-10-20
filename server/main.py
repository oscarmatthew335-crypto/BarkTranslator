"""Pawlingo ingest: receives opt-in pet sound clips and owner labels.

Google Cloud Functions (2nd gen, Python 3.12), one HTTP function, three routes:

  POST   /clips    multipart: "meta" (JSON) + "clip" (WAV or M4A, max 1 MB)
  POST   /labels   JSON: {clipId, context, moods[], comment, rating}
  DELETE /me       deletes every clip and label for the calling install
  GET    /model    ?species=dog&fv=f1&have=<version>: the current shared model
                   (written by train/train.py), or 204 if none / unchanged
  POST   /errors   JSON crash report: {message, stack, fatal, where, appVersion, platform, osVersion}
  POST   /video    multipart: "meta" (JSON {text, petName, label, species}) +
                   optional "video" (the phone's silent camera clip, MP4) or
                   "photo" (JPEG), and "clip" (WAV sound): returns a short MP4
                   share video. Nothing is stored; inputs are deleted at once.
  POST   /extract  multipart: "media" (a video or voice note the owner picked,
                   any common format, max 25 MB) + optional "start" and
                   "seconds" (up to 30): returns the sound as 16 kHz mono WAV
                   for the app to analyse. Nothing is stored; the upload is
                   deleted at once. Header X-Recorded-At carries the file's
                   own recording time when it has one.
  POST   /photo    multipart: "meta" (JSON {photoId, species, petKey, situation,
                   isPet, size, breedId, breedConfirmed, savedAt, appVersion, platform})
                   + "photo" (JPEG only, max 1.5 MB): a Play tab photo-challenge photo
                   the owner chose to share. Any EXIF/metadata segments (camera,
                   location) are stripped again here before it is stored.
  DELETE /photo    JSON {photoId}: deletes one shared photo
  GET    /privacy  the public privacy policy page (no key needed)

Each phone (install ID) is limited per day: DAILY_LIMITS below. Over the
limit the server answers 429 and the app keeps the item and retries later.

Every request carries:
  X-App-Key     must match the APP_KEY env var (a speed bump, not real auth:
                anyone can pull it out of the APK)
  X-Install-Id  random 32-hex ID the app generates; no account or name

Clips are stored in Cloud Storage at clips/<species>/<installId>/<clipId>.<wav|m4a>
and their metadata (including the on-phone sound fingerprint) and labels in the
Firestore collection "clips". Models live at models/<species>/<fv>/current.json.
Shared photos are stored at photos/<species>/<installId>/<photoId>.jpg with their
labels in the Firestore collection "photos". DELETE /me removes clips and photos.
"""

import hmac
import json
import os
import re
import tempfile
from datetime import datetime, timezone

import functions_framework
from flask import jsonify

MAX_CLIP_BYTES = 1_000_000
MAX_COMMENT = 280
INSTALL_RE = re.compile(r"^[0-9a-f]{32}$")
CLIP_RE = re.compile(r"^(dog|cat)-\d{10,16}$")
WORD_RE = re.compile(r"^[a-z0-9_-]{1,32}$")
META_NUMBERS = ("soundCount", "loudness", "clarity", "durationMs", "activeMs", "longestMs", "peakDb", "noiseFloorDb")
META_WORDS = ("breedId", "chosenContext", "pattern", "platform", "format", "featureVersion")
MAX_FEATURES = 128
DAILY_LIMITS = {"clips": 150, "labels": 500, "errors": 50, "videos": 40, "extracts": 60, "photos": 30}
MAX_PHOTO_BYTES = 4_000_000
MAX_VIDEO_BYTES = 15_000_000
MAX_MEDIA_BYTES = 25_000_000   # a picked clip from the gallery or WhatsApp
MAX_EXTRACT_SECONDS = 30
EXTRACT_TIMEOUT_S = 60
MAX_SHARED_PHOTO_BYTES = 1_500_000  # a re-encoded photo-challenge JPEG
PHOTO_RE = re.compile(r"^ph-(dog|cat)-\d{10,16}$")
PHOTO_SITUATIONS = ("eating", "sleeping", "playing", "door", "outside", "toy")
PHOTO_SIZES = ("small", "medium", "large")
PRIVACY_PAGE = os.path.join(os.path.dirname(__file__), "privacy.html")


class Backend:
    """Real Google Cloud storage. Tests swap this for a fake."""

    def __init__(self):
        from google.cloud import firestore, storage

        self.fs = firestore.Client()
        self.bucket = storage.Client().bucket(os.environ["BUCKET"])
        self._array_union = firestore.ArrayUnion

    def clip_exists(self, doc_id):
        return self.fs.collection("clips").document(doc_id).get().exists

    def save_clip(self, doc_id, path, data, record, content_type="audio/mp4"):
        self.bucket.blob(path).upload_from_string(data, content_type=content_type)
        self.fs.collection("clips").document(doc_id).set(record)

    def add_label(self, doc_id, label):
        ref = self.fs.collection("clips").document(doc_id)
        if not ref.get().exists:
            return False
        ref.update({"labels": self._array_union([label]), "latestLabel": label, "labelled": True})
        return True

    def get_model(self, species, fv):
        blob = self.bucket.blob(f"models/{species}/{fv}/current.json")
        if not blob.exists():
            return None
        return json.loads(blob.download_as_text())

    def bump(self, install_id, kind):
        """Count one more request of this kind today for this phone; returns the new count."""
        from google.cloud import firestore as fs_mod

        day = datetime.now(timezone.utc).strftime("%Y%m%d")
        ref = self.fs.collection("limits").document(f"{install_id}_{kind}_{day}")
        ref.set({"n": fs_mod.Increment(1), "day": day}, merge=True)
        return (ref.get().to_dict() or {}).get("n", 1)

    def save_error(self, record):
        self.fs.collection("errors").add(record)

    def save_photo(self, doc_id, path, data, record):
        self.bucket.blob(path).upload_from_string(data, content_type="image/jpeg")
        self.fs.collection("photos").document(doc_id).set(record)

    def delete_photo(self, doc_id):
        ref = self.fs.collection("photos").document(doc_id)
        snap = ref.get()
        if not snap.exists:
            return False
        path = (snap.to_dict() or {}).get("storagePath")
        if path:
            blob = self.bucket.blob(path)
            if blob.exists():
                blob.delete()
        ref.delete()
        return True

    def delete_install(self, install_id):
        removed = 0
        for collection in ("clips", "photos"):
            docs = list(self.fs.collection(collection).where("installId", "==", install_id).stream())
            for d in docs:
                path = (d.to_dict() or {}).get("storagePath")
                if path:
                    blob = self.bucket.blob(path)
                    if blob.exists():
                        blob.delete()
                d.reference.delete()
            removed += len(docs)
        return removed


_backend = None


def get_backend():
    global _backend
    if _backend is None:
        _backend = Backend()
    return _backend


def _now():
    return datetime.now(timezone.utc).isoformat()


def _error(status, message):
    return jsonify({"error": message}), status


def _clean_meta(raw):
    meta = {}
    for k in META_NUMBERS:
        v = raw.get(k)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            meta[k] = v
    for k in META_WORDS:
        v = raw.get(k)
        if isinstance(v, str) and WORD_RE.match(v):
            meta[k] = v
    for k in ("recordedAt", "appVersion"):
        v = raw.get(k)
        if isinstance(v, str) and len(v) <= 40:
            meta[k] = v
    feats = raw.get("features")
    if (
        isinstance(feats, list)
        and 0 < len(feats) <= MAX_FEATURES
        and all(isinstance(x, (int, float)) and not isinstance(x, bool) and abs(x) < 1e6 for x in feats)
    ):
        meta["features"] = [float(x) for x in feats]
    guess = raw.get("guess")
    if isinstance(guess, dict):
        g = {}
        for k in ("context", "source"):
            if isinstance(guess.get(k), str) and WORD_RE.match(guess[k]):
                g[k] = guess[k]
        c = guess.get("confidence")
        if isinstance(c, (int, float)) and not isinstance(c, bool) and 0 <= c <= 1:
            g["confidence"] = float(c)
        if g:
            meta["guess"] = g
    return meta


@functions_framework.http
def ingest(request):
    if request.path.rstrip("/").endswith("/privacy") and request.method == "GET":
        with open(PRIVACY_PAGE, encoding="utf-8") as f:
            return f.read(), 200, {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600"}
    key = os.environ.get("APP_KEY", "")
    if not key or not hmac.compare_digest(request.headers.get("X-App-Key", ""), key):
        return _error(401, "bad app key")
    install_id = request.headers.get("X-Install-Id", "")
    if not INSTALL_RE.match(install_id):
        return _error(400, "bad install id")

    path = request.path.rstrip("/")
    if path.endswith("/model") and request.method == "GET":
        return _get_model(request)
    if path.endswith("/clips") and request.method == "POST":
        if _over_limit(install_id, "clips"):
            return _error(429, "daily clip limit reached; try tomorrow")
        return _post_clip(request, install_id)
    if path.endswith("/labels") and request.method == "POST":
        if _over_limit(install_id, "labels"):
            return _error(429, "daily answer limit reached; try tomorrow")
        return _post_label(request, install_id)
    if path.endswith("/errors") and request.method == "POST":
        if _over_limit(install_id, "errors"):
            return _error(429, "daily error report limit reached")
        return _post_error(request, install_id)
    if path.endswith("/video") and request.method == "POST":
        if _over_limit(install_id, "videos"):
            return _error(429, "daily video limit reached; try tomorrow")
        return _post_video(request)
    if path.endswith("/extract") and request.method == "POST":
        if _over_limit(install_id, "extracts"):
            return _error(429, "daily clip import limit reached; try tomorrow")
        return _post_extract(request)
    if path.endswith("/photo") and request.method == "POST":
        if _over_limit(install_id, "photos"):
            return _error(429, "daily photo limit reached; try tomorrow")
        return _post_photo(request, install_id)
    if path.endswith("/photo") and request.method == "DELETE":
        return _delete_photo(request, install_id)
    if path.endswith("/me") and request.method == "DELETE":
        removed = get_backend().delete_install(install_id)
        return jsonify({"deleted": removed}), 200
    return _error(404, "not found")


def _post_clip(request, install_id):
    if request.content_length and request.content_length > MAX_CLIP_BYTES + 20_000:
        return _error(413, "clip too large")
    try:
        raw = json.loads(request.form.get("meta", ""))
    except (ValueError, TypeError):
        return _error(400, "bad meta")
    if not isinstance(raw, dict):
        return _error(400, "bad meta")
    clip_id = raw.get("clipId", "")
    species = raw.get("species", "")
    if not CLIP_RE.match(str(clip_id)) or species not in ("dog", "cat") or not clip_id.startswith(species):
        return _error(400, "bad clip id or species")

    upload = request.files.get("clip")
    if upload is None:
        return _error(400, "missing clip")
    data = upload.read(MAX_CLIP_BYTES + 1)
    if len(data) > MAX_CLIP_BYTES:
        return _error(413, "clip too large")
    if len(data) < 200:
        return _error(400, "clip too small")

    backend = get_backend()
    doc_id = f"{install_id}_{clip_id}"
    if backend.clip_exists(doc_id):
        return jsonify({"ok": True, "duplicate": True}), 200

    is_wav = data[:4] == b"RIFF" and data[8:12] == b"WAVE"
    ext = "wav" if is_wav else "m4a"
    storage_path = f"clips/{species}/{install_id}/{clip_id}.{ext}"
    record = {
        "installId": install_id,
        "clipId": clip_id,
        "species": species,
        "storagePath": storage_path,
        "bytes": len(data),
        "meta": _clean_meta(raw),
        "labels": [],
        "labelled": False,
        "receivedAt": _now(),
    }
    backend.save_clip(doc_id, storage_path, data, record, "audio/wav" if is_wav else "audio/mp4")
    return jsonify({"ok": True}), 201


def _post_label(request, install_id):
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _error(400, "bad json")
    clip_id = str(body.get("clipId", ""))
    context = body.get("context")
    moods = body.get("moods") or []
    comment = body.get("comment") or ""
    rating = body.get("rating")
    if not CLIP_RE.match(clip_id):
        return _error(400, "bad clip id")
    if not isinstance(context, str) or not WORD_RE.match(context):
        return _error(400, "bad context")
    if not isinstance(moods, list) or len(moods) > 10 or not all(isinstance(m, str) and WORD_RE.match(m) for m in moods):
        return _error(400, "bad moods")
    if not isinstance(comment, str):
        return _error(400, "bad comment")
    if rating not in (None, "up", "down"):
        return _error(400, "bad rating")

    label = {
        "context": context,
        "moods": moods,
        "comment": comment.strip()[:MAX_COMMENT],
        "rating": rating,
        "labelledAt": _now(),
    }
    if not get_backend().add_label(f"{install_id}_{clip_id}", label):
        return _error(404, "clip not found")
    return jsonify({"ok": True}), 200


def _get_model(request):
    species = request.args.get("species", "")
    fv = request.args.get("fv", "")
    if species not in ("dog", "cat") or not WORD_RE.match(fv):
        return _error(400, "bad species or feature version")
    model = get_backend().get_model(species, fv)
    if not model:
        return "", 204
    if request.args.get("have") and request.args.get("have") == str(model.get("version")):
        return "", 204
    return jsonify(model), 200


def _over_limit(install_id, kind):
    return get_backend().bump(install_id, kind) > DAILY_LIMITS[kind]


def _post_error(request, install_id):
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return _error(400, "bad json")

    def text(k, n):
        v = body.get(k)
        return v[:n] if isinstance(v, str) else ""

    record = {
        "installId": install_id,
        "message": text("message", 1000),
        "stack": text("stack", 6000),
        "fatal": bool(body.get("fatal")),
        "where": text("where", 40),
        "appVersion": text("appVersion", 40),
        "platform": text("platform", 20),
        "osVersion": text("osVersion", 40),
        "receivedAt": _now(),
    }
    if not record["message"]:
        return _error(400, "missing message")
    get_backend().save_error(record)
    return jsonify({"ok": True}), 201


def _post_video(request):
    if request.content_length and request.content_length > MAX_VIDEO_BYTES + MAX_CLIP_BYTES + 50_000:
        return _error(413, "too large")
    try:
        raw = json.loads(request.form.get("meta", ""))
    except (ValueError, TypeError):
        return _error(400, "bad meta")
    if not isinstance(raw, dict) or not isinstance(raw.get("text"), str) or not raw["text"].strip():
        return _error(400, "bad meta")

    def field(name, limit):
        f = request.files.get(name)
        if not f:
            return None
        data = f.read(limit + 1)
        if len(data) > limit:
            raise ValueError(name)
        return data or None

    try:
        photo = field("photo", MAX_PHOTO_BYTES)
        clip = field("clip", MAX_CLIP_BYTES)
        movie = field("video", MAX_VIDEO_BYTES)
    except ValueError:
        return _error(413, "file too large")
    if clip is not None and not (clip[:4] == b"RIFF" and clip[8:12] == b"WAVE"):
        clip = None  # only WAV can be mixed in; make the video without sound

    import video  # Pillow and ffmpeg load only when someone shares a video

    species = raw.get("species") if raw.get("species") in ("dog", "cat") else "dog"
    # The iPhone app must not point people at Google Play (and vice versa).
    store = "App Store" if raw.get("platform") == "ios" else "Google Play"
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "pawlingo.mp4")
        movie_path = None
        if movie is not None and movie[4:8] == b"ftyp":  # an MP4 from the phone's camera
            movie_path = os.path.join(tmp, "camera.mp4")
            with open(movie_path, "wb") as f:
                f.write(movie)
        try:
            video.render(
                out,
                video_path=movie_path,
                photo_bytes=photo,
                wav_bytes=clip,
                text=str(raw.get("text"))[:200],
                name=str(raw.get("petName") or "")[:40],
                label=str(raw.get("label") or "")[:60],
                species=species,
                store=store,
            )
        except Exception as e:  # report and fail cleanly; the app falls back to a picture
            print(json.dumps({"severity": "ERROR", "message": f"video render failed: {e}"}))
            return _error(500, "could not make the video")
        with open(out, "rb") as f:
            data = f.read()
    return data, 200, {"Content-Type": "video/mp4", "Cache-Control": "no-store"}


RECORDED_RE = re.compile(r"creation_time\s*:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})")


def _post_extract(request):
    """Pull the sound out of a clip the owner picked (gallery video, WhatsApp voice note, ...).

    The phone can't decode every video and voice-note format itself, so ffmpeg does it here and the app runs its
    usual analysis on the returned WAV. The upload lives only in a temp folder for the length of the request."""
    if request.content_length and request.content_length > MAX_MEDIA_BYTES + 20_000:
        return _error(413, "clip too large")
    f = request.files.get("media")
    if not f:
        return _error(400, "missing media")
    data = f.read(MAX_MEDIA_BYTES + 1)
    if len(data) > MAX_MEDIA_BYTES:
        return _error(413, "clip too large")
    if len(data) < 100:
        return _error(400, "empty clip")
    try:
        start = max(0.0, min(float(request.form.get("start", 0) or 0), 3600.0))
        seconds = float(request.form.get("seconds", MAX_EXTRACT_SECONDS) or MAX_EXTRACT_SECONDS)
    except (TypeError, ValueError):
        return _error(400, "bad start or seconds")
    seconds = max(0.5, min(seconds, MAX_EXTRACT_SECONDS))

    import subprocess

    import imageio_ffmpeg

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "in")
        out = os.path.join(tmp, "out.wav")
        with open(src, "wb") as fh:
            fh.write(data)
        try:
            probe = subprocess.run([ff, "-hide_banner", "-i", src], capture_output=True, text=True,
                                   timeout=EXTRACT_TIMEOUT_S).stderr
            r = subprocess.run(
                [ff, "-hide_banner", "-loglevel", "error", "-nostdin", "-ss", f"{start:.3f}", "-t", f"{seconds:.3f}",
                 "-i", src, "-vn", "-sn", "-dn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-f", "wav", out],
                capture_output=True, text=True, timeout=EXTRACT_TIMEOUT_S)
        except subprocess.TimeoutExpired:
            return _error(422, "that clip took too long to read")
        if r.returncode != 0 or not os.path.exists(out) or os.path.getsize(out) <= 44:
            if "Audio:" not in probe:
                return _error(422, "that clip has no sound")
            return _error(422, "could not read that clip")
        with open(out, "rb") as fh:
            wav = fh.read()
    headers = {"Content-Type": "audio/wav", "Cache-Control": "no-store"}
    m = RECORDED_RE.search(probe or "")
    if m:
        headers["X-Recorded-At"] = m.group(1) + "Z"
    return wav, 200, headers


def strip_jpeg_metadata(data):
    """Return the JPEG without its APPn (EXIF, XMP, ICC...) and comment segments, or None if it isn't a JPEG.

    The app already re-encodes photos (which drops EXIF and location); this is a second line of defence so a
    location can never be stored even from an older or modified app."""
    if len(data) < 4 or data[:3] != b"\xff\xd8\xff":
        return None
    out = bytearray(b"\xff\xd8")
    i = 2
    n = len(data)
    while i + 4 <= n:
        if data[i] != 0xFF:
            return None
        marker = data[i + 1]
        if marker == 0xFF:  # fill byte
            i += 1
            continue
        if marker == 0xDA:  # start of scan: the image data follows to the end
            out += data[i:]
            return bytes(out)
        if 0xD0 <= marker <= 0xD7 or marker == 0x01:
            out += data[i:i + 2]
            i += 2
            continue
        length = int.from_bytes(data[i + 2:i + 4], "big")
        if length < 2 or i + 2 + length > n:
            return None
        if not (0xE0 <= marker <= 0xEF or marker == 0xFE):  # keep everything but APP0-15 and comments
            out += data[i:i + 2 + length]
        elif marker == 0xE0 and data[i + 4:i + 9] == b"JFIF\x00":
            out += data[i:i + 2 + length]  # the plain JFIF header carries no personal data
        i += 2 + length
    return None


def _post_photo(request, install_id):
    if request.content_length and request.content_length > MAX_SHARED_PHOTO_BYTES + 20_000:
        return _error(413, "photo too large")
    try:
        raw = json.loads(request.form.get("meta", ""))
    except (ValueError, TypeError):
        return _error(400, "bad meta")
    if not isinstance(raw, dict):
        return _error(400, "bad meta")
    photo_id = str(raw.get("photoId", ""))
    species = raw.get("species", "")
    m = PHOTO_RE.match(photo_id)
    if not m or m.group(1) != species:
        return _error(400, "bad photo id or species")
    situation = raw.get("situation")
    if situation not in PHOTO_SITUATIONS:
        return _error(400, "bad situation")

    upload = request.files.get("photo")
    if upload is None:
        return _error(400, "missing photo")
    data = upload.read(MAX_SHARED_PHOTO_BYTES + 1)
    if len(data) > MAX_SHARED_PHOTO_BYTES:
        return _error(413, "photo too large")
    clean = strip_jpeg_metadata(data)
    if clean is None or len(clean) < 500:
        return _error(415, "only JPEG photos")

    label = {"situation": situation}
    if raw.get("isPet") in ("yes", "no"):
        label["isPet"] = raw["isPet"]
    if raw.get("size") in PHOTO_SIZES:
        label["size"] = raw["size"]
    if isinstance(raw.get("breedId"), str) and WORD_RE.match(raw["breedId"]):
        label["breedId"] = raw["breedId"]
    if isinstance(raw.get("breedConfirmed"), bool):
        label["breedConfirmed"] = raw["breedConfirmed"]
    pet_key = raw.get("petKey")
    record = {
        "installId": install_id,
        "photoId": photo_id,
        "species": species,
        "petKey": pet_key if isinstance(pet_key, str) and re.match(r"^p[0-9a-f]{16}$", pet_key) else None,
        "label": label,
        "bytes": len(clean),
        "storagePath": f"photos/{species}/{install_id}/{photo_id}.jpg",
        "receivedAt": _now(),
    }
    for k in ("savedAt", "appVersion"):
        v = raw.get(k)
        if isinstance(v, str) and len(v) <= 40:
            record[k] = v
    if raw.get("platform") in ("ios", "android"):
        record["platform"] = raw["platform"]
    get_backend().save_photo(f"{install_id}_{photo_id}", record["storagePath"], clean, record)
    return jsonify({"ok": True}), 201


def _delete_photo(request, install_id):
    body = request.get_json(silent=True)
    photo_id = str((body or {}).get("photoId", "")) if isinstance(body, dict) else ""
    if not PHOTO_RE.match(photo_id):
        return _error(400, "bad photo id")
    removed = get_backend().delete_photo(f"{install_id}_{photo_id}")
    return jsonify({"ok": True, "deleted": bool(removed)}), 200
