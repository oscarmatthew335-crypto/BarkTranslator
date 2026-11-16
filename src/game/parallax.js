// Pure parallax offset helper for Scenery.js (kept in src/game so Node tests can import without JSX).
export function parallaxOffsets(dist, reduceMotion = false) {
  const d = Number(dist) || 0;
  if (reduceMotion) {
    return { sky: 0, far: 0, props: 0, ground: d };
  }
  return {
    sky: d * 0.1,
    far: d * 0.3,
    props: d * 0.6,
    ground: d
  };
}
