import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Share } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import useBarkRecorder from '../audio/useBarkRecorder';
import { pickLinePool, moodScores } from '../audio/barkAnalysis';
import { pickLine, activeContext } from '../lines';
import { guessContext, addExample, learningProgress, bondLevel } from '../learning/petLearning';
import { loadSharedModel, refreshSharedModel } from '../learning/sharedModel';
import { queueClip, queueLabel, flush } from '../contribute/contributions';
import { keepPhoto, keepAudio, keepVideo, fileExists } from '../storage/photos';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { playFile, playSounds, stopSounds } from '../audio/sounds';
import { makeVideo, videoAvailable } from '../share/videoShare';
import { File } from 'expo-file-system';
import { getSpecies, APP_NAME, STORE_URL } from '../species';

const MILESTONE_PER_CONTEXT = 3;

// The Translate flow: tap the paw, listen until the pet stops, measure,
// guess, pick a line, and let the owner teach Pawlingo what it really meant.
export default function useTranslate({ data, cameraRef, cameraOn, shareCardRef }) {
  const { pet, species, breed, shareClips, addEntry, updateEntry } = data;
  const [currentResult, setCurrentResult] = useState(null);
  const [notice, setNotice] = useState(null);
  const [micPrimer, setMicPrimer] = useState(false);
  const [labelEntry, setLabelEntry] = useState(null);
  const [progress, setProgress] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const noticeTimer = useRef(null);
  const finishRef = useRef(null);
  const videoRec = useRef(null); // the camera clip being recorded while listening

  const bark = useBarkRecorder({ onAutoStop: () => finishRef.current?.() });

  const showNotice = useCallback((text, action, ms = 5000) => {
    setNotice({ text, action });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), ms);
  }, []);
  useEffect(() => () => noticeTimer.current && clearTimeout(noticeTimer.current), []);

  const refreshProgress = useCallback(() => {
    if (pet) learningProgress(pet.id).then(setProgress);
  }, [pet?.id]);

  // New pet selected: fresh screen, its own progress, its species' model.
  useEffect(() => {
    if (!pet) return;
    setCurrentResult(null);
    refreshProgress();
    refreshSharedModel(pet.species);
  }, [pet?.id, pet?.species]);

  useEffect(() => {
    if (shareClips) flush();
  }, [shareClips]);

  // Replay plays the pet's real recorded sound. Reading the words aloud with
  // the phone's voice is optional (Settings), and off by default.
  const readAloud = data.settings?.readAloud === true;
  const speak = useCallback(
    (item, { auto = false } = {}) => {
      Speech.stop();
      stopSounds();
      let delay = 0;
      if (!auto) {
        if (fileExists(item.audioUri)) {
          playFile(item.audioUri);
          delay = Math.min(15000, Number(item.duration || 1.5) * 1000) + 300;
        } else {
          playSounds(item.species === 'cat' ? 'cat_unit_meow' : 'dog_unit_bark');
          delay = 900;
        }
      }
      if (readAloud) setTimeout(() => Speech.speak(item.text, { pitch: item.pitch, rate: item.rate }), delay);
    },
    [readAloud]
  );

  const startListening = useCallback(async () => {
    Speech.stop();
    stopSounds();
    setNotice(null);
    const res = await bark.start();
    if (res.ok) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      // With the camera on, film the pet while listening (no sound: the
      // microphone is busy; the share video uses the clean recording).
      if (cameraOn && cameraRef.current) {
        try {
          videoRec.current = cameraRef.current.recordAsync({ maxDuration: 16 }).catch(() => null);
        } catch (_) {
          videoRec.current = null;
        }
      }
      return;
    }
    if (res.reason === 'undetermined') setMicPrimer(true);
    else if (res.reason === 'denied')
      showNotice(`${APP_NAME} needs the microphone to hear ${pet.name}.`, {
        label: 'Allow',
        onPress: () => setMicPrimer(true)
      });
    else if (res.reason === 'blocked')
      showNotice(`The microphone is switched off for ${APP_NAME}. Turn it on in Settings.`, {
        label: 'Open Settings',
        onPress: () => Linking.openSettings()
      });
    else if (res.reason === 'error') showNotice("Couldn't start the microphone. Try again.");
  }, [bark, pet, showNotice, cameraOn, cameraRef]);

  const allowMic = useCallback(async () => {
    setMicPrimer(false);
    const r = await bark.requestPermission();
    if (r === 'granted') startListening();
    else if (r === 'blocked')
      showNotice(`The microphone is switched off for ${APP_NAME}. Turn it on in Settings.`, {
        label: 'Open Settings',
        onPress: () => Linking.openSettings()
      });
    else showNotice(`${APP_NAME} can't hear ${pet.name} without the microphone.`);
  }, [bark, pet, startListening, showNotice]);

  const stopVideo = async () => {
    const rec = videoRec.current;
    videoRec.current = null;
    if (!rec) return null;
    try {
      cameraRef.current?.stopRecording();
    } catch (_) {}
    const r = await rec;
    return r?.uri || null;
  };

  const discard = (uri) => {
    try {
      if (uri) new File(uri).delete();
    } catch (_) {}
  };

  const finishListening = async () => {
    if (!bark.isRecording) return;
    const videoPromise = stopVideo();
    // Always keep the recording: it goes in share videos, and (only if the
    // owner opted in) to the server for training.
    const out = await bark.stop({ keepClip: true });
    const tempVideo = await videoPromise;
    if (!out || !out.analysis?.heard) discard(tempVideo);
    if (!out) return;
    const { analysis, heldMs } = out;
    if (!analysis?.heard) {
      showNotice(`Didn't hear ${pet.name}. Get a bit closer and tap the paw when ${pet.name} is about to ${species.sound}.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Pawlingo's guess from this pet's taught sounds plus the shared model.
    // Used only when it's confident; otherwise the owner's pick decides.
    const sharedModel = await loadSharedModel(species.id);
    const guess = await guessContext(pet.id, out.features?.vector, sharedModel);
    const guessCtx = guess?.show ? species.contexts.find((c) => c.id === guess.contextId) : null;

    const pack = species.packs[pet.personality] || species.packs[species.defaultPersonality];
    const pickedId = activeContext(pet);
    const ctx = guessCtx || species.contexts.find((c) => c.id === pickedId) || species.contexts[0];
    const recent = data.history.filter((h) => h.petId === pet.id).slice(0, 8).map((h) => h.text);
    const text = pickLine({
      pool: pack.lines[ctx.id] || pack.lines.chat,
      size: pickLinePool(analysis.pattern),
      home: pet.home,
      contextId: ctx.id,
      recent
    });
    const now = new Date();
    const id = String(now.getTime());
    let tempPhoto = null;
    if (tempVideo) {
      try {
        const thumb = await getThumbnailAsync(tempVideo, { time: Math.min(3000, Math.max(300, heldMs / 2)), quality: 0.7 });
        tempPhoto = thumb?.uri || null;
      } catch (_) {}
    }
    const photoUri = await keepPhoto(tempPhoto, id);
    const videoUri = await keepVideo(tempVideo, id);
    const audioUri = await keepAudio(out.clipUri, id);
    const uploadClip = shareClips === true && Boolean(out.clipUri);

    const entry = {
      id,
      petId: pet.id,
      species: species.id,
      petName: pet.name,
      breedName: breed?.name || null,
      personalityName: pack.name,
      personalityFace: pack.face,
      contextLabel: ctx.label,
      tip: ctx.tip,
      text,
      duration: (heldMs / 1000).toFixed(1),
      patternLabel: species.patternLabels[analysis.pattern],
      pattern: analysis.pattern,
      soundCount: analysis.barkCount,
      loudness: analysis.loudness,
      pitch: Math.max(0.5, Math.min(1.8, pack.pitch + (breed?.pitchMod || 0))),
      rate: Math.max(0.6, Math.min(1.5, pack.rate + (breed?.rateMod || 0))),
      emotions: moodScores(analysis, ctx.id, pet.personality),
      photoUri,
      audioUri,
      videoUri,
      contextId: ctx.id,
      pickedContextId: pickedId,
      guess: guessCtx
        ? { contextId: guess.contextId, label: guessCtx.label, confidence: guess.confidence, wording: guess.wording, source: guess.source }
        : null,
      features: out.features?.vector || null,
      clipId: uploadClip ? `${species.id}-${now.getTime()}` : null,
      labelled: false,
      date: now.toISOString()
    };

    if (!uploadClip && out.clipUri) {
      try {
        new File(out.clipUri).delete();
      } catch (_) {}
    }
    if (uploadClip) {
      queueClip({
        clipId: entry.clipId,
        tempUri: out.clipUri,
        petId: pet.id,
        species: species.id,
        breedId: breed?.id,
        contextId: pickedId,
        analysis,
        features: out.features,
        guess
      });
    }
    setCurrentResult(entry);
    addEntry(entry);
    speak(entry, { auto: true });
  };
  finishRef.current = finishListening;

  const onPawPress = useCallback(() => {
    if (bark.isRecording) finishRef.current?.();
    else if (bark.phase === 'idle') startListening();
  }, [bark.isRecording, bark.phase, startListening]);

  // Save what the owner says the sound meant: on this phone for this pet,
  // and (if sharing is on) to the server for the shared model.
  const teach = useCallback(
    async (entry, { contextId, moods = [], comment = '' }) => {
      if (!entry) return;
      const petId = entry.petId || pet.id;
      const before = await learningProgress(petId);
      await addExample(petId, entry.features, contextId, moods);
      const after = await learningProgress(petId);
      if (entry.clipId) {
        queueLabel({
          clipId: entry.clipId,
          contextId,
          moods,
          comment,
          rating: entry.guess ? (entry.guess.contextId === contextId ? 'up' : 'down') : null
        });
      }
      const changes = { labelled: true, taughtContextId: contextId };
      updateEntry(entry.id, changes);
      setCurrentResult((cur) => (cur && cur.id === entry.id ? { ...cur, ...changes } : cur));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (petId === pet.id) setProgress(after);

      // Milestones make the learning visible.
      const sp = getSpecies(entry.species);
      const name = entry.petName || pet.name;
      const ctxLabel = sp.contexts.find((c) => c.id === contextId)?.label;
      if (before.stage === 'starting' && after.stage !== 'starting') {
        showNotice(`🎉 Guesses unlocked! ${APP_NAME} will now try to tell what ${name} means.`, null, 7000);
      } else if (bondLevel(after).level > bondLevel(before).level) {
        showNotice(`🎉 Level up! You and ${name} are now "${bondLevel(after).name}".`, null, 7000);
      } else if (ctxLabel && (before.byContext[contextId] || 0) < MILESTONE_PER_CONTEXT && after.byContext[contextId] >= MILESTONE_PER_CONTEXT) {
        showNotice(`🎉 ${APP_NAME} is learning ${name}'s ${ctxLabel.replace(/^\S+\s/, '')} sounds.`, null, 7000);
      } else {
        const b = bondLevel(after);
        showNotice(
          b.needsContext
            ? `Got it. Now teach me a sound from a different situation.`
            : `Got it! ${b.remaining} more ${b.remaining === 1 ? 'answer' : 'answers'} to the next level.`
        );
      }
    },
    [pet, updateEntry, showNotice]
  );

  // One-tap answer to "Did I get it right?"
  const confirmGuess = useCallback(
    (entry, right) => {
      if (right) teach(entry, { contextId: entry.guess.contextId });
      else setLabelEntry({ ...entry, wrongGuess: true });
    },
    [teach]
  );

  // Share a picture card (photo + speech bubble + app link); fall back to text.
  const sharePicture = useCallback(
    async (item) => {
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
        await Share.share({ message: `${item.petName} says: "${item.text}"\n\nTranslated with ${APP_NAME} 🐾 ${STORE_URL}` });
      } catch (_) {}
    },
    [shareCardRef]
  );

  // Share: ask "video or picture?" when videos can be made, else a picture.
  // shareJob drives the share sheet: { item, step: 'choose' | 'making' | 'error', message }
  const [shareJob, setShareJob] = useState(null);
  const videoAbort = useRef(null);

  const shareResult = useCallback(
    (item) => {
      if (videoAvailable) setShareJob({ item, step: 'choose' });
      else sharePicture(item);
    },
    [sharePicture]
  );

  const shareVideo = useCallback(async (item) => {
    const controller = new AbortController();
    videoAbort.current = controller;
    setShareJob({ item, step: 'making' });
    try {
      const uri = await makeVideo(item, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setShareJob(null);
      await Sharing.shareAsync(uri, { mimeType: 'video/mp4', dialogTitle: `Share ${item.petName}'s video` });
    } catch (e) {
      if (controller.signal.aborted) return;
      setShareJob({ item, step: 'error', message: e?.message || "The video couldn't be made." });
    } finally {
      if (videoAbort.current === controller) videoAbort.current = null;
    }
  }, []);

  const closeShare = useCallback(() => {
    videoAbort.current?.abort();
    setShareJob(null);
  }, []);

  return {
    bark,
    onPawPress,
    currentResult,
    dismissResult: () => setCurrentResult(null),
    notice,
    showNotice,
    micPrimer,
    allowMic,
    dismissMicPrimer: () => setMicPrimer(false),
    labelEntry,
    openTeach: setLabelEntry,
    closeTeach: () => setLabelEntry(null),
    teach,
    confirmGuess,
    progress,
    refreshProgress,
    speak,
    shareResult,
    sharePicture,
    shareVideo,
    shareJob,
    closeShare,
    shareItem
  };
}
