export const SR = 16000;
export function synth(sec, events, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const x = new Float32Array(SR * sec);
  for (let i = 0; i < x.length; i++) x[i] = (rnd() - 0.5) * 0.004;
  for (const [st, d, f, a] of events)
    for (let i = Math.floor(st * SR); i < Math.min(x.length, (st + d) * SR); i++) {
      const t = i / SR;
      x[i] += a * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(4 * Math.PI * f * t) + 0.3 * (rnd() - 0.5));
    }
  return x;
}
