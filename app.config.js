// Expo dynamic config: uses Google's official test AdMob App IDs unless
// EXPO_PUBLIC_ADMOB_ANDROID_APP_ID / EXPO_PUBLIC_ADMOB_IOS_APP_ID are set.
// Firebase Analytics is enabled only when google-services.json is present on disk
// (via EXPO_PUBLIC_GOOGLE_SERVICES_JSON or ./google-services.json), so dev and CI
// builds without it succeed cleanly.
const fs = require('fs');
const path = require('path');
const appJson = require('./app.json');

const TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

module.exports = () => {
  const base = appJson.expo;
  const androidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || TEST_ANDROID_APP_ID;
  const iosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || TEST_IOS_APP_ID;
  const googleServicesFile = process.env.EXPO_PUBLIC_GOOGLE_SERVICES_JSON || './google-services.json';
  const hasGoogleServices = fs.existsSync(path.resolve(__dirname, googleServicesFile));
  const metaAppId = String(process.env.EXPO_PUBLIC_META_APP_ID || '').trim();
  const metaClientToken = String(process.env.EXPO_PUBLIC_META_CLIENT_TOKEN || '').trim();

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

  if (hasGoogleServices) {
    if (!plugins.some((p) => (Array.isArray(p) ? p[0] : p) === '@react-native-firebase/app')) {
      plugins.push('@react-native-firebase/app');
    }
    if (!plugins.some((p) => (Array.isArray(p) ? p[0] : p) === '@react-native-firebase/analytics')) {
      plugins.push('@react-native-firebase/analytics');
    }
  }

  if (metaAppId && metaClientToken) {
    plugins.push([
      'react-native-fbsdk-next',
      {
        appID: metaAppId,
        clientToken: metaClientToken,
        displayName: 'Pawlingo',
        scheme: `fb${metaAppId}`,
        autoLogAppEventsEnabled: false,
        advertiserIDCollectionEnabled: false,
        isAutoInitEnabled: false
      }
    ]);
  }

  const android = hasGoogleServices
    ? { ...base.android, googleServicesFile }
    : { ...base.android };

  return {
    ...base,
    android,
    plugins
  };
};
