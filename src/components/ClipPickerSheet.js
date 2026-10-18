import React, { useState, useEffect } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { C, F, INK_WIDTH } from '../theme';
import { StickerButton } from './ui';
import { MAX_EXTRACT_SECONDS } from '../share/extractClip';

function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function ClipPickerSheet({ visible, petName, pendingClip, onSubmitClip, onClose, onShowNotice }) {
  const [clip, setClip] = useState(null);
  const [startSec, setStartSec] = useState(0);
  const [barW, setBarW] = useState(260);

  useEffect(() => {
    if (pendingClip) {
      setClip(pendingClip);
      setStartSec(0);
    } else if (!visible) {
      setClip(null);
      setStartSec(0);
    }
  }, [pendingClip, visible]);

  const pickVideo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const durSec = typeof a.duration === 'number' ? (a.duration > 600 ? a.duration / 1000 : a.duration) : 0;
      const picked = { uri: a.uri, isVideo: true, durationSec: durSec, fallbackDate: a.fileModified || null };
      if (durSec > MAX_EXTRACT_SECONDS) {
        setClip(picked);
        setStartSec(0);
      } else {
        onClose();
        onSubmitClip({ ...picked, startSec: 0 });
      }
    } catch (_) {
      onClose();
      onShowNotice?.('Could not open your video gallery.');
    }
  };

  const pickAudio = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const picked = { uri: a.uri, isVideo: false, durationSec: 0, fallbackDate: a.lastModified || null };
      onClose();
      onSubmitClip({ ...picked, startSec: 0 });
    } catch (_) {
      onClose();
      onShowNotice?.('Could not open that audio file.');
    }
  };

  const maxStart = clip && clip.durationSec > MAX_EXTRACT_SECONDS ? Math.ceil(clip.durationSec - MAX_EXTRACT_SECONDS) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          {clip && maxStart > 0 ? (
            <>
              <Text style={s.title}>Pick the 30s moment</Text>
              <Text style={s.sub}>
                This clip is {fmtTime(clip.durationSec)} long. Slide to the part where {petName} makes the sound:
              </Text>
              <Text style={s.rangeLabel}>
                {fmtTime(startSec)} – {fmtTime(Math.min(clip.durationSec, startSec + MAX_EXTRACT_SECONDS))}
              </Text>
              <Pressable
                style={s.track}
                onLayout={(e) => setBarW(Math.max(120, e.nativeEvent.layout.width))}
                onPress={(e) => {
                  const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / barW));
                  setStartSec(Math.round(ratio * maxStart));
                }}
              >
                <View style={[s.thumb, { left: `${Math.min(82, (startSec / maxStart) * 82)}%` }]} />
              </Pressable>
              <View style={s.stepRow}>
                <Pressable style={s.stepBtn} onPress={() => setStartSec((v) => Math.max(0, v - 5))}>
                  <Text style={s.stepText}>− 5s</Text>
                </Pressable>
                <Pressable style={s.stepBtn} onPress={() => setStartSec(0)}>
                  <Text style={s.stepText}>Start</Text>
                </Pressable>
                <Pressable style={s.stepBtn} onPress={() => setStartSec((v) => Math.min(maxStart, v + 5))}>
                  <Text style={s.stepText}>+ 5s</Text>
                </Pressable>
              </View>
              <View style={{ marginTop: 16 }}>
                <StickerButton
                  label="Translate this part"
                  emoji="🐾"
                  onPress={() => {
                    const chosen = clip;
                    const start = startSec;
                    setClip(null);
                    onClose();
                    onSubmitClip({ ...chosen, startSec: start });
                  }}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={s.title}>Translate from a clip</Text>
              <Text style={s.sub}>Pick a video or voice note where {petName} barked or meowed.</Text>
              <View style={{ gap: 10, marginTop: 14 }}>
                <StickerButton label="Video from gallery" emoji="🎥" onPress={pickVideo} />
                <StickerButton label="Voice note or audio" emoji="🎙️" color={C.sky} onPress={pickAudio} />
              </View>
              <Text style={s.privacy}>
                If you pick a clip from your phone, it is sent to our server only to read the sound, and deleted straight away.
              </Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(36,22,74,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    padding: 20,
    paddingBottom: 30
  },
  title: { fontFamily: F.bold, fontSize: 24, color: C.ink },
  sub: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.inkSoft, marginTop: 6 },
  privacy: { fontFamily: F.regular, fontSize: 12, lineHeight: 17, color: C.inkSoft, marginTop: 14, textAlign: 'center' },
  rangeLabel: { fontFamily: F.bold, fontSize: 20, color: C.ink, textAlign: 'center', marginTop: 12 },
  track: {
    height: 32,
    backgroundColor: C.paper,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.ink,
    marginTop: 10,
    justifyContent: 'center',
    overflow: 'hidden'
  },
  thumb: {
    position: 'absolute',
    width: '18%',
    height: 26,
    borderRadius: 13,
    backgroundColor: C.butter,
    borderWidth: 2,
    borderColor: C.ink
  },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10 },
  stepBtn: {
    backgroundColor: C.paper,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.ink,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  stepText: { fontFamily: F.semibold, fontSize: 14, color: C.ink }
});

