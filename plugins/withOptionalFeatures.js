// Marks hardware the app can live without as optional, so Google Play does not
// hide Pawlingo from devices that lack it (Play flagged screen.portrait, which
// the portrait lock implies, and wifi, which a library's network permission
// implies). Camera and microphone are optional too: the game works without them.
const { withAndroidManifest } = require('expo/config-plugins');

const OPTIONAL = [
  'android.hardware.screen.portrait',
  'android.hardware.wifi',
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
  'android.hardware.microphone',
];

module.exports = function withOptionalFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const list = (manifest['uses-feature'] = manifest['uses-feature'] || []);
    for (const name of OPTIONAL) {
      const entry = { $: { 'android:name': name, 'android:required': 'false', 'tools:replace': 'android:required' } };
      const at = list.findIndex((f) => f.$?.['android:name'] === name);
      if (at >= 0) list[at] = entry;
      else list.push(entry);
    }
    return cfg;
  });
};
