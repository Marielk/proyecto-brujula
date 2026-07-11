from brujula_engine.rules.scoring import general_compass
from brujula_engine.simulation.life_profile import profile_context


def build_life_report(scenario, states, summary, life_profile: dict | None = None) -> dict:
    final = states[-1]
    previous = states[-2] if len(states) > 1 else states[-1]
    base = states[0]
    context = profile_context(life_profile)
    scores = _derived_scores(final, previous, base, context)
    indices = _life_indices(scores)
    path = _path_summary(scenario, summary, scores, indices, context)
    life_summary = _life_summary(path, indices, scores, summary, scenario, states, context)
    return {
        "summary": path,
        "lifeSummary": life_summary,
        "indices": indices,
        "gains": _gains(indices, summary),
        "sacrifices": _sacrifices(indices, summary),
        "timeline": _timeline(states),
        "garden": _garden(scores),
        "rituals": _rituals(summary, scores, context),
        "profile": context,
    }


def _derived_scores(state, previous, base, context) -> dict:
    dashboard = state.as_dashboard()
    previous_dashboard = previous.as_dashboard()
    health = dashboard["Capacidad física"]
    energy = dashboard["Energía diaria"]
    relationships = dashboard["Relaciones"]
    purpose = dashboard["Coherencia con la Estrella del Norte"]
    creative = dashboard["Libertad para crear"]
    financial = _financial_freedom(state)
    burnout = _burnout_risk(energy, health, financial, context)
    serenity = _serenity(energy, health, relationships, burnout)
    resilience = _resilience(relationships, financial, health, energy, context)
    hope = _hope(purpose, creative, relationships, state, base, context)
    life_quality = round(
        health * 0.18
        + energy * 0.18
        + relationships * 0.17
        + purpose * 0.22
        + creative * 0.12
        + serenity * 0.13
        - max(0, burnout - 55) * 0.18,
        1,
    )
    creative_freedom = round(
        creative * 0.42
        + energy * 0.18
        + health * 0.12
        + purpose * 0.18
        + financial * 0.10
        - max(0, burnout - 60) * 0.12,
        1,
    )
    regret = _regret_probability(purpose, creative_freedom, life_quality, financial, burnout, context)
    if "Creatividad" in context["values"]:
        creative_freedom = _clamp(creative_freedom + 4)
    if "Autocuidado" in context["values"] and burnout >= 55:
        life_quality = _clamp(life_quality - 5)
        regret = _clamp(regret + 6)
    return {
        "calidadVida": _clamp(life_quality),
        "libertadFinanciera": financial,
        "libertadCreativa": _clamp(creative_freedom),
        "saludIntegral": _clamp(round(health * 0.58 + energy * 0.22 + serenity * 0.20, 1)),
        "energiaVital": energy,
        "fortalezaRelaciones": relationships,
        "proposito": purpose,
        "riesgoAgotamiento": burnout,
        "probabilidadArrepentimiento": regret,
        "coherenciaEstrellaNorte": purpose,
        "serenidad": serenity,
        "resiliencia": resilience,
        "esperanza": hope,
        "financialTrend": financial - _financial_freedom(previous),
        "energyTrend": energy - previous_dashboard["Energía diaria"],
    }


def _life_indices(scores) -> list[dict]:
    items = [
        ("Calidad de Vida", "🌿", scores["calidadVida"], False, "Qué tan agradable y sostenible se ve este camino."),
        ("Libertad Financiera", "💰", scores["libertadFinanciera"], False, "Cuánto margen real entrega para decidir con calma."),
        ("Libertad Creativa", "✨", scores["libertadCreativa"], False, "Cuánto espacio aparece para crear algo propio."),
        ("Salud Integral", "🌳", scores["saludIntegral"], False, "Qué tan preparado está cuerpo y mente para sostener el camino."),
        ("Energía Vital", "🌙", scores["energiaVital"], False, "Con cuánta energía cotidiana se vive este escenario."),
        ("Fortaleza de Relaciones", "🏡", scores["fortalezaRelaciones"], False, "Qué tan fuerte aparece la red afectiva y de apoyo."),
        ("Propósito", "⭐", scores["proposito"], False, "Cuánto conecta este camino con una vida con sentido."),
        ("Riesgo de Agotamiento", "⚠️", scores["riesgoAgotamiento"], True, "Cuánto descanso y límites pedirá este escenario."),
        (
            "Probabilidad de Arrepentimiento",
            "🍂",
            scores["probabilidadArrepentimiento"],
            True,
            "Qué tan probable es que el camino se sienta poco propio más adelante.",
        ),
        (
            "Coherencia con la Estrella del Norte",
            "🔵",
            scores["coherenciaEstrellaNorte"],
            False,
            "Qué tanto se parece a la vida que declaraste querer cultivar.",
        ),
    ]
    return [_index_item(*item) for item in items]


def _financial_freedom(state) -> float:
    margin = max(0, state.monthly_income - state.monthly_expenses)
    margin_score = min(100, (margin / max(state.monthly_expenses, 1)) * 100)
    months_saved = state.savings / max(state.monthly_expenses, 1)
    savings_score = min(100, months_saved / 12 * 100)
    debt_pressure = min(100, state.debt_total / max(state.monthly_income * 6, 1) * 100)
    return _clamp(round(margin_score * 0.30 + savings_score * 0.35 + (100 - debt_pressure) * 0.35, 1))


def _burnout_risk(energy: float, health: float, financial: float, context) -> float:
    risk = 100 - (energy * 0.42 + health * 0.28 + financial * 0.18 + 12)
    if context["healthLimits"] == "Mucho":
        risk += 10
    if context["savingsLevel"] == "Ninguno":
        risk += 4
    return _clamp(round(risk, 1))


def _serenity(energy, health, relationships, burnout) -> float:
    return _clamp(round(energy * 0.28 + health * 0.18 + relationships * 0.24 + (100 - burnout) * 0.30, 1))


def _resilience(relationships, financial, health, energy, context) -> float:
    penalty = 8 if context["savingsLevel"] == "Ninguno" else 0
    return _clamp(round(relationships * 0.28 + financial * 0.28 + health * 0.22 + energy * 0.22 - penalty, 1))


def _hope(purpose, creative, relationships, state, base, context) -> float:
    progress = 8 if state.savings > base.savings else 0
    dream_bonus = 6 if context["mainDream"] or context["tenYearDay"] else 0
    return _clamp(round(purpose * 0.34 + creative * 0.26 + relationships * 0.20 + progress + dream_bonus + 12, 1))


def _regret_probability(purpose, creative_freedom, life_quality, financial, burnout, context) -> float:
    regret = 100 - (purpose * 0.32 + creative_freedom * 0.24 + life_quality * 0.22 + financial * 0.12) + burnout * 0.10
    if context["nonNegotiables"] and burnout >= 55:
        regret += 5
    if "Autocuidado" in context["values"] and burnout >= 55:
        regret += 5
    return _clamp(round(regret, 1))


def _index_item(label: str, icon: str, value: float, inverse: bool, description: str) -> dict:
    return {
        "label": label,
        "icon": icon,
        "value": round(value, 1),
        "level": _level(value, inverse),
        "tone": _tone(value, inverse),
        "description": _index_description(label, value, inverse, description),
        "inverse": inverse,
    }


def _level(value: float, inverse: bool = False) -> str:
    score = 100 - value if inverse else value
    if score < 30:
        return "Crítico"
    if score < 50:
        return "Frágil"
    if score < 70:
        return "En construcción"
    if score < 85:
        return "Sólido"
    return "Fortaleza"


def _tone(value: float, inverse: bool = False) -> str:
    score = 100 - value if inverse else value
    if score < 30:
        return "red"
    if score < 50:
        return "orange"
    if score < 70:
        return "yellow"
    if score < 85:
        return "green"
    return "blue"


def _index_description(label: str, value: float, inverse: bool, default: str) -> str:
    if label == "Riesgo de Agotamiento":
        if value >= 70:
            return "Este camino puede volverse muy exigente si no proteges descanso y límites."
        if value >= 45:
            return "Hay exigencia posible: conviene avanzar sin descuidarte."
        return "El camino parece manejable si conservas pausas y recuperación."
    if label == "Probabilidad de Arrepentimiento":
        if value >= 65:
            return "Hay señales de distancia con tus valores o con tu bienestar cotidiano."
        if value >= 40:
            return "Conviene revisar qué parte del camino se siente realmente tuya."
        return "El escenario parece coherente con tus valores y sueños de largo plazo."
    score = 100 - value if inverse else value
    if score >= 85:
        return default + " Aparece como una fortaleza clara."
    if score >= 70:
        return default + " Se ve sólido, aunque todavía requiere cuidado."
    if score >= 50:
        return default + " Está creciendo, pero necesita bases más firmes."
    return default + " Es un punto sensible del escenario."


def _path_summary(scenario, summary, scores, indices, context) -> dict:
    compass = summary["compass"]
    burnout = scores["riesgoAgotamiento"]
    regret = scores["probabilidadArrepentimiento"]
    financial = scores["libertadFinanciera"]
    if compass >= 70 and burnout < 45 and regret < 45:
        title = "🌿 Camino prometedor"
    elif compass >= 60:
        title = "🌱 Camino en construcción"
    elif compass >= 48:
        title = "🍂 Camino exigente"
    elif financial < 35 or burnout >= 70:
        title = "⚠️ Camino riesgoso"
    else:
        title = "❄️ Camino de pausa"

    strongest = _strongest_human(indices)
    care = _main_care(indices)
    if context["healthLimits"] == "Mucho":
        care = "Salud Integral"
    elif context["savingsLevel"] == "Ninguno" and financial < 55:
        care = "Libertad Financiera"
    name = f"{context['name']}, " if context["name"] else ""
    return {
        "title": title,
        "diagnosis": title.split(" ", 1)[1] if " " in title else title,
        "status": _level(compass),
        "description": (
            f"{name}este camino fortalece {strongest.lower()}. "
            f"El cuidado principal será {care.lower()}, para que el proyecto avance al ritmo de tu vida."
        ),
        "strongest": strongest,
        "mainCare": care,
    }


def _life_summary(path, indices, scores, summary, scenario, states, context) -> dict:
    return {
        "diagnosticoCamino": path["diagnosis"],
        "calidadVida": scores["calidadVida"],
        "libertadFinanciera": scores["libertadFinanciera"],
        "libertadCreativa": scores["libertadCreativa"],
        "saludIntegral": scores["saludIntegral"],
        "energiaVital": scores["energiaVital"],
        "serenidad": scores["serenidad"],
        "resiliencia": scores["resiliencia"],
        "esperanza": scores["esperanza"],
        "riesgoAgotamiento": _risk_text(scores["riesgoAgotamiento"]),
        "probabilidadArrepentimiento": _risk_text(scores["probabilidadArrepentimiento"]),
        "coherenciaEstrellaNorte": _level(scores["coherenciaEstrellaNorte"]),
        "fortalezas": _fortalezas(indices),
        "cuidados": _cuidados(indices),
        "eventosCamino": _timeline(states),
        "valores": context["values"] or ["Creatividad", "Autocuidado", "Relaciones saludables", "Propósito"],
        "suenos": context["dreams"] or _dreams(scenario),
        "perfil": {
            "nombre": context["name"],
            "edad": context["age"],
            "lugar": ", ".join(part for part in [context["city"], context["country"]] if part),
            "suenoPrincipal": context["mainDream"],
            "noNegociables": context["nonNegotiables"],
            "tonoAcompanamiento": context["supportTone"],
            "recargas": context["recharges"],
            "drenajes": context["drains"],
            "destacados": context["highlights"],
        },
        "escenario": scenario.name,
        "brujulaGeneral": summary["compass"],
    }


def _timeline(states) -> list[dict]:
    events = []
    for previous, current in zip(states, states[1:]):
        title = _event_title(previous, current)
        if not title:
            continue
        events.append(
            {
                "year": current.year,
                "icon": _event_icon(previous, current),
                "title": title,
                "description": _event_description(previous, current),
            }
        )
    if len(events) > 7:
        first = events[:4]
        last = events[-3:]
        events = first + last
    return events[:8]


def _event_title(previous, current) -> str | None:
    if current.notes and current.notes[-1].startswith(f"{current.year}:"):
        return current.notes[-1].split(": ", 1)[1]
    dashboard = current.as_dashboard()
    previous_dashboard = previous.as_dashboard()
    if dashboard["Libertad para crear"] - previous_dashboard["Libertad para crear"] >= 3:
        return "Aumenta tu espacio creativo"
    if dashboard["Energía diaria"] - previous_dashboard["Energía diaria"] <= -2:
        return "La energía pide una pausa"
    if current.debt_total < previous.debt_total and current.year in (2028, 2031, 2035):
        return "Las raíces financieras se fortalecen"
    if abs(general_compass(dashboard) - general_compass(previous_dashboard)) >= 1.2:
        return "El camino cambia de ritmo"
    return None


def _event_icon(previous, current) -> str:
    dashboard = current.as_dashboard()
    previous_dashboard = previous.as_dashboard()
    if dashboard["Libertad para crear"] > previous_dashboard["Libertad para crear"]:
        return "✨"
    if dashboard["Energía diaria"] < previous_dashboard["Energía diaria"]:
        return "⚠️"
    if current.debt_total < previous.debt_total:
        return "🌳"
    return "🌱"


def _event_description(previous, current) -> str:
    dashboard = current.as_dashboard()
    previous_dashboard = previous.as_dashboard()
    if dashboard["Libertad para crear"] > previous_dashboard["Libertad para crear"]:
        return "Aparece más espacio para crear, siempre que el descanso acompañe el crecimiento."
    if dashboard["Energía diaria"] < previous_dashboard["Energía diaria"]:
        return "El proyecto puede pedir más de tu cuerpo; conviene bajar velocidad antes de agotarte."
    if current.debt_total < previous.debt_total:
        return "Disminuyen obligaciones y se abre un poco más de margen para decidir."
    return "El escenario muestra un cambio que merece ser observado con calma."


def _garden(scores) -> list[dict]:
    return [
        _garden_item("🌳", "Salud", scores["saludIntegral"], "Tu cuerpo y tu mente son la tierra que sostiene este camino."),
        _garden_item("🌼", "Creatividad", scores["libertadCreativa"], "Tu capacidad creativa muestra cuánto puede florecer el proyecto."),
        _garden_item("🏡", "Relaciones", scores["fortalezaRelaciones"], "Tus vínculos aparecen como refugio y red de apoyo."),
        _garden_item("💰", "Libertad financiera", scores["libertadFinanciera"], "Las raíces financieras dan margen para elegir sin tanta presión."),
        _garden_item("🌙", "Serenidad", scores["serenidad"], "La calma interior ayuda a que el jardín no crezca desde la urgencia."),
    ]


def _garden_item(icon, label, value, description) -> dict:
    filled = max(0, min(10, round(value / 10)))
    return {
        "icon": icon,
        "label": label,
        "value": round(value, 1),
        "filled": filled,
        "empty": 10 - filled,
        "description": description,
    }


def _gains(indices, summary) -> list[str]:
    strengths = sorted(
        [item for item in indices if not item["inverse"]],
        key=lambda item: item["value"],
        reverse=True,
    )
    gains = [f"{item['label']}: {item['description']}" for item in strengths[:3]]
    if summary["strongest"] not in " ".join(gains):
        gains.append(f"También destaca {summary['strongest'].lower()} como soporte del camino.")
    return gains[:4]


def _sacrifices(indices, summary) -> list[str]:
    weak = sorted(
        indices,
        key=lambda item: 100 - item["value"] if item["inverse"] else item["value"],
    )
    sacrifices = [f"{item['label']}: {item['description']}" for item in weak[:3]]
    if summary["weakest"] not in " ".join(sacrifices):
        sacrifices.append(f"El cuidado principal sigue siendo {summary['weakest'].lower()}.")
    return sacrifices[:4]


def _rituals(summary, scores, context) -> list[str]:
    rituals = []
    recharges = context["recharges"]
    ritual_types = context["ritualTypes"]
    if "Dormir" in recharges or "Descanso" in ritual_types:
        rituals.append("💤 Elegir una noche para dormir antes, sin convertirlo en obligación.")
    if "Naturaleza" in recharges or "Naturaleza" in ritual_types:
        rituals.append("🌳 Salir a mirar cielo o árboles durante diez minutos.")
    if "Crear" in recharges or "Creatividad" in ritual_types:
        rituals.append("📖 Abrir un espacio pequeño para crear sin evaluar el resultado.")
    if "Conversar con alguien querido" in recharges or "Relaciones" in ritual_types:
        rituals.append("🏡 Escribirle a alguien que te devuelva calma.")
    if not rituals:
        rituals = [
            "☕ Preparar algo caliente y sentarte diez minutos sin pantalla.",
            "🌳 Salir a caminar veinte minutos sin convertirlo en meta.",
        ]
    weakest = summary["weakest"].lower()
    if "física" in weakest or "energía" in weakest or scores["riesgoAgotamiento"] >= 45:
        rituals.append("💤 Dormir media hora antes una noche de esta semana.")
    if scores["libertadCreativa"] >= 55:
        rituals.append("📖 Escribir una página pequeña de Brújula, sin corregirla.")
    if scores["fortalezaRelaciones"] >= 70:
        rituals.append("🏡 Mandar un mensaje honesto a alguien que te haga sentir en casa.")
    if scores["serenidad"] < 60:
        rituals.append("🌙 Dejar el celular lejos durante los últimos quince minutos del día.")
    if "Empatía" in context["values"]:
        rituals.append("🌿 Elegir una acción amable que no requiera comprar nada.")
    return list(dict.fromkeys(rituals))[:5]


def _fortalezas(indices) -> list[str]:
    return [f"{item['label']}: {item['level']}" for item in sorted(indices, key=lambda i: i["value"], reverse=True)[:3]]


def _cuidados(indices) -> list[str]:
    return [
        f"{item['label']}: {item['level']}"
        for item in sorted(indices, key=lambda i: 100 - i["value"] if i["inverse"] else i["value"])[:3]
    ]


def _strongest_human(indices) -> str:
    item = max([index for index in indices if not index["inverse"]], key=lambda index: index["value"])
    return item["label"]


def _main_care(indices) -> str:
    item = min(indices, key=lambda index: 100 - index["value"] if index["inverse"] else index["value"])
    return item["label"]


def _risk_text(value: float) -> str:
    if value < 30:
        return "Muy baja"
    if value < 50:
        return "Baja"
    if value < 70:
        return "Media"
    if value < 85:
        return "Alta"
    return "Muy alta"


def _dreams(scenario) -> list[str]:
    text = f"{scenario.name} {scenario.description}".lower()
    dreams = ["Construir una vida tranquila y con sentido"]
    if "brújula" in text or "brujula" in text:
        dreams.append("Ayudar a otras personas desde Brújula")
    if "creativ" in text or "proyecto" in text:
        dreams.append("Vivir con más espacio para crear")
    if "salud" in text or "energ" in text:
        dreams.append("Cuidar el cuerpo mientras el proyecto crece")
    return dreams[:4]


def _clamp(value: float) -> float:
    return max(0, min(100, value))
