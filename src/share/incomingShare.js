import { useEffect } from 'react';
import { Platform } from 'react-native';

let useShareIntentHook = null;
try {
  // Optional in Expo Go; active in standalone/dev builds.
  const mod = require('expo-share-intent');
  useShareIntentHook = mod?.useShareIntent || null;
} catch (_) {
  useShareIntentHook = null;
}

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp|mkv)$/i;
const AUDIO_EXT = /\.(m4a|mp3|wav|aac|ogg|opus|amr|caf|flac)$/i;

export default function useIncomingShareClip(onClip) {
  const share = useShareIntentHook
    ? useShareIntentHook({ disabled: Platform.OS === 'web', resetOnBackground: false })
    : null;

  useEffect(() => {
    if (!share?.hasShareIntent || !share?.shareIntent?.files?.length) return;
    const f = share.shareIntent.files[0];
    const rawPath = f?.path || f?.uri || '';
    if (!rawPath) {
      share.resetShareIntent?.();
      return;
    }
    const uri = rawPath.startsWith('file://') || rawPath.startsWith('content://') ? rawPath : `file://${rawPath}`;
    const mime = f?.mimeType || '';
    const isVideo = /^video\//i.test(mime) || VIDEO_EXT.test(uri);
    const isAudio = /^audio\//i.test(mime) || AUDIO_EXT.test(uri);
    if (!isVideo && !isAudio) {
      share.resetShareIntent?.();
      return;
    }
    const durationSec = typeof f?.duration === 'number' && f.duration > 0 ? f.duration / (f.duration > 600 ? 1000 : 1) : 0;
    onClip?.({
      uri,
      isVideo,
      durationSec,
      fallbackDate: null
    });
    share.resetShareIntent?.();
  }, [share?.hasShareIntent, share?.shareIntent, onClip]);
}
