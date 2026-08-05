import type { FeatureFlags } from "./contracts";

export const featureFlags: FeatureFlags = {
  journeyMode: true,
  gardenMode: true,
  bookMode: false,
  memoryEngine: false,
  lifeGraph: false,
  openAIProvider: false
};

export function isFeatureEnabled(flag: keyof FeatureFlags) {
  return featureFlags[flag];
}
