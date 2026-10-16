import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Share,
  Vibration,
  StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Speech from 'expo-speech';

import { CONTEXTS, DOG_BREEDS } from './src/data/contextsAndBreeds';
import { PERSONALITY_PACKS } from './src/data/personalityPacks';
import SpeakDogTab from './src/components/SpeakDogTab';
import DecoderTab from './src/components/DecoderTab';
import JournalTab from './src/components/JournalTab';
import DogProfileModal from './src/components/DogProfileModal';
import ScannerHud from './src/components/ScannerHud';

export default function App() {
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const [activeTab, setActiveTab] = useState('scanner');
  const [dogName, setDogName] = useState('Bruno');
  const [selectedBreed, setSelectedBreed] = useState(DOG_BREEDS[0]);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const [selectedPersonality, setSelectedPersonality] = useState('boet');
  const [selectedContext, setSelectedContext] = useState('door');
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [liveMs, setLiveMs] = useState(0);
  const [waveBars, setWaveBars] = useState([25, 45, 70, 35, 85, 55, 95, 45, 75, 30, 60, 40]);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);

  const pressStartTime = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setLiveMs(Date.now() - pressStartTime.current);
        setWaveBars(Array.from({ length: 12 }, () => Math.floor(20 + Math.random() * 80)));
      }, 110);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setLiveMs(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const speakTranslation = (item) => {
    Speech.stop();
    Speech.speak(item.text, { pitch: item.pitch, rate: item.rate });
  };

  const shareTranslation = async (item) => {
    try {
      await Share.share({
        message:
          `🐾 BarkSpeak AI Translation for ${item.dogName} (${item.breedName}):\n\n` +
          `💬 "${item.text}"\n\n` +
          `🎭 Personality: ${item.personalityName}\n` +
          `📍 Context: ${item.contextLabel} | ${item.intensity} (${item.duration}s • ${item.confidence}% AI Match)`
      });
    } catch (_) {}
  };

  const startListening = () => {
    Vibration.vibrate(35);
    Speech.stop();
    pressStartTime.current = Date.now();
    setIsRecording(true);
  };

  const stopListening = () => {
    if (!isRecording) return;
    setIsRecording(false);
    Vibration.vibrate([0, 40, 50, 60]);

    const rawDurationMs = Math.max(400, Date.now() - pressStartTime.current);
    const durationSec = (rawDurationMs / 1000).toFixed(1);
    const isLongBark = rawDurationMs >= 1600;

    const pack = PERSONALITY_PACKS[selectedPersonality];
    const ctxObj = CONTEXTS.find((c) => c.id === selectedContext) || CONTEXTS[0];
    const contextLines = pack.lines[selectedContext] || pack.lines.door;
    const pool = isLongBark ? contextLines.long : contextLines.short;
    const chosenLine = pool[Math.floor(Math.random() * pool.length)];

    const pitch = Math.max(0.5, Math.min(1.8, pack.pitch + selectedBreed.pitchMod));
    const rate = Math.max(0.6, Math.min(1.5, pack.rate + selectedBreed.rateMod));
    const confidence = Math.floor(93 + Math.random() * 7);
    const peakHz = Math.floor(isLongBark ? 380 + Math.random() * 240 : 620 + Math.random() * 480);

    const emotions = [
      { label: 'Sass', val: selectedPersonality === 'diva' ? 98 : Math.floor(65 + Math.random() * 30), color: '#EC4899' },
      { label: 'Urgency', val: isLongBark ? 95 : Math.floor(60 + Math.random() * 30), color: '#FF6B00' },
      { label: 'Hunger', val: selectedContext === 'food' ? 99 : Math.floor(35 + Math.random() * 45), color: '#FFB800' },
      { label: 'Play', val: selectedContext === 'play' || selectedContext === 'zoomies' ? 96 : Math.floor(40 + Math.random() * 45), color: '#10B981' }
    ];

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
      duration: durationSec,
      intensity: isLongBark ? '🐺 Extended Rant' : '⚡ Sharp Alert Bark',
      confidence,
      peakHz,
      pitch,
      rate,
      emotions,
      time: timeStr,
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


  if (!camPerm || !micPerm) return <View style={styles.container} />;
  if (!camPerm.granted || !micPerm.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.permEmoji}>🐾🎙️</Text>
        <Text style={styles.permTitle}>Welcome to BarkSpeak AI</Text>
        <Text style={styles.permissionText}>
          Grant Camera & Microphone access to scan your dog's barks in real time, decode canine body language, and translate human speech into dog vocalizations!
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={() => { requestCamPerm(); requestMicPerm(); }}>
          <Text style={styles.permButtonText}>🚀 Enable AI Bark Scanner</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const hudProps = {
    dogName,
    selectedBreed,
    onOpenProfile: () => setProfileModalVisible(true),
    facing,
    setFacing,
    torch,
    setTorch,
    cameraEnabled,
    setCameraEnabled,
    isRecording,
    liveMs,
    waveBars,
    currentResult,
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mainArea}>
        {activeTab === 'scanner' && (
          cameraEnabled ? (
            <CameraView style={styles.camera} facing={facing} enableTorch={torch}>
              <ScannerHud {...hudProps} />
            </CameraView>
          ) : (
            <View style={[styles.camera, { backgroundColor: '#0B0F17' }]}>
              <ScannerHud {...hudProps} />
            </View>
          )
        )}
        {activeTab === 'speak' && <SpeakDogTab dogName={dogName} />}
        {activeTab === 'decoder' && <DecoderTab />}
        {activeTab === 'journal' && (
          <JournalTab
            history={history}
            onReplay={speakTranslation}
            onShare={shareTranslation}
            onClear={() => setHistory([])}
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
            <TouchableOpacity key={tab.id} style={styles.tabItem} onPress={() => setActiveTab(tab.id)}>
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
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: '#0B0F17' },
  permEmoji: { fontSize: 54, marginBottom: 14 },
  permTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  permissionText: { color: '#9CA3AF', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permButton: { backgroundColor: '#FF6B00', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 16 },
  permButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: '#0E1420', borderTopWidth: 1, borderTopColor: '#1F293D', paddingVertical: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  tabLabelActive: { color: '#FFB800' }
});
