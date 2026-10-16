"""Synthesises the short animal and training sounds used on the Speak tab.

Run:  python tools/make_sounds.py   (writes assets/sounds/*.wav)

Sounds are built from a pitched source with harmonics, shaped by moving
"formant" resonances (like a mouth/throat), plus noise for breath. They're
stylised, not recordings; swap any file for a licensed recording later
without code changes (same file names).
"""
import json
import os
import wave

import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def interp(points, n):
    """points: [(time_fraction, value)] -> curve of length n"""
    xs, ys = zip(*points)
    return np.interp(np.linspace(0, 1, n), xs, ys)


def voiced(dur, f0_pts, formants_pts, amp_pts, breath=0.08, vib=(0, 0), harmonics=40, bw=1.0):
    """Additive voice: harmonics of f0 weighted by time-varying formants."""
    n = int(SR * dur)
    f0 = interp(f0_pts, n)
    if vib[0]:
        f0 = f0 * (1 + vib[1] * np.sin(2 * np.pi * vib[0] * t_axis(dur)))
    phase = 2 * np.pi * np.cumsum(f0) / SR
    forms = [interp(fp, n) for fp in formants_pts]  # each: centre freq over time
    out = np.zeros(n)
    for k in range(1, harmonics + 1):
        fk = k * f0
        w = np.zeros(n)
        for i, fc in enumerate(forms):
            width = (80 + 0.12 * fc) * bw
            w += (1.0 / (1 + i * 0.6)) * np.exp(-0.5 * ((fk - fc) / width) ** 2)
        w *= (fk < SR / 2 - 500)
        out += w * np.sin(k * phase) / (k ** 0.35)
    env = interp(amp_pts, n)
    noise = rng.normal(0, 1, n)
    noise = np.convolve(noise, np.ones(6) / 6, mode="same")
    out = out / (np.max(np.abs(out)) + 1e-9)
    return (out * (1 - breath) + noise * breath * 0.6) * env


def noise_burst(dur, lo, hi, amp_pts):
    n = int(SR * dur)
    spec = np.fft.rfft(rng.normal(0, 1, n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= (f > lo) & (f < hi)
    x = np.fft.irfft(spec, n)
    x /= np.max(np.abs(x)) + 1e-9
    return x * interp(amp_pts, n)


def silence(dur):
    return np.zeros(int(SR * dur))


def seq(*parts):
    return np.concatenate(parts)


def mix(a, b, gain=1.0):
    n = max(len(a), len(b))
    out = np.zeros(n)
    out[: len(a)] += a
    out[: len(b)] += b * gain
    return out


# --- base sounds -------------------------------------------------------------
def bark(f0=420, dur=0.2, gruff=0.25):
    v = voiced(
        dur,
        [(0, f0 * 1.15), (0.25, f0), (1, f0 * 0.75)],
        [[(0, 700), (0.3, 1000), (1, 650)], [(0, 1800), (1, 1500)], [(0, 2900), (1, 2600)]],
        [(0, 0), (0.04, 1), (0.35, 0.8), (1, 0)],
        breath=gruff,
        harmonics=30,
    )
    hit = noise_burst(dur * 0.35, 900, 3500, [(0, 0), (0.1, 1), (1, 0)])
    return mix(v, hit, 0.35)


def yip(f0=950):
    return voiced(
        0.09,
        [(0, f0 * 0.9), (0.4, f0 * 1.1), (1, f0)],
        [[(0, 1300), (1, 1600)], [(0, 2600), (1, 3000)]],
        [(0, 0), (0.1, 1), (1, 0)],
        breath=0.1,
        harmonics=16,
    )


def howl(dur=1.8, f0=420):
    return voiced(
        dur,
        [(0, f0 * 0.8), (0.25, f0 * 1.25), (0.7, f0 * 1.15), (1, f0 * 0.85)],
        [[(0, 500), (0.3, 750), (1, 450)], [(0, 1000), (1, 900)]],
        [(0, 0), (0.15, 0.9), (0.8, 0.8), (1, 0)],
        breath=0.05,
        vib=(5.5, 0.02),
        harmonics=12,
    )


def whine(dur=0.7, f0=1000):
    return voiced(
        dur,
        [(0, f0 * 0.9), (0.4, f0 * 1.2), (1, f0 * 0.95)],
        [[(0, 1200), (1, 1300)], [(0, 2800), (1, 2600)]],
        [(0, 0), (0.15, 0.6), (0.85, 0.5), (1, 0)],
        breath=0.06,
        vib=(7, 0.015),
        harmonics=10,
    )


def huff(dur=0.25):
    return noise_burst(dur, 200, 1600, [(0, 0), (0.1, 0.8), (1, 0)])


def meow(dur=0.75, f0=620, pitch_shape="normal"):
    if pitch_shape == "question":
        f0p = [(0, f0 * 0.85), (0.4, f0 * 1.05), (1, f0 * 1.35)]
    else:
        f0p = [(0, f0 * 0.85), (0.35, f0 * 1.25), (1, f0 * 0.8)]
    return voiced(
        dur,
        f0p,
        # m (closed) -> i -> a (open) -> ow (rounded)
        [[(0, 350), (0.15, 450), (0.45, 1000), (1, 650)], [(0, 1100), (0.2, 2300), (0.5, 1700), (1, 1050)], [(0, 2800), (1, 2900)]],
        [(0, 0), (0.12, 0.7), (0.5, 1), (0.85, 0.6), (1, 0)],
        breath=0.06,
        vib=(6, 0.01),
        harmonics=24,
    )


def mrrp(dur=0.38, f0=480):
    v = voiced(
        dur,
        [(0, f0 * 0.9), (1, f0 * 1.45)],
        [[(0, 450), (1, 750)], [(0, 1300), (1, 1800)]],
        [(0, 0), (0.15, 1), (0.8, 0.9), (1, 0)],
        breath=0.05,
        harmonics=18,
    )
    trill = 0.55 + 0.45 * np.sin(2 * np.pi * 28 * t_axis(dur))
    return v * trill[: len(v)]


def purr(dur=1.4):
    n = int(SR * dur)
    t = t_axis(dur)
    pulses = (0.5 + 0.5 * np.sin(2 * np.pi * 26 * t)) ** 3
    body = noise_burst(dur, 60, 700, [(0, 0), (0.1, 1), (0.9, 1), (1, 0)])
    hum = 0.4 * np.sin(2 * np.pi * 52 * t)
    return (body + hum) * pulses * interp([(0, 0), (0.1, 1), (0.9, 1), (1, 0)], n)


def chirp(f0=750):
    return voiced(
        0.12,
        [(0, f0), (1, f0 * 1.5)],
        [[(0, 900), (1, 1300)], [(0, 2000), (1, 2600)]],
        [(0, 0), (0.15, 1), (1, 0)],
        breath=0.05,
        harmonics=14,
    )


def yowl(dur=1.4):
    return meow(dur, 520) * 1.0


def tone(dur, f_pts, amp_pts, wobble=(0, 0)):
    n = int(SR * dur)
    f = interp(f_pts, n)
    if wobble[0]:
        f = f * (1 + wobble[1] * np.sin(2 * np.pi * wobble[0] * t_axis(dur)))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * interp(amp_pts, n)


def click():
    x = noise_burst(0.012, 1500, 7000, [(0, 1), (1, 0)])
    return seq(x, silence(0.05), x * 0.8)


def whistle():
    return seq(
        tone(0.28, [(0, 1600), (1, 2600)], [(0, 0), (0.1, 0.7), (1, 0.5)]),
        tone(0.4, [(0, 2600), (0.5, 2200), (1, 1900)], [(0, 0.5), (0.8, 0.6), (1, 0)]),
    )


def squeak():
    s = tone(0.22, [(0, 1900), (0.5, 2500), (1, 2100)], [(0, 0), (0.2, 0.8), (1, 0)], wobble=(30, 0.05))
    return seq(s, silence(0.08), s * 0.9)


def treat_shake():
    hits = []
    for _ in range(6):
        hits.append(noise_burst(0.05, 2500, 8000, [(0, 1), (1, 0)]) * rng.uniform(0.5, 1))
        hits.append(silence(rng.uniform(0.03, 0.07)))
    return seq(*hits)


def kiss():
    k = noise_burst(0.04, 3000, 9000, [(0, 0), (0.2, 1), (1, 0)])
    return seq(k, silence(0.09), k, silence(0.09), k)


def bird():
    c = tone(0.09, [(0, 3000), (1, 4600)], [(0, 0), (0.2, 0.6), (1, 0)])
    return seq(c, silence(0.06), c * 0.9, silence(0.06), c)


# --- what each phrase / tool plays ------------------------------------------
SOUNDS = {
    # dog phrases (ids from src/data/speakDogAndDecoder.js)
    "dog_good_boy": seq(yip(900), silence(0.07), yip(1000), silence(0.1), howl(0.9, 520)),
    "dog_walkies": seq(bark(460), silence(0.12), bark(480), silence(0.12), yip(950), silence(0.08), yip(1000)),
    "dog_stop_barking": seq(huff(0.35), silence(0.15), bark(300, 0.16, 0.4) * 0.6),
    "dog_braai_wait": seq(bark(380, 0.18), silence(0.35), huff(0.25)),
    "dog_come_here": seq(bark(440), silence(0.1), bark(460), silence(0.1), bark(480)),
    "dog_sorry_vet": seq(whine(0.6), silence(0.1), huff(0.25)),
    "dog_be_right_back": seq(huff(0.3), silence(0.2), whine(0.5, 900) * 0.7),
    "dog_play_bow": seq(huff(0.18), silence(0.08), bark(500, 0.15), silence(0.08), yip(1000), silence(0.06), bark(480, 0.15)),
    # cat phrases (ids from src/data/cat/speakAndDecoder.js)
    "cat_love_you": seq(mrrp(), silence(0.1), purr(1.2)),
    "cat_dinner": seq(meow(0.6, 650, "question"), silence(0.12), meow(0.5, 700), silence(0.08), meow(0.45, 720)),
    "cat_come_here": seq(mrrp(), silence(0.15), meow(0.5, 680, "question")),
    "cat_good_cat": seq(purr(1.0), silence(0.05), meow(0.35, 750) * 0.6),
    "cat_stop_that": seq(meow(0.55, 480) * 0.8),
    "cat_goodnight": seq(mrrp(0.45, 420) * 0.7, silence(0.1), purr(1.0) * 0.8),
    "cat_sorry": seq(meow(0.35, 820) * 0.6, silence(0.12), mrrp(0.35, 520) * 0.7),
    "cat_play": seq(chirp(), silence(0.05), chirp(800), silence(0.05), chirp(780), silence(0.12), meow(0.55, 600)),
    # tools (ids from src/species.js)
    "tool_click": click(),
    "tool_whistle": whistle(),
    "tool_squeak": squeak(),
    "tool_treats": treat_shake(),
    "tool_psst": kiss(),
    "tool_feather": bird(),
    # building blocks for "say it in Dog/Cat"
    "dog_unit_bark": bark(440),
    "dog_unit_low": bark(320, 0.22, 0.35),
    "dog_unit_yip": yip(950),
    "cat_unit_meow": meow(0.5, 640),
    "cat_unit_question": meow(0.55, 620, "question"),
    "cat_unit_mrrp": mrrp(0.3),
}


def write(name, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.85
    fade = min(len(x) // 10, int(0.01 * SR))
    if fade:
        x[-fade:] *= np.linspace(1, 0, fade)
    pcm = (x * 32767).astype("<i2")
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return round(len(x) / SR, 3)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    durations = {name: write(name, x) for name, x in SOUNDS.items()}
    with open(os.path.join(OUT, "durations.json"), "w") as f:
        json.dump(durations, f, indent=1)
    print(json.dumps(durations))
