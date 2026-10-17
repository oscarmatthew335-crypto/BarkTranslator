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
import ShareCard from './src/components/ShareCard';
import ShareSheet from './src/components/ShareSheet';
import TabBar from './src/components/TabBar';
import { getSpecies } from './src/species';

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
  const t = useTranslate({ data, cameraRef, cameraOn, shareCardRef });
  const { pet, species } = data;

  const toggleCamera = async () => {
    if (camPerm?.granted) {
      setCameraWanted((v) => !v);
      return;
    }
    const res = await requestCamPerm();
    if (res?.granted) setCameraWanted(true);
    else if (res && !res.canAskAgain)
      t.showNotice(`The camera is switched off. You can still translate without it.`, {
        label: 'Open Settings',
        onPress: () => Linking.openSettings()
      });
  };

  if (!data.loaded) return <View style={styles.blank} />;
  if (!pet)
    return (
      <Onboarding
        onDone={({ species: sp, name }) => {
          data.addPet({ species: sp, name });
          data.updateSettings({ ageConfirmed: true });
        }}
      />
    );
  if (!data.settings.ageConfirmed) return <AgeCheck onConfirm={() => data.updateSettings({ ageConfirmed: true })} />;
  if (data.shareClips === null) return <ConsentScreen petName={pet.name} onChoose={data.setShareClips} />;

  const listening = t.bark.phase !== 'idle';

  return (
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
            onChangeContext={(id) => data.updatePet(pet.id, { contextId: id })}
            onChangePersonality={(id) => data.updatePet(pet.id, { personality: id })}
            progress={t.progress}
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
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  main: { flex: 1 }
});
