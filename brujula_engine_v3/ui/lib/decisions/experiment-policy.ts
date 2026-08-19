import type { JourneyDecision, JourneyReview } from "./contracts";

const actionVerbPattern = /^(crear|escribir|conversar|registrar|probar|invitar|revisar|definir|reservar|medir|contactar|preparar|hacer|leer|estudiar|reducir|observar|anotar|validar|comparar)\b/i;

export function validateDecision(decision: JourneyDecision) {
  const errors: string[] = [];
  if (![7, 30].includes(decision.experiment.durationDays)) errors.push("El experimento debe durar 7 o 30 dias.");
  if (!decision.learningQuestion.trim()) errors.push("Toda decision necesita una pregunta de aprendizaje.");
  if (!decision.experiment.title.trim()) errors.push("El experimento necesita un nombre.");
  if (!decision.experiment.purpose.trim()) errors.push("El experimento necesita un proposito.");
  if (!decision.experiment.reviewAt || Number.isNaN(Date.parse(decision.experiment.reviewAt))) errors.push("La fecha de revision es invalida.");
  if (decision.experiment.actions.length < 1) errors.push("El experimento necesita al menos una accion.");
  if (decision.experiment.actions.length > 5) errors.push("El experimento no debe tener mas de cinco acciones principales.");
  if (!decision.experiment.actions.some(isActionInNext48Hours)) errors.push("Debe existir una accion realizable durante las proximas 48 horas.");
  for (const action of decision.experiment.actions) {
    if (!action.title.trim()) errors.push("Cada accion necesita contenido observable.");
    if (!actionVerbPattern.test(action.title.trim())) errors.push(`La accion "${action.title}" debe comenzar con un verbo observable.`);
  }
  if (!decision.experiment.signals.some((signal) => signal.kind === "continue")) errors.push("Falta una senal para continuar.");
  if (!decision.experiment.signals.some((signal) => signal.kind === "adjust")) errors.push("Falta una senal para ajustar.");
  if (!decision.experiment.signals.some((signal) => signal.kind === "stop")) errors.push("Falta una senal para detenerse.");
  if (decision.experiment.weeklyTimeLimit !== undefined && decision.experiment.weeklyTimeLimit < 0) errors.push("El limite de tiempo no puede ser negativo.");
  if (decision.experiment.budgetLimit !== undefined && decision.experiment.budgetLimit < 0) errors.push("El presupuesto maximo no puede ser negativo.");
  return [...new Set(errors)];
}

export function validateReview(review: JourneyReview) {
  const errors: string[] = [];
  if (!review.decisionId.trim()) errors.push("La revision necesita una decision asociada.");
  if (!review.learning.trim()) errors.push("Registra que aprendiste antes de cerrar la revision.");
  if (review.energyAfter !== undefined && (review.energyAfter < 1 || review.energyAfter > 5)) errors.push("La energia debe estar entre 1 y 5.");
  if (review.timeSpentHours !== undefined && review.timeSpentHours < 0) errors.push("El tiempo usado no puede ser negativo.");
  if (review.moneySpent !== undefined && review.moneySpent < 0) errors.push("El gasto no puede ser negativo.");
  return errors;
}

function isActionInNext48Hours(action: { title: string }) {
  return /(hoy|manana|mañana|48 horas|primeros? dos dias|primeras 48)/i.test(action.title);
}
