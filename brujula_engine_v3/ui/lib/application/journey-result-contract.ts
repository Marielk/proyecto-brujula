export function isSimulationResultContract(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isScenario(value.scenario) &&
    Array.isArray(value.states) &&
    isRecord(value.final) &&
    isSummary(value.summary) &&
    typeof value.report === "string" &&
    isRecord(value.lifeReport) &&
    isRecord(value.llm)
  );
}

export function simulationResultContractError(value: unknown) {
  if (isSimulationResultContract(value)) {
    return "";
  }
  if (!isRecord(value)) {
    return "Resultado de simulacion invalido: Python no devolvio un objeto.";
  }
  const missing = ["scenario", "states", "final", "summary", "report", "lifeReport", "llm"].filter((key) => !(key in value));
  return missing.length
    ? `Resultado de simulacion invalido: faltan campos ${missing.join(", ")}.`
    : "Resultado de simulacion invalido: el contrato Python-Next.js no coincide.";
}

function isScenario(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.startYear === "number" &&
    typeof value.endYear === "number"
  );
}

function isSummary(value: unknown) {
  return isRecord(value) && typeof value.strongest === "string" && typeof value.weakest === "string" && typeof value.compass === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
