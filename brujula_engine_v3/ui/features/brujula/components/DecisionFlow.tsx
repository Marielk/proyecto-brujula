"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { JourneyDecision, JourneyReview, ReviewDecision } from "../../../lib/decisions/contracts";
import {
  buildRouteOptions,
  createDecisionDraft,
  createDecisionRepository,
  createReviewDraft,
  learningContextForSimulation
} from "../../../lib/decisions/decision-service";
import { validateDecision, validateReview } from "../../../lib/decisions/experiment-policy";
import type { LifeProfile, SimulationResult } from "../../../lib/types";
import { browserStorageProvider } from "../services/browser-storage-provider";
import { publishDecisionEvent } from "../services/decision-events";
import { readStoredJourneyResults, writePendingLearningContext } from "../services/storage";

type LoadedResult = {
  simulationId: string;
  goal: string;
  result: SimulationResult;
};

export function DecisionFlow({
  simulationId,
  initialResult,
  initialGoal,
  profile
}: {
  simulationId: string;
  initialResult?: SimulationResult;
  initialGoal?: string;
  profile?: LifeProfile;
}) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const repository = useMemo(() => createDecisionRepository(browserStorageProvider), []);
  const [loaded, setLoaded] = useState<LoadedResult | null>(
    initialResult ? { simulationId, goal: initialGoal || initialResult.scenario.name, result: initialResult } : null
  );
  const [decision, setDecision] = useState<JourneyDecision | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [customRouteName, setCustomRouteName] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (loaded || !simulationId) return;
    const saved = readStoredJourneyResults().items[simulationId];
    if (saved) {
      setLoaded({ simulationId, goal: saved.goal, result: saved.result });
    }
  }, [loaded, simulationId]);

  const routeOptions = useMemo(() => (loaded ? buildRouteOptions(loaded.result) : []), [loaded]);

  useEffect(() => {
    if (!loaded || selectedRouteId || routeOptions.length === 0) return;
    const first = routeOptions[0];
    setSelectedRouteId(first.id);
    const draft = createDecisionDraft({ simulationId: loaded.simulationId, goal: loaded.goal, result: loaded.result, selectedRouteId: first.id, lifeProfile: profile });
    setDecision(draft);
    publishDecisionEvent("DecisionDraftStarted", { simulationId: loaded.simulationId, durationDays: draft.experiment.durationDays, actionCount: draft.experiment.actions.length });
    publishDecisionEvent("ExperimentGenerated", { simulationId: loaded.simulationId, durationDays: draft.experiment.durationDays, actionCount: draft.experiment.actions.length });
  }, [loaded, profile, routeOptions, selectedRouteId]);

  function chooseRoute(routeId: string) {
    if (!loaded) return;
    setSelectedRouteId(routeId);
    const draft = createDecisionDraft({
      simulationId: loaded.simulationId,
      goal: loaded.goal,
      result: loaded.result,
      selectedRouteId: routeId,
      customRouteName,
      lifeProfile: profile
    });
    setDecision((current) => ({ ...draft, id: current?.id || draft.id, createdAt: current?.createdAt || draft.createdAt }));
    publishDecisionEvent("PathSelected", { simulationId: loaded.simulationId });
  }

  async function save(status: JourneyDecision["status"]) {
    if (!decision) return;
    const next = { ...decision, status, updatedAt: new Date().toISOString() };
    const nextErrors = validateDecision(next);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    await repository.saveDecision(next);
    setDecision(next);
    setMessage(status === "draft" ? "Borrador guardado en este navegador." : "Plan guardado. Puedes volver para revisarlo.");
    publishDecisionEvent(status === "draft" ? "ExperimentEdited" : "DecisionPlanned", {
      decisionId: next.id,
      simulationId: next.simulationId,
      durationDays: next.experiment.durationDays,
      actionCount: next.experiment.actions.length,
      status: next.status
    });
  }

  if (!loaded || !decision) {
    return (
      <section className="journeyScreen decisionScreen">
        <article className="glassPanel decisionPanel">
          <h1 ref={titleRef} tabIndex={-1}>No encontré este resultado guardado.</h1>
          <p>Para crear una decisión, abre el resultado original en este navegador o traza un nuevo viaje.</p>
          <Link className="secondaryButton" href="/viaje">Volver a Viaje</Link>
        </article>
      </section>
    );
  }

  return (
    <section className="journeyScreen decisionScreen">
      <article className="glassPanel decisionPanel">
        <span className="eyebrow">Convierte esta ruta en un paso real</span>
        <h1 ref={titleRef} tabIndex={-1}>Probemos una hipótesis pequeña antes de comprometernos más.</h1>
        <p>Esta elección no es definitiva. Es una hipótesis que puedes probar y revisar con evidencia real.</p>
        {message && <p className="successNotice" role="status">{message}</p>}
        {errors.length > 0 && (
          <div className="errorNotice" role="alert">
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        )}
      </article>

      <section className="glassPanel decisionPanel" aria-labelledby="route-choice-title">
        <h2 id="route-choice-title">1. Elegir ruta</h2>
        <div className="decisionChoiceGrid">
          {routeOptions.map((route) => (
            <button className={selectedRouteId === route.id ? "decisionChoice selected" : "decisionChoice"} key={route.id} type="button" onClick={() => chooseRoute(route.id)}>
              <strong>{route.name}</strong>
              <span>{route.intention}</span>
              <small>Ventaja: {route.advantage}</small>
              <small>Costo: {route.cost}</small>
              <small>Reversibilidad: {route.reversibility}</small>
              <small>Condición mínima: {route.minimumCondition}</small>
              <em>{route.reason}</em>
            </button>
          ))}
        </div>
        {selectedRouteId === "custom" && (
          <label className="fieldLabel">
            <span>Nombre de tu ruta propia</span>
            <input value={customRouteName} onChange={(event) => setCustomRouteName(event.target.value)} onBlur={() => chooseRoute("custom")} />
          </label>
        )}
      </section>

      <section className="glassPanel decisionPanel">
        <h2>2. Definir aprendizaje</h2>
        <label className="fieldLabel fullField">
          <span>Pregunta principal</span>
          <textarea value={decision.learningQuestion} rows={3} onChange={(event) => setDecision({ ...decision, learningQuestion: event.target.value, updatedAt: new Date().toISOString() })} />
        </label>
      </section>

      <section className="glassPanel decisionPanel">
        <h2>3. Diseñar experimento reversible</h2>
        <div className="decisionFormGrid">
          <label className="fieldLabel">
            <span>Nombre</span>
            <input value={decision.experiment.title} onChange={(event) => updateExperiment(decision, setDecision, { title: event.target.value })} />
          </label>
          <label className="fieldLabel">
            <span>Duración</span>
            <select value={decision.experiment.durationDays} onChange={(event) => updateExperiment(decision, setDecision, { durationDays: Number(event.target.value) as 7 | 30 })}>
              <option value={7}>7 días</option>
              <option value={30}>30 días</option>
            </select>
          </label>
          <label className="fieldLabel">
            <span>Tiempo semanal máximo</span>
            <input type="number" min={0} value={decision.experiment.weeklyTimeLimit ?? ""} onChange={(event) => updateExperiment(decision, setDecision, { weeklyTimeLimit: optionalNumber(event.target.value) })} />
          </label>
          <label className="fieldLabel">
            <span>Presupuesto máximo</span>
            <input type="number" min={0} value={decision.experiment.budgetLimit ?? ""} onChange={(event) => updateExperiment(decision, setDecision, { budgetLimit: optionalNumber(event.target.value) })} />
          </label>
          <label className="fieldLabel">
            <span>Fecha de inicio</span>
            <input type="date" value={decision.experiment.startsAt || ""} onChange={(event) => updateExperiment(decision, setDecision, { startsAt: event.target.value })} />
          </label>
          <label className="fieldLabel">
            <span>Fecha de revisión</span>
            <input type="date" value={decision.experiment.reviewAt} onChange={(event) => updateExperiment(decision, setDecision, { reviewAt: event.target.value })} />
          </label>
        </div>
        <label className="fieldLabel fullField">
          <span>Propósito</span>
          <textarea value={decision.experiment.purpose} rows={3} onChange={(event) => updateExperiment(decision, setDecision, { purpose: event.target.value })} />
        </label>
        <EditableActions decision={decision} onChange={setDecision} />
      </section>

      <section className="glassPanel decisionPanel">
        <h2>4. Acordar señales</h2>
        <div className="signalsGrid">
          {decision.experiment.signals.map((signal) => (
            <label className="fieldLabel fullField" key={signal.id}>
              <span>{signal.kind === "continue" ? "Señal para continuar" : signal.kind === "adjust" ? "Señal para ajustar" : "Señal para detener"}</span>
              <textarea
                value={signal.description}
                rows={2}
                onChange={(event) =>
                  updateExperiment(decision, setDecision, { signals: decision.experiment.signals.map((item) => (item.id === signal.id ? { ...item, description: event.target.value } : item)) })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="glassPanel decisionPanel">
        <h2>5. Programar revisión</h2>
        <p>Guardar no te compromete de forma definitiva. Te deja un mapa pequeño para observar, aprender y volver a decidir.</p>
        <div className="resultActions">
          <button type="button" onClick={() => void save("draft")}>Guardar borrador</button>
          <button type="button" onClick={() => void save("planned")}>Guardar plan</button>
          <Link className="secondaryButton" href={`/viaje/decision/${decision.id}`}>Abrir seguimiento</Link>
          <Link className="secondaryButton" href="/viaje/historial">Ver historial</Link>
        </div>
      </section>
    </section>
  );
}

export function DecisionDetail({ decisionId }: { decisionId: string }) {
  const repository = useMemo(() => createDecisionRepository(browserStorageProvider), []);
  const [decision, setDecision] = useState<JourneyDecision | null>(null);
  const [reviews, setReviews] = useState<JourneyReview[]>([]);

  useEffect(() => {
    void repository.getDecision(decisionId).then(setDecision);
    void repository.listReviews(decisionId).then(setReviews);
  }, [decisionId, repository]);

  async function save(next: JourneyDecision) {
    await repository.saveDecision(next);
    setDecision(next);
    publishDecisionEvent(next.status === "in_progress" ? "DecisionStarted" : "ExperimentEdited", {
      decisionId: next.id,
      simulationId: next.simulationId,
      status: next.status,
      actionCount: next.experiment.actions.length
    });
  }

  if (!decision) {
    return <EmptyDecisionState title="Decisión no encontrada" body="Puede haber sido eliminada o estar guardada en otro navegador." />;
  }

  return (
    <section className="journeyScreen decisionScreen">
      <article className="glassPanel decisionPanel">
        <span className="eyebrow">{statusLabel(decision.status)}</span>
        <h1>{decision.selectedPathName}</h1>
        <p>{decision.learningQuestion}</p>
        <div className="resultActions">
          <button type="button" onClick={() => void save({ ...decision, status: "in_progress", updatedAt: new Date().toISOString() })}>Iniciar seguimiento</button>
          <button className="secondaryButton" type="button" onClick={() => void save({ ...decision, status: "paused", updatedAt: new Date().toISOString() })}>Pausar</button>
          <Link className="secondaryButton" href={`/viaje/decision/${decision.id}/revision`}>Registrar revisión</Link>
        </div>
      </article>
      <section className="glassPanel decisionPanel">
        <h2>Acciones del experimento</h2>
        <div className="decisionChecklist">
          {decision.experiment.actions.map((action) => (
            <label key={action.id}>
              <input
                type="checkbox"
                checked={action.done}
                onChange={(event) =>
                  void save({
                    ...decision,
                    updatedAt: new Date().toISOString(),
                    experiment: {
                      ...decision.experiment,
                      actions: decision.experiment.actions.map((item) => (item.id === action.id ? { ...item, done: event.target.checked } : item))
                    }
                  })
                }
              />
              <span>{action.title}</span>
            </label>
          ))}
        </div>
      </section>
      <DecisionSummary decision={decision} reviews={reviews} />
    </section>
  );
}

export function DecisionReview({ decisionId }: { decisionId: string }) {
  const repository = useMemo(() => createDecisionRepository(browserStorageProvider), []);
  const [decision, setDecision] = useState<JourneyDecision | null>(null);
  const [review, setReview] = useState<JourneyReview | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void repository.getDecision(decisionId).then((loaded) => {
      setDecision(loaded);
      if (loaded) setReview(createReviewDraft(loaded));
      publishDecisionEvent("ReviewOpened", { decisionId });
    });
  }, [decisionId, repository]);

  async function saveReview() {
    if (!decision || !review) return;
    const nextErrors = validateReview(review);
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    await repository.saveReview(review);
    const status = review.nextDecision === "stop" ? "completed" : review.nextDecision === "adjust" ? "planned" : review.nextDecision === "continue" ? "in_progress" : decision.status;
    await repository.saveDecision({ ...decision, status, updatedAt: new Date().toISOString() });
    setSaved(true);
    publishDecisionEvent("ReviewCompleted", { decisionId: decision.id, nextDecision: review.nextDecision, status });
    if (review.nextDecision === "stop" || review.nextDecision === "adjust" || review.nextDecision === "continue") {
      publishDecisionEvent(
        review.nextDecision === "stop" ? "DecisionStopped" : review.nextDecision === "adjust" ? "DecisionAdjusted" : "DecisionContinued",
        { decisionId: decision.id, nextDecision: review.nextDecision, status }
      );
    }
  }

  if (!decision || !review) return <EmptyDecisionState title="No encontré esta decisión" body="Puedes volver al historial para elegir otra." />;

  return (
    <section className="journeyScreen decisionScreen">
      <article className="glassPanel decisionPanel">
        <span className="eyebrow">Revisión</span>
        <h1>Registrar lo que ocurrió</h1>
        <p>Continuar, ajustar o detener son resultados válidos si nacen de evidencia.</p>
        {saved && <p className="successNotice">Revisión guardada.</p>}
        {errors.map((error) => <p className="errorNotice" key={error}>{error}</p>)}
      </article>
      <section className="glassPanel decisionPanel">
        <h2>Acciones realizadas</h2>
        <div className="decisionChecklist">
          {decision.experiment.actions.map((action) => (
            <label key={action.id}>
              <input
                type="checkbox"
                checked={review.completedActions.includes(action.id)}
                onChange={(event) => {
                  const completedActions = event.target.checked ? [...review.completedActions, action.id] : review.completedActions.filter((id) => id !== action.id);
                  setReview({ ...review, completedActions });
                }}
              />
              <span>{action.title}</span>
            </label>
          ))}
        </div>
        <ReviewFields review={review} onChange={setReview} />
        <div className="resultActions">
          <button type="button" onClick={() => void saveReview()}>Guardar revisión</button>
          <Link className="secondaryButton" href={`/viaje/decision/${decision.id}`}>Volver al seguimiento</Link>
        </div>
      </section>
    </section>
  );
}

export function DecisionHistory() {
  const repository = useMemo(() => createDecisionRepository(browserStorageProvider), []);
  const [decisions, setDecisions] = useState<JourneyDecision[]>([]);
  const [reviews, setReviews] = useState<JourneyReview[]>([]);

  async function load() {
    setDecisions(await repository.listDecisions());
    setReviews(await repository.listReviews());
  }

  useEffect(() => {
    void load();
  }, []);

  async function archive(id: string) {
    await repository.archiveDecision(id);
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar esta decisión y sus revisiones?")) return;
    await repository.deleteDecision(id);
    await load();
  }

  function useLearning() {
    writePendingLearningContext(learningContextForSimulation(decisions, reviews));
    publishDecisionEvent("JourneyResimulatedFromLearning", { actionCount: decisions.length });
    window.location.href = "/viaje";
  }

  return (
    <section className="journeyScreen decisionScreen">
      <article className="glassPanel decisionPanel">
        <span className="eyebrow">Historial local</span>
        <h1>Decisiones y aprendizajes</h1>
        <p>Estos datos viven solamente en este navegador. Puedes usarlos como contexto de un nuevo viaje cuando tú lo elijas.</p>
        <div className="resultActions">
          <button type="button" onClick={useLearning} disabled={decisions.length === 0}>Usar aprendizaje en un nuevo viaje</button>
          <Link className="secondaryButton" href="/viaje">Volver a Viaje</Link>
        </div>
      </article>
      <div className="decisionHistoryList">
        {decisions.filter((decision) => !decision.archivedAt).map((decision) => {
          const latestReview = reviews.find((review) => review.decisionId === decision.id);
          return (
            <article className="glassPanel decisionHistoryItem" key={decision.id}>
              <span>{statusLabel(decision.status)}</span>
              <h2>{decision.goal}</h2>
              <p><strong>Ruta:</strong> {decision.selectedPathName}</p>
              <p><strong>Experimento:</strong> {decision.experiment.title}</p>
              <p><strong>Próxima revisión:</strong> {formatDate(decision.experiment.reviewAt)}</p>
              {latestReview?.learning && <p><strong>Último aprendizaje:</strong> {latestReview.learning}</p>}
              <div className="resultActions">
                <Link href={`/viaje/decision/${decision.id}`}>Abrir decisión</Link>
                <Link className="secondaryButton" href={`/viaje/decision/${decision.id}/revision`}>Registrar revisión</Link>
                <button className="secondaryButton" type="button" onClick={() => void archive(decision.id)}>Archivar</button>
                <button className="secondaryButton" type="button" onClick={() => void remove(decision.id)}>Eliminar</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function EditableActions({ decision, onChange }: { decision: JourneyDecision; onChange: (decision: JourneyDecision) => void }) {
  function updateAction(id: string, title: string) {
    updateExperiment(decision, onChange, { actions: decision.experiment.actions.map((action) => (action.id === id ? { ...action, title } : action)) });
  }

  function addAction() {
    if (decision.experiment.actions.length >= 5) return;
    updateExperiment(decision, onChange, {
      actions: [...decision.experiment.actions, { id: `action_${Date.now()}`, title: "Registrar evidencia observable de esta ruta.", done: false }]
    });
  }

  return (
    <div className="decisionActionsEditor">
      <h3>Acciones principales</h3>
      {decision.experiment.actions.map((action, index) => (
        <label className="fieldLabel fullField" key={action.id}>
          <span>Acción {index + 1}</span>
          <input value={action.title} onChange={(event) => updateAction(action.id, event.target.value)} />
        </label>
      ))}
      <button className="secondaryButton" type="button" onClick={addAction}>Agregar acción</button>
    </div>
  );
}

function ReviewFields({ review, onChange }: { review: JourneyReview; onChange: (review: JourneyReview) => void }) {
  return (
    <div className="decisionFormGrid">
      <label className="fieldLabel fullField">
        <span>Evidencia obtenida</span>
        <textarea value={review.evidence.join("\n")} rows={3} onChange={(event) => onChange({ ...review, evidence: event.target.value.split("\n").filter(Boolean) })} />
      </label>
      <label className="fieldLabel">
        <span>Energía después</span>
        <input type="number" min={1} max={5} value={review.energyAfter ?? ""} onChange={(event) => onChange({ ...review, energyAfter: optionalNumber(event.target.value) })} />
      </label>
      <label className="fieldLabel">
        <span>Horas aproximadas</span>
        <input type="number" min={0} value={review.timeSpentHours ?? ""} onChange={(event) => onChange({ ...review, timeSpentHours: optionalNumber(event.target.value) })} />
      </label>
      <label className="fieldLabel">
        <span>Gasto aproximado</span>
        <input type="number" min={0} value={review.moneySpent ?? ""} onChange={(event) => onChange({ ...review, moneySpent: optionalNumber(event.target.value) })} />
      </label>
      <label className="fieldLabel fullField">
        <span>Qué funcionó</span>
        <textarea value={review.worked} rows={2} onChange={(event) => onChange({ ...review, worked: event.target.value })} />
      </label>
      <label className="fieldLabel fullField">
        <span>Qué fue más difícil</span>
        <textarea value={review.difficult} rows={2} onChange={(event) => onChange({ ...review, difficult: event.target.value })} />
      </label>
      <label className="fieldLabel fullField">
        <span>Qué cambió en tu comprensión</span>
        <textarea value={review.learning} rows={3} onChange={(event) => onChange({ ...review, learning: event.target.value })} />
      </label>
      <label className="fieldLabel">
        <span>Decisión siguiente</span>
        <select value={review.nextDecision} onChange={(event) => onChange({ ...review, nextDecision: event.target.value as ReviewDecision })}>
          <option value="continue">Continuar</option>
          <option value="adjust">Ajustar</option>
          <option value="stop">Detener</option>
          <option value="simulate_again">Simular de nuevo</option>
          <option value="undecided">Aún no decidir</option>
        </select>
      </label>
    </div>
  );
}

function DecisionSummary({ decision, reviews }: { decision: JourneyDecision; reviews: JourneyReview[] }) {
  return (
    <section className="glassPanel decisionPanel">
      <h2>Señales y revisiones</h2>
      <div className="signalsGrid">
        {decision.experiment.signals.map((signal) => <p key={signal.id}><strong>{signal.kind}</strong><span>{signal.description}</span></p>)}
      </div>
      {reviews.map((review) => (
        <article className="reviewItem" key={review.id}>
          <strong>{formatDate(review.createdAt)}</strong>
          <p>{review.learning || "Revisión sin aprendizaje registrado."}</p>
          <span>{review.nextDecision}</span>
        </article>
      ))}
    </section>
  );
}

function EmptyDecisionState({ title, body }: { title: string; body: string }) {
  return (
    <section className="journeyScreen decisionScreen">
      <article className="glassPanel decisionPanel">
        <h1>{title}</h1>
        <p>{body}</p>
        <Link className="secondaryButton" href="/viaje/historial">Abrir historial</Link>
      </article>
    </section>
  );
}

function updateExperiment(decision: JourneyDecision, onChange: (decision: JourneyDecision) => void, patch: Partial<JourneyDecision["experiment"]>) {
  onChange({ ...decision, updatedAt: new Date().toISOString(), experiment: { ...decision.experiment, ...patch } });
}

function optionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

function statusLabel(status: JourneyDecision["status"]) {
  return {
    draft: "Borrador",
    planned: "Planificado",
    in_progress: "En curso",
    completed: "Completado",
    paused: "Pausado",
    discarded: "Descartado"
  }[status];
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(value));
}
