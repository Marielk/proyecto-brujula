"use client";

import type { LifeProfile, SimulationResult } from "../../../lib/types";
import { GardenBar, IndexCard, SectionTitle } from "./SharedControls";

export function LegacyResults({ result, isLoading }: { result: SimulationResult | null; isLoading: boolean }) {
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


export function ProfileSummary({ profile, message, onEdit, onDelete }: { profile: LifeProfile; message: string; onEdit: () => void; onDelete: () => void }) {
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


