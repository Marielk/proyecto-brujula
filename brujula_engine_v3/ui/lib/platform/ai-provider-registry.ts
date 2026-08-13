import type { AIProvider } from "./contracts";
import { ollamaPythonProvider } from "./simulation-service";

let journeyProvider: AIProvider = ollamaPythonProvider;

export function getJourneyProvider() {
  return journeyProvider;
}

export function setJourneyProvider(provider: AIProvider) {
  journeyProvider = provider;
}

export function resetJourneyProvider() {
  journeyProvider = ollamaPythonProvider;
}
