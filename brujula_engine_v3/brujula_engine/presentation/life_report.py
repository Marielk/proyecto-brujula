from brujula_engine.rules.scoring import general_compass
from brujula_engine.simulation.journey_goal import (
    domain_avoid_list,
    domain_first_step,
    domain_milestones,
    domain_metrics,
    domain_risks,
    domain_rituals,
    domain_strengths,
    domain_success_conditions,
)
from brujula_engine.simulation.life_profile import profile_context


def build_life_report(scenario, states, summary, life_profile: dict | None = None, goal: dict | None = None) -> dict:
    final = states[-1]
    previous = states[-2] if len(states) > 1 else states[-1]
    base = states[0]
    context = profile_context(life_profile)
    scores = _derived_scores(final, previous, base, context)
    goal = goal or {"spec": {"domain": "general", "goalType": "objetivo general", "supported": False}}
    domain_metric_values = domain_metrics(goal, scores, summary, context)
    indices = _life_indices(scores, goal, domain_metric_values)
    path = _path_summary(scenario, summary, scores, indices, context)
    journey_guidance = _journey_guidance(path, indices, scores, summary, scenario, states, context, goal, domain_metric_values)
    life_summary = _life_summary(path, indices, scores, summary, scenario, states, context, journey_guidance)
    return {
        "summary": path,
        "lifeSummary": life_summary,
        "journeyGuidance": journey_guidance,
        "indices": indices,
        "gains": _gains(indices, summary),
        "sacrifices": _sacrifices(indices, summary),
        "timeline": journey_guidance.get("domainMilestones") or _timeline(states),
        "garden": _garden(scores),
        "rituals": journey_guidance.get("domainRituals") or _rituals(summary, scores, context),
        "profile": context,
        "goal": goal["spec"],
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


def _life_indices(scores, goal: dict | None = None, domain_metric_values: dict | None = None) -> list[dict]:
    items = [
        ("Calidad de Vida", "🌿", scores["calidadVida"], False, "Qué tan agradable y sostenible se ve este camino."),
        ("Libertad Financiera", "💰", scores["libertadFinanciera"], False, "Cuánto margen real entrega para decidir con calma."),
        ("Serenidad", "🌙", scores["serenidad"], False, "Qué tanta calma existe para decidir sin urgencia."),
        ("Propósito", "⭐", scores["proposito"], False, "Cuánto conecta este camino con una vida con sentido."),
    ]
    for label, value in (domain_metric_values or {}).items():
        inverse = label.startswith("Riesgo")
        icon = "⚠️" if inverse else _domain_icon(goal, label)
        items.append((label, icon, value, inverse, _domain_index_description(goal, label)))
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
    preparation = _path_preparation(scores, summary)
    if preparation >= 72 and burnout < 48 and regret < 55:
        title = "🌱 Este camino parece posible"
    elif preparation >= 54:
        title = "🌿 Este camino puede funcionar"
    elif financial < 35 or burnout >= 70 or preparation < 42:
        title = "🌧️ Hoy este escenario parece frágil"
    else:
        title = "🌿 Este camino puede funcionar"

    strongest = _strongest_human(indices)
    care = _main_care(indices)
    if context["healthLimits"] == "Mucho":
        care = "Salud Integral"
    elif context["savingsLevel"] == "Ninguno" and financial < 55:
        care = "Libertad Financiera"
    name = f"{context['name']}, " if context["name"] else ""
    return {
        "title": title,
        "diagnosis": _conclusion_label(preparation, financial, burnout, regret),
        "status": _level(preparation),
        "description": (
            f"{name}este sueño no se mide como un veredicto cerrado. "
            f"Hoy la preparación del camino se apoya en {strongest.lower()}, "
            f"pero necesita cuidar {care.lower()} para volverse más sostenible."
        ),
        "strongest": strongest,
        "mainCare": care,
        "preparation": preparation,
    }


def _life_summary(path, indices, scores, summary, scenario, states, context, journey_guidance) -> dict:
    return {
        "domain": journey_guidance["goal"]["domain"],
        "goalType": journey_guidance["goal"]["goalType"],
        "domainMetrics": journey_guidance["domainMetrics"],
        "domainRisks": journey_guidance["domainRisks"],
        "domainMilestones": journey_guidance["domainMilestones"],
        "successConditions": journey_guidance["successConditions"],
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
        "preparacionCamino": journey_guidance["preparation"],
        "guiaViaje": journey_guidance,
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


def _journey_guidance(path, indices, scores, summary, scenario, states, context, goal, domain_metric_values) -> dict:
    preparation = _path_preparation(scores, summary)
    strengths = domain_strengths(goal, domain_metric_values, scores, context) if goal["spec"]["supported"] else identify_strengths(indices)
    weaknesses = domain_risks(goal, domain_metric_values, scores, context) if goal["spec"]["supported"] else identify_weaknesses(indices, scores, context)
    conditions = domain_success_conditions(goal, domain_metric_values, scores, context) if goal["spec"]["supported"] else build_success_conditions(scores, summary, context)
    avoid = domain_avoid_list(goal, domain_metric_values, scores, context) if goal["spec"]["supported"] else build_avoid_list(scores, summary, context)
    first_step = domain_first_step(goal, domain_metric_values, scores, context) if goal["spec"]["supported"] else choose_highest_impact_action(scores, summary, context)
    milestones = domain_milestones(goal, context) if goal["spec"]["supported"] else _timeline(states)
    rituals = domain_rituals(goal, context) if goal["spec"]["supported"] else _rituals(summary, scores, context)
    return {
        "goal": goal["spec"],
        "unsupportedWarning": goal.get("unsupportedWarning"),
        "conclusion": explain_conclusion(preparation, strengths, weaknesses, path),
        "preparation": preparation,
        "preparationLabel": _level(preparation),
        "preparationExplanation": (
            "La preparación del camino muestra cuánto soporte existe hoy para sostener este sueño. "
            "No predice el futuro: señala qué pilares ya están construidos y cuáles conviene fortalecer."
        ),
        "flowers": strengths,
        "cares": weaknesses,
        "domainMetrics": domain_metric_values,
        "domainRisks": weaknesses,
        "domainMilestones": milestones,
        "domainRituals": rituals,
        "successConditions": conditions,
        "avoidList": avoid,
        "firstStep": first_step,
        "focusQuestion": "¿Qué tendría que cambiar para que este sueño sea posible?",
    }


def explain_conclusion(preparation: float, strengths: list[dict], weaknesses: list[dict], path: dict) -> dict:
    care_label = weaknesses[0]["label"].lower() if weaknesses else path["mainCare"].lower()
    strength_label = strengths[0]["label"].lower() if strengths else path["strongest"].lower()
    if preparation >= 72:
        tone = "promising"
        title = "🌱 Este camino parece posible."
        body = (
            f"Hay una base real en {strength_label}. Todavía necesita cuidar {care_label}, "
            "pero el sueño conversa con varias partes de la vida que quieres construir."
        )
    elif preparation >= 54:
        tone = "demanding"
        title = "🌿 Este camino puede funcionar."
        body = (
            f"No aparece como un salto imposible, pero sí como un viaje que pide preparación. "
            f"Fortalecer {care_label} aumentaría mucho su sostenibilidad."
        )
    else:
        tone = "fragile"
        title = "🌧️ Hoy este escenario parece demasiado riesgoso."
        body = (
            f"No porque el sueño sea imposible, sino porque las condiciones actuales todavía no lo sostienen. "
            f"El primer cuidado debería estar en {care_label}, antes de acelerar."
        )
    return {"tone": tone, "title": title, "body": body}


def identify_strengths(indices) -> list[dict]:
    candidates = sorted(
        [item for item in indices if not item["inverse"]],
        key=lambda item: item["value"],
        reverse=True,
    )
    strengths = []
    for item in candidates[:4]:
        if item["value"] < 50:
            continue
        strengths.append(
            {
                "label": _plain_strength_label(item["label"]),
                "impact": _strength_impact(item),
                "value": item["value"],
            }
        )
    return strengths or [
        {
            "label": "Sueño declarado",
            "impact": "El deseo existe y puede convertirse en hipótesis de camino si se prueba en pequeño.",
            "value": 50,
        }
    ]


def identify_weaknesses(indices, scores, context) -> list[dict]:
    weak = sorted(indices, key=lambda item: 100 - item["value"] if item["inverse"] else item["value"])
    cares = []
    for item in weak[:5]:
        normalized_score = 100 - item["value"] if item["inverse"] else item["value"]
        if normalized_score >= 72 and len(cares) >= 2:
            continue
        cares.append(
            {
                "label": _plain_care_label(item["label"]),
                "impact": _care_impact(item, scores, context),
                "value": item["value"],
                "inverse": item["inverse"],
            }
        )
    return cares[:4]


def build_success_conditions(scores, summary, context) -> list[str]:
    conditions = []
    if scores["libertadFinanciera"] < 60 or context["savingsLevel"] == "Ninguno":
        conditions.append("Construir un fondo de emergencia antes de aumentar el riesgo del cambio.")
    if scores["energiaVital"] < 58 or scores["riesgoAgotamiento"] >= 50:
        conditions.append("Proteger descanso y límites para que el viaje no dependa de agotarte.")
    if scores["saludIntegral"] < 58 or context["healthLimits"] in ["Moderadamente", "Mucho"]:
        conditions.append("Adaptar el ritmo a tu salud actual, con metas pequeñas y sostenibles.")
    if scores["libertadCreativa"] < 60:
        conditions.append("Reservar un espacio semanal fijo para crear y validar el proyecto.")
    if scores["resiliencia"] < 60:
        conditions.append("Buscar una red de apoyo o una persona testigo antes de tomar decisiones grandes.")
    if summary["weakest"] == "Estabilidad financiera":
        conditions.append("Validar ingresos posibles antes de soltar la fuente principal de estabilidad.")
    if not conditions:
        conditions = [
            "Mantener el avance gradual, revisando el camino cada tres meses.",
            "Probar el sueño en pequeño antes de convertirlo en obligación.",
            "Cuidar descanso, dinero y vínculos como parte del plan, no como premio final.",
        ]
    return list(dict.fromkeys(conditions))[:5]


def build_avoid_list(scores, summary, context) -> list[str]:
    avoid = []
    if scores["libertadFinanciera"] < 58:
        avoid.append("Renunciar inmediatamente sin colchón financiero.")
        avoid.append("Financiar el proyecto con más deuda.")
    if scores["riesgoAgotamiento"] >= 45 or scores["energiaVital"] < 60:
        avoid.append("Trabajar siete días por semana para compensar la incertidumbre.")
    if scores["saludIntegral"] < 60 or context["healthLimits"] in ["Moderadamente", "Mucho"]:
        avoid.append("Ignorar señales del cuerpo para cumplir un calendario rígido.")
    if scores["libertadCreativa"] < 55:
        avoid.append("Exigir resultados públicos antes de tener una práctica mínima.")
    if not avoid:
        avoid = [
            "Convertir el sueño en una carrera contra el tiempo.",
            "Medir el avance solo por dinero o validación externa.",
            "Tomar una decisión irreversible sin revisar tus datos reales.",
        ]
    return list(dict.fromkeys(avoid))[:5]


def choose_highest_impact_action(scores, summary, context) -> dict:
    if scores["libertadFinanciera"] < 55 or context["savingsLevel"] == "Ninguno":
        return {
            "title": "Construir un fondo de emergencia inicial.",
            "why": "Ese margen baja la urgencia y permite probar el sueño sin que cada error se vuelva una crisis.",
        }
    if scores["riesgoAgotamiento"] >= 55 or scores["energiaVital"] < 55:
        return {
            "title": "Definir un límite semanal de energía para el proyecto.",
            "why": "Si el viaje empieza cuidando descanso, tiene más posibilidades de durar.",
        }
    if scores["saludIntegral"] < 58 or context["healthLimits"] in ["Moderadamente", "Mucho"]:
        return {
            "title": "Diseñar una versión del sueño compatible con tu salud actual.",
            "why": "El camino mejora cuando el cuerpo deja de ser costo oculto y pasa a ser condición de diseño.",
        }
    if scores["libertadCreativa"] < 60:
        return {
            "title": "Hacer un experimento creativo pequeño durante cuatro semanas.",
            "why": "Un experimento real entrega aprendizaje sin obligarte a apostar toda la vida de una vez.",
        }
    return {
        "title": "Elegir una prueba pequeña y fechar una revisión en 30 días.",
        "why": "La claridad aumenta cuando el sueño sale de la imaginación y se convierte en evidencia amable.",
    }


def _path_preparation(scores, summary) -> float:
    preparation = (
        scores["saludIntegral"] * 0.16
        + scores["energiaVital"] * 0.15
        + scores["libertadFinanciera"] * 0.18
        + scores["proposito"] * 0.18
        + scores["fortalezaRelaciones"] * 0.11
        + scores["resiliencia"] * 0.12
        + scores["serenidad"] * 0.10
        - max(0, scores["riesgoAgotamiento"] - 55) * 0.12
    )
    return _clamp(round(preparation, 1))


def _conclusion_label(preparation, financial, burnout, regret) -> str:
    if preparation >= 72 and burnout < 48 and regret < 55:
        return "Camino prometedor"
    if preparation >= 54:
        return "Camino exigente"
    if financial < 35 or burnout >= 70 or preparation < 42:
        return "Camino frágil"
    return "Camino exigente"


def _plain_strength_label(label: str) -> str:
    return {
        "Propósito": "propósito sólido",
        "Libertad Creativa": "creatividad disponible",
        "Fortaleza de Relaciones": "relaciones fuertes",
        "Resiliencia": "buena resiliencia",
        "Libertad Financiera": "margen financiero",
        "Salud Integral": "salud que puede sostener el viaje",
        "Energía Vital": "energía disponible",
        "Serenidad": "calma interna",
        "Coherencia con la Estrella del Norte": "coherencia con tu estrella del norte",
    }.get(label, label.lower())


def _domain_icon(goal: dict | None, label: str) -> str:
    domain = (goal or {}).get("spec", {}).get("domain", "general")
    if label.startswith("Riesgo"):
        return "⚠️"
    if domain == "salud":
        return "🌳"
    if domain == "vivienda":
        return "🏡"
    if domain == "familia":
        return "🤍"
    if domain == "emprendimiento":
        return "✨"
    return "◇"


def _domain_index_description(goal: dict | None, label: str) -> str:
    domain = (goal or {}).get("spec", {}).get("domain", "general")
    descriptions = {
        "salud": {
            "Preparación física": "Qué tan listo está el cuerpo para avanzar sin castigo.",
            "Riesgo de recaída": "Qué tanto habría que cuidar dolor, descanso y sobreexigencia.",
            "Capacidad funcional": "Cuánto margen físico aparece para sostener hábitos.",
            "Adherencia esperada": "Qué tan repetible se ve la rutina en la vida real.",
        },
        "vivienda": {
            "Preparación hipotecaria": "Qué tan cerca está la base financiera de sostener una compra.",
            "Capacidad de ahorro": "Qué tan posible se ve juntar pie y colchón sin ahogarse.",
            "Riesgo financiero": "Qué tan frágil sería asumir compromisos de vivienda hoy.",
            "Estabilidad de ingresos": "Cuánto suelo entregan ingresos y serenidad para planificar.",
        },
        "familia": {
            "Preparación familiar": "Qué tan preparada está la vida para sumar cuidados importantes.",
            "Fortaleza de la red de apoyo": "Qué tan acompañada podría estar esta etapa.",
            "Disponibilidad de tiempo": "Cuánto espacio real aparece para presencia y descanso.",
            "Seguridad del hogar": "Qué tan estable se ve la base material del hogar.",
        },
        "emprendimiento": {
            "Preparación del negocio": "Qué tan cerca está el sueño de convertirse en oferta sostenible.",
            "Riesgo de transición": "Qué tan delicado sería cambiar ingresos, energía y estabilidad.",
            "Autonomía económica": "Cuánto margen financiero existe para experimentar.",
            "Validación creativa": "Qué tan fuerte aparece la base creativa para probar una propuesta.",
        },
    }
    return descriptions.get(domain, {}).get(label, "Indicador específico del tipo de viaje detectado.")


def _plain_care_label(label: str) -> str:
    return {
        "Libertad Financiera": "libertad financiera frágil",
        "Energía Vital": "poca energía",
        "Salud Integral": "salud que pide cuidado",
        "Riesgo de Agotamiento": "riesgo de agotamiento",
        "Probabilidad de Arrepentimiento": "posible distancia con tus valores",
        "Serenidad": "poca calma cotidiana",
        "Libertad Creativa": "poco espacio creativo",
        "Fortaleza de Relaciones": "red de apoyo limitada",
    }.get(label, label.lower())


def _strength_impact(item) -> str:
    if item["label"] == "Propósito":
        return "Ayuda a que el esfuerzo tenga sentido y no dependa solo de resultados rápidos."
    if item["label"] == "Libertad Creativa":
        return "Da espacio para experimentar, iterar y encontrar una forma propia del sueño."
    if item["label"] == "Fortaleza de Relaciones":
        return "Entrega refugio y perspectiva cuando el camino se vuelva incierto."
    if item["label"] == "Libertad Financiera":
        return "Permite tomar decisiones con más calma y menos urgencia."
    if item["label"] == "Salud Integral":
        return "Hace más probable que el viaje pueda sostenerse en el tiempo."
    return item["description"]


def _care_impact(item, scores, context) -> str:
    label = item["label"]
    if label == "Libertad Financiera":
        return "Sin margen económico, el sueño puede sentirse como presión en vez de libertad."
    if label == "Energía Vital":
        return "La energía baja reduce consistencia y aumenta la tentación de abandonar."
    if label == "Salud Integral":
        return "El cuerpo marca el ritmo posible; ignorarlo encarece cualquier avance."
    if label == "Riesgo de Agotamiento":
        return "Si el plan exige demasiado descanso pendiente, puede volverse insostenible."
    if label == "Probabilidad de Arrepentimiento":
        return "Conviene revisar que el camino no sacrifique algo que para ti es no negociable."
    if label == "Serenidad":
        return "La falta de calma puede hacer que decisiones importantes nazcan desde urgencia."
    return item["description"]


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
