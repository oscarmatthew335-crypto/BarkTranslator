"""Pawlingo ingest: receives opt-in pet sound clips and owner labels.

Google Cloud Functions (2nd gen, Python 3.12), one HTTP function, three routes:

  POST   /clips    multipart: "meta" (JSON) + "clip" (WAV or M4A, max 1 MB)
  POST   /labels   JSON: {clipId, context, moods[], comment, rating}
  DELETE /me       deletes every clip and label for the calling install
  GET    /model    ?species=dog&fv=f1&have=<version>: the current shared model
                   (written by train/train.py), or 204 if none / unchanged
  POST   /errors   JSON crash report: {message, stack, fatal, where, appVersion, platform, osVersion}
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
"""

import hmac
import json
import os
import re
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
DAILY_LIMITS = {"clips": 150, "labels": 500, "errors": 50}
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

    def delete_install(self, install_id):
        docs = list(self.fs.collection("clips").where("installId", "==", install_id).stream())
        for d in docs:
            path = (d.to_dict() or {}).get("storagePath")
            if path:
                blob = self.bucket.blob(path)
                if blob.exists():
                    blob.delete()
            d.reference.delete()
        return len(docs)


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
