import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Share } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import useBarkRecorder from '../audio/useBarkRecorder';
import { runTranslationPipeline } from '../audio/pipeline';
import { addExample, learningProgress, bondLevel } from '../learning/petLearning';
import { refreshSharedModel } from '../learning/sharedModel';
import { queueClip, queueLabel, flush } from '../contribute/contributions';
import { keepPhoto, keepAudio, keepVideo, fileExists } from '../storage/photos';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { playFile, playSounds, stopSounds } from '../audio/sounds';
import { makeVideo, videoAvailable } from '../share/videoShare';
import { extractClipAudio, canUseForShareVideo, MAX_EXTRACT_SECONDS } from '../share/extractClip';
import { File } from 'expo-file-system';
import { getSpecies, APP_NAME, STORE_URL } from '../species';

const MILESTONE_PER_CONTEXT = 3;

// The Translate flow: tap the paw, listen until the pet stops (or catch a
// sound from the 10s rolling buffer, or import a clip), measure, guess, pick
// a line, and let the owner teach Pawlingo what it really meant.
export default function useTranslate({ data, cameraRef, cameraOn, shareCardRef, scannerOpen = true }) {
  const { pet, species, breed, shareClips, addEntry, updateEntry } = data;
  const [currentResult, setCurrentResult] = useState(null);
  const [notice, setNotice] = useState(null);
  const [micPrimer, setMicPrimer] = useState(false);
  const [labelEntry, setLabelEntry] = useState(null);
  const [progress, setProgress] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const [importingClip, setImportingClip] = useState(false);
  const [clipPickerOpen, setClipPickerOpen] = useState(false);
  const [pendingClip, setPendingClip] = useState(null);
  const noticeTimer = useRef(null);
  const finishRef = useRef(null);
  const videoRec = useRef(null); // the camera clip being recorded while listening

  const watchEnabled = Boolean(scannerOpen && !importingClip && data.settings?.catchMissed !== false);
  const bark = useBarkRecorder({ onAutoStop: () => finishRef.current?.(), watchEnabled });

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

  const completeTranslation = async ({
    pcm,
    liveHeard = true,
    clipUri = null,
    videoSourceUri = null,
    copyVideo = false,
    thumbTimeMs = null,
    recordedAt = null,
    notHeardMsg = null
  }) => {
    const res = await runTranslationPipeline({
      pcm,
      liveHeard,
      pet,
      species,
      breed,
      history: data.history,
      recordedAt
    });
    if (!res.heard) {
      if (!copyVideo) discard(videoSourceUri);
      discard(clipUri);
      showNotice(
        notHeardMsg ||
          `Didn't hear ${pet.name}. Get a bit closer and tap the paw when ${pet.name} is about to ${species.sound}.`
      );
      return false;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const { entry, analysis, features, guess, pickedId, durationMs } = res;
    const id = entry.id;
    let tempPhoto = null;
    if (videoSourceUri) {
      try {
        const atMs = thumbTimeMs ?? Math.min(3000, Math.max(300, durationMs / 2));
        const thumb = await getThumbnailAsync(videoSourceUri, { time: atMs, quality: 0.7 });
        tempPhoto = thumb?.uri || null;
      } catch (_) {}
    }
    const photoUri = await keepPhoto(tempPhoto, id);
    const keepVidOk = videoSourceUri && (!copyVideo || canUseForShareVideo(videoSourceUri));
    const videoUri = keepVidOk ? await keepVideo(videoSourceUri, id, { copy: copyVideo }) : null;
    if (!copyVideo && !keepVidOk) discard(videoSourceUri);
    const audioUri = await keepAudio(clipUri, id);
    const uploadClip = shareClips === true && Boolean(clipUri);

    const finalEntry = {
      ...entry,
      photoUri,
      audioUri,
      videoUri,
      clipId: uploadClip ? `${species.id}-${id}` : null
    };

    if (!uploadClip && clipUri) discard(clipUri);
    if (uploadClip) {
      queueClip({
        clipId: finalEntry.clipId,
        tempUri: clipUri,
        petId: pet.id,
        species: species.id,
        breedId: breed?.id,
        contextId: pickedId,
        analysis,
        features: finalEntry.features,
        guess
      });
    }
    setCurrentResult(finalEntry);
    addEntry(finalEntry);
    speak(finalEntry, { auto: true });
    return true;
  };

  const finishListening = async () => {
    if (!bark.isRecording) return;
    const videoPromise = stopVideo();
    // Always keep the recording: it goes in share videos, and (only if the
    // owner opted in) to the server for training.
    const out = await bark.stop({ keepClip: true });
    const tempVideo = await videoPromise;
    if (!out) {
      discard(tempVideo);
      return;
    }
    await completeTranslation({
      pcm: out.pcm,
      liveHeard: out.liveHeard,
      clipUri: out.clipUri,
      videoSourceUri: tempVideo,
      copyVideo: false
    });
  };
  finishRef.current = finishListening;

  const onPawPress = useCallback(() => {
    if (bark.isRecording) {
      finishRef.current?.();
      return;
    }
    if (bark.phase !== 'idle' || importingClip) return;
    // Feature 2 ("I just missed it"): if the rolling 10s buffer caught a
    // sound right before the owner tapped the paw, translate it immediately.
    const missed = bark.consumeMissed({ keepClip: true });
    if (missed) {
      completeTranslation({
        pcm: missed.pcm,
        liveHeard: missed.liveHeard,
        clipUri: missed.clipUri
      });
      return;
    }
    startListening();
  }, [bark, importingClip, startListening]);

  // Feature 1 ("Use a clip I already have" or shared into Pawlingo).
  const importClip = useCallback(
    async ({ uri, isVideo = false, startSec = 0, durationSec = 0, fallbackDate = null, needsTrimCheck = false }) => {
      if (!uri || importingClip) return;
      if (needsTrimCheck && durationSec > MAX_EXTRACT_SECONDS) {
        setPendingClip({ uri, isVideo, durationSec, fallbackDate });
        setClipPickerOpen(true);
        return;
      }
      Speech.stop();
      stopSounds();
      setNotice(null);
      setImportingClip(true);
      try {
        const extracted = await extractClipAudio({
          uri,
          start: startSec,
          seconds: MAX_EXTRACT_SECONDS,
          fallbackDate
        });
        await completeTranslation({
          pcm: extracted.pcm,
          liveHeard: true,
          clipUri: extracted.clipUri,
          videoSourceUri: isVideo ? uri : null,
          copyVideo: true,
          thumbTimeMs: Math.round((startSec || 0) * 1000 + 800),
          recordedAt: extracted.recordedAt,
          notHeardMsg: `Couldn't hear ${pet.name} in that clip.`
        });
      } catch (e) {
        showNotice(e?.message || 'Could not read that clip.');
      } finally {
        setImportingClip(false);
      }
    },
    [importingClip, pet, species, breed, data.history, shareClips, showNotice]
  );

  // Save what the owner says the sound meant: on this phone for this pet,
  // and (if sharing is on) to the server for the shared model.
  const teach = useCallback(
    async (entry, { contextId, moods = [], comment = '' }) => {
      if (!entry) return;
      const petId = entry.petId || pet.id;
      const before = await learningProgress(petId);
      await addExample(petId, entry.features, contextId, moods, entry.recordedAt || entry.date);
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
    shareItem,
    importingClip,
    clipPickerOpen,
    pendingClip,
    openClipPicker: () => {
      setPendingClip(null);
      setClipPickerOpen(true);
    },
    closeClipPicker: () => {
      setPendingClip(null);
      setClipPickerOpen(false);
    },
    importClip
  };
}
