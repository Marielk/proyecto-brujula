"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useEffect, useRef } from "react";
import type { LifeProfile, SimulationResult } from "../../../lib/types";
import type { JourneyFlowState } from "../model";
import { EXAMPLE, JOURNEY_STAGE_DEFINITIONS } from "../model";
import { ProfileSummary } from "./LegacyResults";
import { JourneyResults } from "./JourneyResults";

export function JourneyMode({
  profile,
  profileMessage,
  flow,
  text,
  model,
  result,
  error,
  isLoading,
  onText,
  onModel,
  onSubmit,
  onCancel,
  onRetry,
  onEditGoal,
  onNewJourney,
  onEditProfile,
  onDeleteProfile
}: {
  profile: LifeProfile;
  profileMessage: string;
  flow: JourneyFlowState;
  text: string;
  model: string;
  result: SimulationResult | null;
  error: string;
  isLoading: boolean;
  onText: (value: string) => void;
  onModel: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onRetry: () => void;
  onEditGoal: () => void;
  onNewJourney: () => void;
  onEditProfile: () => void;
  onDeleteProfile: () => void;
}) {
  const destinationRef = useRef<HTMLTextAreaElement | null>(null);
  const resultTitleRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (flow.status === "input") {
      destinationRef.current?.focus();
    }
    if (flow.status === "result") {
      resultTitleRef.current?.focus();
    }
  }, [flow.status]);

  if (flow.status === "loading") {
    return <JourneyLoading flow={flow} onCancel={onCancel} />;
  }

  if (flow.status === "error") {
    return (
      <JourneyError
        flow={flow}
        technicalError={error}
        onRetry={onRetry}
        onEditGoal={onEditGoal}
        onHome={onNewJourney}
      />
    );
  }

  if (flow.status === "result" && result) {
    return (
      <JourneyResults
        result={result}
        goal={flow.goal}
        simulationId={flow.simulationId}
        completedAt={flow.completedAt}
        titleRef={resultTitleRef}
        onEditGoal={onEditGoal}
        onNewJourney={onNewJourney}
        profile={profile}
      />
    );
  }

  return (
    <section className="journeyScreen">
      <header className="journeyHeader">
        <h1>Planificar un Viaje</h1>
        <p>Explora el camino hacia tu sueño utilizando tu Perfil de Vida como brújula.</p>
      </header>

      <form className="journeyInput glassPanel" id="journey-form" name="journey-form" onSubmit={onSubmit}>
        <label htmlFor="scenario">¿Cuál es tu destino?</label>
        <textarea ref={destinationRef} id="scenario" value={text} onChange={(event) => onText(event.target.value)} rows={4} placeholder="Ej: Dedicarme gradualmente al arte, cuidar mi salud y sostener mis ingresos..." />
        <div className="journeyControls">
          <button type="submit" disabled={isLoading || !text.trim()}>{isLoading ? "Trazando ruta..." : "Trazar ruta"}</button>
          <button className="secondaryButton" type="button" onClick={onEditProfile}>Revisar Perfil de Vida</button>
          <a className="secondaryButton" href="/viaje/historial">Historial</a>
        </div>
        <details className="technicalMode">
          <summary>Modo técnico</summary>
          <label htmlFor="model">Modelo Ollama</label>
          <input id="model" value={model} onChange={(event) => onModel(event.target.value)} />
        </details>
      </form>

      <div className="journeyEmpty glassPanel">
        <ProfileSummary profile={profile} message={profileMessage} onEdit={onEditProfile} onDelete={onDeleteProfile} />
      </div>
    </section>
  );
}

export function JourneyLoading({ flow, onCancel }: { flow: Extract<JourneyFlowState, { status: "loading" }>; onCancel: () => void }) {
  const currentIndex = JOURNEY_STAGE_DEFINITIONS.findIndex((stage) => stage.id === flow.stage);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  return (
    <section className="journeyScreen journeyLoadingScreen" aria-busy="true">
      <div className="journeyLoading">
      <div className="loadingOrb" aria-hidden="true">
        <Image src="/assets/sue-mapa.png" alt="" width={240} height={240} sizes="180px" priority />
      </div>
      <h1>Brújula está explorando muchos futuros posibles.</h1>
      <p>Estamos recorriendo distintas rutas para encontrar aquella que mejor equilibra bienestar, propósito y posibilidades reales.</p>
      <progress max={100} value={flow.progress} aria-label={`Progreso de la simulación: ${flow.progress}%`} />
      <strong className="loadingProgress">{flow.progress}%</strong>
      <p className="stageMessage" aria-live="polite">{flow.message}</p>
      <div className="loadingSteps">
        {JOURNEY_STAGE_DEFINITIONS.map((item, index) => (
          <p className={index < safeIndex ? "doneStep" : index === safeIndex ? "activeStep" : "pendingStep"} key={item.id}>
            <span>{index < safeIndex ? "✓" : index === safeIndex ? "•" : "·"}</span>{item.label}
          </p>
        ))}
      </div>
      <button className="secondaryButton" type="button" onClick={onCancel}>Cancelar simulación</button>
      </div>
    </section>
  );
}

export function JourneyError({
  flow,
  technicalError,
  onRetry,
  onEditGoal,
  onHome
}: {
  flow: Extract<JourneyFlowState, { status: "error" }>;
  technicalError: string;
  onRetry: () => void;
  onEditGoal: () => void;
  onHome: () => void;
}) {
  return (
    <section className="journeyScreen journeyErrorScreen">
      <article className="journeyErrorState glassPanel">
        <span>Viaje interrumpido</span>
        <h1>Parece que la niebla cubrió el sendero.</h1>
        <p>No pudimos completar esta simulación, pero tu destino sigue guardado.</p>
        <blockquote>{flow.goal}</blockquote>
        <div className="resultActions">
          <button type="button" onClick={onRetry}>Reintentar</button>
          <button className="secondaryButton" type="button" onClick={onEditGoal}>Editar destino</button>
          <button className="secondaryButton" type="button" onClick={onHome}>Volver al inicio</button>
        </div>
        {technicalError && (
          <details className="technicalMode">
            <summary>Detalle técnico</summary>
            <p>{technicalError}</p>
          </details>
        )}
      </article>
    </section>
  );
}
