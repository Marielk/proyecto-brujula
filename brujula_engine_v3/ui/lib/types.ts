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
  year: number;
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
  };
  lifeSummary: LifeSummary;
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
  lifeProfile: LifeProfile | Record<string, unknown>;
  warnings: string[];
  llm: {
    scenario: boolean;
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
