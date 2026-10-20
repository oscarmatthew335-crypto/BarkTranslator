import React, { useRef, useState } from 'react';
import { StyleSheet, View, StatusBar, Linking } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { useFonts, Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';

import { C } from './src/theme';
import { installCrashReporting } from './src/crash';
import useAppData from './src/state/useAppData';
import useTranslate from './src/state/useTranslate';
import ErrorBoundary from './src/components/ErrorBoundary';
import Onboarding from './src/components/Onboarding';
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
  const [activeTab, setActiveTab] = useState('scanner');
  const [petsOpen, setPetsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cameraRef = useRef(null);
  const shareCardRef = useRef(null);

  const cameraOn = Boolean(camPerm?.granted && cameraWanted);
  const t = useTranslate({ data, cameraRef, cameraOn, shareCardRef, scannerOpen: activeTab === 'scanner' });
  const { pet, species } = data;

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

  if (!data.loaded) return <View style={styles.blank} />;
  if (!pet)
    return (
      <I18nProvider language={data.settings.language}>
        <Onboarding
          onDone={({ species: sp, name, breedId = null, home = null, contextId = null }) => {
            const created = data.addPet({ species: sp || 'dog', name, breedId, home });
            if (contextId && created?.id) {
              data.updatePet(created.id, { contextId, contextSetAt: Date.now() });
            }
            data.updateSettings({ ageConfirmed: true });
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
  if (data.shareClips === null)
    return (
      <I18nProvider language={data.settings.language}>
        <ConsentScreen petName={pet.name} onChoose={data.setShareClips} />
      </I18nProvider>
    );

  const listening = t.bark.phase !== 'idle' || t.importingClip;

  return (
    <I18nProvider language={data.settings.language}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.main}>
        {activeTab === 'scanner' && (
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
        )}
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
        {activeTab === 'play' && <PlayTab pet={pet} species={species} />}
      </View>

      <TabBar active={activeTab} onChange={setActiveTab} disabled={listening} species={species} journalCount={data.history.length} />

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
