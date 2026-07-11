"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateGardenState, defaultCheckIn, gardenMoodLine, recommendRitual } from "../lib/garden";
import type {
  DailyCheckIn,
  GardenIndicator,
  GardenItem,
  GardenNeed,
  GardenTime,
  JourneyGuidance,
  LifeIndex,
  LifeProfile,
  RitualOutcome,
  RitualRecommendation,
  SimulationResult,
  CandidatePath
} from "../lib/types";

const STORAGE_KEY = "brujula.lifeProfile.v0.7";
const CHECKIN_STORAGE_KEY = "brujula.dailyCheckIn.v0.8";
const OUTCOME_STORAGE_KEY = "brujula.ritualOutcome.v0.8";
const EXAMPLE =
  "Quiero simular dedicarme gradualmente a Brújula desde 2028, bajando horas del trabajo actual, haciendo freelance para sostener ingresos y cuidando mi salud física.";
const JOURNEY_LOADING_STEPS = [
  "Sue abre el mapa...",
  "Comprendiendo tu sueño.",
  "Recordando tu Perfil de Vida.",
  "Explorando caminos posibles.",
  "Buscando el sendero más amable.",
  "Preparando una carta para ti."
];
type Mode = "home" | "garden" | "journey";

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
  const [mode, setMode] = useState<Mode>("home");
  const [checkIn, setCheckIn] = useState<DailyCheckIn>(defaultCheckIn);
  const [ritualOutcome, setRitualOutcome] = useState<RitualOutcome | null>(null);

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

  useEffect(() => {
    const savedCheckIn = window.localStorage.getItem(CHECKIN_STORAGE_KEY);
    const savedOutcome = window.localStorage.getItem(OUTCOME_STORAGE_KEY);
    if (savedCheckIn) {
      try {
        setCheckIn({ ...defaultCheckIn, ...JSON.parse(savedCheckIn) });
      } catch {
        window.localStorage.removeItem(CHECKIN_STORAGE_KEY);
      }
    }
    if (savedOutcome) {
      try {
        setRitualOutcome(JSON.parse(savedOutcome));
      } catch {
        window.localStorage.removeItem(OUTCOME_STORAGE_KEY);
      }
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
    setMode("home");
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
  const indicators = useMemo(() => calculateGardenState(profile, checkIn), [profile, checkIn]);
  const ritual = useMemo(() => recommendRitual(profile, checkIn), [profile, checkIn]);

  function updateCheckIn(update: Partial<DailyCheckIn>) {
    setCheckIn((current) => {
      const next = { ...current, ...update, createdAt: new Date().toISOString() };
      window.localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function recordOutcome(completed: boolean, feelingAfter = 70) {
    const next = {
      ritualId: ritual.ritual.id,
      completed,
      feelingAfter,
      note: completed ? "Ritual registrado desde Mi Jardín." : "Ritual guardado para intentar después.",
      createdAt: new Date().toISOString()
    };
    setRitualOutcome(next);
    window.localStorage.setItem(OUTCOME_STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <main className={showProfileForm ? "shell profileCanvas" : "appCanvas"}>
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
        <>
          <AppNav mode={mode} onMode={setMode} onEditProfile={() => setIsEditingProfile(true)} />
          {mode === "home" && <ModeLanding profile={profile} onMode={setMode} />}
          {mode === "garden" && (
            <GardenMode
              checkIn={checkIn}
              indicators={indicators}
              moodLine={gardenMoodLine(indicators)}
              recommendation={ritual}
              outcome={ritualOutcome}
              onCheckIn={updateCheckIn}
              onOutcome={recordOutcome}
            />
          )}
          {mode === "journey" && (
            <JourneyMode
              profile={profile}
              profileMessage={profileMessage}
              text={text}
              model={model}
              result={result}
              error={error}
              isLoading={isLoading}
              onText={setText}
              onModel={setModel}
              onSubmit={submit}
              onEditProfile={() => setIsEditingProfile(true)}
              onDeleteProfile={deleteProfile}
            />
          )}
          <AppFooter />
        </>
      )}
    </main>
  );
}

function AppNav({ mode, onMode, onEditProfile }: { mode: Mode; onMode: (mode: Mode) => void; onEditProfile: () => void }) {
  return (
    <header className="topBar">
      <button className="brandButton" type="button" onClick={() => onMode("home")}>Brújula</button>
      <nav aria-label="Modos de Brújula">
        <button className={mode === "garden" ? "active" : ""} type="button" onClick={() => onMode("garden")}>Jardín</button>
        <button className={mode === "journey" ? "active" : ""} type="button" onClick={() => onMode("journey")}>Viaje</button>
        <button className={mode === "home" ? "active" : ""} type="button" onClick={() => onMode("home")}>Refugio</button>
      </nav>
      <button className="iconButton" type="button" onClick={onEditProfile} title="Editar perfil">⚙</button>
    </header>
  );
}

function ModeLanding({ profile, onMode }: { profile: LifeProfile; onMode: (mode: Mode) => void }) {
  const name = profile.identity.name ? ` de nuevo, ${profile.identity.name}` : " de nuevo";
  return (
    <section className="modeLanding">
      <div className="landingHero">
        <h1>Bienvenido{name}, ¿qué quieres hacer hoy?</h1>
        <p>Toma un respiro. Elige el camino que más resuene con tu energía en este momento.</p>
      </div>

      <div className="modeCards">
        <article className="modeCard gardenCard">
          <span className="modeIcon">🌿</span>
          <h2>Cuidar mi Jardín</h2>
          <p>Pequeños actos de calma para nutrir tu bienestar hoy.</p>
          <button type="button" onClick={() => onMode("garden")}>Entrar al Jardín ✨</button>
        </article>

        <article className="modeCard journeyCard">
          <span className="modeIcon">◈</span>
          <h2>Planificar un Viaje</h2>
          <p>Explora nuevos horizontes y traza el camino hacia tus sueños.</p>
          <button type="button" onClick={() => onMode("journey")}>Comenzar Viaje ↗</button>
        </article>
      </div>

      <section className="promiseAnchor">
        <span>La Promesa</span>
        <blockquote>
          "Brújula es un hogar al que siempre puedas volver. No importa qué tan lejos vayas o qué tan pausado sea tu ritmo, aquí siempre encontrarás tu centro."
        </blockquote>
      </section>
    </section>
  );
}

function GardenMode({
  checkIn,
  indicators,
  moodLine,
  recommendation,
  outcome,
  onCheckIn,
  onOutcome
}: {
  checkIn: DailyCheckIn;
  indicators: GardenIndicator[];
  moodLine: string;
  recommendation: RitualRecommendation;
  outcome: RitualOutcome | null;
  onCheckIn: (update: Partial<DailyCheckIn>) => void;
  onOutcome: (completed: boolean, feelingAfter?: number) => void;
}) {
  return (
    <section className="gardenScreen">
      <div className="screenHeader">
        <h1>Mi Jardín</h1>
        <p>Bienvenido de nuevo a tu santuario. Tu vida florece con cada cuidado pequeño.</p>
      </div>

      <div className="gardenGridLayout">
        <div className="gardenMain">
          <section className="glassPanel checkPanel">
            <h2>🌸 Check-in del día</h2>
            <div className="rangeGrid">
              <RangeControl label="Ánimo" icon="☺" value={checkIn.mood} onChange={(value) => onCheckIn({ mood: value })} />
              <RangeControl label="Energía" icon="⚡" value={checkIn.energy} onChange={(value) => onCheckIn({ energy: value })} />
              <RangeControl label="Dolor" icon="☁" value={checkIn.pain} onChange={(value) => onCheckIn({ pain: value })} />
              <RangeControl label="Sueño" icon="☾" value={checkIn.sleepQuality} onChange={(value) => onCheckIn({ sleepQuality: value })} />
            </div>
          </section>

          <div className="selectorRow">
            <ChoicePanel title="¿Cuánto tiempo tienes?">
              {(["5m", "15m", "30m", "60m"] as GardenTime[]).map((time) => (
                <button key={time} className={checkIn.availableTime === time ? "chip selected" : "chip"} type="button" onClick={() => onCheckIn({ availableTime: time })}>
                  {time}
                </button>
              ))}
            </ChoicePanel>
            <ChoicePanel title="¿Qué necesitas hoy?">
              {(["energia", "serenidad", "salud", "relaciones", "creatividad"] as GardenNeed[]).map((need) => (
                <button key={need} className={checkIn.mainNeed === need ? "chip selected" : "chip"} type="button" onClick={() => onCheckIn({ mainNeed: need })}>
                  {gardenNeedLabel(need)}
                </button>
              ))}
            </ChoicePanel>
          </div>

          <label className="gardenNote glassPanel">
            <span>Nota del día</span>
            <textarea value={checkIn.note} onChange={(event) => onCheckIn({ note: event.target.value })} rows={3} placeholder="Escribe lo que florece en tu mente..." />
          </label>

          <section className="ritualHero">
            <img src="/assets/ritual-tea-garden.png" alt="Bebida caliente en un jardín sereno" />
            <div>
              <span>Ritual recomendado</span>
              <h2>{recommendation.ritual.title}</h2>
              <p>{recommendation.reason}</p>
              <div className="ritualActions">
                <button type="button" onClick={() => onOutcome(true, 78)}>Realizado</button>
                <button className="secondaryButton" type="button" onClick={() => onOutcome(false, 50)}>Después</button>
              </div>
            </div>
          </section>
        </div>

        <aside className="gardenAside">
          <section className="glassPanel gardenStatus">
            <h2>Estado de tu Jardín</h2>
            {indicators.map((indicator) => (
              <div className="statusBar" key={indicator.key}>
                <div><span>{indicator.icon}</span><strong>{indicator.label}</strong><em>{indicator.value}%</em></div>
                <progress max={100} value={indicator.value} />
              </div>
            ))}
            <p className="sueWhisper">"{moodLine}"</p>
          </section>

          <section className="moreCare">
            <h2>Más cuidados</h2>
            <div>
              {recommendation.ritual.steps.map((step) => (
                <article key={step}>{step}</article>
              ))}
            </div>
          </section>

          {outcome && (
            <section className="glassPanel outcomePanel">
              <strong>{outcome.completed ? "Ritual registrado" : "Ritual reservado"}</strong>
              <p>Sensación posterior: {outcome.feelingAfter}%</p>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

function JourneyMode({
  profile,
  profileMessage,
  text,
  model,
  result,
  error,
  isLoading,
  onText,
  onModel,
  onSubmit,
  onEditProfile,
  onDeleteProfile
}: {
  profile: LifeProfile;
  profileMessage: string;
  text: string;
  model: string;
  result: SimulationResult | null;
  error: string;
  isLoading: boolean;
  onText: (value: string) => void;
  onModel: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditProfile: () => void;
  onDeleteProfile: () => void;
}) {
  return (
    <section className="journeyScreen">
      <header className="journeyHeader">
        <h1>Planificar un Viaje</h1>
        <p>Explora el camino hacia tu sueño con tu Perfil de Vida como brújula.</p>
      </header>

      <form className="journeyInput glassPanel" onSubmit={onSubmit}>
        <label htmlFor="scenario">¿Cuál es tu destino final?</label>
        <textarea id="scenario" value={text} onChange={(event) => onText(event.target.value)} rows={4} placeholder="Ej: Dedicarme gradualmente al arte, cuidar mi salud y sostener mis ingresos..." />
        <div className="journeyControls">
          <label htmlFor="model">Modelo Ollama</label>
          <input id="model" value={model} onChange={(event) => onModel(event.target.value)} />
          <button type="submit" disabled={isLoading || !text.trim()}>{isLoading ? "Trazando ruta..." : "Trazar ruta ✨"}</button>
        </div>
      </form>

      {error && <div className="error journeyError">{error}</div>}

      {!result && !isLoading && (
        <div className="journeyEmpty glassPanel">
          <ProfileSummary profile={profile} message={profileMessage} onEdit={onEditProfile} onDelete={onDeleteProfile} />
          <p>Describe un camino posible. Brújula lo transformará en ruta, riesgos, hitos y carta de Sue.</p>
        </div>
      )}

      {isLoading && <JourneyLoading />}

      {result && <JourneyResults result={result} />}
    </section>
  );
}

function JourneyLoading() {
  const [visibleSteps, setVisibleSteps] = useState(1);

  useEffect(() => {
    setVisibleSteps(1);
    const interval = window.setInterval(() => {
      setVisibleSteps((current) => Math.min(current + 1, JOURNEY_LOADING_STEPS.length));
    }, 1150);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="journeyLoading">
      <div className="loadingOrb" aria-hidden="true">
        <img src="/assets/sue-mapa.png" alt="" />
      </div>
      <h2>Sue está leyendo el mapa...</h2>
      <div className="loadingSteps">
        {JOURNEY_LOADING_STEPS.slice(0, visibleSteps).map((item, index) => (
          <p className={index === visibleSteps - 1 ? "activeStep" : "doneStep"} key={item}>
            <span>{index === visibleSteps - 1 ? "•" : "✓"}</span>{item}
          </p>
        ))}
      </div>
      <small>Un momento de calma mientras trazamos el camino.</small>
    </div>
  );
}

function JourneyResults({ result }: { result: SimulationResult }) {
  const guidance = result.lifeReport.journeyGuidance || fallbackJourneyGuidance(result);
  const selectedPath = guidance.selectedPath || result.selectedPath;
  const candidatePaths = guidance.candidatePaths || result.candidatePaths || [];
  const discardedPaths = guidance.discardedPaths || candidatePaths.filter((path) => path.id !== selectedPath?.id).slice(0, 4);
  const exploredPaths = guidance.exploredPaths || result.exploredPaths || candidatePaths.length;
  const clusters = guidance.clusteredPaths || result.clusteredPaths || [];
  const confidenceScore = Math.round(guidance.confidenceScore || 0);
  const preparation = Math.round(guidance.preparation);
  const effort = effortFromResult(result);
  return (
    <section className={`journeyResults journeyTone-${guidance.conclusion.tone}`}>
      <article className="hybridIntro glassPanel">
        <span>Explorador de futuros v0.12</span>
        <h2>Exploré {exploredPaths} futuros plausibles antes de sugerirte un sendero.</h2>
        <p>Brújula expandió estrategias base, podó rutas frágiles, agrupó caminos parecidos y eligió la alternativa que mejor protege tu vida cotidiana.</p>
        <div className="hybridStatus">
          <span className={result.llm.goal ? "okPill" : "fallbackPill"}>Intérprete: {result.llm.goal ? "Ollama" : "Local"}</span>
          <span className={result.llm.paths ? "okPill" : "fallbackPill"}>Caminos: {result.llm.paths ? "Ollama" : "Locales"}</span>
          <span className={result.llm.comparison ? "okPill" : "fallbackPill"}>Comparación: {result.llm.comparison ? "Ollama" : "Local"}</span>
          <span className={result.llm.report ? "okPill" : "fallbackPill"}>Sue: {result.llm.report ? "Ollama" : "Determinista"}</span>
        </div>
      </article>

      {selectedPath && (
        <section className="pathDecisionCard glassPanel">
          <div className="pathDecisionHeader">
            <div>
              <span>Ruta recomendada</span>
              <h3>{selectedPath.name}</h3>
              <p>{selectedPath.description}</p>
            </div>
            <strong>{confidenceScore ? `${confidenceScore}%` : `${Math.round(selectedPath.selectionScore)} pts`}</strong>
          </div>
          <div className="pathStats">
            <div><span>Estrategia</span><strong>{strategyLabel(selectedPath.strategy)}</strong></div>
            <div><span>Tiempo estimado</span><strong>{selectedPath.timeEstimate}</strong></div>
            <div><span>Riesgo financiero</span><strong>{riskLabel(selectedPath.financialRisk)}</strong></div>
            <div><span>Demanda de energía</span><strong>{energyLabel(selectedPath.energyDemand)}</strong></div>
          </div>
          {selectedPath.evaluationDetails && (
            <div className="evaluationPetals">
              {Object.entries(evaluationLabels(selectedPath)).map(([key, label]) => (
                <div key={key}>
                  <span>{label}</span>
                  <strong>{Math.round(selectedPath.evaluationDetails?.[key as keyof typeof selectedPath.evaluationDetails] || 0)}%</strong>
                </div>
              ))}
            </div>
          )}
          {selectedPath.decisions && selectedPath.decisions.length > 0 && (
            <div className="decisionSteps">
              <h4>Decisiones que dibujan esta historia</h4>
              <ol>
                {selectedPath.decisions.slice(0, 4).map((decision) => <li key={decision}>{decision}</li>)}
              </ol>
            </div>
          )}
          {guidance.comparisonReasons && guidance.comparisonReasons.length > 0 && (
            <div className="comparisonReasons">
              <h4>Por qué fue elegido</h4>
              <ul>
                {guidance.comparisonReasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {discardedPaths.length > 0 && (
        <section className="pathAlternatives glassPanel">
          <div className="sectionTitle">
            <p className="eyebrow">Otros caminos considerados</p>
            <h3>Qué tendría que cambiar para que otra ruta sea mejor</h3>
          </div>
          <div className="alternativeGrid">
            {discardedPaths.map((path) => (
              <article key={path.id}>
                <div>
                  <strong>{path.name}</strong>
                  <span>{Math.round(path.selectionScore)} pts</span>
                </div>
                <p>{path.description}</p>
                <small>{whatWouldImprovePath(path)}</small>
              </article>
            ))}
          </div>
        </section>
      )}

      {clusters.length > 0 && (
        <section className="clusterGarden glassPanel">
          <div className="sectionTitle">
            <p className="eyebrow">Agrupación de futuros</p>
            <h3>Familias de caminos exploradas</h3>
          </div>
          <div>
            {clusters.slice(0, 5).map((cluster) => (
              <article key={cluster.id}>
                <span>{cluster.size}</span>
                <strong>{cluster.label}</strong>
                <small>Promedio {Math.round(cluster.averageScore)} pts</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <article className="routeCard guidanceHero glassPanel">
        {guidance.unsupportedWarning && <div className="domainWarning">{guidance.unsupportedWarning}</div>}
        <div className="routeHead">
          <div>
            <span>Conclusión inmediata</span>
            <h2>{guidance.conclusion.title}</h2>
            {guidance.goal && (
              <div className="goalBadge">
                <strong>{domainLabel(guidance.goal.domain)}</strong>
                <span>{guidance.goal.goalType}</span>
                {guidance.goal.horizonYear && <em>Horizonte {guidance.goal.horizonYear}</em>}
              </div>
            )}
          </div>
          <div className="preparationMeter">
            <span>Preparación del Camino</span>
            <strong>{preparation}%</strong>
            <progress max={100} value={preparation} />
            <small>{guidance.preparationLabel}</small>
          </div>
        </div>
        <p>{guidance.conclusion.body}</p>
        <p className="focusQuestion">{guidance.focusQuestion}</p>
        <div className="routeFacts">
          <div><span>Destino explorado</span><strong>{result.scenario.name}</strong></div>
          <div><span>Ventana del viaje</span><strong>{result.scenario.startYear} - {result.scenario.endYear}</strong></div>
          <div><span>Esfuerzo requerido</span><strong>{effort}</strong></div>
        </div>
      </article>

      <article className="preparationExplain glassPanel">
        <span>Cómo leer este número</span>
        <p>{guidance.preparationExplanation}</p>
      </article>

      {guidance.domainMetrics && (
        <section className="domainMetricsCard glassPanel">
          <h3>Métricas de este destino</h3>
          <div className="domainMetricGrid">
            {Object.entries(guidance.domainMetrics).map(([label, value]) => (
              <article key={label}>
                <strong>{label}</strong>
                <span>{Math.round(value)}%</span>
                <progress max={100} value={value} />
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="reasoningCard glassPanel">
        <h3>¿Por qué llegué a esta conclusión?</h3>
        <div className="reasonColumns">
          <div>
            <h4>Flores que encontré</h4>
            <ul>
              {guidance.flowers.map((item) => (
                <li key={item.label}><strong>{item.label}</strong><p>{item.impact}</p></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Cuidados importantes</h4>
            <ul>
              {guidance.cares.map((item) => (
                <li key={item.label}><strong>{item.label}</strong><p>{item.impact}</p></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="conditionCard glassPanel">
        <h3>Para que este sueño tenga muchas posibilidades de hacerse realidad</h3>
        <ul>
          {guidance.successConditions.map((item) => (
            <li key={item}>✅ {item}</li>
          ))}
        </ul>
      </section>

      <section className="avoidCard glassPanel">
        <h3>Evitaría hacer esto</h3>
        <ul>
          {guidance.avoidList.map((item) => (
            <li key={item}>❌ {item}</li>
          ))}
        </ul>
      </section>

      <section className="firstStepCard glassPanel">
        <span>Si hoy solo dieras un paso</span>
        <h3>{guidance.firstStep.title}</h3>
        <p>{guidance.firstStep.why}</p>
      </section>

      <section className="milestoneCard glassPanel">
        <h3>Historia del camino</h3>
        <ol>
          {result.lifeReport.timeline.slice(0, 4).map((item, index) => (
            <li key={`${item.year}-${item.title}`}>
              <span>{index + 1}</span>
              <div><strong>{item.title}</strong><p>{item.description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <article className="sueJourneyLetter glassPanel">
        <span>Mensaje de tu guía</span>
        <h3>Carta de Sue</h3>
        <p>{result.report}</p>
      </article>

      <details className="advancedJourney glassPanel">
        <summary>Datos técnicos avanzados</summary>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Año</th>
                <th>Brújula</th>
                <th>Est. fin.</th>
                <th>Crear</th>
                <th>Energía</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function fallbackJourneyGuidance(result: SimulationResult): JourneyGuidance {
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

function ChoicePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glassPanel choicePanel">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function RangeControl({ label, icon, value, onChange }: { label: string; icon: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="rangeControl">
      <span><strong>{label}</strong><em>{icon}</em></span>
      <input type="range" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function AppFooter() {
  return (
    <footer className="appFooter">
      <strong>Brújula</strong>
      <p>© 2024 Brújula. Cultivando tu bienestar interior.</p>
    </footer>
  );
}

function gardenNeedLabel(need: GardenNeed) {
  return {
    energia: "Energía",
    serenidad: "Serenidad",
    salud: "Salud",
    relaciones: "Relaciones",
    creatividad: "Creatividad"
  }[need];
}

function effortFromResult(result: SimulationResult) {
  const burnout = result.lifeReport.lifeSummary.riesgoAgotamiento;
  if (burnout === "Alto") return "Alto";
  if (result.final.compass >= 78) return "Medio";
  return "Muy alto";
}

function domainLabel(domain: string) {
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

function strategyLabel(strategy: string) {
  return {
    paralela: "Paralela",
    gradual: "Gradual",
    intensiva: "Intensiva",
    alianza: "En alianza",
    financiada: "Financiada",
    pausada: "Pausada"
  }[strategy] || strategy;
}

function riskLabel(value: string) {
  return value === "alto" ? "Alto" : value === "bajo" ? "Bajo" : "Medio";
}

function energyLabel(value: string) {
  return value === "alta" ? "Alta" : value === "baja" ? "Baja" : "Media";
}

function whatWouldImprovePath(path: CandidatePath) {
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

function evaluationLabels(path: CandidatePath): Record<string, string> {
  const details = path.evaluationDetails || {};
  return Object.fromEntries(
    [
      ["sustainability", "Sostenibilidad"],
      ["qualityOfLife", "Calidad de vida"],
      ["serenity", "Serenidad"],
      ["resilience", "Resiliencia"],
      ["hope", "Esperanza"],
      ["valueCoherence", "Valores"]
    ].filter(([key]) => typeof details[key as keyof typeof details] === "number")
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
