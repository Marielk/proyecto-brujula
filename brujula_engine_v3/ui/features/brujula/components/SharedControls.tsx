"use client";

import type { ReactNode } from "react";
import type { GardenItem, LifeIndex } from "../../../lib/types";
import { scaleLabel } from "../profile-utils";

export function ChoicePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glassPanel choicePanel">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

export function RangeControl({ label, icon, value, onChange }: { label: string; icon: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="rangeControl">
      <span><strong>{label}</strong><em>{icon}</em></span>
      <input type="range" min={0} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}


export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="sectionTitle">
      <p className="eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
    </div>
  );
}

export function IndexCard({ index }: { index: LifeIndex }) {
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

export function GardenBar({ item }: { item: GardenItem }) {
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

export function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="fieldLabel">
      <span>{label}{required ? " *" : ""}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="fieldLabel fullField">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
    </label>
  );
}

export function NumberField({ label, value, onChange, required, min = 0, max }: { label: string; value: number | ""; onChange: (value: number | "") => void; required?: boolean; min?: number; max?: number }) {
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

export function SelectField({ label, value, options, onChange, required }: { label: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean }) {
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

export function ScaleField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="fieldLabel scaleField">
      <span>{label}</span>
      <input type="range" min={1} max={5} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <small>{scaleLabel(value)}</small>
    </label>
  );
}

export function MultiSelect({ label, values, options, onChange, max }: { label: string; values: string[]; options: string[]; onChange: (values: string[]) => void; max?: number }) {
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
