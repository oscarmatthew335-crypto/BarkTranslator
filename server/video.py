"""Makes the short share video: the pet's photo, the speech bubble popping up
and typing out in time with the recorded bark, then a Pawlingo end card.

Nothing here is stored. The caller passes bytes in and gets an MP4 path back
inside a temp folder it deletes afterwards.
"""

import array
import io
import math
import os
import re
import subprocess
import wave

from PIL import Image, ImageDraw, ImageFont, ImageOps

import imageio_ffmpeg

Image.MAX_IMAGE_PIXELS = 40_000_000

W, H = 720, 900
FPS = 24
HERE = os.path.dirname(__file__)
INK = (36, 22, 74)
SOFT = (107, 95, 143)
BG = (238, 231, 255)
PAPER = (255, 255, 255)
BUTTER = (255, 212, 59)
PINK = (255, 122, 172)
MINT = (43, 196, 138)

# The font has no emoji; the app's labels start with one ("🍖 Food / Braai").
EMOJI_RE = re.compile("[\U0001F000-\U0001FFFF☀-➿️‍←-⇿⬀-⯿]")


def clean(text, limit):
    text = EMOJI_RE.sub("", text or "")
    return re.sub(r"\s+", " ", text).strip()[:limit]


def _font(weight, size):
    return ImageFont.truetype(os.path.join(HERE, "fonts", f"Fredoka_{weight}.ttf"), size)


def _ease_out_back(t):
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2


def _ease_in_out(t):
    return t * t * (3 - 2 * t)


def read_wav(data):
    """16-bit PCM WAV -> (samples as floats -1..1, sample rate), or None."""
    try:
        with wave.open(io.BytesIO(data)) as w:
            if w.getsampwidth() != 2:
                return None
            rate, ch = w.getframerate(), w.getnchannels()
            raw = array.array("h", w.readframes(w.getnframes()))
        if ch > 1:
            raw = raw[::ch]
        return [s / 32768 for s in raw], rate
    except (wave.Error, EOFError, ValueError):
        return None


def envelope(samples, rate, fps, frames):
    """Loudness per video frame, 0..1, for the bouncing sound bars."""
    if not samples:
        return [0.0] * frames
    hop = max(1, rate // fps)
    out = []
    for i in range(frames):
        chunk = samples[i * hop : (i + 1) * hop]
        out.append(math.sqrt(sum(x * x for x in chunk) / len(chunk)) if chunk else 0.0)
    top = max(out) or 1
    return [min(1.0, v / top) for v in out]


def _wrap(draw, text, font, width):
    lines, line = [], ""
    for word in text.split(" "):
        test = f"{line} {word}".strip()
        if draw.textlength(test, font=font) <= width or not line:
            line = test
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


class Card:
    """Draws the frames. Layout is worked out once; each frame only changes
    the photo zoom, how much text is shown and the sound bars."""

    def __init__(self, photo, text, name, label, species):
        self.name = clean(name, 20) or ("Your dog" if species == "dog" else "Your cat")
        self.text = clean(text, 160) or "..."
        self.label = clean(label, 40)
        self.pet = "cat" if species == "cat" else "dog"
        self.icon = Image.open(os.path.join(HERE, "assets", "icon.png")).convert("RGBA")
        self.mark = Image.open(os.path.join(HERE, "assets", "mark.png")).convert("RGBA")
        self.f_head = _font("500Medium", 28)
        self.f_brand = _font("700Bold", 34)
        self.f_sub = _font("500Medium", 19)
        self.f_badge_s = _font("500Medium", 14)
        self.f_badge = _font("600SemiBold", 21)
        self.f_chip = _font("600SemiBold", 22)

        # Photo, pre-sized to cover the frame with room to zoom.
        self.photo = None
        if photo is not None:
            img = ImageOps.exif_transpose(photo).convert("RGB")
            scale = max(W * 1.1 / img.width, H * 1.1 / img.height)
            self.photo = img.resize((math.ceil(img.width * scale), math.ceil(img.height * scale)), Image.LANCZOS)

        # Bubble: pick the biggest text size that fits in 5 lines.
        probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
        self.bw = W - 64
        for size in (50, 46, 42, 38, 34, 30):
            self.f_text = _font("700Bold", size)
            self.lines = _wrap(probe, self.text, self.f_text, self.bw - 56)
            if len(self.lines) <= 5:
                break
        self.lines = self.lines[:6]
        self.line_h = int(self.f_text.size * 1.18)
        chip_h = 44 if self.label else 0
        self.bh = 28 + 36 + len(self.lines) * self.line_h + (chip_h + 14 if chip_h else 0) + 26
        self.bubble_y = H - 92 - 34 - self.bh
        self.total_chars = sum(len(l) for l in self.lines)

    # -- pieces -------------------------------------------------------------

    def _background(self, t, total):
        if self.photo is not None:
            z = 1.0 + 0.08 * (t / total)
            cw, ch = int(W * 1.1 / z), int(H * 1.1 / z)
            px, py = (self.photo.width - cw) // 2, (self.photo.height - ch) // 2
            return self.photo.crop((px, py, px + cw, py + ch)).resize((W, H), Image.BILINEAR)
        frame = Image.new("RGB", (W, H), BG)
        size = 330
        bob = int(10 * math.sin(t * 2.4))
        mark = self.mark.resize((size, int(size * self.mark.height / self.mark.width)), Image.LANCZOS)
        frame.paste(mark, ((W - size) // 2, 110 + bob), mark)
        return frame

    def _bubble(self, shown, level):
        layer = Image.new("RGBA", (self.bw + 8, self.bh + 40), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        # hard shadow, tail, body
        d.rounded_rectangle((7, 7, self.bw + 7, self.bh + 7), 30, fill=INK)
        d.polygon([(70, self.bh - 4), (150, self.bh - 4), (88, self.bh + 36)], fill=INK)
        d.rounded_rectangle((0, 0, self.bw, self.bh), 30, fill=PAPER, outline=INK, width=4)
        d.polygon([(66, self.bh - 6), (140, self.bh - 6), (82, self.bh + 30)], fill=PAPER)
        d.line([(66, self.bh - 2), (82, self.bh + 30), (140, self.bh - 2)], fill=INK, width=4, joint="curve")
        d.text((28, 26), f"{self.name} says", font=self.f_head, fill=SOFT)
        # live sound bars next to the name
        bx = 28 + int(d.textlength(f"{self.name} says", font=self.f_head)) + 18
        for i in range(7):
            amp = level * (0.55 + 0.45 * math.sin(i * 1.7 + level * 9))
            hgt = 6 + int(26 * max(0.0, amp))
            d.rounded_rectangle((bx + i * 11, 42 - hgt // 2, bx + i * 11 + 6, 42 + hgt // 2), 3, fill=PINK)
        # typed text
        y, left = 28 + 40, shown
        for line in self.lines:
            if left <= 0:
                break
            part = line[:left]
            d.text((28, y), part, font=self.f_text, fill=INK)
            left -= len(line)
            y += self.line_h
        if self.label and shown >= self.total_chars:
            y = 28 + 40 + len(self.lines) * self.line_h + 10
            tw = int(d.textlength(self.label, font=self.f_chip))
            d.rounded_rectangle((28, y, 28 + tw + 32, y + 44), 22, fill=BG, outline=INK, width=3)
            d.text((44, y + 8), self.label, font=self.f_chip, fill=INK)
        return layer

    def _footer(self, frame):
        d = ImageDraw.Draw(frame)
        top = H - 92
        d.rectangle((0, top, W, H), fill=BUTTER)
        d.line([(0, top), (W, top)], fill=INK, width=4)
        d.text((24, top + 14), "Pawlingo", font=self.f_brand, fill=INK)
        d.text((24, top + 54), f"What's your {self.pet} saying?", font=self.f_sub, fill=INK)
        bw = 196
        d.rounded_rectangle((W - bw - 22, top + 18, W - 22, top + 74), 14, fill=INK)
        d.text((W - bw - 6, top + 22), "Free on", font=self.f_badge_s, fill=PAPER)
        d.text((W - bw - 6, top + 40), "Google Play", font=self.f_badge, fill=PAPER)

    def end_card(self, t):
        frame = Image.new("RGB", (W, H), BUTTER)
        d = ImageDraw.Draw(frame)
        size = 280
        pop = _ease_out_back(min(1.0, t / 0.45))
        s = max(1, int(size * pop))
        icon = self.icon.resize((s, s), Image.LANCZOS)
        frame.paste(icon, ((W - s) // 2, 150 + (size - s) // 2), icon)
        big = _font("700Bold", 76)
        for text, font, y in (
            ("Pawlingo", big, 470),
            (f"What's your {self.pet} saying?", _font("500Medium", 32), 572),
        ):
            tw = d.textlength(text, font=font)
            d.text(((W - tw) / 2, y), text, font=font, fill=INK)
        label = "Free on Google Play"
        tw = d.textlength(label, font=self.f_chip)
        x0 = (W - tw) / 2 - 28
        d.rounded_rectangle((x0 + 5, 655, x0 + tw + 61, 721), 33, fill=INK)
        d.rounded_rectangle((x0, 650, x0 + tw + 56, 716), 33, fill=PAPER, outline=INK, width=4)
        d.text((x0 + 28, 668), label, font=self.f_chip, fill=INK)
        return frame


def render(out_path, photo_bytes=None, wav_bytes=None, text="", name="", label="", species="dog"):
    photo = None
    if photo_bytes:
        try:
            photo = Image.open(io.BytesIO(photo_bytes))
            photo.load()
        except Exception:  # an unreadable photo just means the no-photo look
            photo = None
    card = Card(photo, text, name, label, species)

    audio = read_wav(wav_bytes) if wav_bytes else None
    samples, rate = audio if audio else ([], 16000)
    audio_s = len(samples) / rate if samples else 0.0
    audio_start = 0.5
    type_start = 0.6
    type_s = min(6.0, max(1.6, audio_s or len(card.text) / 18))
    hold_s = 1.8
    main_s = type_start + type_s + hold_s
    end_s = 2.0
    total = main_s + end_s
    frames = int(total * FPS)
    env = envelope(samples, rate, FPS, frames)
    delay_frames = int(audio_start * FPS)

    wav_path = None
    tmp_dir = os.path.dirname(out_path)
    if audio:
        wav_path = os.path.join(tmp_dir, "in.wav")
        with open(wav_path, "wb") as f:
            f.write(wav_bytes)

    ff = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ff, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if wav_path:
        # Phone recordings from across the room are quiet: bring the loudest
        # moment up to about -3 dB (at most +24 dB) so the pet is heard.
        peak = max((abs(v) for v in samples), default=0.0)
        gain_db = 0.0 if peak <= 0 else max(0.0, min(24.0, -3.0 - 20 * math.log10(peak)))
        cmd += [
            "-i", wav_path, "-filter_complex",
            f"[1:a]volume={gain_db:.1f}dB,adelay={int(audio_start * 1000)}:all=1,apad,aresample=44100[a]",
        ]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-filter_complex", "[1:a]anull[a]"]
    cmd += [
        "-map", "0:v", "-map", "[a]", "-t", f"{total:.2f}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out_path,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for i in range(frames):
            t = i / FPS
            if t >= main_s:
                frame = card.end_card(t - main_s)
                if t - main_s < 0.25:  # quick fade from the main card
                    frame = Image.blend(last, frame, (t - main_s) / 0.25)
            else:
                frame = card._background(t, main_s)
                if t >= 0.35:
                    k = 1.0 if t >= type_start + type_s else max(0.0, (t - type_start) / type_s)
                    shown = int(round(card.total_chars * _ease_in_out(k))) if k < 1 else card.total_chars
                    ai = i - delay_frames
                    level = env[ai] if 0 <= ai < len(env) and t < type_start + type_s + 0.3 else 0.0
                    layer = card._bubble(shown, level)
                    pop = _ease_out_back(min(1.0, (t - 0.35) / 0.35))
                    if pop < 0.999:
                        lw, lh = max(1, int(layer.width * pop)), max(1, int(layer.height * pop))
                        layer = layer.resize((lw, lh), Image.BILINEAR)
                        x = 32 + (card.bw - lw) // 2
                        y = card.bubble_y + (card.bh - lh)
                    else:
                        x, y = 32, card.bubble_y
                    frame.paste(layer, (x, y), layer)
                card._footer(frame)
                last = frame
            proc.stdin.write(frame.tobytes())
        proc.stdin.close()
        err = proc.stderr.read().decode(errors="replace")
        if proc.wait(timeout=120) != 0:
            raise RuntimeError(f"ffmpeg failed: {err[-400:]}")
    finally:
        if proc.poll() is None:
            proc.kill()
    return {"seconds": round(total, 2), "frames": frames}
