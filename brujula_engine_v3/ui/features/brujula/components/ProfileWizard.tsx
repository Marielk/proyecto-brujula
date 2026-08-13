"use client";

import type { LifeProfile } from "../../../lib/types";
import { steps } from "../model";
import { MultiSelect, NumberField, ScaleField, SelectField, TextareaField, TextField } from "./SharedControls";
import { LegacyResults } from "./LegacyResults";

export function ProfileWizard({
  profile,
  step,
  validation,
  onUpdate,
  onStep,
  onSaveDraft,
  onFinish,
  canFinish
}: {
  profile: LifeProfile;
  step: number;
  validation: string[];
  onUpdate: (section: keyof LifeProfile, key: string, value: unknown) => void;
  onStep: (step: number) => void;
  onSaveDraft: () => void;
  onFinish: () => void;
  canFinish: boolean;
}) {
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const isLast = step === steps.length - 1;

  function next() {
    if (isLast) {
      onFinish();
      return;
    }
    onStep(Math.min(steps.length - 1, step + 1));
  }

  return (
    <section className="profileShell">
      <header className="profileIntro">
        <p className="eyebrow">Perfil de Vida v0.7</p>
        <h1>Conozcamos tu jardín</h1>
        <p>Estas preguntas ayudan a Brújula a simular caminos más parecidos a tu vida real.</p>
        <small>Puedes responder de forma aproximada. No necesitas tener todos los datos exactos.</small>
      </header>

      <div className="progressWrap" aria-label={`Progreso ${progress}%`}>
        <div style={{ width: `${progress}%` }} />
      </div>

      <section className="profilePanel">
        <div className="stepHeader">
          <span>{step + 1} de {steps.length}</span>
          <h2>{steps[step]}</h2>
        </div>

        <StepContent profile={profile} step={step} onUpdate={onUpdate} />

        {isLast && validation.length > 0 && (
          <div className="warning compactWarning">
            <strong>Antes de terminar</strong>
            <ul>
              {validation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="wizardActions">
          <button type="button" className="secondaryButton" onClick={() => onStep(Math.max(0, step - 1))} disabled={step === 0}>
            Volver
          </button>
          <button type="button" className="secondaryButton" onClick={onSaveDraft}>
            Guardar para después
          </button>
          <button type="button" onClick={next} disabled={isLast && !canFinish}>
            {isLast ? "Guardar perfil" : "Guardar y continuar"}
          </button>
        </div>
      </section>
    </section>
  );
}

export function StepContent({
  profile,
  step,
  onUpdate
}: {
  profile: LifeProfile;
  step: number;
  onUpdate: (section: keyof LifeProfile, key: string, value: unknown) => void;
}) {
  if (step === 0) {
    return (
      <div className="fieldGrid">
        <TextField label="Nombre o apodo" value={profile.identity.name || ""} onChange={(value) => onUpdate("identity", "name", value)} />
        <NumberField label="Edad" value={profile.identity.age} onChange={(value) => onUpdate("identity", "age", value)} required />
        <TextField label="País" value={profile.identity.country} onChange={(value) => onUpdate("identity", "country", value)} required />
        <TextField label="Ciudad o región" value={profile.identity.city || ""} onChange={(value) => onUpdate("identity", "city", value)} />
        <SelectField label="Situación de hogar" value={profile.identity.household} options={["Vivo sola/o", "Vivo con pareja", "Vivo con familia", "Vivo con hijos", "Vivo con amistades", "Otra"]} onChange={(value) => onUpdate("identity", "household", value)} />
        <MultiSelect label="Personas o seres importantes a cargo" values={profile.identity.careResponsibilities} options={["Hijos", "Mascotas", "Familiar adulto mayor", "Persona enferma o dependiente", "Ninguno", "Otro"]} onChange={(values) => onUpdate("identity", "careResponsibilities", values)} />
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="fieldGrid">
        <SelectField label="Situación laboral principal" value={profile.workTime.mainStatus} options={["Trabajo dependiente tiempo completo", "Trabajo dependiente medio tiempo", "Independiente / freelance", "Emprendimiento", "Estudiante", "Cesante", "Jubilada/o", "Otra"]} onChange={(value) => onUpdate("workTime", "mainStatus", value)} required />
        <TextField label="Área principal" value={profile.workTime.area || ""} onChange={(value) => onUpdate("workTime", "area", value)} />
        <SelectField label="Horas semanales de trabajo o estudio" value={profile.workTime.weeklyHours} options={["Menos de 20", "20 a 30", "31 a 40", "41 a 50", "Más de 50"]} onChange={(value) => onUpdate("workTime", "weeklyHours", value)} required />
        <ScaleField label="Nivel de exigencia percibida" value={profile.workTime.perceivedDemand} onChange={(value) => onUpdate("workTime", "perceivedDemand", value)} />
        <ScaleField label="Límites saludables con el trabajo" value={profile.workTime.healthyBoundaries} onChange={(value) => onUpdate("workTime", "healthyBoundaries", value)} />
        <SelectField label="Tiempo semanal para proyectos personales" value={profile.workTime.personalProjectTime} options={["Casi nada", "1 a 3 horas", "4 a 7 horas", "8 a 14 horas", "Más de 14 horas"]} onChange={(value) => onUpdate("workTime", "personalProjectTime", value)} />
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="fieldGrid compactScales">
        <ScaleField label="Salud física" value={profile.lifeGarden.physicalHealth} onChange={(value) => onUpdate("lifeGarden", "physicalHealth", value)} />
        <ScaleField label="Energía diaria" value={profile.lifeGarden.dailyEnergy} onChange={(value) => onUpdate("lifeGarden", "dailyEnergy", value)} />
        <ScaleField label="Estabilidad financiera" value={profile.lifeGarden.financialStability} onChange={(value) => onUpdate("lifeGarden", "financialStability", value)} />
        <ScaleField label="Relaciones y red de apoyo" value={profile.lifeGarden.relationships} onChange={(value) => onUpdate("lifeGarden", "relationships", value)} />
        <ScaleField label="Creatividad" value={profile.lifeGarden.creativity} onChange={(value) => onUpdate("lifeGarden", "creativity", value)} />
        <ScaleField label="Propósito o sentido" value={profile.lifeGarden.purpose} onChange={(value) => onUpdate("lifeGarden", "purpose", value)} />
        <ScaleField label="Tiempo libre" value={profile.lifeGarden.freeTime} onChange={(value) => onUpdate("lifeGarden", "freeTime", value)} />
        <ScaleField label="Calma o serenidad" value={profile.lifeGarden.serenity} onChange={(value) => onUpdate("lifeGarden", "serenity", value)} />
      </div>
    );
  }
  if (step === 3) {
    return (
      <div className="fieldGrid">
        <p className="softNote">Brújula no reemplaza atención profesional. Esta información solo ayuda a adaptar mejor las simulaciones.</p>
        <MultiSelect label="Condiciones de salud a considerar" values={profile.health.conditions} options={["Dolor crónico", "Lesión musculoesquelética", "Fatiga frecuente", "Salud mental", "Salud metabólica", "Dificultades de movilidad", "Problemas de sueño", "Dolor de manos, brazos o cuello", "Ninguna", "Otra"]} onChange={(values) => onUpdate("health", "conditions", values)} />
        <NumberField label="Dolor o molestia habitual (0-10)" value={profile.health.painLevel || ""} onChange={(value) => onUpdate("health", "painLevel", value)} min={0} max={10} />
        <ScaleField label="Energía promedio" value={profile.health.averageEnergy} onChange={(value) => onUpdate("health", "averageEnergy", value)} />
        <SelectField label="¿Tu salud limita actualmente tus proyectos?" value={profile.health.limitsProjects} options={["No", "Un poco", "Moderadamente", "Mucho"]} onChange={(value) => onUpdate("health", "limitsProjects", value)} />
        <MultiSelect label="Actividades físicas difíciles" values={profile.health.difficultActivities} options={["Estar sentada/o muchas horas", "Estar de pie muchas horas", "Levantar peso", "Caminar mucho", "Usar manos repetidamente", "Dormir bien", "Ninguna", "Otra"]} onChange={(values) => onUpdate("health", "difficultActivities", values)} />
      </div>
    );
  }
  if (step === 4) {
    return (
      <div className="fieldGrid">
        <SelectField label="Rango de ingreso mensual personal" value={profile.finances.incomeMode} options={["Sin ingresos", "Bajo", "Medio", "Alto", "Prefiero ingresar monto exacto", "Prefiero no responder"]} onChange={(value) => onUpdate("finances", "incomeMode", value)} />
        {profile.finances.incomeMode === "Prefiero ingresar monto exacto" && <NumberField label="Ingreso mensual exacto" value={profile.finances.monthlyIncome || ""} onChange={(value) => onUpdate("finances", "monthlyIncome", value)} />}
        <SelectField label="Gastos mensuales aproximados" value={profile.finances.expensesMode} options={["Menores que mis ingresos", "Similares a mis ingresos", "Mayores que mis ingresos", "No lo sé", "Prefiero ingresar monto exacto"]} onChange={(value) => onUpdate("finances", "expensesMode", value)} />
        {profile.finances.expensesMode === "Prefiero ingresar monto exacto" && <NumberField label="Gastos mensuales exactos" value={profile.finances.monthlyExpenses || ""} onChange={(value) => onUpdate("finances", "monthlyExpenses", value)} />}
        <SelectField label="Nivel de deuda" value={profile.finances.debtLevel} options={["Sin deuda", "Baja", "Media", "Alta", "Muy alta", "Prefiero ingresar monto exacto"]} onChange={(value) => onUpdate("finances", "debtLevel", value)} />
        {profile.finances.debtLevel === "Prefiero ingresar monto exacto" && <NumberField label="Monto total de deuda" value={profile.finances.debtAmount || ""} onChange={(value) => onUpdate("finances", "debtAmount", value)} />}
        <SelectField label="Ahorro actual" value={profile.finances.savingsLevel} options={["Ninguno", "Menos de 1 mes de gastos", "1 a 3 meses", "3 a 6 meses", "Más de 6 meses"]} onChange={(value) => onUpdate("finances", "savingsLevel", value)} />
        <SelectField label="Dependencia de ingresos" value={profile.finances.incomeDependency} options={["Dependo de una sola fuente", "Tengo más de una fuente", "Mi hogar tiene más de una fuente", "No tengo ingresos estables"]} onChange={(value) => onUpdate("finances", "incomeDependency", value)} />
        <ScaleField label="Sensación financiera" value={profile.finances.financialFeeling} onChange={(value) => onUpdate("finances", "financialFeeling", value)} />
      </div>
    );
  }
  if (step === 5) {
    return (
      <div className="fieldGrid">
        <TextareaField label="Dentro de 10 años todo salió bien. ¿Cómo sería un día normal de tu vida?" value={profile.northStar.tenYearDay} onChange={(value) => onUpdate("northStar", "tenYearDay", value)} />
        <TextareaField label="Mayor sueño actual" value={profile.northStar.mainDream} onChange={(value) => onUpdate("northStar", "mainDream", value)} />
        <MultiSelect label="Sueños importantes" values={profile.northStar.dreams} options={["Formar una familia", "Cambiar de carrera", "Emprender", "Vivir del arte", "Comprar una casa", "Viajar", "Mejorar salud", "Ayudar a otros", "Crear una obra o legado", "Vivir cerca de la naturaleza", "Otro"]} onChange={(values) => onUpdate("northStar", "dreams", values)} />
        <SelectField label="Horizonte de tiempo" value={profile.northStar.timeHorizon} options={["1 año", "3 años", "5 años", "10 años", "Toda la vida"]} onChange={(value) => onUpdate("northStar", "timeHorizon", value)} />
      </div>
    );
  }
  if (step === 6) {
    return (
      <div className="fieldGrid">
        <MultiSelect label="Selecciona hasta 5 valores importantes" values={profile.values.selected} options={["Creatividad", "Familia", "Relaciones saludables", "Autocuidado", "Empatía", "Libertad", "Seguridad", "Aprendizaje", "Espiritualidad", "Naturaleza", "Justicia", "Estabilidad", "Aventura", "Comunidad", "Otro"]} max={5} onChange={(values) => onUpdate("values", "selected", values)} />
        <MultiSelect label="Ordena tus 3 valores principales" values={profile.values.topThree} options={profile.values.selected.length ? profile.values.selected : ["Creatividad", "Autocuidado", "Empatía"]} max={3} onChange={(values) => onUpdate("values", "topThree", values)} />
        <TextareaField label="No negociables" value={profile.values.nonNegotiables || ""} onChange={(value) => onUpdate("values", "nonNegotiables", value)} />
      </div>
    );
  }
  return (
    <div className="fieldGrid">
      <MultiSelect label="Actividades que te recargan" values={profile.wellbeingPreferences.recharges} options={["Caminar", "Naturaleza", "Dormir", "Crear", "Leer", "Cocinar", "Conversar con alguien querido", "Música", "Meditación", "Ejercicio", "Animales", "Escribir", "Viajar", "Otra"]} onChange={(values) => onUpdate("wellbeingPreferences", "recharges", values)} />
      <MultiSelect label="Actividades que te drenan" values={profile.wellbeingPreferences.drains} options={["Redes sociales", "Compras impulsivas", "Trabajo excesivo", "Conflictos", "Desorden", "Falta de sueño", "Dolor físico", "Soledad", "Otra"]} onChange={(values) => onUpdate("wellbeingPreferences", "drains", values)} />
      <SelectField label="Tono de acompañamiento preferido" value={profile.wellbeingPreferences.supportTone} options={["Amiga cariñosa", "Compañera tranquila", "Maestra amable", "Guía práctica", "Mezcla equilibrada"]} onChange={(value) => onUpdate("wellbeingPreferences", "supportTone", value)} />
      <MultiSelect label="Tipos de rituales deseados" values={profile.wellbeingPreferences.ritualTypes} options={["Salud", "Creatividad", "Relaciones", "Finanzas", "Descanso", "Naturaleza", "Hogar", "Celebraciones", "Reflexión", "Otro"]} onChange={(values) => onUpdate("wellbeingPreferences", "ritualTypes", values)} />
    </div>
  );
}

