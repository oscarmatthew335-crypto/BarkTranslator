// Lets plain Node run the app's JS modules by swapping native modules for stubs.
const stubs = new URL('./stubs/', import.meta.url);
const map = {
  '@react-native-async-storage/async-storage': 'storage.mjs',
  'react-native': 'rn.mjs',
  'expo-file-system': 'fs.mjs',
  'expo-network': 'network.mjs',
  'expo-image-manipulator': 'imagemanip.mjs'
};
export async function resolve(spec, ctx, next) {
  if (map[spec]) return { url: new URL(map[spec], stubs).href, shortCircuit: true };
  if (spec.startsWith('.') && !/\.(m?js|json)$/.test(spec)) return next(spec + '.js', ctx);
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.endsWith('.json')) {
    const { readFileSync } = await import('node:fs');
    return { format: 'json', source: readFileSync(new URL(url)), shortCircuit: true, importAttributes: { type: 'json' } };
  }
  if (url.includes('/src/') && url.endsWith('.js')) return { ...(await next(url, { ...ctx, format: 'module' })), format: 'module' };
  return next(url, ctx);
}
