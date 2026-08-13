import type { CandidatePath, JourneyGuidance, SimulationResult } from "../../../lib/types";

export function fallbackJourneyGuidance(result: SimulationResult): JourneyGuidance {
  const preparation = Math.round(result.lifeReport.summary.preparation || result.final.compass);
  const tone = preparation >= 72 ? "promising" : preparation >= 54 ? "demanding" : "fragile";
  return {
    conclusion: {
      tone,
      title: result.lifeReport.summary.title,
      body: result.lifeReport.summary.description
    },
    preparation,
    preparationLabel: result.lifeReport.summary.status,
    preparationExplanation: "La preparación del camino muestra cuánto soporte existe hoy para sostener este sueño. No es una predicción absoluta.",
    flowers: result.lifeReport.gains.slice(0, 3).map((item, index) => ({ label: `Flor ${index + 1}`, impact: item, value: preparation })),
    cares: result.lifeReport.sacrifices.slice(0, 3).map((item, index) => ({ label: `Cuidado ${index + 1}`, impact: item, value: 100 - preparation })),
    successConditions: result.lifeReport.rituals.slice(0, 3),
    avoidList: ["Tomar una decisión irreversible sin revisar tus datos reales.", "Convertir el sueño en una carrera contra el tiempo."],
    firstStep: {
      title: result.lifeReport.rituals[0] || "Elegir una prueba pequeña y revisarla en 30 días.",
      why: "Un paso pequeño convierte el sueño en evidencia sin exigir una apuesta total."
    },
    focusQuestion: "¿Qué tendría que cambiar para que este sueño sea posible?"
  };
}


export function effortFromResult(result: SimulationResult) {
  const burnout = result.lifeReport.lifeSummary.riesgoAgotamiento;
  if (burnout === "Alto") return "Alto";
  if (result.final.compass >= 78) return "Medio";
  return "Muy alto";
}

export function domainLabel(domain: string) {
  return {
    salud: "Salud",
    vivienda: "Vivienda",
    familia: "Familia",
    emprendimiento: "Emprendimiento / cambio de carrera",
    educacion: "Educación",
    creatividad: "Creatividad",
    general: "Modelo general"
  }[domain] || domain;
}

export function strategyLabel(strategy: string) {
  return {
    paralela: "Paralela",
    gradual: "Gradual",
    intensiva: "Intensiva",
    alianza: "En alianza",
    financiada: "Financiada",
    pausada: "Pausada"
  }[strategy] || strategy;
}

export function riskLabel(value: string) {
  return value === "alto" ? "Alto" : value === "bajo" ? "Bajo" : "Medio";
}

export function energyLabel(value: string) {
  return value === "alta" ? "Alta" : value === "baja" ? "Baja" : "Media";
}

export function uniqueCandidatePaths(paths: Array<CandidatePath | undefined | null>) {
  const seen = new Set<string>();
  return paths.filter((path): path is CandidatePath => {
    if (!path || seen.has(path.id)) {
      return false;
    }
    seen.add(path.id);
    return true;
  });
}

export function starRating(score: number) {
  const filled = Math.max(1, Math.min(5, Math.round(score / 20)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export function pathPros(path: CandidatePath) {
  const details = path.evaluationDetails || {};
  const items: string[] = [];
  if ((details.sustainability || 0) >= 65) items.push("mejor sostenibilidad");
  if ((details.qualityOfLife || 0) >= 65) items.push("mayor bienestar cotidiano");
  if ((details.serenity || 0) >= 65) items.push("menor tensión emocional");
  if ((details.resilience || 0) >= 65) items.push("más margen si algo cambia");
  if ((details.valueCoherence || 0) >= 65) items.push("más coherencia con tus valores");
  if (path.financialRisk === "bajo") items.push("menos riesgo financiero");
  if (path.energyDemand === "baja") items.push("menor agotamiento");
  if (path.reversibility === "alta") items.push("más fácil de ajustar");
  if (path.domainBenefit?.name) items.push(path.domainBenefit.name.toLowerCase());
  if (items.length === 0) items.push(strategyLabel(path.strategy).toLowerCase(), "primer paso más verificable");
  return [...new Set(items)].slice(0, 3);
}

export function pathCons(path: CandidatePath) {
  const details = path.evaluationDetails || {};
  const items: string[] = [];
  if (path.financialRisk === "alto") items.push("alto riesgo financiero");
  if (path.energyDemand === "alta") items.push("puede exigir demasiada energía");
  if ((details.sustainability || 100) < 55) items.push("sostenibilidad frágil");
  if ((details.serenity || 100) < 55) items.push("más estrés durante el proceso");
  if ((details.regretProtection || 100) < 55) items.push("menos protección ante arrepentimiento");
  if (path.preparation < 60) items.push("necesita más preparación previa");
  if (path.tradeoffs?.[0]) items.push(path.tradeoffs[0].toLowerCase());
  if (items.length === 0) items.push("requiere validar mejor sus supuestos");
  return [...new Set(items)].slice(0, 3);
}

export function whatWouldImprovePath(path: CandidatePath) {
  if (path.financialRisk === "alto") {
    return "Podria subir en el ranking si aparece mas ahorro, una fuente de ingresos adicional o menor deuda antes de avanzar.";
  }
  if (path.energyDemand === "alta") {
    return "Podria volverse mejor si tu energia diaria mejora o si la ruta se divide en etapas mas suaves.";
  }
  if (path.preparation < 60) {
    return "Necesitaria mas preparacion concreta: red de apoyo, informacion del dominio y una primera prueba con evidencia.";
  }
  return "Podria ganar fuerza si sus supuestos se vuelven mas verificables durante un experimento corto.";
}

export function evaluationLabels(path: CandidatePath): Record<string, string> {
  const details = path.evaluationDetails || {};
  return Object.fromEntries(
    [
      ["domainSpecific", "Destino"],
      ["sustainability", "Sostenibilidad"],
      ["qualityOfLife", "Calidad de vida"],
      ["serenity", "Serenidad"],
      ["resilience", "Resiliencia"],
      ["hope", "Esperanza"],
      ["valueCoherence", "Valores"]
    ].filter(([key]) => typeof details[key as keyof typeof details] === "number")
  );
}

