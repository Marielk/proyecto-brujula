"use client";

import type { LifeProfile } from "../../../lib/types";
import type { Mode } from "../model";

export function AppNav({ mode, onMode, onEditProfile }: { mode: Mode; onMode: (mode: Mode) => void; onEditProfile: () => void }) {
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

export function ModeLanding({ profile, onMode }: { profile: LifeProfile; onMode: (mode: Mode) => void }) {
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


export function AppFooter() {
  return (
    <footer className="appFooter">
      <strong>Brújula</strong>
      <p>© 2024 Brújula. Cultivando tu bienestar interior.</p>
    </footer>
  );
}

