import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'barktranslator:state:v1';
export const MAX_HISTORY = 100;

// Loads the saved dog profile, settings and journal. Returns null if
// nothing is saved yet or the data can't be read.
export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch (_) {
    return null;
  }
}

export async function saveState(state) {
  try {
    const trimmed = { ...state, history: (state.history || []).slice(0, MAX_HISTORY) };
    await AsyncStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch (_) {}
}
