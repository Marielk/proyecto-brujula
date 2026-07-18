export type Dashboard = Record<string, number>;

export type SimState = {
  year: number;
  age: number;
  compass: number;
  dashboard: Dashboard;
  monthlyIncome: number;
  monthlyExpenses: number;
  debtTotal: number;
  savings: number;
  money: {
    monthlyIncome: string;
    monthlyExpenses: string;
    debtTotal: string;
    savings: string;
  };
};

export type LifeIndex = {
  label: string;
  icon: string;
  value: number;
  level: string;
  tone: "red" | "orange" | "yellow" | "green" | "blue";
  description: string;
  inverse: boolean;
};

export type TimelineItem = {
  year: number | string;
  icon: string;
  title: string;
  description: string;
};

export type GardenItem = {
  icon: string;
  label: string;
  value: number;
  filled: number;
  empty: number;
  description: string;
};

export type LifeSummary = {
  domain?: string;
  goalType?: string;
  domainMetrics?: Record<string, number>;
  domainRisks?: JourneyReason[];
  domainMilestones?: TimelineItem[];
  successConditions?: string[];
  candidatePaths?: CandidatePath[];
  selectedPath?: CandidatePath;
  discardedPaths?: CandidatePath[];
  discardedReasons?: string[];
  comparisonReasons?: string[];
  confidence?: "baja" | "media" | "alta" | string;
  confidenceScore?: number;
  exploredPaths?: number;
  clusteredPaths?: PathCluster[];
  assumptions?: string[];
  domainPolicy?: string;
  evaluationDetails?: EvaluationDetails;
  whatCouldChangeRecommendation?: string[];
  genericityGuard?: GenericityGuard;
  debug?: JourneyDebug;
  aiParticipation?: {
    goalInterpreter: boolean;
    pathGenerator: boolean;
  };
  diagnosticoCamino: string;
  calidadVida: number;
  libertadFinanciera: number;
  libertadCreativa: number;
  saludIntegral: number;
  energiaVital: number;
  serenidad: number;
  resiliencia: number;
  esperanza: number;
  riesgoAgotamiento: string;
  probabilidadArrepentimiento: string;
  coherenciaEstrellaNorte: string;
  fortalezas: string[];
  cuidados: string[];
  eventosCamino: TimelineItem[];
  valores: string[];
  suenos: string[];
  escenario: string;
  brujulaGeneral: number;
  preparacionCamino?: number;
  guiaViaje?: JourneyGuidance;
};

export type JourneyReason = {
  label: string;
  impact: string;
  value: number;
  inverse?: boolean;
};

export type JourneyGuidance = {
  goal?: GoalSpec;
  unsupportedWarning?: string | null;
  candidatePaths?: CandidatePath[];
  selectedPath?: CandidatePath;
  discardedPaths?: CandidatePath[];
  discardedReasons?: string[];
  comparisonReasons?: string[];
  confidence?: "baja" | "media" | "alta" | string;
  confidenceScore?: number;
  exploredPaths?: number;
  clusteredPaths?: PathCluster[];
  assumptions?: string[];
  domainPolicy?: string;
  evaluationDetails?: EvaluationDetails;
  whatCouldChangeRecommendation?: string[];
  genericityGuard?: GenericityGuard;
  debug?: JourneyDebug;
  conclusion: {
    tone: "promising" | "demanding" | "fragile";
    title: string;
    body: string;
  };
  preparation: number;
  preparationLabel: string;
  preparationExplanation: string;
  flowers: JourneyReason[];
  cares: JourneyReason[];
  domainMetrics?: Record<string, number>;
  domainRisks?: JourneyReason[];
  domainMilestones?: TimelineItem[];
  domainRituals?: string[];
  successConditions: string[];
  avoidList: string[];
  firstStep: {
    title: string;
    why: string;
  };
  focusQuestion: string;
};

export type GoalSpec = {
  domain: string;
  secondaryDomains?: string[];
  goalType: string;
  goalStatement?: string;
  targetOutcome?: string;
  horizonYear?: number | null;
  controllability?: "high" | "partial" | "low" | "exploratory" | string;
  controllabilityLabel?: string;
  uncertaintyType?: string;
  metrics: string[];
  requiredResources: string[];
  constraints: string[];
  nonNegotiables?: string[];
  successCriteria?: string[];
  assumptions?: string[];
  supported: boolean;
};

export type CandidatePath = {
  id: string;
  name: string;
  strategy: string;
  description: string;
  assumptions: string[];
  tradeoffs: string[];
  steps?: Array<string | PathStep>;
  requirements?: string[];
  advanceConditions?: string[];
  pauseConditions?: string[];
  successCriteria?: string[];
  decisions?: string[];
  expectedEffects?: string[];
  variant?: Record<string, string>;
  timeEstimate: string;
  timeEstimateMonths?: number;
  financialRisk: "bajo" | "medio" | "alto" | string;
  energyDemand: "baja" | "media" | "alta" | string;
  reversibility?: "alta" | "media" | "baja" | string;
  creativeUpside: "bajo" | "medio" | "alto" | string;
  domainBenefit?: {
    name?: string;
    metric?: string;
    level?: string;
  };
  preparation: number;
  compass: number;
  selectionScore: number;
  riskLevel: "bajo" | "medio" | "alto" | string;
  firstStep: string;
  domainPolicy?: string;
  evaluationDetails?: EvaluationDetails;
};

export type EvaluationDetails = {
  domainSpecific?: number;
  sustainability?: number;
  qualityOfLife?: number;
  serenity?: number;
  resilience?: number;
  hope?: number;
  regretProtection?: number;
  valueCoherence?: number;
};

export type PathStep = {
  id?: string;
  phase?: number;
  title: string;
  durationWeeks?: number;
  actions?: string[];
  completionCriteria?: string[];
  expectedEffects?: Record<string, number>;
};

export type GenericityGuard = {
  passed: boolean;
  domainKeywordHits: string[];
  genericPhrases: string[];
  blocksRegenerated: string[];
  selectedDecisionMentions: number;
};

export type JourneyDebug = {
  domain?: string;
  domainLabel?: string;
  controllability?: string;
  scenarioType?: string;
  primaryContext?: string[];
  secondaryContext?: string[];
  excludedContext?: string[];
  basePaths?: number;
  variants?: number;
  prunedPaths?: number;
  clusters?: number;
  scoringPolicy?: string;
  llm?: Record<string, boolean | string>;
  fallbackUsed?: string[];
  genericityGuard?: GenericityGuard;
  durationMs?: Record<string, number>;
};

export type PathCluster = {
  id: string;
  label: string;
  size: number;
  representative: CandidatePath;
  averageScore: number;
};

export type LifeProfile = {
  identity: {
    name?: string;
    age: number | "";
    country: string;
    city?: string;
    household: string;
    careResponsibilities: string[];
  };
  workTime: {
    mainStatus: string;
    area?: string;
    weeklyHours: string;
    perceivedDemand: number;
    healthyBoundaries: number;
    personalProjectTime: string;
  };
  lifeGarden: {
    physicalHealth: number;
    dailyEnergy: number;
    financialStability: number;
    relationships: number;
    creativity: number;
    purpose: number;
    freeTime: number;
    serenity: number;
  };
  health: {
    conditions: string[];
    painLevel?: number | "";
    averageEnergy: number;
    limitsProjects: string;
    difficultActivities: string[];
  };
  finances: {
    incomeMode: string;
    monthlyIncome?: number | "";
    expensesMode: string;
    monthlyExpenses?: number | "";
    debtLevel: string;
    debtAmount?: number | "";
    savingsLevel: string;
    incomeDependency: string;
    financialFeeling: number;
  };
  northStar: {
    tenYearDay: string;
    mainDream: string;
    dreams: string[];
    timeHorizon: string;
  };
  values: {
    selected: string[];
    topThree: string[];
    nonNegotiables?: string;
  };
  wellbeingPreferences: {
    recharges: string[];
    drains: string[];
    supportTone: string;
    ritualTypes: string[];
  };
};

export type LifeReport = {
  summary: {
    title: string;
    diagnosis: string;
    status: string;
    description: string;
    strongest: string;
    mainCare: string;
    preparation?: number;
  };
  lifeSummary: LifeSummary;
  journeyGuidance?: JourneyGuidance;
  indices: LifeIndex[];
  gains: string[];
  sacrifices: string[];
  timeline: TimelineItem[];
  garden: GardenItem[];
  rituals: string[];
  profile?: Record<string, unknown>;
};

export type SimulationResult = {
  scenario: {
    name: string;
    description: string;
    startYear: number;
    endYear: number;
  };
  states: SimState[];
  final: SimState;
  summary: {
    strongest: string;
    weakest: string;
    compass: number;
  };
  notes: string[];
  report: string;
  lifeReport: LifeReport;
  goal?: GoalSpec;
  candidatePaths?: CandidatePath[];
  selectedPath?: CandidatePath;
  exploredPaths?: number;
  clusteredPaths?: PathCluster[];
  lifeProfile: LifeProfile | Record<string, unknown>;
  warnings: string[];
  debug?: JourneyDebug;
  llm: {
    scenario: boolean;
    goal?: boolean;
    paths?: boolean;
    comparison?: boolean;
    report: boolean;
    model: string;
  };
};

export type GardenNeed = "energia" | "serenidad" | "salud" | "relaciones" | "creatividad";
export type GardenTime = "5m" | "15m" | "30m" | "60m";

export type DailyCheckIn = {
  mood: number;
  energy: number;
  pain: number;
  sleepQuality: number;
  availableTime: GardenTime;
  mainNeed: GardenNeed;
  note: string;
  createdAt: string;
};

export type GardenIndicator = {
  key: GardenNeed;
  label: string;
  icon: string;
  value: number;
  description: string;
};

export type Ritual = {
  id: string;
  title: string;
  duration: GardenTime;
  need: GardenNeed;
  icon: string;
  steps: string[];
};

export type RitualRecommendation = {
  ritual: Ritual;
  reason: string;
  expectedEffect: GardenNeed[];
  intensity: "suave" | "media";
};

export type RitualOutcome = {
  ritualId: string;
  completed: boolean;
  feelingAfter: number;
  note: string;
  createdAt: string;
};
