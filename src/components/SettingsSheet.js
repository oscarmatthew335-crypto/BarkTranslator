import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, Switch, Alert, Linking } from 'react-native';
import { C, F, INK_WIDTH } from '../theme';
import { APP_NAME, SUPPORT_EMAIL } from '../species';
import appJson from '../../app.json';
import { getStatus, onStatusChange, flush, deleteMyData, discardQueued, getInstallId } from '../contribute/contributions';
import { resetExamples } from '../learning/petLearning';

const API = (process.env.EXPO_PUBLIC_PAWLINGO_API || '').replace(/\/+$/, '');
export const PRIVACY_URL = API ? `${API}/privacy` : null;

export default function SettingsSheet({ visible, onClose, data, onShowNotice }) {
  const { pet, settings, updateSettings, shareClips, setShareClips, setHistory } = data;
  const [status, setStatus] = useState(null);
  const [installId, setInstallId] = useState('');
  useEffect(() => {
    getInstallId().then(setInstallId);
  }, []);
  const refresh = useCallback(() => {
    getStatus().then(setStatus);
  }, []);
  useEffect(() => {
    if (!visible) return;
    refresh();
    return onStatusChange(refresh);
  }, [visible, refresh]);

  const toggleSharing = async (on) => {
    setShareClips(on);
    if (!on) await discardQueued();
    refresh();
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete what you have shared?',
      `This removes every clip and answer this phone has sent to ${APP_NAME}, and anything still waiting to send.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteMyData();
            setHistory((h) => h.map((e) => (e.clipId ? { ...e, clipId: null } : e)));
            refresh();
            Alert.alert(
              res === 'failed' ? "Couldn't reach the server" : 'Deleted',
              res === 'failed'
                ? 'Anything waiting on this phone was deleted. Try again when you are online to remove what was already sent.'
                : 'Your shared clips and answers have been deleted.'
            );
          }
        }
      ]
    );

  const confirmReset = () =>
    Alert.alert(`Start ${pet.name}'s learning again?`, `${APP_NAME} forgets the sounds you taught it for ${pet.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start again',
        style: 'destructive',
        onPress: async () => {
          await resetExamples(pet.id);
          onClose();
          onShowNotice(`${APP_NAME} will learn ${pet.name}'s sounds from scratch.`);
        }
      }
    ]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <ScrollView>
            <Text style={s.title}>Settings</Text>

            <Text style={s.section}>Help {APP_NAME} learn</Text>
            <View style={s.box}>
              <Row
                title="Share clips and answers"
                sub={shareClips ? 'Short clips and your answers help train a real translator.' : 'Off. Nothing is recorded or sent.'}
                value={shareClips === true}
                onChange={toggleSharing}
              />
              {shareClips && (
                <Row
                  title="Upload on mobile data"
                  sub="Off: clips wait for Wi-Fi. Each clip is up to about 0.5 MB."
                  value={settings.mobileData}
                  onChange={(v) => updateSettings({ mobileData: v })}
                  divider
                />
              )}
              {shareClips && status && (
                <View style={s.statusBox}>
                  <Text style={s.statusText}>
                    Waiting to send: {status.waitingClips} clip{status.waitingClips === 1 ? '' : 's'}, {status.waitingLabels} answer
                    {status.waitingLabels === 1 ? '' : 's'}
                  </Text>
                  {!status.configured && <Text style={s.statusText}>This test build has no server set up, so clips wait.</Text>}
                  {status.last.at && (
                    <Text style={[s.statusText, { color: status.last.ok ? '#16815A' : C.tomato }]}>Last try: {status.last.detail}</Text>
                  )}
                  {status.configured && status.waitingClips + status.waitingLabels > 0 && (
                    <Pressable onPress={() => flush().then(refresh)} accessibilityRole="button" style={{ paddingTop: 4 }}>
                      <Text style={s.link}>Send now</Text>
                    </Pressable>
                  )}
                </View>
              )}
              <Pressable onPress={confirmDelete} accessibilityRole="button" style={s.linkRow}>
                <Text style={[s.link, { color: C.tomato }]}>Delete everything I've shared</Text>
              </Pressable>
            </View>

            <Text style={s.section}>Sound</Text>
            <View style={s.box}>
              <Row
                title="Catch sounds I just missed"
                sub={`Keeps the last 10 seconds in memory while the scanner is open so tapping the paw right after ${pet.name} makes a sound still catches it. Never saved or sent.`}
                value={settings.catchMissed !== false}
                onChange={(v) => updateSettings({ catchMissed: v })}
              />
              <Row
                title="Read translations aloud"
                sub={`Off: you see the words, and Replay plays ${pet.name}'s real sound. On: the phone's voice also reads them.`}
                value={settings.readAloud === true}
                onChange={(v) => updateSettings({ readAloud: v })}
                divider
              />
            </View>
            <Text style={s.privacyNote}>
              If you pick a clip from your phone, it is sent to our server only to read the sound, and deleted straight away.
            </Text>

            <Text style={s.section}>{pet.name}</Text>
            <View style={s.box}>
              <Pressable onPress={confirmReset} accessibilityRole="button" style={s.linkRow}>
                <Text style={s.link}>Start {pet.name}'s learning again</Text>
              </Pressable>
            </View>

            <Text style={s.section}>About</Text>
            <View style={s.box}>
              {PRIVACY_URL && (
                <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" style={s.linkRow}>
                  <Text style={s.link}>Privacy policy</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} feedback`)}`)}
                accessibilityRole="link"
                style={s.linkRow}
              >
                <Text style={s.link}>Contact us: {SUPPORT_EMAIL}</Text>
              </Pressable>
              <Text style={s.version} selectable>
                {APP_NAME} {appJson?.expo?.version}
                {'\n'}Install ID: {installId}
              </Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ title, sub, value, onChange, divider }) {
  return (
    <View style={[s.row, divider && s.divider]}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: C.mint, false: '#CFC6EA' }}
        thumbColor={C.paper}
        accessibilityLabel={title}
      />
    </View>
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
    paddingBottom: 30,
    maxHeight: '88%'
  },
  title: { fontFamily: F.bold, fontSize: 26, color: C.ink, marginBottom: 6 },
  section: { fontFamily: F.semibold, fontSize: 15, color: C.inkSoft, marginTop: 14, marginBottom: 6 },
  box: { backgroundColor: C.paper, borderRadius: 16, borderWidth: 2, borderColor: C.ink, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divider: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(36,22,74,0.15)' },
  rowTitle: { fontFamily: F.semibold, fontSize: 16, color: C.ink },
  rowSub: { fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.inkSoft, marginTop: 2 },
  statusBox: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(36,22,74,0.15)', gap: 2 },
  statusText: { fontFamily: F.regular, fontSize: 12, lineHeight: 17, color: C.inkSoft },
  privacyNote: { fontFamily: F.regular, fontSize: 12, lineHeight: 17, color: C.inkSoft, marginTop: 8 },
  linkRow: { paddingTop: 10 },
  link: { fontFamily: F.semibold, fontSize: 14, color: C.ink, textDecorationLine: 'underline' },
  version: { fontFamily: F.regular, fontSize: 12, color: C.inkSoft, marginTop: 12 }
});
