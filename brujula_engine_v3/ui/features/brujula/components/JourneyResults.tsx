"use client";

import type { SimulationResult } from "../../../lib/types";
import type { LifeProfile } from "../../../lib/types";
import { formatSimulationDate } from "../model";
import { DecisionFlow } from "./DecisionFlow";
import {
  domainLabel,
  effortFromResult,
  energyLabel,
  evaluationLabels,
  fallbackJourneyGuidance,
  pathCons,
  pathPros,
  riskLabel,
  starRating,
  strategyLabel,
  uniqueCandidatePaths,
  whatWouldImprovePath
} from "./journey-utils";

export function JourneyResults({
  result,
  goal,
  simulationId,
  completedAt,
  titleRef,
  onEditGoal,
  onNewJourney,
  profile
}: {
  result: SimulationResult;
  goal: string;
  simulationId: string;
  completedAt: string;
  titleRef: { current: HTMLHeadingElement | null };
  onEditGoal: () => void;
  onNewJourney: () => void;
  profile: LifeProfile;
}) {
  const guidance = result.lifeReport.journeyGuidance || fallbackJourneyGuidance(result);
  const selectedPath = guidance.selectedPath || result.selectedPath;
  const candidatePaths = guidance.candidatePaths || result.candidatePaths || [];
  const discardedPaths = guidance.discardedPaths || candidatePaths.filter((path) => path.id !== selectedPath?.id).slice(0, 4);
  const exploredPaths = guidance.exploredPaths || result.exploredPaths || candidatePaths.length;
  const clusters = guidance.clusteredPaths || result.clusteredPaths || [];
  const confidenceScore = Math.round(guidance.confidenceScore || 0);
  const preparation = Math.round(guidance.preparation);
  const effort = effortFromResult(result);
  const scenarioType = guidance.goal?.controllabilityLabel || result.debug?.scenarioType;
  const debug = guidance.debug || result.debug;
  const baseStrategies = debug?.basePaths ?? candidatePaths.length;
  const variants = debug?.variants ?? exploredPaths;
  const pruned = debug?.prunedPaths ?? Math.max(0, variants - exploredPaths);
  const finalRoutes = selectedPath ? 1 : 0;
  const comparisonPaths = uniqueCandidatePaths([selectedPath, ...candidatePaths, ...discardedPaths]).slice(0, 4);
  return (
    <section className={`journeyResults journeyTone-${guidance.conclusion.tone}`}>
      <article className="hybridIntro glassPanel">
        <span>Resultado del viaje</span>
        <h1 ref={titleRef} tabIndex={-1}>Exploré {variants} variantes de varios caminos posibles.</h1>
        <p>Brújula expandió estrategias base, podó rutas frágiles, agrupó caminos parecidos y eligió la alternativa que mejor protege tu vida cotidiana.</p>
        <div className="resultActions">
          <button type="button" onClick={onNewJourney}>Trazar un nuevo viaje</button>
          <button className="secondaryButton" type="button" onClick={onEditGoal}>Editar este destino</button>
          <a className="secondaryButton" href="/viaje/historial">Historial de decisiones</a>
        </div>
        <div className="resultMetaGrid">
          <div><span>Destino simulado</span><strong>{goal}</strong></div>
          {selectedPath && <div><span>Ruta recomendada</span><strong>{selectedPath.name}</strong></div>}
          <div><span>Estrategias base</span><strong>{baseStrategies}</strong></div>
          <div><span>Preparación actual</span><strong>{preparation}%</strong><small>Condiciones disponibles hoy para sostener esta ruta.</small></div>
        </div>
        <details className="engineSummary">
          <summary>Cómo se construyó esta recomendación</summary>
          <div className="resultMetaGrid">
            {guidance.goal && <div><span>Dominio detectado</span><strong>{domainLabel(guidance.goal.domain)}</strong></div>}
            {scenarioType && <div><span>Tipo de escenario</span><strong>{scenarioType}</strong></div>}
            <div><span>Fecha</span><strong>{formatSimulationDate(completedAt)}</strong></div>
            <div><span>Variantes evaluadas</span><strong>{variants}</strong></div>
            <div><span>Rutas descartadas</span><strong>{pruned}</strong></div>
            <div><span>Familias de caminos</span><strong>{clusters.length}</strong></div>
            <div><span>Rutas finalistas</span><strong>{Math.max(finalRoutes, candidatePaths.length ? Math.min(3, candidatePaths.length) : 0)}</strong></div>
            <div><span>ID simulación</span><strong>{simulationId}</strong></div>
          </div>
          <div className="hybridStatus">
            {selectedPath?.domainPolicy && <span className="okPill">Modelo especializado: {selectedPath.domainPolicy}</span>}
            <span className={result.llm.goal ? "okPill" : "fallbackPill"}>Intérprete: {result.llm.goal ? "Ollama" : "Local"}</span>
            <span className={result.llm.paths ? "okPill" : "fallbackPill"}>Caminos: {result.llm.paths ? "Ollama" : "Locales"}</span>
            <span className={result.llm.comparison ? "okPill" : "fallbackPill"}>Comparación: {result.llm.comparison ? "Ollama" : "Local"}</span>
            <span className={result.llm.report ? "okPill" : "fallbackPill"}>Sue: {result.llm.report ? "Ollama" : "Determinista"}</span>
          </div>
        </details>
      </article>

      <DecisionFlow simulationId={simulationId} initialResult={result} initialGoal={goal} profile={profile} />

      {comparisonPaths.length > 1 && (
        <section className="pathComparisonBoard glassPanel">
          <div className="sectionTitle">
            <p className="eyebrow">Comparación de caminos</p>
            <h2>Por qué esta ruta ganó frente a las alternativas</h2>
          </div>
          <div className="pathCompareGrid">
            {comparisonPaths.map((path) => (
              <article className={path.id === selectedPath?.id ? "recommendedPath" : ""} key={path.id}>
                <header>
                  <span>{path.id === selectedPath?.id ? "Recomendada" : strategyLabel(path.strategy)}</span>
                  <h3>{path.name}</h3>
                  <strong>{starRating(path.selectionScore)} <em>{Math.round(path.selectionScore)} pts</em></strong>
                </header>
                <div className="compareFacts">
                  <div><span>Tiempo</span><strong>{path.timeEstimate}</strong></div>
                  <div><span>Riesgo</span><strong>{riskLabel(path.financialRisk)}</strong></div>
                  <div><span>Energía</span><strong>{energyLabel(path.energyDemand)}</strong></div>
                  <div><span>Preparación</span><strong>{Math.round(path.preparation)}%</strong></div>
                </div>
                <div className="prosCons">
                  <div>
                    <span>Gana por</span>
                    <ul>{pathPros(path).map((item) => <li key={item}>✓ {item}</li>)}</ul>
                  </div>
                  <div>
                    <span>Cuida esto</span>
                    <ul>{pathCons(path).map((item) => <li key={item}>✕ {item}</li>)}</ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {selectedPath && (
        <section className="pathDecisionCard glassPanel">
          <div className="pathDecisionHeader">
            <div>
              <span>Ruta recomendada</span>
              <h3>{selectedPath.name}</h3>
              <p>{selectedPath.description}</p>
            </div>
            <strong>{confidenceScore ? `${confidenceScore}%` : `${Math.round(selectedPath.selectionScore)} pts`}<small>Confianza comparativa</small></strong>
          </div>
          <div className="pathStats">
            <div><span>Estrategia</span><strong>{strategyLabel(selectedPath.strategy)}</strong></div>
            <div><span>Tiempo estimado</span><strong>{selectedPath.timeEstimate}</strong></div>
            <div><span>Riesgo financiero</span><strong>{riskLabel(selectedPath.financialRisk)}</strong></div>
            <div><span>Demanda de energía</span><strong>{energyLabel(selectedPath.energyDemand)}</strong></div>
            {selectedPath.domainBenefit?.name && <div><span>Beneficio del dominio</span><strong>{selectedPath.domainBenefit.name}</strong></div>}
            {selectedPath.reversibility && <div><span>Reversibilidad</span><strong>{selectedPath.reversibility}</strong></div>}
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
        <details className="pathAlternatives glassPanel">
          <summary>Alternativas consideradas</summary>
          <div className="sectionTitle">
            <p className="eyebrow">Otros caminos considerados</p>
            <h3>Qué tendría que cambiar para que otra ruta sea mejor</h3>
          </div>
          <div className="alternativeGrid">
            {discardedPaths.map((path) => (
              <article key={path.id}>
                <div>
                  <strong>{path.name}</strong>
                  <span>{starRating(path.selectionScore)} {Math.round(path.selectionScore)} pts</span>
                </div>
                <p>{path.description}</p>
                <dl className="alternativeFacts">
                  <div><dt>Tiempo</dt><dd>{path.timeEstimate}</dd></div>
                  <div><dt>Riesgo</dt><dd>{riskLabel(path.financialRisk)}</dd></div>
                  <div><dt>Energía</dt><dd>{energyLabel(path.energyDemand)}</dd></div>
                  <div><dt>Preparación</dt><dd>{Math.round(path.preparation)}%</dd></div>
                </dl>
                <ul className="alternativePros">
                  {pathPros(path).slice(0, 2).map((item) => <li key={item}>✓ {item}</li>)}
                </ul>
                <ul className="alternativeCons">
                  {pathCons(path).slice(0, 2).map((item) => <li key={item}>✕ {item}</li>)}
                </ul>
                <small>{whatWouldImprovePath(path)}</small>
              </article>
            ))}
          </div>
        </details>
      )}

      {clusters.length > 0 && (
        <details className="clusterGarden glassPanel">
          <summary>Familias de caminos</summary>
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
        </details>
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
            <span>Preparación actual</span>
            <strong>{preparation}%</strong>
            <progress max={100} value={preparation} />
            <small>Hoy tienes un {preparation}% de las condiciones para sostener esta ruta. {guidance.preparationLabel}</small>
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

      {guidance.whatCouldChangeRecommendation && guidance.whatCouldChangeRecommendation.length > 0 && (
        <section className="changeRecommendationCard glassPanel">
          <h3>¿Qué podría cambiar esta recomendación?</h3>
          <ul>
            {guidance.whatCouldChangeRecommendation.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}

      <article className="preparationExplain glassPanel">
        <span>Cómo leer este número</span>
        <p>{guidance.preparationExplanation}</p>
      </article>

      {guidance.domainMetrics && (
        <details className="domainMetricsCard glassPanel">
          <summary>Métricas del destino</summary>
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
        </details>
      )}

      <details className="reasoningCard glassPanel">
        <summary>Fortalezas y cuidados</summary>
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
      </details>

      <details className="conditionCard glassPanel">
        <summary>Condiciones de éxito</summary>
        <h3>Para que este sueño tenga muchas posibilidades de hacerse realidad</h3>
        <ul>
          {guidance.successConditions.map((item) => (
            <li key={item}>✅ {item}</li>
          ))}
        </ul>
      </details>

      <details className="avoidCard glassPanel">
        <summary>Qué evitar</summary>
        <h3>Evitaría hacer esto</h3>
        <ul>
          {guidance.avoidList.map((item) => (
            <li key={item}>❌ {item}</li>
          ))}
        </ul>
      </details>

      <section className="firstStepCard glassPanel">
        <span>Si hoy solo dieras un paso</span>
        <h3>{guidance.firstStep.title}</h3>
        <p>{guidance.firstStep.why}</p>
      </section>

      <section className="milestoneCard glassPanel">
        <h3>Historia del camino</h3>
        <ol>
          {result.lifeReport.timeline.slice(0, 4).map((item, index) => (
            <li key={`${String(item.year)}-${item.title}`}>
              <span>{index + 1}</span>
              <div><small>{item.year}</small><strong>{item.title}</strong><p>{item.description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <details className="sueJourneyLetter glassPanel">
        <summary>Carta de Sue</summary>
        <span>Mensaje de tu guía</span>
        <h3>Carta de Sue</h3>
        <p>{result.report}</p>
      </details>

      <details className="advancedJourney glassPanel">
        <summary>Datos técnicos avanzados</summary>
        {debug && (
          <div className="debugGrid">
            <div><span>Dominio</span><strong>{debug.domainLabel || debug.domain}</strong></div>
            <div><span>Controlabilidad</span><strong>{debug.scenarioType || debug.controllability}</strong></div>
            <div><span>Contexto primario</span><strong>{(debug.primaryContext || []).join(", ") || "sin datos"}</strong></div>
            <div><span>Rutas base</span><strong>{debug.basePaths ?? 0}</strong></div>
            <div><span>Variantes</span><strong>{debug.variants ?? 0}</strong></div>
            <div><span>Rutas podadas</span><strong>{debug.prunedPaths ?? 0}</strong></div>
            <div><span>Clusters</span><strong>{debug.clusters ?? 0}</strong></div>
            <div><span>GenericityGuard</span><strong>{debug.genericityGuard?.passed ? "OK" : "Revisar"}</strong></div>
            <div><span>Fallback</span><strong>{(debug.fallbackUsed || []).join(", ") || "no"}</strong></div>
          </div>
        )}
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
