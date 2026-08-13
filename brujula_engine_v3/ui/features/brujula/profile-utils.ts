import type { LifeProfile } from "../../lib/types";
import { emptyProfile } from "./model";

export function validateProfile(profile: LifeProfile) {
  const errors = [];
  if (!profile.identity.age) errors.push("La edad es obligatoria.");
  if (!profile.workTime.mainStatus) errors.push("La situación laboral es obligatoria.");
  if (!profile.workTime.weeklyHours) errors.push("Las horas semanales son obligatorias.");
  if (!profile.lifeGarden.physicalHealth) errors.push("La salud física general es obligatoria.");
  if (!profile.lifeGarden.financialStability) errors.push("La estabilidad financiera general es obligatoria.");
  if (!profile.northStar.mainDream.trim() && !profile.northStar.tenYearDay.trim()) errors.push("Agrega tu mayor sueño o tu día ideal a 10 años.");
  if (profile.values.selected.length < 1) errors.push("Selecciona al menos un valor.");
  return errors;
}

export function mergeProfile(profile: LifeProfile): LifeProfile {
  return {
    ...emptyProfile,
    ...profile,
    identity: { ...emptyProfile.identity, ...profile.identity },
    workTime: { ...emptyProfile.workTime, ...profile.workTime },
    lifeGarden: { ...emptyProfile.lifeGarden, ...profile.lifeGarden },
    health: { ...emptyProfile.health, ...profile.health },
    finances: { ...emptyProfile.finances, ...profile.finances },
    northStar: { ...emptyProfile.northStar, ...profile.northStar },
    values: { ...emptyProfile.values, ...profile.values },
    wellbeingPreferences: { ...emptyProfile.wellbeingPreferences, ...profile.wellbeingPreferences }
  };
}

export function scaleLabel(value: number) {
  return ["Muy difícil", "Frágil", "En construcción", "Sólido", "Fortaleza"][value - 1] || "En construcción";
}
