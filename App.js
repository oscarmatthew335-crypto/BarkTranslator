import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share, Vibration, StatusBar, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';

import { CONTEXTS, DOG_BREEDS } from './src/data/contextsAndBreeds';
import { PERSONALITY_PACKS } from './src/data/personalityPacks';
import { PATTERN_LABELS, pickLinePool, moodScores } from './src/audio/barkAnalysis';
import useBarkRecorder from './src/audio/useBarkRecorder';
import { loadState, saveState } from './src/storage/savedState';
import SpeakDogTab from './src/components/SpeakDogTab';
import DecoderTab from './src/components/DecoderTab';
import JournalTab from './src/components/JournalTab';
import DogProfileModal from './src/components/DogProfileModal';
import ScannerHud from './src/components/ScannerHud';

export default function App() {
  return (
    <SafeAreaProvider>
      <BarkApp />
    </SafeAreaProvider>
  );
}

function BarkApp() {
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const bark = useBarkRecorder();

  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner');
  const [dogName, setDogName] = useState('Bruno');
  const [selectedBreed, setSelectedBreed] = useState(DOG_BREEDS[0]);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [selectedPersonality, setSelectedPersonality] = useState('boet');
  const [selectedContext, setSelectedContext] = useState('door');
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [cameraWanted, setCameraWanted] = useState(true);

  const [currentResult, setCurrentResult] = useState(null);
  const [notice, setNotice] = useState(null);
  const [history, setHistory] = useState([]);
  const noticeTimer = useRef(null);

  // Restore the saved dog profile, settings and journal.
  useEffect(() => {
    loadState().then((saved) => {
      if (saved) {
        if (typeof saved.dogName === 'string') setDogName(saved.dogName);
        const breed = DOG_BREEDS.find((b) => b.id === saved.breedId);
        if (breed) setSelectedBreed(breed);
        if (PERSONALITY_PACKS[saved.personality]) setSelectedPersonality(saved.personality);
        if (CONTEXTS.some((c) => c.id === saved.context)) setSelectedContext(saved.context);
        if (Array.isArray(saved.history)) setHistory(saved.history);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveState({
      dogName,
      breedId: selectedBreed.id,
      personality: selectedPersonality,
      context: selectedContext,
      history
    });
  }, [loaded, dogName, selectedBreed, selectedPersonality, selectedContext, history]);

  useEffect(() => () => noticeTimer.current && clearTimeout(noticeTimer.current), []);

  const showNotice = (text, action) => {
    setNotice({ text, action });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  };

  const speakTranslation = (item) => {
    Speech.stop();
    Speech.speak(item.text, { pitch: item.pitch, rate: item.rate });
  };

  const shareTranslation = async (item) => {
    const stats = item.barkCount
      ? `${item.barkCount} bark${item.barkCount === 1 ? '' : 's'} in ${item.duration}s • loudness ${item.loudness}/100`
      : `${item.duration}s`;
    try {
      await Share.share({
        message:
          `🐾 BarkTranslator: ${item.dogName} (${item.breedName}) says:\n\n` +
          `💬 "${item.text}"\n\n` +
          `🎭 ${item.personalityName} • ${item.contextLabel}\n` +
          `🎙️ ${item.intensity} • ${stats}`
      });
    } catch (_) {}
  };

  const handleStartFailure = (reason) => {
    if (reason === 'just-granted') {
      showNotice('Mic is on. Now hold the button while your dog barks.');
    } else if (reason === 'denied') {
      showNotice('BarkTranslator needs the microphone to hear barks.');
    } else if (reason === 'blocked') {
      showNotice('Microphone is blocked. Allow it in Settings to hear barks.', {
        label: 'Open Settings',
        onPress: () => Linking.openSettings()
      });
    } else if (reason === 'error') {
      showNotice("Couldn't start the microphone. Try again.");
    }
  };

  const startListening = async () => {
    Speech.stop();
    setNotice(null);
    const res = await bark.start();
    if (!res.ok) {
      handleStartFailure(res.reason);
      return;
    }
    Vibration.vibrate(35);
    if (res.releasedEarly) finishListening();
  };

  const stopListening = () => {
    finishListening();
  };

  const finishListening = async () => {
    const out = await bark.stop();
    if (!out) return;
    Vibration.vibrate([0, 40, 50, 60]);

    const { analysis, heldMs } = out;
    if (!analysis) {
      showNotice('Hold the button down the whole time your dog is barking.');
      return;
    }
    if (!analysis.heard) {
      showNotice("Didn't hear a bark. Get a bit closer and try again.");
      return;
    }

    const pack = PERSONALITY_PACKS[selectedPersonality];
    const ctxObj = CONTEXTS.find((c) => c.id === selectedContext) || CONTEXTS[0];
    const contextLines = pack.lines[selectedContext] || pack.lines.door;
    const pool = contextLines[pickLinePool(analysis.pattern)] || contextLines.short;
    const chosenLine = pool[Math.floor(Math.random() * pool.length)];

    const pitch = Math.max(0.5, Math.min(1.8, pack.pitch + selectedBreed.pitchMod));
    const rate = Math.max(0.6, Math.min(1.5, pack.rate + selectedBreed.rateMod));

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const entry = {
      id: String(Date.now()),
      dogName: dogName.trim() || 'Doggo',
      breedName: selectedBreed.name,
      personalityName: pack.name,
      personalityBadge: pack.badge,
      personalityColor: pack.color,
      contextLabel: ctxObj.label,
      tip: ctxObj.tip,
      text: chosenLine,
      duration: (heldMs / 1000).toFixed(1),
      intensity: PATTERN_LABELS[analysis.pattern],
      pattern: analysis.pattern,
      barkCount: analysis.barkCount,
      loudness: analysis.loudness,
      clarity: analysis.clarity,
      pitch,
      rate,
      emotions: moodScores(analysis, selectedContext, selectedPersonality),
      time: timeStr,
      date: now.toISOString(),
      rating: null
    };

    setCurrentResult(entry);
    setHistory((prev) => [entry, ...prev]);
    speakTranslation(entry);
  };

  const rateResult = (rating) => {
    if (!currentResult) return;
    Vibration.vibrate(25);
    const updated = { ...currentResult, rating };
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
    else if (res && !res.canAskAgain) {
      showNotice('Camera is blocked. You can still translate barks without it.', {
        label: 'Open Settings',
        onPress: () => Linking.openSettings()
      });
    }
  };

  const cameraOn = Boolean(camPerm?.granted && cameraWanted);

  const hudProps = {
    dogName,
    selectedBreed,
    onOpenProfile: () => setProfileModalVisible(true),
    facing,
    setFacing,
    torch,
    setTorch,
    cameraOn,
    onToggleCamera: toggleCamera,
    isRecording: bark.isRecording,
    isBusy: bark.phase === 'starting' || bark.phase === 'analysing',
    liveMs: bark.liveMs,
    levels: bark.levels,
    currentResult,
    notice,
    onReplay: speakTranslation,
    onShare: shareTranslation,
    onRate: rateResult,
    selectedContext,
    setSelectedContext,
    selectedPersonality,
    setSelectedPersonality,
    onStartListening: startListening,
    onStopListening: stopListening
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mainArea}>
        {activeTab === 'scanner' &&
          (cameraOn ? (
            <CameraView style={styles.camera} facing={facing} enableTorch={torch} mute>
              <ScannerHud {...hudProps} />
            </CameraView>
          ) : (
            <View style={[styles.camera, { backgroundColor: '#0B0F17' }]}>
              <ScannerHud {...hudProps} />
            </View>
          ))}
        {activeTab === 'speak' && <SpeakDogTab dogName={dogName} />}
        {activeTab === 'decoder' && <DecoderTab />}
        {activeTab === 'journal' && (
          <JournalTab
            history={history}
            onReplay={speakTranslation}
            onShare={shareTranslation}
            onClear={() => {
              setHistory([]);
              setCurrentResult(null);
            }}
          />
        )}
      </View>

      <View style={styles.tabBar}>
        {[
          { id: 'scanner', icon: '🎙️', label: 'Scanner' },
          { id: 'speak', icon: '🐕', label: 'Speak Dog' },
          { id: 'decoder', icon: '🧠', label: 'Decoder' },
          { id: 'journal', icon: '📜', label: `Journal (${history.length})` }
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              disabled={bark.phase !== 'idle'}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <DogProfileModal
        visible={profileModalVisible}
        dogName={dogName}
        setDogName={setDogName}
        selectedBreed={selectedBreed}
        setSelectedBreed={setSelectedBreed}
        onClose={() => setProfileModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070A10' },
  mainArea: { flex: 1 },
  camera: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#0E1420', borderTopWidth: 1, borderTopColor: '#1F293D', paddingVertical: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: '#FFB800' }
});
