export type DecisionStatus = "draft" | "planned" | "in_progress" | "completed" | "paused" | "discarded";

export type ReviewDecision = "continue" | "adjust" | "stop" | "simulate_again" | "undecided";

export type DecisionSignal = {
  id: string;
  kind: "continue" | "adjust" | "stop";
  description: string;
};

export type ExperimentAction = {
  id: string;
  title: string;
  done: boolean;
  evidence?: string;
};

export type JourneyDecision = {
  id: string;
  simulationId: string;
  goal: string;
  selectedPathId?: string;
  selectedPathName: string;
  status: DecisionStatus;
  learningQuestion: string;
  experiment: {
    title: string;
    purpose: string;
    durationDays: 7 | 30;
    weeklyTimeLimit?: number;
    budgetLimit?: number;
    actions: ExperimentAction[];
    signals: DecisionSignal[];
    startsAt?: string;
    reviewAt: string;
  };
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type JourneyReview = {
  id: string;
  decisionId: string;
  completedActions: string[];
  evidence: string[];
  energyAfter?: number;
  timeSpentHours?: number;
  moneySpent?: number;
  worked: string;
  difficult: string;
  learning: string;
  nextDecision: ReviewDecision;
  createdAt: string;
};

export type DecisionRouteOption = {
  id: string;
  name: string;
  intention: string;
  advantage: string;
  cost: string;
  reversibility: string;
  minimumCondition: string;
  reason: string;
};
