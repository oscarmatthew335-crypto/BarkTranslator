export const SaveFormat = { JPEG: 'jpeg', PNG: 'png' };
export const calls = [];
export const ImageManipulator = {
  manipulate(uri) {
    const ctx = {
      resize(size) { calls.push(['resize', size]); return ctx; },
      async renderAsync() {
        return { async saveAsync(opts) { calls.push(['save', uri, opts]); return { uri: `${uri}.clean.jpg` }; } };
      }
    };
    calls.push(['manipulate', uri]);
    return ctx;
  }
};
