import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Speech from 'expo-speech';

// 1. THE PHRASE ENGINE (Downloadable Pack Structure)
const PERSONALITY_PACKS = {
  grumpy: {
    name: "👴 Grumpy Old Man",
    free: true,
    pitch: 0.7,
    rate: 0.85,
    lines: {
      door: [
        "Get off my lawn! Nobody invited the courier!",
        "Back in my day, people knocked politely. Now I have to yell!",
        "Tell them we're not buying anything! And close the gate!"
      ],
      food: [
        "Is the kitchen staff on strike? My bowl has been empty for four minutes!",
        "Dry kibble again? While you eat steak? Unbelievable.",
        "I'm wasting away here! Service in this house is terrible."
      ],
      play: [
        "Throw the ball, don't fake-throw it! My knees are too old for your tricks!",
        "Okay, one lap around the yard, then I need a three-hour nap.",
        "Stop filming me for TikTok and hand over the squeaky toy!"
      ]
    }
  },
  diva: {
    name: "💅 Sassy Diva",
    free: true,
    pitch: 1.3,
    rate: 1.05,
    lines: {
      door: [
        "Ugh, paparazzi at the gate again. Tell them no photos today!",
        "Unless that's an Uber Eats delivery for me, tell them to leave.",
        "Excuse me, why is a stranger breathing near my property?"
      ],
      food: [
        "Darling, this gourmet meal isn't going to serve itself. Chop chop!",
        "I require a treat immediately for being this gorgeous.",
        "Look at me. Now look at the empty bowl. Fix it, peasant."
      ],
      play: [
        "Entertain me, human! I'm bored and dramatic!",
        "Fetch? Honey, I don't chase balls, balls chase me.",
        "Pay attention to me right now or I'm chewing your favourite shoe!"
      ]
    }
  },
  boet: {
    name: "🥩 Local Boet (PRO 🔒)",
    free: false,
    pitch: 0.9,
    rate: 0.95,
    lines: {
      door: [
        "Aweh! Check who's by the gate, bru! Looking proper dodgy!",
        "Tell the ous at the door the braai hasn't started yet!",
        "Hectic! Someone just walked past my pavement, china!"
      ],
      food: [
        "Eish, my bru, where's the biltong? This bowl is bone dry!",
        "Listen here china, drop a piece of boerewors or we're gonna have problems.",
        "Chommie, I'm starving here, sort a boy out with some pellets!"
      ],
      play: [
        "Come, let's gooi! Throw the ball lekker far this time!",
        "No ways you fake-threw that, boet! Don't play games with me!",
        "Pull through to the park, my legs are itching for a run!"
      ]
    }
  }
};

export default function App() {
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const [selectedPersonality, setSelectedPersonality] = useState('grumpy');
  const [selectedContext, setSelectedContext] = useState('door');
  const [isRecording, setIsRecording] = useState(false);
  const [translation, setTranslation] = useState('');
  const [audioStats, setAudioStats] = useState('');
  const pressStartTime = useRef(0);

  if (!camPerm || !micPerm) return <View />;
  if (!camPerm.granted || !micPerm.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need Camera & Mic access to translate your pet!</Text>
        <TouchableOpacity style={styles.permButton} onPress={() => { requestCamPerm(); requestMicPerm(); }}>
          <Text style={styles.permButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startListening = () => {
    setTranslation('');
    setAudioStats('Listening to bark...');
    pressStartTime.current = Date.now();
    setIsRecording(true);
  };

  const stopListening = () => {
    setIsRecording(false);
    const durationMs = Date.now() - pressStartTime.current;
    
    // Classify based on bark duration + context
    const intensity = durationMs > 1800 ? "Long / Demanding Bark" : "Short / Alert Bark";
    setAudioStats(`Detected: ${intensity} (${(durationMs / 1000).toFixed(1)}s)`);

    const pack = PERSONALITY_PACKS[selectedPersonality];
    const possibleLines = pack.lines[selectedContext];
    const chosenLine = possibleLines[Math.floor(Math.random() * possibleLines.length)];

    setTranslation(chosenLine);

    Speech.stop();
    Speech.speak(chosenLine, {
      pitch: pack.pitch,
      rate: pack.rate,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing="back">
        
        {/* TOP WATERMARK */}
        <View style={styles.watermark}>
          <Text style={styles.watermarkText}>🐾 BarkSpeak App</Text>
        </View>

        {/* SUBTITLE OVERLAY */}
        {translation !== '' && (
          <View style={styles.subtitleBox}>
            <Text style={styles.audioStatText}>{audioStats}</Text>
            <Text style={styles.subtitleText}>"{translation}"</Text>
            <View style={styles.feedbackRow}>
              <Text style={styles.feedbackPrompt}>Was this accurate?</Text>
              <TouchableOpacity onPress={() => alert('Thanks! Saved for v2 AI training.')}><Text style={styles.thumb}>👍</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => alert('Got it! We will adjust the model.')}><Text style={styles.thumb}>👎</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* BOTTOM CONTROLS */}
        <View style={styles.controlsContainer}>
          
          <Text style={styles.sectionLabel}>1. What is your dog doing?</Text>
          <View style={styles.row}>
            {[
              { id: 'door', label: '🚪 At Door' },
              { id: 'food', label: '🍖 Near Food' },
              { id: 'play', label: '🎾 Playing' }
            ].map((ctx) => (
              <TouchableOpacity
                key={ctx.id}
                style={[styles.pill, selectedContext === ctx.id && styles.pillActive]}
                onPress={() => setSelectedContext(ctx.id)}
              >
                <Text style={styles.pillText}>{ctx.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>2. Choose Personality:</Text>
          <View style={styles.row}>
            {Object.keys(PERSONALITY_PACKS).map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.pill, selectedPersonality === key && styles.pillActive]}
                onPress={() => setSelectedPersonality(key)}
              >
                <Text style={styles.pillText}>{PERSONALITY_PACKS[key].name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}
            onPressIn={startListening}
            onPressOut={stopListening}
          >
            <Text style={styles.recordButtonText}>
              {isRecording ? '🔴 LISTENING... (RELEASE TO TRANSLATE)' : '🎙️ HOLD TO TRANSLATE BARK'}
            </Text>
          </TouchableOpacity>

        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1, justifyContent: 'space-between' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#111' },
  permissionText: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 20 },
  permButton: { backgroundColor: '#FF6B00', padding: 15, borderRadius: 12 },
  permButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  watermark: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, margin: 16, marginTop: 40 },
  watermarkText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  subtitleBox: { backgroundColor: 'rgba(0,0,0,0.85)', marginHorizontal: 20, padding: 18, borderRadius: 16, borderWidth: 2, borderColor: '#FFD700', alignItems: 'center' },
  audioStatText: { color: '#aaa', fontSize: 12, marginBottom: 4 },
  subtitleText: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  feedbackPrompt: { color: '#fff', fontSize: 12, marginRight: 10 },
  thumb: { fontSize: 18, marginHorizontal: 6 },
  controlsContainer: { backgroundColor: 'rgba(0,0,0,0.75)', padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sectionLabel: { color: '#ccc', fontSize: 12, fontWeight: 'bold', marginBottom: 6, marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  pillActive: { backgroundColor: '#FF6B00' },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  recordButton: { backgroundColor: '#E53935', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 10 },
  recordButtonActive: { backgroundColor: '#43A047' },
  recordButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});