"""Builds the Speak tab sounds from real recordings.

Source: BigSoundBank (https://bigsoundbank.com), released under CC0 (public
domain): free for commercial use, no attribution required. The source MP3s are
not kept in the repo; put them in a folder as <id>.mp3 and run:

    python3 tools/make_real_sounds.py <folder-with-mp3s>

Each sound is a list of (source id, start s, end s, gain) cuts joined with
short gaps. Sounds not listed here keep their synthesized version from
tools/make_sounds.py (the clicker, whistle and other training tools).
"""

import json
import os
import subprocess
import sys
import wave

import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
GAP = "gap"

RECIPES = {
    # building blocks for "say it in Dog" (short, one per word)
    "dog_unit_bark": [("2954", 0.08, 0.33)],
    "dog_unit_low": [("2352", 0.27, 0.52)],
    "dog_unit_yip": [("0682", 0.71, 1.22)],
    # dog phrases
    "dog_walkies": [("2954", 0.08, 0.70), (GAP, 0.12), ("0682", 0.71, 1.22)],
    "dog_come_here": [("2954", 2.47, 3.12), (GAP, 0.10), ("2954", 5.09, 5.30)],
    "dog_good_boy": [("0682", 0.71, 1.22), (GAP, 0.12), ("2954", 0.42, 0.66)],
    "dog_stop_barking": [("2352", 0.27, 0.52, 0.7)],
    "dog_braai_wait": [("2450", 0.13, 1.80)],
    "dog_sorry_vet": [("2451", 0.35, 1.90, 0.7, "fade")],
    "dog_be_right_back": [("1544", 1.55, 3.00, 1.0, "fade")],
    "dog_play_bow": [("1060", 0.29, 0.78), (GAP, 0.08), ("1060", 2.19, 2.36), (GAP, 0.08), ("1060", 2.88, 3.05)],
    # building blocks for "say it in Cat"
    "cat_unit_meow": [("1898", 0.60, 1.41)],
    "cat_unit_question": [("1900", 0.70, 1.57)],
    "cat_unit_mrrp": [("1894", 1.15, 1.38)],
    # cat phrases
    "cat_dinner": [("1891", 0.12, 1.44)],
    "cat_come_here": [("0098", 0.10, 0.72), (GAP, 0.15), ("0098", 1.09, 1.75)],
    "cat_good_cat": [("0436", 0.45, 2.45, 1.0, "fade")],
    "cat_goodnight": [("0436", 2.60, 5.00, 0.7, "fade")],
    "cat_love_you": [("1894", 1.15, 1.38), (GAP, 0.10), ("0436", 0.45, 1.80, 0.9, "fade")],
    "cat_play": [("0390", 0.07, 0.73), (GAP, 0.10), ("0390", 1.52, 1.97)],
    "cat_sorry": [("1896", 0.10, 1.79, 0.8)],
    "cat_stop_that": [("1886", 0.14, 1.60)],
    # training tools with a real recording
    "tool_squeak": [("0879", 0.10, 0.70)],
}


def load(src_dir, sid, cache={}):
    if sid not in cache:
        import imageio_ffmpeg

        raw = subprocess.run(
            [imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-i", os.path.join(src_dir, f"{sid}.mp3"),
             "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
            check=True, capture_output=True,
        ).stdout
        cache[sid] = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    return cache[sid]


def cut(x, start, end, gain=1.0, shape=None):
    seg = x[int(start * SR):int(end * SR)].copy()
    fi, fo = int(0.008 * SR), int(0.04 * SR)
    if shape == "fade":  # purrs: long soft fades
        fi = fo = int(0.25 * SR)
    fi, fo = min(fi, len(seg) // 3), min(fo, len(seg) // 3)
    seg[:fi] *= np.linspace(0, 1, fi)
    seg[-fo:] *= np.linspace(1, 0, fo)
    return seg * gain


def build(src_dir, recipe):
    parts = []
    for step in recipe:
        if step[0] == GAP:
            parts.append(np.zeros(int(step[1] * SR), np.float32))
        else:
            sid, s, e, *rest = step
            parts.append(cut(load(src_dir, sid), s, e, *rest))
    x = np.concatenate(parts)
    x -= x.mean()
    # Even loudness across sounds: active RMS to about -18 dBFS, peaks under -1 dB.
    frame = int(0.02 * SR)
    rms = np.sqrt(np.convolve(x * x, np.ones(frame) / frame, mode="same"))
    active = rms > rms.max() * 0.1
    level = np.sqrt(np.mean(x[active] ** 2)) if active.any() else 1e-3
    x *= 10 ** (-18 / 20) / level
    peak = np.abs(x).max()
    if peak > 0.89:
        x *= 0.89 / peak
    return x


def write(name, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return round(len(x) / SR, 3)


if __name__ == "__main__":
    src = sys.argv[1]
    path = os.path.join(OUT, "durations.json")
    durations = json.load(open(path))
    for name, recipe in RECIPES.items():
        durations[name] = write(name, build(src, recipe))
    with open(path, "w") as f:
        json.dump(durations, f, indent=1)
    print(json.dumps({k: durations[k] for k in RECIPES}))
