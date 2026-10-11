// Rewarded ad stub. Once the game is wrapped in Capacitor, swap the body for
// @capacitor-community/admob's showRewardVideoAd() and resolve true only when
// the player earns the reward.
export const FAKE_AD_MS = 2500;

export function showRewardedAd() {
  return new Promise((resolve) => setTimeout(() => resolve(true), FAKE_AD_MS));
}
