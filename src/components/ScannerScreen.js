import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { C, F, INK_WIDTH } from '../theme';
import { APP_NAME } from '../species';
import useMeter from '../audio/useMeter';
import { Sticker } from './ui';
import PawButton from './PawButton';
import ProgressRing from './ProgressRing';
import { bondLevel } from '../learning/petLearning';
import SpeechBubble from './SpeechBubble';
import ContextSheet from './ContextSheet';

// The goal under the paw: how many answers until the next bond level.
function targetLine(bond, name) {
  if (bond.needsContext) return `🎯 Teach me a sound from a new situation to unlock guesses`;
  const n = bond.remaining;
  if (bond.unlocksGuesses) return `🎯 ${n} more till I can guess what ${name} means`;
  return `🎯 ${n} more till I know ${name} better`;
}

export default function ScannerScreen(props) {
  const {
    pet,
    pets,
    species,
    breed,
    onOpenPets,
    onOpenSettings,
    cameraRef,
    cameraOn,
    onToggleCamera,
    facing,
    onFlip,
    torch,
    onTorch,
    recorder,
    onPawPress,
    showPawHint,
    onPawHintSeen,
    currentResult,
    onDismissResult,
    notice,
    onReplay,
    onShare,
    onTeach,
    onConfirmGuess,
    onChangeContext,
    onChangePersonality,
    progress
  } = props;
  const bond = progress ? bondLevel(progress) : null;

  const [contextOpen, setContextOpen] = useState(false);
  const [idleH, setIdleH] = useState(0);
  const petSize = Math.max(60, Math.min(170, Math.round((idleH - 70) * 0.7)));
  const context = species.contexts.find((c) => c.id === pet.contextId) || species.contexts[0];
  const listening = recorder.isRecording;
  const result = currentResult && !listening && currentResult.petId === pet.id ? currentResult : null;

  const pressPaw = () => {
    if (showPawHint) onPawHintSeen();
    onPawPress();
  };

  return (
    <View style={s.container}>
      {/* Backdrop: the pet through the camera, or a big pet on lilac paper */}
      {cameraOn ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
          mode="video"
          videoQuality="720p"
          videoBitrate={2_000_000}
          mute
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.paperBg]} />
      )}

      {/* Top row: pet switcher, camera tools, settings */}
      <View style={s.topRow}>
        <Pressable
          onPress={onOpenPets}
          accessibilityRole="button"
          accessibilityLabel={`${pet.name}. Switch or edit pets`}
          style={{ flexShrink: 1 }}
        >
          <Sticker radius={999} offset={3} innerStyle={s.petChip}>
            <Text style={s.petText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {species.emoji} {pet.name}
              {breed ? <Text style={s.petSub}>  {breed.name.replace(/^\S+\s/, '')}</Text> : null}
            </Text>
            <Text style={s.petCaret}>{pets.length > 1 ? '⇄' : '✎'}</Text>
          </Sticker>
        </Pressable>
        <View style={s.tools}>
          {cameraOn && <RoundTool emoji="🔄" label="Flip camera" onPress={onFlip} />}
          {cameraOn && <RoundTool emoji="🔦" label="Torch" onPress={onTorch} active={torch} />}
          <RoundTool
            emoji={cameraOn ? '📷' : '📸'}
            label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            onPress={onToggleCamera}
            active={!cameraOn}
          />
          <RoundTool emoji="⚙️" label="Settings" onPress={onOpenSettings} />
        </View>
      </View>

      {/* Middle: live listening, the speech bubble, or a message */}
      <View style={s.middle} pointerEvents="box-none">
        {listening ? (
          <ListeningCard recorder={recorder} pet={pet} species={species} filming={cameraOn} />
        ) : result ? (
          <SpeechBubble
            name={result.petName}
            face={result.personalityFace}
            text={result.text}
            animateKey={result.id}
            footer={
              <ResultFooter
                result={result}
                species={species}
                onReplay={onReplay}
                onShare={onShare}
                onDismiss={onDismissResult}
                onTeach={onTeach}
                onConfirmGuess={onConfirmGuess}
              />
            }
          />
        ) : (
          <>
            {/* The big pet sits in the space left above the panel, so the
                panel can grow (large text, small phones) without covering it. */}
            {!cameraOn && (
              <View style={s.idle} onLayout={(e) => setIdleH(e.nativeEvent.layout.height)}>
                {idleH > 90 && (
                  <Text style={[s.bigPet, { fontSize: petSize, lineHeight: petSize * 1.15 }]} maxFontSizeMultiplier={1}>
                    {species.emoji}
                  </Text>
                )}
                {!notice && (
                  <Pressable onPress={onToggleCamera} style={s.camHint} accessibilityRole="button">
                    <Text style={s.camHintText} maxFontSizeMultiplier={1.3}>
                      🎥 Film {pet.name} for a share video
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
            {notice && (
              <Sticker color={C.butter} radius={20} innerStyle={s.noticeBox}>
                <Text style={s.noticeText}>{notice.text}</Text>
                {notice.action && (
                  <Pressable style={s.noticeAction} onPress={notice.action.onPress} accessibilityRole="button">
                    <Text style={s.noticeActionText}>{notice.action.label}</Text>
                  </Pressable>
                )}
              </Sticker>
            )}
          </>
        )}
      </View>

      {/* Bottom panel */}
      <View style={s.panel}>
        <Pressable
          onPress={() => setContextOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Situation: ${context.shortLabel}. Change`}
          style={s.contextChip}
          disabled={listening}
        >
          <Text style={s.contextText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {context.label}
          </Text>
          <Text style={s.contextChange}>Change</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.faces}>
          {Object.entries(species.packs).map(([key, p]) => {
            const active = key === pet.personality;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onChangePersonality(key);
                }}
                style={s.faceItem}
                accessibilityRole="button"
                accessibilityLabel={`Voice: ${p.shortName}`}
                accessibilityState={{ selected: active }}
              >
                <View style={[s.faceCircle, active && { backgroundColor: p.color, transform: [{ scale: 1.12 }] }]}>
                  <Text style={s.faceEmoji}>{p.face}</Text>
                </View>
                <Text style={[s.faceLabel, active && s.faceLabelActive]} maxFontSizeMultiplier={1.2}>
                  {p.shortName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.pawRow}>
          {showPawHint && !listening && !result && (
            <Sticker color={C.paper} radius={16} offset={3} style={s.hintWrap} innerStyle={s.hintBox}>
              <Text style={s.hintText}>
                Tap the paw, then let {pet.name} {species.sound}. {APP_NAME} stops listening when {pet.name} is done.
              </Text>
              <Pressable onPress={onPawHintSeen} accessibilityRole="button" hitSlop={8}>
                <Text style={s.hintOk}>Got it</Text>
              </Pressable>
            </Sticker>
          )}
          <ProgressRing bond={bond}>
            <PawButton
              recorder={recorder}
              onPress={pressPaw}
              label={listening ? 'Stop listening' : `Listen to ${pet.name}`}
            />
          </ProgressRing>
          <Text style={s.pawHint} maxFontSizeMultiplier={1.3} numberOfLines={2}>
            {listening
              ? `Listening… tap to stop`
              : showPawHint || !bond
              ? `Tap the paw to listen to ${pet.name}`
              : targetLine(bond, pet.name)}
          </Text>
        </View>
      </View>

      <ContextSheet
        visible={contextOpen}
        contexts={species.contexts}
        selected={pet.contextId}
        petName={pet.name}
        onSelect={(id) => {
          onChangeContext(id);
          setContextOpen(false);
        }}
        onClose={() => setContextOpen(false)}
      />
    </View>
  );
}

// Live meter while listening. Only this card redraws with the audio.
function ListeningCard({ recorder, pet, species, filming }) {
  const meter = useMeter(recorder);
  return (
    <Sticker color={C.paper} radius={24} innerStyle={s.listenBox}>
      <Text style={s.listenTitle} maxFontSizeMultiplier={1.3}>
        {filming ? '🔴 ' : ''}
        {meter.heard ? `Hearing ${pet.name}…` : `Listening for ${pet.name}…`} {(meter.ms / 1000).toFixed(1)}s
      </Text>
      <View style={s.meterRow} accessible={false}>
        {Array.from({ length: 14 }, (_, i) => {
          const db = meter.levels[meter.levels.length - 14 + i];
          const h = typeof db === 'number' ? Math.max(0, Math.min(1, (db + 60) / 55)) : 0;
          return <View key={i} style={[s.meterBar, { height: 8 + h * 52 }]} />;
        })}
      </View>
      <Text style={s.listenSub}>
        {meter.heard ? `Stops by itself when ${pet.name} goes quiet` : `Waiting for a ${species.sound}`}
      </Text>
    </Sticker>
  );
}

function ResultFooter({ result, species, onReplay, onShare, onDismiss, onTeach, onConfirmGuess }) {
  const count = result.soundCount;
  return (
    <>
      {result.guess && (
        <View style={s.guessRow}>
          <Text style={s.guessText} maxFontSizeMultiplier={1.3}>
            🧠 {result.guess.wording || 'Maybe'}: {result.guess.label}
          </Text>
        </View>
      )}
      <View style={s.statRow}>
        <Tag text={result.patternLabel} color={C.sky} />
        <Tag text={`${count} ${count === 1 ? species.sound : species.sounds}`} color={C.butter} />
        <Tag text={`🔊 ${result.loudness}`} color={C.mint} />
      </View>
      <View style={s.actions}>
        <Action emoji="🔊" label="Replay" onPress={() => onReplay(result)} />
        <Action emoji="📤" label="Share" onPress={() => onShare(result)} primary />
        <Action emoji="✕" label="Close" onPress={onDismiss} />
      </View>
      {result.features && !result.labelled && (
        result.guess ? (
          <View style={s.confirm}>
            <Text style={s.confirmText} maxFontSizeMultiplier={1.3}>
              Did I get it right?
            </Text>
            <View style={s.confirmBtns}>
              <Pressable style={[s.yesNo, { backgroundColor: C.mint }]} onPress={() => onConfirmGuess(result, true)} accessibilityRole="button">
                <Text style={s.yesNoText}>✅ Yes</Text>
              </Pressable>
              <Pressable style={[s.yesNo, { backgroundColor: C.paper }]} onPress={() => onConfirmGuess(result, false)} accessibilityRole="button">
                <Text style={s.yesNoText}>❌ No</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => onTeach(result)} style={s.teach} accessibilityRole="button">
            <Text style={s.teachText} maxFontSizeMultiplier={1.3}>
              🧠 Tell {APP_NAME} what {result.petName} meant
            </Text>
          </Pressable>
        )
      )}
      {result.labelled && (
        <Text style={s.taught} maxFontSizeMultiplier={1.3}>
          ✓ Thanks, {APP_NAME} learned from this one
        </Text>
      )}
    </>
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
      <Text style={s.tagText} maxFontSizeMultiplier={1.2}>
        {text}
      </Text>
    </View>
  );
}

function Action({ emoji, label, onPress, primary }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[s.action, primary && s.actionPrimary]}
      hitSlop={4}
    >
      <Text style={s.actionEmoji}>{emoji}</Text>
      {primary ? (
        <Text style={s.actionLabel} maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  paperBg: { backgroundColor: C.bg },
  idle: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 60 },
  bigPet: { fontSize: 170, opacity: 0.9, textAlign: 'center' },
  camHint: {
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: C.paper,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.ink,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  camHintText: { fontFamily: F.semibold, fontSize: 15, color: C.ink },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, gap: 8 },
  petChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  petText: { fontFamily: F.semibold, fontSize: 16, color: C.ink, flexShrink: 1 },
  petSub: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft },
  petCaret: { fontFamily: F.semibold, fontSize: 15, color: C.inkSoft },
  tools: { flexDirection: 'row', gap: 6 },
  tool: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  middle: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 },
  listenBox: { padding: 16, alignItems: 'center' },
  listenTitle: { fontFamily: F.bold, fontSize: 18, color: C.ink, marginBottom: 10 },
  listenSub: { fontFamily: F.regular, fontSize: 13, color: C.inkSoft, marginTop: 8 },
  meterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 62 },
  meterBar: { width: 10, borderRadius: 5, backgroundColor: C.pink, borderWidth: 2, borderColor: C.ink },

  guessRow: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.ink,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  guessText: { fontFamily: F.semibold, fontSize: 14, color: C.ink },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { borderRadius: 999, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 9, paddingVertical: 3 },
  tagText: { fontFamily: F.medium, fontSize: 12, color: C.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  action: {
    height: 40,
    minWidth: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 4
  },
  actionPrimary: { backgroundColor: C.butter, paddingHorizontal: 16 },
  actionEmoji: { fontSize: 16 },
  actionLabel: { fontFamily: F.semibold, fontSize: 15, color: C.ink },

  confirm: { marginTop: 12, paddingTop: 10, borderTopWidth: 2, borderTopColor: 'rgba(36,22,74,0.12)' },
  confirmText: { fontFamily: F.semibold, fontSize: 15, color: C.ink, marginBottom: 8 },
  confirmBtns: { flexDirection: 'row', gap: 8 },
  yesNo: { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: C.ink, paddingVertical: 9, alignItems: 'center' },
  yesNoText: { fontFamily: F.semibold, fontSize: 15, color: C.ink },
  teach: {
    marginTop: 12,
    backgroundColor: C.pink,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.ink,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  teachText: { fontFamily: F.semibold, fontSize: 14, color: C.ink, textAlign: 'center' },
  taught: { fontFamily: F.medium, fontSize: 13, color: C.inkSoft, marginTop: 10 },

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
  pawRow: { alignItems: 'center', paddingTop: 6 },
  pawHint: { fontFamily: F.medium, fontSize: 14, color: C.inkSoft, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  hintWrap: { position: 'absolute', bottom: 150, left: 16, right: 16, zIndex: 5 },
  hintBox: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  hintText: { fontFamily: F.medium, fontSize: 14, lineHeight: 19, color: C.ink, flex: 1 },
  hintOk: { fontFamily: F.bold, fontSize: 14, color: C.ink, textDecorationLine: 'underline' }
});
