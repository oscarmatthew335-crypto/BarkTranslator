import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, StatusBar, Linking, AppState, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { useFonts, Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';

import { C } from './src/theme';
import { installCrashReporting } from './src/crash';
import useAppData from './src/state/useAppData';
import useTranslate from './src/state/useTranslate';
import ErrorBoundary from './src/components/ErrorBoundary';
import Onboarding from './src/components/Onboarding';
import QuickStart from './src/components/QuickStart';
import ConsentScreen from './src/components/ConsentScreen';
import AgeCheck from './src/components/AgeCheck';
import ScannerScreen from './src/components/ScannerScreen';
import SpeakTab from './src/components/SpeakTab';
import DecoderTab from './src/components/DecoderTab';
import JournalTab from './src/components/JournalTab';
import PetsSheet from './src/components/PetsSheet';
import SettingsSheet from './src/components/SettingsSheet';
import LabelSheet from './src/components/LabelSheet';
import MicPrimer from './src/components/MicPrimer';
import ClipPickerSheet from './src/components/ClipPickerSheet';
import ShareCard from './src/components/ShareCard';
import ShareSheet from './src/components/ShareSheet';
import TabBar from './src/components/TabBar';
import PlayTab from './src/components/game/PlayTab';
import { getSpecies } from './src/species';
import useIncomingShareClip from './src/share/incomingShare';
import { I18nProvider, translate } from './src/i18n';
import { countSession } from './src/game/counters';
import { initAds } from './src/game/ads';
import { initPurchases } from './src/game/purchases';
import { track } from './src/game/analytics';

installCrashReporting();

export default function App() {
  const [fontsLoaded] = useFonts({ Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold });
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <ErrorBoundary>{fontsLoaded ? <PetApp /> : <View style={styles.blank} />}</ErrorBoundary>
    </SafeAreaProvider>
  );
}

function PetApp() {
  const data = useAppData();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [cameraWanted, setCameraWanted] = useState(true);
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [activeTab, setActiveTab] = useState('play');
  const [gameRunning, setGameRunning] = useState(false);
  // Set by QuickStart: the Play tab starts the first run straight away.
  const [autoStartRun, setAutoStartRun] = useState(false);
  const [petsOpen, setPetsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openedFromReminder, setOpenedFromReminder] = useState(false);
  const handledNotifRef = useRef(new Set());
  const cameraRef = useRef(null);
  const shareCardRef = useRef(null);

  useEffect(() => {
    const handleResponse = (resp) => {
      if (!resp) return;
      const id = resp.notification?.request?.identifier || 'last';
      if (handledNotifRef.current.has(id)) return;
      handledNotifRef.current.add(id);
      const giftDay = resp.notification?.request?.content?.data?.giftDay;
      track('notification_opened', giftDay ? { day: giftDay } : {});
      setActiveTab('play');
      setOpenedFromReminder(true);
    };
    Notifications.getLastNotificationResponseAsync?.().then(handleResponse).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener?.(handleResponse);
    return () => sub?.remove?.();
  }, []);

  // On-phone usage counts for the hidden numbers screen (never sent).
  useEffect(() => {
    countSession();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && countSession());
    return () => sub.remove();
  }, []);

  const cameraOn = Boolean(camPerm?.granted && cameraWanted);
  const t = useTranslate({
    data,
    cameraRef,
    cameraOn,
    shareCardRef,
    scannerOpen: activeTab === 'scanner' && data.shareClips !== null
  });
  const { pet, species } = data;
  const readyForMonetization = Boolean(data.loaded && pet && data.settings.ageConfirmed);

  // Initialize UMP consent + AdMob and Play Billing only after onboarding and
  // age confirmation are complete (Android only; safe no-op on iOS).
  useEffect(() => {
    if (!readyForMonetization) return;
    initAds();
    initPurchases();
  }, [readyForMonetization]);

  useIncomingShareClip((clip) => {
    if (!pet) return;
    setActiveTab('scanner');
    t.importClip({ ...clip, needsTrimCheck: true });
  });

  const toggleCamera = async () => {
    if (camPerm?.granted) {
      setCameraWanted((v) => !v);
      return;
    }
    const res = await requestCamPerm();
    if (res?.granted) setCameraWanted(true);
    else if (res && !res.canAskAgain)
      t.showNotice(translate('error.cameraOff'), {
        label: translate('error.openSettings'),
        onPress: () => Linking.openSettings()
      });
  };

  // Android back: on another tab, go back to Play; on Play, let the game step
  // back through its own screens (run -> pause, end/wardrobe/photo -> hub).
  // Only on the Play hub does back leave the app. Pop-up sheets close
  // themselves first (their Modal onRequestClose). While a recording is in
  // progress, back is ignored so the clip isn't cut off.
  const playBackRef = useRef(null);
  const backState = useRef({});
  backState.current = { activeTab, busy: t.bark.phase !== 'idle' || t.importingClip };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const { activeTab: tab, busy } = backState.current;
      if (busy) return true;
      if (tab !== 'play') {
        setActiveTab('play');
        return true;
      }
      return Boolean(playBackRef.current?.());
    });
    return () => sub.remove();
  }, []);

  if (!data.loaded) return <View style={styles.blank} />;
  if (!pet)
    return (
      <I18nProvider language={data.settings.language}>
        <QuickStart
          onDone={({ species: sp }) => {
            const created = data.addPet({ species: sp || 'dog' });
            // Name, breed, home and first sound are asked when the translator is first opened.
            if (created?.id) data.updatePet(created.id, { detailsDone: false });
            data.updateSettings({ ageConfirmed: true });
            setActiveTab('play');
            setAutoStartRun(true);
            track('tutorial_complete');
          }}
        />
      </I18nProvider>
    );
  if (!data.settings.ageConfirmed)
    return (
      <I18nProvider language={data.settings.language}>
        <AgeCheck onConfirm={() => data.updateSettings({ ageConfirmed: true })} />
      </I18nProvider>
    );

  const listening = t.bark.phase !== 'idle' || t.importingClip;
  const hideTabBar = activeTab === 'play' && gameRunning;

  return (
    <I18nProvider language={data.settings.language}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.main}>
        {activeTab === 'scanner' && pet.detailsDone === false && (
          <Onboarding
            mode="details"
            initialSpecies={pet.species}
            initialName={pet.name === species.defaultName ? '' : pet.name}
            onDone={({ name, breedId = null, home = null, contextId = null }) => {
              data.updatePet(pet.id, {
                name,
                breedId,
                home,
                ...(contextId ? { contextId, contextSetAt: Date.now() } : {}),
                detailsDone: true
              });
              track('pet_details_complete');
            }}
          />
        )}
        {activeTab === 'scanner' && pet.detailsDone !== false &&
          (data.shareClips === null ? (
            <ConsentScreen petName={pet.name} onChoose={data.setShareClips} />
          ) : (
            <ScannerScreen
              pet={pet}
              pets={data.pets}
              species={species}
              breed={data.breed}
              onOpenPets={() => setPetsOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              cameraRef={cameraRef}
              cameraOn={cameraOn}
              onToggleCamera={toggleCamera}
              facing={facing}
              onFlip={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              torch={torch}
              onTorch={() => setTorch((v) => !v)}
              recorder={t.bark}
              onPawPress={t.onPawPress}
              showPawHint={!data.settings.seen.pawHint}
              onPawHintSeen={() => data.markSeen('pawHint')}
              currentResult={t.currentResult}
              onDismissResult={t.dismissResult}
              notice={t.notice}
              onReplay={t.speak}
              onShare={t.shareResult}
              onTeach={t.openTeach}
              onConfirmGuess={t.confirmGuess}
              onChangeContext={(id) => data.updatePet(pet.id, { contextId: id, contextSetAt: Date.now() })}
              onChangePersonality={(id) => data.updatePet(pet.id, { personality: id })}
              progress={t.progress}
              importingClip={t.importingClip}
              onOpenClipPicker={t.openClipPicker}
            />
          ))}
        {activeTab === 'speak' && <SpeakTab species={species} petName={pet.name} />}
        {activeTab === 'decoder' && <DecoderTab species={species} />}
        {activeTab === 'journal' && (
          <JournalTab
            history={data.history}
            pets={data.pets}
            pet={pet}
            species={species}
            progress={t.progress}
            onReplay={t.speak}
            onShare={t.shareResult}
            onTeach={t.openTeach}
            onClear={() => {
              data.clearHistory();
              t.dismissResult();
            }}
            onGoScan={() => setActiveTab('scanner')}
          />
        )}
        {activeTab === 'play' && (
          <PlayTab
            pet={pet}
            species={species}
            breed={data.breed}
            history={data.history}
            onTeach={t.teach}
            onUpdatePet={data.updatePet}
            shareClips={data.shareClips}
            settings={data.settings}
            onUpdateSettings={data.updateSettings}
            onRunningChange={setGameRunning}
            backRef={playBackRef}
            autoStart={autoStartRun}
            onAutoStarted={() => setAutoStartRun(false)}
            openedFromReminder={openedFromReminder}
            onReminderSourceConsumed={() => setOpenedFromReminder(false)}
          />
        )}
      </View>

      {!hideTabBar && (
        <TabBar active={activeTab} onChange={setActiveTab} disabled={listening} species={species} journalCount={data.history.length} />
      )}

      <PetsSheet
        visible={petsOpen}
        pets={data.pets}
        activePetId={pet.id}
        onSelect={(id) => {
          data.setActivePetId(id);
          setPetsOpen(false);
        }}
        onAdd={(fields) => data.addPet(fields)}
        onUpdate={data.updatePet}
        onRemove={data.removePet}
        onClose={() => setPetsOpen(false)}
      />

      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        data={data}
        onShowNotice={t.showNotice}
      />

      <LabelSheet
        visible={Boolean(t.labelEntry)}
        species={t.labelEntry ? getSpecies(t.labelEntry.species) : species}
        petName={t.labelEntry?.petName || pet.name}
        entry={t.labelEntry}
        onSubmit={(label) => {
          const entry = t.labelEntry;
          t.closeTeach();
          t.teach(entry, label);
        }}
        onClose={t.closeTeach}
      />

      <MicPrimer visible={t.micPrimer} petName={pet.name} species={species} onAllow={t.allowMic} onClose={t.dismissMicPrimer} />

      <ClipPickerSheet
        visible={t.clipPickerOpen}
        petName={pet.name}
        pendingClip={t.pendingClip}
        onSubmitClip={t.importClip}
        onClose={t.closeClipPicker}
        onShowNotice={t.showNotice}
      />

      <ShareSheet
        job={t.shareJob}
        onVideo={t.shareVideo}
        onPicture={(item) => {
          t.closeShare();
          t.sharePicture(item);
        }}
        onClose={t.closeShare}
      />
      {t.shareItem && <ShareCard ref={shareCardRef} item={t.shareItem} />}
    </SafeAreaView>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  main: { flex: 1 }
});
