import type { DecisionSignal, DecisionStatus, ExperimentAction, JourneyDecision, JourneyReview, ReviewDecision } from "./contracts";

const decisionStatuses: DecisionStatus[] = ["draft", "planned", "in_progress", "completed", "paused", "discarded"];
const reviewDecisions: ReviewDecision[] = ["continue", "adjust", "stop", "simulate_again", "undecided"];
const signalKinds: DecisionSignal["kind"][] = ["continue", "adjust", "stop"];

export function isJourneyDecision(value: unknown): value is JourneyDecision {
  if (!isRecord(value) || !isRecord(value.experiment)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.simulationId === "string" &&
    typeof value.goal === "string" &&
    typeof value.selectedPathName === "string" &&
    decisionStatuses.includes(value.status as DecisionStatus) &&
    typeof value.learningQuestion === "string" &&
    typeof value.experiment.title === "string" &&
    typeof value.experiment.purpose === "string" &&
    (value.experiment.durationDays === 7 || value.experiment.durationDays === 30) &&
    Array.isArray(value.experiment.actions) &&
    value.experiment.actions.every(isExperimentAction) &&
    Array.isArray(value.experiment.signals) &&
    value.experiment.signals.every(isDecisionSignal) &&
    typeof value.experiment.reviewAt === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function isJourneyReview(value: unknown): value is JourneyReview {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.decisionId === "string" &&
    Array.isArray(value.completedActions) &&
    value.completedActions.every((item) => typeof item === "string") &&
    Array.isArray(value.evidence) &&
    value.evidence.every((item) => typeof item === "string") &&
    typeof value.worked === "string" &&
    typeof value.difficult === "string" &&
    typeof value.learning === "string" &&
    reviewDecisions.includes(value.nextDecision as ReviewDecision) &&
    typeof value.createdAt === "string"
  );
}

export function validateDecisionContract(value: unknown) {
  return isJourneyDecision(value) ? [] : ["La decision guardada no coincide con el contrato v0.15."];
}

export function validateReviewContract(value: unknown) {
  return isJourneyReview(value) ? [] : ["La revision guardada no coincide con el contrato v0.15."];
}

function isExperimentAction(value: unknown): value is ExperimentAction {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.done === "boolean";
}

function isDecisionSignal(value: unknown): value is DecisionSignal {
  return isRecord(value) && typeof value.id === "string" && signalKinds.includes(value.kind as DecisionSignal["kind"]) && typeof value.description === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
