import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { CONTEXTS } from '../data/contextsAndBreeds';
import { PERSONALITY_PACKS } from '../data/personalityPacks';

export default function ScannerHud({
  dogName,
  selectedBreed,
  onOpenProfile,
  facing,
  setFacing,
  torch,
  setTorch,
  cameraOn,
  onToggleCamera,
  isRecording,
  isBusy,
  liveMs,
  levels,
  currentResult,
  notice,
  onReplay,
  onShare,
  onRate,
  selectedContext,
  setSelectedContext,
  selectedPersonality,
  setSelectedPersonality,
  onStartListening,
  onStopListening
}) {
  return (
    <View style={s.scannerOverlay}>
      <View style={s.topHud}>
        <TouchableOpacity style={s.dogProfileBtn} onPress={onOpenProfile}>
          <Text style={s.dogProfileText}>🐶 {dogName} • {selectedBreed.name}</Text>
          <Text style={s.dogProfileSub}>Tap to customize breed & voice ✎</Text>
        </TouchableOpacity>
        <View style={s.camTools}>
          {cameraOn && (
            <TouchableOpacity style={s.iconBtn} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
              <Text style={s.iconBtnText}>🔄</Text>
            </TouchableOpacity>
          )}
          {cameraOn && (
            <TouchableOpacity style={[s.iconBtn, torch && s.iconBtnActive]} onPress={() => setTorch(!torch)}>
              <Text style={s.iconBtnText}>🔦</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.iconBtn, !cameraOn && s.iconBtnActive]} onPress={onToggleCamera}>
            <Text style={s.iconBtnText}>{cameraOn ? '📷' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.centerStage}>
        {notice && !isRecording && (
          <View style={s.noticeBox}>
            <Text style={s.noticeText}>{notice.text}</Text>
            {notice.action && (
              <TouchableOpacity style={s.noticeAction} onPress={notice.action.onPress}>
                <Text style={s.noticeActionText}>{notice.action.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {isRecording ? (
          <View style={s.liveRadarBox}>
            <Text style={s.liveListeningTag}>🔴 LISTENING... {(liveMs / 1000).toFixed(1)}s</Text>
            <View style={s.waveRow}>
              {Array.from({ length: 12 }, (_, i) => {
                const db = levels[levels.length - 12 + i];
                const h = typeof db === 'number' ? Math.max(0, Math.min(1, (db + 60) / 55)) : 0;
                return <View key={i} style={[s.waveBar, { height: 8 + h * 56 }]} />;
              })}
            </View>
            <Text style={s.liveSubHint}>Keep holding while {dogName} barks, then let go</Text>
          </View>
        ) : currentResult ? (
          <View style={s.subtitleBox}>
            <View style={s.resultTopRow}>
              <Text style={s.audioStatText}>
                {currentResult.intensity} • {currentResult.barkCount} bark{currentResult.barkCount === 1 ? '' : 's'} • {currentResult.duration}s
              </Text>
              <Text style={s.confBadge}>🔊 {currentResult.loudness}/100</Text>
            </View>
            <Text style={s.dogSpeakerTag}>{currentResult.dogName} ({currentResult.personalityName}):</Text>
            <Text style={s.subtitleText}>"{currentResult.text}"</Text>
            <View style={s.emotionGrid}>
              {currentResult.emotions.map((em) => (
                <View key={em.label} style={s.emotionItem}>
                  <View style={s.emotionLabelRow}>
                    <Text style={s.emotionLabel}>{em.label}</Text>
                    <Text style={[s.emotionVal, { color: em.color }]}>{em.val}%</Text>
                  </View>
                  <View style={s.emotionTrack}>
                    <View style={[s.emotionFill, { width: `${em.val}%`, backgroundColor: em.color }]} />
                  </View>
                </View>
              ))}
            </View>
            <Text style={s.tipText}>{currentResult.tip}</Text>
            <View style={s.feedbackRow}>
              <TouchableOpacity style={s.actionPill} onPress={() => onReplay(currentResult)}>
                <Text style={s.actionPillText}>🔊 Replay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionPill} onPress={() => onShare(currentResult)}>
                <Text style={s.actionPillText}>📤 Share</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.rateBtn, currentResult.rating === 'up' && s.rateBtnActive]} onPress={() => onRate('up')}>
                <Text style={s.thumb}>👍</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.rateBtn, currentResult.rating === 'down' && s.rateBtnActive]} onPress={() => onRate('down')}>
                <Text style={s.thumb}>👎</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.idleReticle}>
            <Text style={s.reticleEmoji}>🎯</Text>
            <Text style={s.reticleTitle}>Hold the button while {dogName} barks</Text>
            <Text style={s.reticleSub}>Real bark count, length & loudness pick the line. Just for fun!</Text>
          </View>
        )}
      </View>
      <View style={s.controlsContainer}>
        <Text style={s.sectionLabel}>1. CONTEXT (WHAT IS {dogName.toUpperCase()} DOING?)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.horizScroll}>
          {CONTEXTS.map((ctx) => (
            <TouchableOpacity key={ctx.id} style={[s.pill, selectedContext === ctx.id && s.pillActive]} onPress={() => setSelectedContext(ctx.id)}>
              <Text style={s.pillText}>{ctx.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.sectionLabel}>2. VOICE PERSONALITY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.horizScroll}>
          {Object.keys(PERSONALITY_PACKS).map((key) => {
            const p = PERSONALITY_PACKS[key];
            const active = selectedPersonality === key;
            return (
              <TouchableOpacity key={key} style={[s.pill, active && { backgroundColor: p.color }]} onPress={() => setSelectedPersonality(key)}>
                <Text style={s.pillText}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.recordButton, isRecording && s.recordButtonActive, isBusy && !isRecording && s.recordButtonBusy]}
          onPressIn={onStartListening}
          onPressOut={onStopListening}
        >
          <Text style={s.recordButtonText}>
            {isRecording ? '🔴 LISTENING... RELEASE TO TRANSLATE' : `🎙️ HOLD TO TRANSLATE ${dogName.toUpperCase()}'S BARK`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  scannerOverlay: { flex: 1, justifyContent: 'space-between' },
  topHud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12 },
  dogProfileBtn: { backgroundColor: 'rgba(11,15,23,0.85)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#FF6B00' },
  dogProfileText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  dogProfileSub: { color: '#FFB800', fontSize: 10, marginTop: 1 },
  camTools: { flexDirection: 'row', gap: 8 },
  iconBtn: { backgroundColor: 'rgba(11,15,23,0.85)', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2E3C56' },
  iconBtnActive: { backgroundColor: '#FF6B00', borderColor: '#FFB800' },
  iconBtnText: { fontSize: 17 },
  centerStage: { paddingHorizontal: 16, justifyContent: 'center' },
  liveRadarBox: { backgroundColor: 'rgba(11,15,23,0.9)', borderRadius: 20, padding: 18, alignItems: 'center', borderWidth: 2, borderColor: '#10B981' },
  liveListeningTag: { color: '#10B981', fontWeight: '900', fontSize: 13, marginBottom: 12 },
  waveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 64, marginBottom: 10 },
  waveBar: { width: 8, backgroundColor: '#FFB800', borderRadius: 4 },
  liveSubHint: { color: '#E5E7EB', fontSize: 12, fontWeight: '700' },
  idleReticle: { alignSelf: 'center', backgroundColor: 'rgba(11,15,23,0.75)', paddingHorizontal: 22, paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)' },
  reticleEmoji: { fontSize: 30, marginBottom: 4 },
  reticleTitle: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  reticleSub: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  subtitleBox: { backgroundColor: 'rgba(11,15,23,0.92)', padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: '#FFB800' },
  resultTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  audioStatText: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },
  confBadge: { color: '#10B981', fontSize: 11, fontWeight: '900', backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dogSpeakerTag: { color: '#FF6B00', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  subtitleText: { color: '#FFB800', fontSize: 18, fontWeight: '900', lineHeight: 24, marginBottom: 10 },
  emotionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  emotionItem: { width: '48%', marginBottom: 6 },
  emotionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  emotionLabel: { color: '#D1D5DB', fontSize: 10, fontWeight: '700' },
  emotionVal: { fontSize: 10, fontWeight: '800' },
  emotionTrack: { height: 5, backgroundColor: '#1F293D', borderRadius: 3, overflow: 'hidden' },
  emotionFill: { height: 5, borderRadius: 3 },
  tipText: { color: '#9CA3AF', fontSize: 11, fontStyle: 'italic', marginBottom: 10, lineHeight: 15 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionPill: { backgroundColor: '#1F293D', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  actionPillText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  rateBtn: { backgroundColor: '#1F293D', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  rateBtnActive: { backgroundColor: '#FF6B00' },
  thumb: { fontSize: 15 },
  controlsContainer: { backgroundColor: 'rgba(11,15,23,0.92)', padding: 14, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: '#26334D' },
  sectionLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', marginBottom: 6, marginTop: 4, letterSpacing: 0.6 },
  horizScroll: { marginBottom: 8 },
  pill: { backgroundColor: '#1A2438', paddingVertical: 8, paddingHorizontal: 13, borderRadius: 18, marginRight: 8, borderWidth: 1, borderColor: '#2E3C56' },
  pillActive: { backgroundColor: '#FF6B00', borderColor: '#FFB800' },
  pillText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  recordButton: { backgroundColor: '#E53935', paddingVertical: 16, borderRadius: 26, alignItems: 'center', marginTop: 6 },
  recordButtonActive: { backgroundColor: '#10B981' },
  recordButtonBusy: { opacity: 0.7 },
  noticeBox: { backgroundColor: 'rgba(11,15,23,0.92)', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FFB800', flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeText: { color: '#FFF', fontSize: 13, fontWeight: '700', flex: 1, lineHeight: 18 },
  noticeAction: { backgroundColor: '#FF6B00', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  noticeActionText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  recordButtonText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.4 }
});


