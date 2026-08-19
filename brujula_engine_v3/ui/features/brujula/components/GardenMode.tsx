"use client";

import Image from "next/image";
import type { DailyCheckIn, GardenIndicator, GardenNeed, GardenTime, RitualOutcome, RitualRecommendation } from "../../../lib/types";
import { ChoicePanel, RangeControl } from "./SharedControls";
import { gardenNeedLabel } from "./garden-utils";

export function GardenMode({
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
            <Image src="/assets/ritual-tea-garden.png" alt="Bebida caliente en un jardín sereno" width={420} height={280} sizes="(max-width: 900px) 100vw, 420px" />
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
