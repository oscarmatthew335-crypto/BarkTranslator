// Node test stub for react-native-google-mobile-ads
export const TestIds = {
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712'
};

export const MaxAdContentRating = {
  G: 'G',
  PG: 'PG',
  T: 'T',
  MA: 'MA'
};

export const AdEventType = {
  LOADED: 'loaded',
  ERROR: 'error',
  OPENED: 'opened',
  CLOSED: 'closed',
  CLICKED: 'clicked'
};

export const RewardedAdEventType = {
  LOADED: 'rewarded_loaded',
  EARNED_REWARD: 'rewarded_earned_reward'
};

export const AdsConsentStatus = {
  UNKNOWN: 'UNKNOWN',
  REQUIRED: 'REQUIRED',
  NOT_REQUIRED: 'NOT_REQUIRED',
  OBTAINED: 'OBTAINED'
};

export const AdsConsent = {
  gatherConsent: async () => ({
    canRequestAds: true,
    status: 'OBTAINED',
    isConsentFormAvailable: false,
    privacyOptionsRequirementStatus: 'NOT_REQUIRED'
  }),
  getConsentInfo: async () => ({
    canRequestAds: true,
    status: 'OBTAINED',
    isConsentFormAvailable: false,
    privacyOptionsRequirementStatus: 'NOT_REQUIRED'
  }),
  showPrivacyOptionsForm: async () => {}
};

function createFakeAd() {
  const handlers = new Map();
  return {
    addAdEventListener(event, cb) {
      handlers.set(event, cb);
      return () => handlers.delete(event);
    },
    load() {
      const onLoaded = handlers.get(RewardedAdEventType.LOADED) || handlers.get(AdEventType.LOADED);
      if (onLoaded) onLoaded();
    },
    async show() {
      const onEarned = handlers.get(RewardedAdEventType.EARNED_REWARD);
      if (onEarned) onEarned({ type: 'life', amount: 1 });
      const onClosed = handlers.get(AdEventType.CLOSED);
      if (onClosed) onClosed();
    }
  };
}

export const RewardedAd = {
  createForAdRequest: () => createFakeAd()
};

export const InterstitialAd = {
  createForAdRequest: () => createFakeAd()
};

export default function mobileAds() {
  return {
    setRequestConfiguration: async () => {},
    initialize: async () => ({})
  };
}
