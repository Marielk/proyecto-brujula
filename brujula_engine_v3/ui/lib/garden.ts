import type { DailyCheckIn, GardenIndicator, GardenNeed, LifeProfile, Ritual, RitualRecommendation } from "./types";

export const defaultCheckIn: DailyCheckIn = {
  mood: 62,
  energy: 48,
  pain: 28,
  sleepQuality: 66,
  availableTime: "15m",
  mainNeed: "serenidad",
  note: "",
  createdAt: new Date().toISOString()
};

const rituals: Ritual[] = [
  {
    id: "warm-drink",
    title: "Preparar una bebida caliente",
    duration: "15m",
    need: "serenidad",
    icon: "☕",
    steps: ["Prepara algo tibio sin apuro.", "Sosten la taza con ambas manos.", "Respira lento durante tres sorbos."]
  },
  {
    id: "slow-walk",
    title: "Caminar lento y mirar el cielo",
    duration: "15m",
    need: "salud",
    icon: "🌳",
    steps: ["Sal sin meta productiva.", "Camina a ritmo amable.", "Vuelve antes de cansarte."]
  },
  {
    id: "one-page",
    title: "Escribir una página libre",
    duration: "30m",
    need: "creatividad",
    icon: "📖",
    steps: ["Abre una página en blanco.", "Escribe sin corregir.", "Subraya una frase que quieras cuidar."]
  },
  {
    id: "kind-message",
    title: "Enviar un mensaje sencillo",
    duration: "5m",
    need: "relaciones",
    icon: "🏡",
    steps: ["Piensa en alguien seguro.", "Envía una línea honesta.", "No conviertas esto en obligación."]
  },
  {
    id: "early-rest",
    title: "Preparar descanso temprano",
    duration: "60m",
    need: "energia",
    icon: "💤",
    steps: ["Baja luces y pantallas.", "Deja listo lo mínimo para mañana.", "Acuéstate antes de negociar con el cansancio."]
  }
];

export function calculateGardenState(profile: LifeProfile, checkIn: DailyCheckIn): GardenIndicator[] {
  const garden = profile.lifeGarden;
  const healthLimit = profile.health.limitsProjects;
  const energy = average(checkIn.energy, checkIn.sleepQuality, scale(garden.dailyEnergy));
  const serenity = average(checkIn.mood, 100 - checkIn.pain, scale(garden.serenity));
  const health = average(100 - checkIn.pain, scale(garden.physicalHealth), checkIn.sleepQuality);
  const relationships = scale(garden.relationships);
  const creativity = average(scale(garden.creativity), energy, checkIn.mood);

  const healthPenalty = healthLimit === "Mucho" ? 12 : healthLimit === "Moderadamente" ? 6 : 0;

  return [
    indicator("energia", "Energía Vital", "🌿", energy, "Reserva disponible para moverte sin forzarte."),
    indicator("serenidad", "Serenidad", "🌸", serenity, "Calma interna para escuchar lo que pasa hoy."),
    indicator("salud", "Salud", "🌳", health - healthPenalty, "Cuerpo, descanso y límites posibles."),
    indicator("relaciones", "Relaciones", "🏡", relationships, "Red de apoyo y vínculos que sostienen."),
    indicator("creatividad", "Creatividad", "🎨", creativity, "Espacio emocional para imaginar y crear.")
  ];
}

export function recommendRitual(profile: LifeProfile, checkIn: DailyCheckIn): RitualRecommendation {
  const preferredNeeds = profile.wellbeingPreferences.ritualTypes.map(normalizeNeed).filter(Boolean) as GardenNeed[];
  const healthLimited = profile.health.limitsProjects === "Mucho" || checkIn.pain >= 65;
  const lowEnergy = checkIn.energy <= 35 || checkIn.sleepQuality <= 35;
  let need = checkIn.mainNeed;

  if (lowEnergy) {
    need = "energia";
  } else if (healthLimited) {
    need = "serenidad";
  } else if (preferredNeeds.includes(checkIn.mainNeed)) {
    need = checkIn.mainNeed;
  }

  const candidates = rituals.filter((ritual) => ritual.need === need);
  const fallback = candidates[0] || rituals[0];
  const ritual = fitDuration(fallback, checkIn);

  return {
    ritual,
    intensity: healthLimited || lowEnergy ? "suave" : "media",
    expectedEffect: [ritual.need, checkIn.mainNeed].filter((item, index, list) => list.indexOf(item) === index),
    reason: buildReason(profile, checkIn, ritual)
  };
}

export function gardenMoodLine(indicators: GardenIndicator[]) {
  const lowest = [...indicators].sort((a, b) => a.value - b.value)[0];
  if (!lowest) return "Tu jardín está listo para una pausa amable.";
  return `Hoy tu jardín pide cuidar ${lowest.label.toLowerCase()} sin convertirlo en tarea pesada.`;
}

function fitDuration(ritual: Ritual, checkIn: DailyCheckIn): Ritual {
  if (checkIn.availableTime === "5m" && ritual.duration !== "5m") {
    return rituals.find((item) => item.duration === "5m") || ritual;
  }
  if (checkIn.availableTime === "15m" && ritual.duration === "60m") {
    return rituals.find((item) => item.need === ritual.need && item.duration !== "60m") || rituals[0];
  }
  return ritual;
}

function buildReason(profile: LifeProfile, checkIn: DailyCheckIn, ritual: Ritual) {
  const name = profile.identity.name ? `${profile.identity.name}, ` : "";
  if (checkIn.energy <= 35) {
    return `${name}tu energía está baja; este ritual baja la exigencia y protege el ritmo.`;
  }
  if (checkIn.pain >= 65) {
    return `${name}tu cuerpo aparece como prioridad; este cuidado evita sumar carga física.`;
  }
  if (ritual.need === "creatividad") {
    return `${name}hay espacio para volver a crear en pequeño, sin pedirle una obra completa al día.`;
  }
  return `${name}este ritual conversa con tu necesidad de ${needLabel(checkIn.mainNeed).toLowerCase()} y con el tiempo real que tienes.`;
}

function normalizeNeed(value: string): GardenNeed | null {
  const normalized = value.toLowerCase();
  if (normalized.includes("salud")) return "salud";
  if (normalized.includes("creativ")) return "creatividad";
  if (normalized.includes("relacion")) return "relaciones";
  if (normalized.includes("descanso") || normalized.includes("energ")) return "energia";
  if (normalized.includes("naturaleza") || normalized.includes("reflex")) return "serenidad";
  return null;
}

function needLabel(need: GardenNeed) {
  return {
    energia: "Energía",
    serenidad: "Serenidad",
    salud: "Salud",
    relaciones: "Relaciones",
    creatividad: "Creatividad"
  }[need];
}

function indicator(key: GardenNeed, label: string, icon: string, value: number, description: string): GardenIndicator {
  return { key, label, icon, value: clamp(value), description };
}

function scale(value: number) {
  return { 1: 24, 2: 42, 3: 60, 4: 78, 5: 92 }[value] || 60;
}

function average(...values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
