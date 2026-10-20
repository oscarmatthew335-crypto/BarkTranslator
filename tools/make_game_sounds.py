"""Synthesises the Play tab's short sound effects (jump, treat, bump, power-up, goal).

Run:  python tools/make_game_sounds.py   (writes assets/sounds/game_*.wav)

Plain tones and noise shaped by envelopes: tiny files, no recordings or
third-party assets.
"""
import os
import wave

import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
rng = np.random.default_rng(11)


def sweep(dur, f0, f1, shape="sine"):
    n = int(SR * dur)
    f = np.geomspace(f0, f1, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) if shape == "sine" else np.sign(np.sin(ph)) * 0.5


def env(n, attack=0.005, release=0.6):
    a = max(1, int(SR * attack))
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    r = int(n * release)
    e[n - r:] *= np.linspace(1, 0, r) ** 2
    return e


def tone(dur, f):
    return sweep(dur, f, f)


def save(name, x, gain=0.5):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    data = (x * 32767).astype("<i2").tobytes()
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)


jump = sweep(0.16, 330, 760)
save("game_jump", jump * env(len(jump)), 0.35)

c1, c2 = tone(0.06, 1320), tone(0.1, 1760)
collect = np.concatenate([c1 * env(len(c1), release=0.3), c2 * env(len(c2))])
save("game_collect", collect, 0.3)

thud = sweep(0.22, 220, 70) + rng.normal(0, 0.3, int(SR * 0.22))
save("game_hit", thud * env(len(thud), release=0.8), 0.45)

notes = [523, 659, 784, 1047]
power = np.concatenate([tone(0.07, f) * env(int(SR * 0.07), release=0.4) for f in notes])
save("game_power", power, 0.35)

goal = np.concatenate([tone(0.12, f) * env(int(SR * 0.12), release=0.3) for f in [523, 659, 784]] + [tone(0.35, 1047) * env(int(SR * 0.35))])
save("game_goal", goal, 0.4)
