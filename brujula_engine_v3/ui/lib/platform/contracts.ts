export type JourneyStage =
  | "understanding_goal"
  | "selecting_context"
  | "generating_strategies"
  | "expanding_paths"
  | "pruning_paths"
  | "comparing_paths"
  | "building_result"
  | "writing_letter"
  | "completed";

export type JourneyProgressEvent = {
  type: "progress";
  stage: JourneyStage;
  progress: number;
  message: string;
  metadata?: Record<string, unknown>;
};

export type JourneySimulationRequest = {
  simulationId: string;
  text: string;
  model: string;
  lifeProfile: unknown;
};

export type JourneyProviderResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export type JourneySimulationStatus = "loading" | "result" | "error" | "cancelled";

export type PublicSimulationJob = {
  id: string;
  status: JourneySimulationStatus;
  goal: string;
  stage: JourneyStage;
  progress: number;
  message: string;
  createdAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
};

export type AIProvider = {
  id: string;
  kind: "ollama" | "openai" | "local";
  runJourneySimulation(request: JourneySimulationRequest, onProgress?: (event: JourneyProgressEvent) => void): {
    child?: { kill(signal?: NodeJS.Signals | number): boolean };
    result: Promise<JourneyProviderResult>;
  };
};

export type StorageProvider = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
};

export type PlatformEvent = {
  name: "JourneyStarted" | "JourneyProgressed" | "JourneyCompleted" | "JourneyCancelled" | "JourneyFailed" | "ProfileChanged" | "GardenUpdated";
  createdAt: string;
  properties?: Record<string, string | number | boolean | null>;
};

export type EventBus = {
  publish(event: PlatformEvent): void;
  recent(): PlatformEvent[];
};

export type FeatureFlags = {
  journeyMode: boolean;
  gardenMode: boolean;
  bookMode: boolean;
  memoryEngine: boolean;
  lifeGraph: boolean;
  openAIProvider: boolean;
};
