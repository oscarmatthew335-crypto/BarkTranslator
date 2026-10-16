import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { Sticker } from './ui';
import PawButton from './PawButton';
import SpeechBubble from './SpeechBubble';
import ContextSheet from './ContextSheet';

export default function ScannerScreen(props) {
  const {
    species,
    petName,
    breed,
    onOpenProfile,
    cameraRef,
    cameraOn,
    onToggleCamera,
    facing,
    onFlip,
    torch,
    onTorch,
    recorder,
    currentResult,
    onDismissResult,
    notice,
    onReplay,
    onShare,
    onRate,
    contextId,
    setContextId,
    personality,
    setPersonality,
    onStartListening,
    onStopListening
  } = props;

  const [contextOpen, setContextOpen] = useState(false);
  const context = species.contexts.find((c) => c.id === contextId) || species.contexts[0];
  const recording = recorder.isRecording;
  const level = recorder.levels[recorder.levels.length - 1];
  const showResult = currentResult && !recording && currentResult.species === species.id;

  return (
    <View style={s.container}>
      {/* Backdrop: the pet through the camera, or a big pet on lilac paper */}
      {cameraOn ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} enableTorch={torch} mute />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.paperBg]}>
          <Text style={s.bigPet}>{species.emoji}</Text>
          {!showResult && !recording && !notice && (
            <Pressable onPress={onToggleCamera} style={s.camHint} accessibilityRole="button">
              <Text style={s.camHintText}>📸 Show {petName} on camera</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Top row */}
      <View style={s.topRow}>
        <Pressable onPress={onOpenProfile} accessibilityRole="button" accessibilityLabel="Edit your pet">
          <Sticker radius={999} offset={3} innerStyle={s.profileChip}>
            <Text style={s.profileText} numberOfLines={1}>
              {species.emoji} {petName}
              {breed ? <Text style={s.profileSub}>  {breed.name.replace(/^\S+\s/, '')}</Text> : null}
            </Text>
            <Text style={s.profileEdit}>✎</Text>
          </Sticker>
        </Pressable>
        <View style={s.camTools}>
          {cameraOn && <RoundTool emoji="🔄" label="Flip camera" onPress={onFlip} />}
          {cameraOn && <RoundTool emoji="🔦" label="Torch" onPress={onTorch} active={torch} />}
          <RoundTool
            emoji={cameraOn ? '📷' : '📸'}
            label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            onPress={onToggleCamera}
            active={!cameraOn}
          />
        </View>
      </View>

      {/* Middle: the speech bubble, live meter or a hint */}
      <View style={s.middle} pointerEvents="box-none">
        {recording ? (
          <Sticker color={C.paper} radius={24} innerStyle={s.listenBox}>
            <Text style={s.listenTitle}>Listening… {(recorder.liveMs / 1000).toFixed(1)}s</Text>
            <View style={s.meterRow}>
              {Array.from({ length: 14 }, (_, i) => {
                const db = recorder.levels[recorder.levels.length - 14 + i];
                const h = typeof db === 'number' ? Math.max(0, Math.min(1, (db + 60) / 55)) : 0;
                return <View key={i} style={[s.meterBar, { height: 8 + h * 52 }]} />;
              })}
            </View>
          </Sticker>
        ) : showResult ? (
          <SpeechBubble
            name={currentResult.petName}
            face={currentResult.personalityFace}
            text={currentResult.text}
            animateKey={currentResult.id}
            footer={
              <>
                <View style={s.statRow}>
                  <Tag text={currentResult.patternLabel} color={C.sky} />
                  <Tag
                    text={`${currentResult.soundCount} ${currentResult.soundCount === 1 ? species.sound : species.sounds}`}
                    color={C.butter}
                  />
                  <Tag text={`🔊 ${currentResult.loudness}`} color={C.mint} />
                </View>
                <View style={s.actions}>
                  <Action emoji="🔊" label="Replay" onPress={() => onReplay(currentResult)} />
                  <Action emoji="📤" label="Share" onPress={() => onShare(currentResult)} primary />
                  <Action emoji="👍" onPress={() => onRate('up')} active={currentResult.rating === 'up'} label="Spot on" />
                  <Action emoji="👎" onPress={() => onRate('down')} active={currentResult.rating === 'down'} label="Not quite" />
                  <Action emoji="✕" onPress={onDismissResult} label="Close" />
                </View>
              </>
            }
          />
        ) : notice ? (
          <Sticker color={C.butter} radius={20} innerStyle={s.noticeBox}>
            <Text style={s.noticeText}>{notice.text}</Text>
            {notice.action && (
              <Pressable style={s.noticeAction} onPress={notice.action.onPress}>
                <Text style={s.noticeActionText}>{notice.action.label}</Text>
              </Pressable>
            )}
          </Sticker>
        ) : null}
      </View>

      {/* Bottom panel */}
      <View style={s.panel}>
        <Pressable onPress={() => setContextOpen(true)} accessibilityRole="button" style={s.contextChip}>
          <Text style={s.contextText} numberOfLines={1}>
            {context.label}
          </Text>
          <Text style={s.contextChange}>Change</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.faces}>
          {Object.entries(species.packs).map(([key, p]) => {
            const active = key === personality;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setPersonality(key);
                }}
                style={s.faceItem}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                accessibilityState={{ selected: active }}
              >
                <View style={[s.faceCircle, active && { backgroundColor: p.color, transform: [{ scale: 1.12 }] }]}>
                  <Text style={s.faceEmoji}>{p.face}</Text>
                </View>
                <Text style={[s.faceLabel, active && s.faceLabelActive]}>{p.shortName}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.pawRow}>
          <PawButton
            recording={recording}
            busy={recorder.phase !== 'idle'}
            level={level}
            onPressIn={onStartListening}
            onPressOut={onStopListening}
            label={`Hold while ${petName} ${species.sounds}`}
          />
          <Text style={s.pawHint}>
            {recording ? `Let go when ${petName} stops` : `Hold the paw while ${petName} ${species.sounds}`}
          </Text>
        </View>
      </View>

      <ContextSheet
        visible={contextOpen}
        contexts={species.contexts}
        selected={contextId}
        petName={petName}
        onSelect={(id) => {
          setContextId(id);
          setContextOpen(false);
        }}
        onClose={() => setContextOpen(false)}
      />
    </View>
  );
}

function RoundTool({ emoji, label, onPress, active }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Sticker color={active ? C.butter : C.paper} radius={999} offset={3} innerStyle={s.tool}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </Sticker>
    </Pressable>
  );
}

function Tag({ text, color }) {
  return (
    <View style={[s.tag, { backgroundColor: color }]}>
      <Text style={s.tagText}>{text}</Text>
    </View>
  );
}

function Action({ emoji, label, onPress, active, primary }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[s.action, primary && s.actionPrimary, active && s.actionActive]}
      hitSlop={4}
    >
      <Text style={s.actionEmoji}>{emoji}</Text>
      {primary ? <Text style={s.actionLabel}>{label}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  paperBg: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingBottom: 190 },
  bigPet: { fontSize: 170, opacity: 0.9 },
  camHint: {
    marginTop: 14,
    backgroundColor: C.paper,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.ink,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  camHintText: { fontFamily: F.semibold, fontSize: 15, color: C.ink },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10 },
  profileChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8, maxWidth: 220 },
  profileText: { fontFamily: F.semibold, fontSize: 16, color: C.ink, flexShrink: 1 },
  profileSub: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft },
  profileEdit: { fontFamily: F.semibold, fontSize: 15, color: C.inkSoft },
  camTools: { flexDirection: 'row', gap: 8 },
  tool: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },

  middle: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 },
  listenBox: { padding: 16, alignItems: 'center' },
  listenTitle: { fontFamily: F.bold, fontSize: 18, color: C.ink, marginBottom: 10 },
  meterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 62 },
  meterBar: { width: 10, borderRadius: 5, backgroundColor: C.pink, borderWidth: 2, borderColor: C.ink },

  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { borderRadius: 999, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  action: {
    height: 38,
    minWidth: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 4
  },
  actionPrimary: { backgroundColor: C.butter, paddingHorizontal: 14 },
  actionActive: { backgroundColor: C.mint },
  actionEmoji: { fontSize: 16 },
  actionLabel: { fontFamily: F.semibold, fontSize: 15, color: C.ink },

  noticeBox: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeText: { fontFamily: F.medium, fontSize: 15, color: C.ink, flex: 1, lineHeight: 20 },
  noticeAction: { backgroundColor: C.paper, borderRadius: 999, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 12, paddingVertical: 6 },
  noticeActionText: { fontFamily: F.semibold, fontSize: 13, color: C.ink },

  panel: {
    backgroundColor: C.paper,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: INK_WIDTH,
    borderLeftWidth: INK_WIDTH,
    borderRightWidth: INK_WIDTH,
    borderColor: C.ink,
    paddingTop: 14,
    paddingBottom: 8
  },
  contextChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.bg,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.ink,
    paddingVertical: 7,
    paddingLeft: 14,
    paddingRight: 6,
    maxWidth: '90%'
  },
  contextText: { fontFamily: F.semibold, fontSize: 15, color: C.ink, flexShrink: 1 },
  contextChange: {
    fontFamily: F.semibold,
    fontSize: 12,
    color: C.ink,
    backgroundColor: C.sky,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3
  },
  faces: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, gap: 14 },
  faceItem: { alignItems: 'center', width: 62 },
  faceCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: INK_WIDTH,
    borderColor: C.ink,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  faceEmoji: { fontSize: 26 },
  faceLabel: { fontFamily: F.medium, fontSize: 12, color: C.inkSoft, marginTop: 6 },
  faceLabelActive: { fontFamily: F.bold, color: C.ink },
  pawRow: { alignItems: 'center', paddingTop: 8 },
  pawHint: { fontFamily: F.medium, fontSize: 14, color: C.inkSoft, marginTop: 8 }
});
