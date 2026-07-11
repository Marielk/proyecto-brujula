"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GardenItem, LifeIndex, LifeProfile, SimulationResult } from "../lib/types";

const STORAGE_KEY = "brujula.lifeProfile.v0.7";
const EXAMPLE =
  "Quiero simular dedicarme gradualmente a Brújula desde 2028, bajando horas del trabajo actual, haciendo freelance para sostener ingresos y cuidando mi salud física.";

const emptyProfile: LifeProfile = {
  identity: {
    name: "",
    age: "",
    country: "Chile",
    city: "",
    household: "Vivo sola/o",
    careResponsibilities: ["Ninguno"]
  },
  workTime: {
    mainStatus: "",
    area: "",
    weeklyHours: "",
    perceivedDemand: 3,
    healthyBoundaries: 3,
    personalProjectTime: "1 a 3 horas"
  },
  lifeGarden: {
    physicalHealth: 3,
    dailyEnergy: 3,
    financialStability: 3,
    relationships: 3,
    creativity: 3,
    purpose: 3,
    freeTime: 3,
    serenity: 3
  },
  health: {
    conditions: ["Ninguna"],
    painLevel: "",
    averageEnergy: 3,
    limitsProjects: "Un poco",
    difficultActivities: ["Ninguna"]
  },
  finances: {
    incomeMode: "Prefiero no responder",
    monthlyIncome: "",
    expensesMode: "No lo sé",
    monthlyExpenses: "",
    debtLevel: "Media",
    debtAmount: "",
    savingsLevel: "Ninguno",
    incomeDependency: "Dependo de una sola fuente",
    financialFeeling: 3
  },
  northStar: {
    tenYearDay: "",
    mainDream: "",
    dreams: [],
    timeHorizon: "10 años"
  },
  values: {
    selected: [],
    topThree: [],
    nonNegotiables: ""
  },
  wellbeingPreferences: {
    recharges: [],
    drains: [],
    supportTone: "Mezcla equilibrada",
    ritualTypes: []
  }
};

const steps = [
  "Quién eres hoy",
  "Trabajo y tiempo",
  "Tu jardín hoy",
  "Salud y limitaciones",
  "Finanzas y seguridad",
  "Estrella del Norte",
  "Valores",
  "Lo que te hace bien"
];

export default function Home() {
  const [profile, setProfile] = useState<LifeProfile>(emptyProfile);
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [step, setStep] = useState(0);
  const [text, setText] = useState(EXAMPLE);
  const [model, setModel] = useState("llama3.2:1b");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }
    try {
      const parsed = JSON.parse(saved) as LifeProfile;
      setProfile(mergeProfile(parsed));
      setHasProfile(true);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const validation = useMemo(() => validateProfile(profile), [profile]);
  const canFinish = validation.length === 0;

  function saveProfile(nextProfile = profile) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    setHasProfile(true);
    setIsEditingProfile(false);
    setProfileMessage("Perfil guardado en este navegador.");
  }

  function deleteProfile() {
    window.localStorage.removeItem(STORAGE_KEY);
    setProfile(emptyProfile);
    setHasProfile(false);
    setIsEditingProfile(true);
    setStep(0);
    setResult(null);
  }

  function update(section: keyof LifeProfile, key: string, value: unknown) {
    setProfile((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value
      }
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model, lifeProfile: profile })
      });
      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.error || "No se pudo simular el escenario.");
      }
      setResult(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setIsLoading(false);
    }
  }

  const showProfileForm = isEditingProfile || !hasProfile;

  return (
    <main className="shell">
      {showProfileForm ? (
        <ProfileWizard
          profile={profile}
          step={step}
          validation={validation}
          onUpdate={update}
          onStep={setStep}
          onSaveDraft={() => saveProfile(profile)}
          onFinish={() => saveProfile(profile)}
          canFinish={canFinish}
        />
      ) : (
        <section className="workspace">
          <aside className="controlPanel">
            <div>
              <p className="eyebrow">Proyecto Brújula v0.7</p>
              <h1>Informe de Vida</h1>
            </div>

            <ProfileSummary profile={profile} message={profileMessage} onEdit={() => setIsEditingProfile(true)} onDelete={deleteProfile} />

            <form onSubmit={submit} className="form scenarioForm">
              <label htmlFor="scenario">Escenario</label>
              <textarea
                id="scenario"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Describe el camino que quieres explorar..."
                rows={9}
              />

              <label htmlFor="model">Modelo Ollama</label>
              <input id="model" value={model} onChange={(event) => setModel(event.target.value)} />

              <button type="submit" disabled={isLoading || !text.trim()}>
                {isLoading ? "Simulando..." : "Ejecutar simulación"}
              </button>
            </form>

            {error && <div className="error">{error}</div>}
          </aside>

          <Results result={result} isLoading={isLoading} />
        </section>
      )}
    </main>
  );
}

function ProfileWizard({
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

function StepContent({
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

function Results({ result, isLoading }: { result: SimulationResult | null; isLoading: boolean }) {
  return (
    <section className="results">
      {!result && !isLoading && (
        <div className="emptyState">
          <h2>¿Qué vida estás construyendo si sigues este camino?</h2>
          <p>Tu Perfil de Vida ya está guardado. Escribe un escenario y Brújula lo leerá desde tu contexto real.</p>
        </div>
      )}

      {isLoading && (
        <div className="emptyState">
          <h2>Preparando tu informe...</h2>
          <p>El motor cruza tu escenario con tu Perfil de Vida y Sue prepara una lectura amable del camino.</p>
        </div>
      )}

      {result && (
        <>
          <section className="cover">
            <p className="eyebrow">Tu Brújula</p>
            <h2>{result.lifeReport.summary.title}</h2>
            <p>{result.lifeReport.summary.description}</p>
          </section>

          {result.warnings.length > 0 && (
            <div className="warning">
              <strong>Ajustes del perfil y modo resiliente</strong>
              <ul>
                {result.warnings.slice(0, 5).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="statusRow">
            <span className={result.llm.scenario ? "okPill" : "fallbackPill"}>
              Escenario: {result.llm.scenario ? "Ollama" : "Fallback local"}
            </span>
            <span className={result.llm.report ? "okPill" : "fallbackPill"}>
              Carta de Sue: {result.llm.report ? "Ollama" : "Determinista"}
            </span>
          </div>

          <section>
            <SectionTitle eyebrow="Índices de Vida" title="Lo que sostiene la historia" />
            <div className="indexGrid">
              {result.lifeReport.indices.map((index) => (
                <IndexCard key={index.label} index={index} />
              ))}
            </div>
          </section>

          <section className="gainSacrifice">
            <div>
              <SectionTitle eyebrow="Lo que este camino gana" title="Flores que aparecen" />
              <ul>
                {result.lifeReport.gains.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <SectionTitle eyebrow="Lo que este camino sacrifica" title="Cuidados del jardín" />
              <ul>
                {result.lifeReport.sacrifices.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="timelineSection">
            <SectionTitle eyebrow="Historia del Camino" title="Hitos que sí cambian algo" />
            <ol className="timeline">
              {result.lifeReport.timeline.map((item) => (
                <li key={`${item.year}-${item.title}`}>
                  <strong>{item.year}</strong>
                  <div className="timelineIcon">{item.icon}</div>
                  <div>
                    <span>{item.title}</span>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <SectionTitle eyebrow="Evolución de tu Jardín" title="Una primera imagen del camino" />
            <div className="gardenGrid">
              {result.lifeReport.garden.map((item) => (
                <GardenBar key={item.label} item={item} />
              ))}
            </div>
          </section>

          <article className="sueLetter">
            <h3>Carta de Sue</h3>
            <div>{result.report}</div>
          </article>

          <section className="rituals">
            <SectionTitle eyebrow="Pequeños rituales sugeridos" title="Para corregir el rumbo sin culpa" />
            <ul>
              {result.lifeReport.rituals.map((ritual) => (
                <li key={ritual}>{ritual}</li>
              ))}
            </ul>
          </section>

          <details className="advancedTable">
            <summary>Ver tabla anual avanzada</summary>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Año</th>
                    <th>Brújula</th>
                    <th>Est. fin.</th>
                    <th>Crear</th>
                    <th>Energía</th>
                    <th>Ahorro</th>
                  </tr>
                </thead>
                <tbody>
                  {result.states.map((state) => (
                    <tr key={state.year}>
                      <td>{state.year}</td>
                      <td>{state.compass.toFixed(1)}%</td>
                      <td>{state.dashboard["Estabilidad financiera"].toFixed(1)}%</td>
                      <td>{state.dashboard["Libertad para crear"].toFixed(1)}%</td>
                      <td>{state.dashboard["Energía diaria"].toFixed(1)}%</td>
                      <td>{state.money.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function ProfileSummary({ profile, message, onEdit, onDelete }: { profile: LifeProfile; message: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <section className="profileSummary">
      <div>
        <p className="eyebrow">Perfil de Vida</p>
        <h2>{profile.identity.name || "Tu jardín"}</h2>
        <p>{profile.identity.age ? `${profile.identity.age} años` : "Edad pendiente"} · {profile.identity.country || "País pendiente"}</p>
      </div>
      <dl>
        <div><dt>Trabajo</dt><dd>{profile.workTime.mainStatus || "Pendiente"}</dd></div>
        <div><dt>Sueño</dt><dd>{profile.northStar.mainDream || profile.northStar.tenYearDay || "Pendiente"}</dd></div>
        <div><dt>Valores</dt><dd>{profile.values.selected.slice(0, 3).join(", ") || "Pendientes"}</dd></div>
      </dl>
      {message && <small>{message}</small>}
      <div className="summaryActions">
        <button type="button" className="secondaryButton" onClick={onEdit}>Editar perfil</button>
        <button type="button" className="dangerButton" onClick={onDelete}>Borrar perfil</button>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="sectionTitle">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
    </div>
  );
}

function IndexCard({ index }: { index: LifeIndex }) {
  return (
    <article className={`indexCard tone-${index.tone}`}>
      <div>
        <span>{index.icon} {index.label}</span>
        <strong>{index.inverse ? index.level : `${index.value.toFixed(0)}%`}</strong>
      </div>
      <p>Nivel: {index.level}</p>
      <small>{index.description}</small>
    </article>
  );
}

function GardenBar({ item }: { item: GardenItem }) {
  return (
    <article className="gardenItem">
      <div className="gardenHead">
        <strong>{item.icon} {item.label}</strong>
        <span>{item.value.toFixed(0)}%</span>
      </div>
      <div className="gardenBlocks" aria-hidden="true">
        {Array.from({ length: item.filled }).map((_, index) => (
          <span className="filled" key={`filled-${index}`} />
        ))}
        {Array.from({ length: item.empty }).map((_, index) => (
          <span key={`empty-${index}`} />
        ))}
      </div>
      <p>{item.description}</p>
    </article>
  );
}

function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="fieldLabel">
      <span>{label}{required ? " *" : ""}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="fieldLabel fullField">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
    </label>
  );
}

function NumberField({ label, value, onChange, required, min = 0, max }: { label: string; value: number | ""; onChange: (value: number | "") => void; required?: boolean; min?: number; max?: number }) {
  return (
    <label className="fieldLabel">
      <span>{label}{required ? " *" : ""}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange, required }: { label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="fieldLabel">
      <span>{label}{required ? " *" : ""}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecciona...</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ScaleField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="fieldLabel scaleField">
      <span>{label}</span>
      <input type="range" min={1} max={5} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <small>{scaleLabel(value)}</small>
    </label>
  );
}

function MultiSelect({ label, values, options, onChange, max }: { label: string; values: string[]; options: string[]; onChange: (values: string[]) => void; max?: number }) {
  function toggle(option: string) {
    if (values.includes(option)) {
      onChange(values.filter((item) => item !== option));
      return;
    }
    if (max && values.length >= max) {
      return;
    }
    const cleaned = option === "Ninguno" || option === "Ninguna" ? [] : values.filter((item) => item !== "Ninguno" && item !== "Ninguna");
    onChange([...cleaned, option]);
  }

  return (
    <fieldset className="multiField">
      <legend>{label}{max ? ` (${values.length}/${max})` : ""}</legend>
      <div>
        {options.map((option) => (
          <label key={option} className={values.includes(option) ? "chip selected" : "chip"}>
            <input type="checkbox" checked={values.includes(option)} onChange={() => toggle(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function validateProfile(profile: LifeProfile) {
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

function mergeProfile(profile: LifeProfile): LifeProfile {
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

function scaleLabel(value: number) {
  return ["Muy difícil", "Frágil", "En construcción", "Sólido", "Fortaleza"][value - 1] || "En construcción";
}
