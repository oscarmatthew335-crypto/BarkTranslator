// Expo dynamic config: uses Google's official test AdMob App IDs unless
// EXPO_PUBLIC_ADMOB_ANDROID_APP_ID / EXPO_PUBLIC_ADMOB_IOS_APP_ID are set.
const appJson = require('./app.json');

const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

module.exports = () => {
  const base = appJson.expo;
  const androidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || TEST_ANDROID_APP_ID;
  const iosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || TEST_IOS_APP_ID;

  const plugins = (base.plugins || []).map((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry;
    if (name === 'react-native-google-mobile-ads') {
      const existing = Array.isArray(entry) && entry[1] ? entry[1] : {};
      return [
        'react-native-google-mobile-ads',
        {
          ...existing,
          androidAppId,
          iosAppId,
          delayAppMeasurementInit: true
        }
      ];
    }
    return entry;
  });

  return {
    ...base,
    plugins
  };
};
