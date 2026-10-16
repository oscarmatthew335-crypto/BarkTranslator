import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Share, Linking, StatusBar, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useFonts, Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';

import { getSpecies, APP_NAME } from './src/species';
import { pickLinePool, moodScores } from './src/audio/barkAnalysis';
import useBarkRecorder from './src/audio/useBarkRecorder';
import { loadState, saveState } from './src/storage/savedState';
import { C } from './src/theme';
import Onboarding from './src/components/Onboarding';
import ConsentScreen from './src/components/ConsentScreen';
import LabelSheet from './src/components/LabelSheet';
import { queueClip, queueLabel, flush, discardQueued, deleteMyData } from './src/contribute/contributions';
import ScannerScreen from './src/components/ScannerScreen';
import SpeakTab from './src/components/SpeakTab';
import DecoderTab from './src/components/DecoderTab';
import JournalTab from './src/components/JournalTab';
import PetProfileModal from './src/components/PetProfileModal';
import ShareCard from './src/components/ShareCard';
import TabBar from './src/components/TabBar';

export default function App() {
  const [fontsLoaded] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {fontsLoaded ? <PetApp /> : <View style={{ flex: 1, backgroundColor: C.bg }} />}
    </SafeAreaProvider>
  );
}

function PetApp() {
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const bark = useBarkRecorder();
  const cameraRef = useRef(null);
  const shareCardRef = useRef(null);

  const [loaded, setLoaded] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [speciesId, setSpeciesId] = useState('dog');
  const species = getSpecies(speciesId);

  const [activeTab, setActiveTab] = useState('scanner');
  const [petName, setPetName] = useState('Bruno');
  const [breedId, setBreedId] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const [personality, setPersonality] = useState('boet');
  const [contextId, setContextId] = useState('door');
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [cameraWanted, setCameraWanted] = useState(true);

  const [currentResult, setCurrentResult] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const [notice, setNotice] = useState(null);
  const [history, setHistory] = useState([]);
  const [shareClips, setShareClips] = useState(null); // null = not asked yet
  const [labelEntry, setLabelEntry] = useState(null);
  const noticeTimer = useRef(null);

  const breed = species.breeds ? species.breeds.find((b) => b.id === breedId) || species.breeds[0] : null;

  // Restore saved pet, settings and journal (older saves were dog-only).
  useEffect(() => {
    loadState().then((saved) => {
      if (!saved) {
        setNeedsSetup(true);
        setLoaded(true);
        return;
      }
      const sp = getSpecies(saved.species || 'dog');
      setSpeciesId(sp.id);
      const name = saved.petName ?? saved.dogName;
      if (typeof name === 'string') setPetName(name);
      if (saved.breedId) setBreedId(saved.breedId);
      setPersonality(sp.packs[saved.personality] ? saved.personality : sp.defaultPersonality);
      setContextId(sp.contexts.some((c) => c.id === saved.context) ? saved.context : sp.defaultContext);
      if (Array.isArray(saved.history)) setHistory(saved.history);
      if (typeof saved.shareClips === 'boolean') setShareClips(saved.shareClips);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded || needsSetup) return;
    saveState({ species: speciesId, petName, breedId, personality, context: contextId, history, shareClips });
  }, [loaded, needsSetup, speciesId, petName, breedId, personality, contextId, history, shareClips]);

  // Send anything that was waiting for a connection.
  useEffect(() => {
    if (shareClips) flush();
  }, [shareClips]);

  useEffect(() => () => noticeTimer.current && clearTimeout(noticeTimer.current), []);

  const switchSpecies = useCallback(
    (id, name) => {
      const sp = getSpecies(id);
      if (id !== speciesId) {
        setPersonality(sp.defaultPersonality);
        setContextId(sp.defaultContext);
        setCurrentResult(null);
      }
      setSpeciesId(id);
      if (name !== undefined) setPetName(name);
    },
    [speciesId]
  );

  const finishSetup = (id, name) => {
    const sp = getSpecies(id);
    setSpeciesId(id);
    setPetName(name.trim() || sp.defaultName);
    setPersonality(sp.defaultPersonality);
    setContextId(sp.defaultContext);
    setNeedsSetup(false);
  };

  const showNotice = (text, action) => {
    setNotice({ text, action });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  };

  const speak = (item) => {
    Speech.stop();
    Speech.speak(item.text, { pitch: item.pitch, rate: item.rate });
  };

  // Share a picture card (photo + speech bubble); fall back to text.
  const shareResult = async (item) => {
    setShareItem(item);
    await new Promise((r) => setTimeout(r, 250)); // let the card render
    try {
      if (shareCardRef.current && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(shareCardRef, { format: 'jpg', quality: 0.92, width: 1080, height: 1350 });
        await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: `Share ${item.petName}'s translation` });
        return;
      }
    } catch (_) {}
    try {
      await Share.share({ message: `${item.petName} says: "${item.text}"\n\nTranslated with ${APP_NAME} 🐾` });
    } catch (_) {}
  };

  const handleStartFailure = (reason) => {
    if (reason === 'just-granted') showNotice(`Mic is on. Now hold the paw while ${petName} ${species.sounds}.`);
    else if (reason === 'denied') showNotice(`${APP_NAME} needs the microphone to hear ${species.sounds}.`);
    else if (reason === 'blocked')
      showNotice(`The microphone is blocked. Allow it in Settings to hear ${species.sounds}.`, {
        label: 'Open Settings',
        onPress: () => Linking.openSettings()
      });
    else if (reason === 'error') showNotice("Couldn't start the microphone. Try again.");
  };

  const startListening = async () => {
    Speech.stop();
    setNotice(null);
    const res = await bark.start();
    if (!res.ok) {
      handleStartFailure(res.reason);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (res.releasedEarly) finishListening();
  };

  const snapPhoto = async () => {
    if (!cameraOn || !cameraRef.current) return null;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.6, shutterSound: false });
      return pic?.uri || null;
    } catch (_) {
      return null;
    }
  };

  const finishListening = async () => {
    const photoPromise = bark.isRecording ? snapPhoto() : Promise.resolve(null);
    const out = await bark.stop({ keepClip: shareClips === true });
    const photoUri = await photoPromise;
    if (!out) return;

    const { analysis, heldMs } = out;
    if (!analysis) {
      showNotice(`Hold the paw down the whole time ${petName} ${species.sounds}.`);
      return;
    }
    if (!analysis.heard) {
      showNotice(`Didn't hear a ${species.sound}. Get a bit closer and try again.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const pack = species.packs[personality] || species.packs[species.defaultPersonality];
    const ctx = species.contexts.find((c) => c.id === contextId) || species.contexts[0];
    const contextLines = pack.lines[ctx.id] || Object.values(pack.lines)[0];
    const pool = contextLines[pickLinePool(analysis.pattern)] || contextLines.short;
    const text = pool[Math.floor(Math.random() * pool.length)];

    const pitch = Math.max(0.5, Math.min(1.8, pack.pitch + (breed?.pitchMod || 0)));
    const rate = Math.max(0.6, Math.min(1.5, pack.rate + (breed?.rateMod || 0)));
    const now = new Date();

    const entry = {
      id: String(now.getTime()),
      species: species.id,
      petName: petName.trim() || species.defaultName,
      breedName: breed?.name || null,
      personalityName: pack.name,
      personalityFace: pack.face,
      personalityColor: pack.color,
      contextLabel: ctx.label,
      tip: ctx.tip,
      text,
      duration: (heldMs / 1000).toFixed(1),
      patternLabel: species.patternLabels[analysis.pattern],
      pattern: analysis.pattern,
      soundCount: analysis.barkCount,
      loudness: analysis.loudness,
      pitch,
      rate,
      emotions: moodScores(analysis, ctx.id, personality),
      photoUri,
      contextId: ctx.id,
      clipId: out.clipUri ? `${species.id}-${now.getTime()}` : null,
      labelled: false,
      date: now.toISOString(),
      rating: null
    };

    if (out.clipUri) {
      queueClip({
        clipId: entry.clipId,
        tempUri: out.clipUri,
        species: species.id,
        breedId: breed?.id,
        contextId: ctx.id,
        analysis
      });
    }

    setCurrentResult(entry);
    setHistory((prev) => [entry, ...prev]);
    speak(entry);
  };

  const submitLabel = ({ contextId: labelContext, moods, comment }) => {
    const entry = labelEntry;
    setLabelEntry(null);
    if (!entry?.clipId) return;
    queueLabel({ clipId: entry.clipId, contextId: labelContext, moods, comment, rating: entry.rating });
    const mark = (h) => (h.id === entry.id ? { ...h, labelled: true } : h);
    setHistory((prev) => prev.map(mark));
    setCurrentResult((cur) => (cur ? mark(cur) : cur));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    showNotice(`Thanks! That helps ${APP_NAME} learn what ${petName} means.`);
  };

  const chooseSharing = async (on) => {
    setShareClips(on);
    if (!on) await discardQueued();
  };

  const confirmDeleteData = () =>
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
            setHistory((prev) => prev.map((h) => (h.clipId ? { ...h, clipId: null } : h)));
            setCurrentResult((cur) => (cur?.clipId ? { ...cur, clipId: null } : cur));
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

  const rateResult = (rating) => {
    if (!currentResult) return;
    Haptics.selectionAsync().catch(() => {});
    const updated = { ...currentResult, rating: currentResult.rating === rating ? null : rating };
    setCurrentResult(updated);
    setHistory((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
  };

  const toggleCamera = async () => {
    if (camPerm?.granted) {
      setCameraWanted((v) => !v);
      return;
    }
    const res = await requestCamPerm();
    if (res?.granted) setCameraWanted(true);
    else if (res && !res.canAskAgain)
      showNotice(`The camera is blocked. You can still translate ${species.sounds} without it.`, {
        label: 'Open Settings',
        onPress: () => Linking.openSettings()
      });
  };

  const cameraOn = Boolean(camPerm?.granted && cameraWanted);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (needsSetup) return <Onboarding onDone={finishSetup} />;
  if (shareClips === null) return <ConsentScreen petName={petName} onChoose={chooseSharing} />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.main}>
        {activeTab === 'scanner' && (
          <ScannerScreen
            species={species}
            petName={petName}
            breed={breed}
            onOpenProfile={() => setProfileVisible(true)}
            cameraRef={cameraRef}
            cameraOn={cameraOn}
            cameraAsked={Boolean(camPerm && (camPerm.granted || !camPerm.canAskAgain || camPerm.status !== 'undetermined'))}
            onToggleCamera={toggleCamera}
            facing={facing}
            onFlip={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            torch={torch}
            onTorch={() => setTorch((t) => !t)}
            recorder={bark}
            currentResult={currentResult}
            onDismissResult={() => setCurrentResult(null)}
            notice={notice}
            onReplay={speak}
            onShare={shareResult}
            onRate={rateResult}
            onTeach={setLabelEntry}
            contextId={contextId}
            setContextId={setContextId}
            personality={personality}
            setPersonality={setPersonality}
            onStartListening={startListening}
            onStopListening={finishListening}
          />
        )}
        {activeTab === 'speak' && <SpeakTab species={species} petName={petName} />}
        {activeTab === 'decoder' && <DecoderTab species={species} />}
        {activeTab === 'journal' && (
          <JournalTab
            history={history}
            onReplay={speak}
            onShare={shareResult}
            onClear={() => {
              setHistory([]);
              setCurrentResult(null);
            }}
            onGoScan={() => setActiveTab('scanner')}
            onTeach={setLabelEntry}
            species={species}
          />
        )}
      </View>

      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        disabled={bark.phase !== 'idle'}
        species={species}
        journalCount={history.length}
      />

      <PetProfileModal
        visible={profileVisible}
        speciesId={speciesId}
        petName={petName}
        breedId={breed?.id || null}
        shareClips={shareClips === true}
        onToggleShare={chooseSharing}
        onDeleteData={confirmDeleteData}
        onSave={({ speciesId: sp, petName: name, breedId: b }) => {
          switchSpecies(sp, name.trim() || getSpecies(sp).defaultName);
          setBreedId(b);
          setProfileVisible(false);
        }}
        onClose={() => setProfileVisible(false)}
      />

      <LabelSheet
        visible={Boolean(labelEntry)}
        species={labelEntry ? getSpecies(labelEntry.species) : species}
        petName={labelEntry?.petName || petName}
        entry={labelEntry}
        onSubmit={submitLabel}
        onClose={() => setLabelEntry(null)}
      />

      {shareItem && <ShareCard ref={shareCardRef} item={shareItem} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  main: { flex: 1 }
});
