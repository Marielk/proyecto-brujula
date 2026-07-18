from __future__ import annotations

from typing import Any

from brujula_engine.rules.scoring import clamp


DOMAIN_LABELS = {
    "salud": "Salud",
    "vivienda": "Vivienda",
    "familia": "Familia",
    "emprendimiento": "Emprendimiento",
    "creatividad": "Creatividad",
    "educacion": "Educación",
    "carrera": "Carrera",
    "general": "General",
}

CONTROLLABILITY_LABELS = {
    "high": "planificable",
    "partial": "parcialmente planificable",
    "low": "dependiente del azar",
    "exploratory": "exploratorio",
}

DOMAIN_BENEFITS = {
    "salud": ("capacidad funcional", "preparación física"),
    "vivienda": ("capacidad hipotecaria", "preparación hipotecaria"),
    "familia": ("preparación familiar", "red de apoyo"),
    "emprendimiento": ("validación de oferta", "preparación del negocio"),
    "creatividad": ("progreso creativo", "pulso creativo"),
    "educacion": ("aprendizaje aplicable", "preparación de aprendizaje"),
    "carrera": ("empleabilidad", "preparación profesional"),
    "general": ("claridad del experimento", "preparación general"),
}

DOMAIN_KEYWORDS = {
    "salud": ["salud", "hábito", "sueño", "dolor", "energía", "adherencia"],
    "vivienda": ["pie", "deuda", "hipoteca", "dividendo", "ahorro", "vivienda"],
    "familia": ["cuidados", "red de apoyo", "corresponsabilidad", "hogar", "tiempo familiar"],
    "emprendimiento": ["oferta", "cliente", "validación", "canal", "ingreso", "transición"],
    "creatividad": ["obra", "portafolio", "comunidad", "exposición", "práctica", "monetización"],
    "educacion": ["programa", "competencia", "estudio", "requisitos", "aplicación", "continuidad"],
    "carrera": ["rol", "portafolio", "empleabilidad", "networking", "postulaciones", "renta"],
    "general": ["experimento", "revisión", "evidencia"],
}


def build_goal_profile_v2(spec: dict, text: str, life_profile: dict | None = None, ai_profile: dict | None = None) -> dict:
    domain = spec.get("domain", "general")
    controllability, uncertainty = detect_controllability(text, domain)
    secondary = _secondary_domains(domain, text)
    target = _target_outcome(domain, spec.get("goalType", "objetivo"), text)
    profile_constraints = _profile_constraints(life_profile or {})
    return {
        **spec,
        "secondaryDomains": list(dict.fromkeys((ai_profile or {}).get("secondaryDomains", []) + secondary)),
        "goalStatement": _clean_statement(text),
        "targetOutcome": target,
        "controllability": controllability,
        "controllabilityLabel": CONTROLLABILITY_LABELS[controllability],
        "uncertaintyType": uncertainty,
        "successCriteria": _success_criteria(domain, target),
        "requiredResources": list(dict.fromkeys(spec.get("requiredResources", []) + _domain_resources(domain))),
        "constraints": list(dict.fromkeys(spec.get("constraints", []) + profile_constraints)),
        "nonNegotiables": _non_negotiables(life_profile or {}),
        "assumptions": (ai_profile or {}).get("assumptions", []),
    }


def detect_controllability(text: str, domain: str) -> tuple[str, str]:
    lower = text.lower()
    if any(word in lower for word in ["loter", "ganarme el loto", "ganar el loto", "azar", "sorteo"]):
        return "low", "random_event"
    if any(word in lower for word in ["fantasía", "fantasia", "imaginar", "si ocurriera", "hipotético", "hipotetico"]):
        return "exploratory", "hypothetical"
    if domain in {"familia", "emprendimiento", "carrera", "vivienda"}:
        return "partial", "life_transition"
    return "high", "actionable"


def select_goal_context(life_profile: dict | None, domain: str) -> dict:
    profile = life_profile or {}
    primary_keys = {
        "salud": ["health", "lifeGarden", "wellbeingPreferences"],
        "vivienda": ["finances", "workTime", "identity", "values"],
        "familia": ["identity", "health", "finances", "workTime", "values", "wellbeingPreferences"],
        "emprendimiento": ["workTime", "finances", "northStar", "values", "lifeGarden"],
        "creatividad": ["northStar", "values", "wellbeingPreferences", "workTime", "lifeGarden"],
        "educacion": ["workTime", "finances", "northStar", "values", "lifeGarden"],
        "carrera": ["workTime", "finances", "northStar", "values", "lifeGarden"],
        "general": ["identity", "northStar", "values"],
    }
    secondary_keys = {
        "salud": ["finances", "identity"],
        "vivienda": ["health", "northStar"],
        "familia": ["northStar", "lifeGarden"],
        "emprendimiento": ["health", "wellbeingPreferences"],
        "creatividad": ["finances", "health"],
        "educacion": ["health", "wellbeingPreferences"],
        "carrera": ["health", "wellbeingPreferences", "identity"],
        "general": ["health", "finances", "workTime"],
    }
    primary = primary_keys.get(domain, primary_keys["general"])
    secondary = [key for key in secondary_keys.get(domain, []) if key not in primary]
    excluded = sorted(set(profile.keys()) - set(primary) - set(secondary))
    return {
        "primaryContext": {key: profile.get(key) for key in primary if key in profile},
        "secondaryContext": {key: profile.get(key) for key in secondary if key in profile},
        "excludedContext": excluded,
    }


def path_schema_v2(path: dict, goal: dict) -> dict:
    spec = goal.get("spec", goal)
    domain = spec.get("domain", "general")
    blueprint = _blueprint(domain, path.get("strategy", "gradual"), path.get("name", "Ruta"))
    path.setdefault("domain", domain)
    path.setdefault("specificOutcome", spec.get("targetOutcome") or spec.get("goalType", "resultado específico"))
    path.setdefault("timeEstimateMonths", _months_from_estimate(path.get("timeEstimate", "")))
    path.setdefault("reversibility", _reversibility(path))
    path.setdefault("requirements", blueprint["requirements"])
    path.setdefault("advanceConditions", blueprint["advanceConditions"])
    path.setdefault("pauseConditions", blueprint["pauseConditions"])
    path.setdefault("successCriteria", spec.get("successCriteria") or blueprint["successCriteria"])
    path.setdefault("domainBenefit", _domain_benefit(domain, path))
    if not path.get("steps") or isinstance(path.get("steps", [None])[0], str):
        path["steps"] = blueprint["steps"]
    path.setdefault("tradeoffs", blueprint["tradeoffs"])
    return path


def domain_specific_metrics(domain: str, scores: dict, context: dict) -> dict:
    if domain == "carrera":
        return {
            "Preparación profesional": _avg(scores["proposito"], scores["resiliencia"], scores["energiaVital"]),
            "Fuerza del portafolio": _avg(scores["libertadCreativa"], scores["proposito"]),
            "Empleabilidad": _avg(scores["resiliencia"], scores["libertadFinanciera"], scores["serenidad"]),
            "Compatibilidad de renta": _avg(scores["libertadFinanciera"], scores["resiliencia"]),
            "Sostenibilidad de transición": _avg(scores["energiaVital"], scores["serenidad"], 100 - scores["riesgoAgotamiento"]),
        }
    return {}


def scoring_policy(domain: str) -> dict:
    if domain == "carrera":
        return {
            "label": "Carrera",
            "domain": 0.58,
            "sustainability": 0.18,
            "values": 0.12,
            "regret": 0.07,
            "penalty": 0.32,
        }
    if domain == "familia":
        return {"label": "Familia", "domain": 0.54, "sustainability": 0.22, "values": 0.10, "regret": 0.06, "penalty": 0.34}
    if domain == "vivienda":
        return {"label": "Vivienda", "domain": 0.56, "sustainability": 0.20, "values": 0.08, "regret": 0.06, "penalty": 0.38}
    if domain == "salud":
        return {"label": "Salud", "domain": 0.60, "sustainability": 0.20, "values": 0.08, "regret": 0.05, "penalty": 0.24}
    return {"label": DOMAIN_LABELS.get(domain, "General"), "domain": 0.48, "sustainability": 0.22, "values": 0.12, "regret": 0.08, "penalty": 0.35}


def causal_strengths(goal: dict, path: dict, metrics: dict, context: dict) -> list[dict]:
    domain = goal["spec"].get("domain", "general")
    resources = goal["spec"].get("requiredResources", [])
    primary = sorted(metrics.items(), key=lambda item: item[1], reverse=True)
    items = []
    for label, value in primary[:3]:
        origin = _origin_for_metric(domain, label, resources, context)
        stage = _stage_from_path(path, 0)
        items.append({"label": label, "value": round(value, 1), "impact": f"{origin}. Ayuda a {path.get('specificOutcome', goal['spec'].get('goalType', 'este destino')).lower()}, especialmente en {stage}."})
    return items


def causal_risks(goal: dict, path: dict, metrics: dict, context: dict) -> list[dict]:
    domain = goal["spec"].get("domain", "general")
    ordered = sorted(metrics.items(), key=lambda item: item[1])
    items = []
    for label, value in ordered[:3]:
        signal = _risk_signal(domain, label)
        items.append({"label": label, "value": round(value, 1), "impact": f"Si {label.lower()} queda débil, la ruta '{path.get('name', 'seleccionada')}' puede perder sostén. Revísalo cuando aparezca esta señal: {signal}."})
    return items


def conditions_from_path(path: dict, goal: dict, metrics: dict, context: dict) -> list[str]:
    items = []
    for key in ("requirements", "advanceConditions", "successCriteria"):
        items.extend(path.get(key, []))
    lowest = sorted(metrics.items(), key=lambda item: item[1])[:1]
    for label, _ in lowest:
        items.append(f"Fortalecer {label.lower()} antes de aumentar compromiso.")
    return list(dict.fromkeys(items))[:6]


def avoid_from_path(path: dict, goal: dict, metrics: dict, context: dict) -> list[str]:
    domain = goal["spec"].get("domain", "general")
    first_requirement = (path.get("requirements") or ["evidencia mínima"])[0]
    specific = {
        "carrera": [
            f"Postular masivamente antes de completar {first_requirement.lower()}.",
            "Aceptar un rol que empeore de forma importante renta, salud o estilo de vida.",
            "Estudiar herramientas sin relación con la brecha profesional real.",
        ],
        "familia": [
            "Asumir que la ayuda aparecerá sin conversarla antes.",
            "Concentrar todos los cuidados en una sola persona.",
            "Avanzar sin revisar disponibilidad real de tiempo y orientación pertinente de salud.",
        ],
        "vivienda": [
            "Mirar propiedades antes de saber pie, dividendo y costos de mantención.",
            "Tapar falta de ahorro con deuda cara.",
            "Comprar al límite del ingreso sin margen para vivir.",
        ],
        "salud": [
            "Subir intensidad antes de tener adherencia mínima.",
            "Ignorar dolor, sueño o fatiga por cumplir calendario.",
            "Tratar una señal médica como simple falta de voluntad.",
        ],
    }
    return specific.get(domain, [f"Escalar la ruta antes de completar {first_requirement.lower()}.", "Tomar una decisión irreversible sin evidencia suficiente.", "Confundir deseo con garantía de resultado."])


def first_step_from_path(path: dict, goal: dict) -> dict:
    first = (path.get("steps") or [{}])[0]
    if isinstance(first, dict):
        title = first.get("actions", [first.get("title", "Definir el primer experimento verificable")])[0]
        why = first.get("completionCriteria", ["Entrega evidencia para decidir el siguiente paso."])[0]
        return {"title": title, "why": f"Esto desbloquea {why.lower()} y permite revisar la ruta en una semana."}
    requirement = (path.get("requirements") or ["un primer experimento verificable"])[0]
    return {"title": requirement, "why": "Es el primer elemento concreto de la ruta ganadora y permite avanzar con evidencia, no solo con entusiasmo."}


def milestones_from_path(path: dict) -> list[dict]:
    result = []
    for index, step in enumerate((path.get("steps") or [])[:5]):
        if isinstance(step, dict):
            period = _period_label(step, index)
            actions = ", ".join(step.get("actions", [])[:2])
            condition = "; ".join(step.get("completionCriteria", [])[:1])
            result.append(
                {
                    "year": period,
                    "icon": ["🌱", "🧭", "✨", "🌿", "🏡"][index % 5],
                    "title": step.get("title", f"Fase {index + 1}"),
                    "description": f"Decisión: {actions or step.get('title', '')}. Resultado esperado: {condition or 'evidencia para revisar el avance'}.",
                }
            )
    return result


def what_could_change_recommendation(selected: dict, discarded: list[dict], goal: dict, context: dict) -> list[str]:
    domain = goal["spec"].get("domain", "general")
    base = {
        "carrera": ["recibir una oferta laboral compatible", "fortalecer el portafolio con revisión profesional", "aumentar conversaciones de networking"],
        "familia": ["conseguir apoyo estable para cuidados", "mejorar disponibilidad real de tiempo", "fortalecer salud o descanso antes de avanzar"],
        "vivienda": ["aumentar el ahorro mensual", "reducir deuda cara", "recibir una mejora estable de ingresos"],
        "salud": ["mejorar una limitación física", "contar con acompañamiento profesional", "subir adherencia sin aumentar dolor"],
        "emprendimiento": ["validar clientes recurrentes", "aumentar fondo de transición", "conseguir una alianza que reduzca carga"],
        "creatividad": ["construir portafolio público", "encontrar comunidad o canal de exposición", "monetizar una pieza sin sacrificar práctica"],
        "educacion": ["obtener beca o apoyo", "liberar horas semanales de estudio", "encontrar un programa más compatible"],
    }
    changes = base.get(domain, ["cambiar el plazo", "sumar apoyo real", "reducir el costo vital de la ruta"])
    if discarded:
        changes.append(f"que '{discarded[0].get('name')}' reduzca su riesgo o aumente evidencia temprana")
    return changes[:5]


def low_control_message(goal: dict) -> str | None:
    if goal["spec"].get("controllability") != "low":
        return None
    return "Este resultado depende en gran medida del azar. Brújula puede ayudarte a explorar qué harías si ocurriera, pero no a construir una ruta fiable para provocarlo."


def genericity_guard(life_report: dict, report: str | None = None) -> dict:
    guidance = life_report.get("journeyGuidance", {})
    goal = guidance.get("goal", {})
    selected = guidance.get("selectedPath", {})
    domain = goal.get("domain", "general")
    keywords = DOMAIN_KEYWORDS.get(domain, DOMAIN_KEYWORDS["general"])
    text_blocks = " ".join(
        [
            guidance.get("firstStep", {}).get("title", ""),
            " ".join(guidance.get("successConditions", [])),
            " ".join(guidance.get("avoidList", [])),
            " ".join(item.get("title", "") + " " + item.get("description", "") for item in guidance.get("domainMilestones", [])),
            report or "",
        ]
    ).lower()
    hits = [keyword for keyword in keywords if keyword.lower() in text_blocks]
    generic_phrases = [
        "revisar dinero, energía y apoyo",
        "mantener, pausar o rediseñar",
        "experimento pequeño",
        "convertir el sueño en una urgencia",
    ]
    repeated = [phrase for phrase in generic_phrases if phrase in text_blocks]
    decision_mentions = sum(1 for item in selected.get("decisions", []) if str(item).lower()[:24] in text_blocks)
    passed = len(hits) >= 2 and (decision_mentions >= 1 or bool(selected.get("steps")))
    return {
        "passed": passed,
        "domainKeywordHits": hits,
        "genericPhrases": repeated,
        "blocksRegenerated": [] if passed else ["firstStep", "successConditions", "timeline"],
        "selectedDecisionMentions": decision_mentions,
    }


def debug_payload(goal: dict, context_selection: dict, counts: dict, llm: dict, guard: dict, duration_ms: dict | None = None) -> dict:
    spec = goal.get("spec", goal)
    return {
        "domain": spec.get("domain"),
        "domainLabel": DOMAIN_LABELS.get(spec.get("domain"), "General"),
        "controllability": spec.get("controllability"),
        "scenarioType": spec.get("controllabilityLabel"),
        "primaryContext": sorted(context_selection.get("primaryContext", {}).keys()),
        "secondaryContext": sorted(context_selection.get("secondaryContext", {}).keys()),
        "excludedContext": context_selection.get("excludedContext", []),
        "basePaths": counts.get("basePaths", 0),
        "variants": counts.get("variants", 0),
        "prunedPaths": counts.get("prunedPaths", 0),
        "clusters": counts.get("clusters", 0),
        "scoringPolicy": counts.get("scoringPolicy"),
        "llm": llm,
        "fallbackUsed": [key for key, used in llm.items() if key != "model" and used is False],
        "genericityGuard": guard,
        "durationMs": duration_ms or {},
    }


def _blueprint(domain: str, strategy: str, name: str) -> dict:
    templates = {
        "carrera": {
            "requirements": ["Actualizar portafolio con dos casos de estudio", "Practicar entrevistas", "Contactar red profesional"],
            "advanceConditions": ["Portafolio revisado por dos personas", "Al menos tres conversaciones profesionales"],
            "successCriteria": ["Conseguir una oferta compatible con renta y estilo de vida"],
            "tradeoffs": ["Avance más lento a cambio de conservar ingresos y evidencia profesional."],
            "steps": [
                _step("audit", 1, "Auditar experiencia y brechas", 2, ["Seleccionar proyectos relevantes", "Identificar competencias faltantes"], ["Lista priorizada de brechas", "Dos proyectos elegidos"], {"careerReadiness": 6, "clarity": 8, "energy": -1}),
                _step("portfolio", 2, "Reconstruir portafolio", 6, ["Redactar casos de estudio", "Pedir revisión a profesionales"], ["Dos casos publicados o listos para enviar"], {"portfolioStrength": 10, "energy": -2}),
                _step("market", 3, "Conversar con mercado", 8, ["Contactar red", "Postular selectivamente"], ["Tres conversaciones y cinco postulaciones cuidadas"], {"employability": 8, "incomeFit": 4}),
            ],
        },
        "familia": {
            "requirements": ["Mapear red de apoyo", "Conversar corresponsabilidad", "Revisar salud y hogar"],
            "advanceConditions": ["Plan de cuidados conversado", "Tiempo semanal real identificado"],
            "successCriteria": ["Decisión familiar tomada con red, salud y hogar revisados"],
            "tradeoffs": ["Más preparación inicial a cambio de menos carga invisible después."],
            "steps": [
                _step("support", 1, "Mapear cuidados y red", 2, ["Listar apoyos reales", "Conversar disponibilidad"], ["Red de apoyo con compromisos claros"], {"supportNetwork": 8, "clarity": 6}),
                _step("time", 2, "Diseñar semana familiar posible", 4, ["Revisar horarios", "Distribuir responsabilidades"], ["Semana tipo con cuidados compartidos"], {"familyReadiness": 8, "energy": -1}),
                _step("home", 3, "Revisar hogar, salud y costos", 6, ["Estimar costos", "Consultar orientación pertinente"], ["Condición mínima antes de avanzar"], {"homeSecurity": 7, "health": 4}),
            ],
        },
        "vivienda": {
            "requirements": ["Calcular pie objetivo", "Reducir deuda cara", "Simular dividendo sostenible"],
            "advanceConditions": ["Ahorro mensual validado por tres meses", "Dividendo no ahoga gastos esenciales"],
            "successCriteria": ["Buscar vivienda solo con pie, deuda y mantención visibles"],
            "tradeoffs": ["Postergar búsqueda emocional para comprar con más margen."],
            "steps": [
                _step("numbers", 1, "Calcular pie y dividendo", 2, ["Definir rango de precio", "Estimar pie y mantención"], ["Monto objetivo y ahorro mensual definidos"], {"mortgageReadiness": 8, "clarity": 7}),
                _step("debt", 2, "Ordenar deuda y ahorro", 12, ["Bajar deuda cara", "Automatizar ahorro"], ["Tres meses cumpliendo ahorro posible"], {"savingsCapacity": 9, "risk": -5}),
                _step("search", 3, "Iniciar búsqueda sostenible", 8, ["Comparar zonas", "Revisar preaprobación"], ["Criterio de búsqueda realista"], {"homeReadiness": 8}),
            ],
        },
        "salud": {
            "requirements": ["Definir hábito mínimo", "Registrar adherencia", "Pedir apoyo profesional si corresponde"],
            "advanceConditions": ["Dos semanas sin empeorar dolor o sueño", "Frecuencia mínima sostenida"],
            "successCriteria": ["Mejorar capacidad funcional sin recaída importante"],
            "tradeoffs": ["Menos intensidad inicial a cambio de más adherencia."],
            "steps": [
                _step("baseline", 1, "Registrar línea base", 2, ["Anotar sueño, dolor y energía", "Elegir hábito mínimo"], ["Línea base de dos semanas"], {"adherence": 6, "health": 4}),
                _step("progression", 2, "Progresar con criterio de pausa", 6, ["Aumentar frecuencia gradualmente", "Pausar ante señales de recaída"], ["Rutina repetible sin deterioro"], {"functionalCapacity": 8, "energy": 3}),
            ],
        },
    }
    generic = {
        "requirements": [f"Definir evidencia concreta para {name.lower()}", "Probar una acción verificable", "Fijar fecha de revisión"],
        "advanceConditions": ["Evidencia mínima reunida", "Costo vital tolerable"],
        "successCriteria": ["Avanzar sin convertir el sueño en garantía ni urgencia"],
        "tradeoffs": ["Aprender antes de comprometer recursos grandes."],
        "steps": [
            _step("experiment", 1, "Diseñar experimento verificable", 2, ["Definir prueba", "Registrar evidencia"], ["Hipótesis y criterio de revisión"], {"clarity": 8}),
            _step("review", 2, "Revisar evidencia", 4, ["Comparar resultados", "Ajustar alcance"], ["Decisión de mantener, pausar o rediseñar"], {"resilience": 5}),
        ],
    }
    data = templates.get(domain, generic)
    data["pauseConditions"] = ["La ruta empieza a dañar sueño, salud o relaciones por dos semanas seguidas."]
    return data


def _step(id_: str, phase: int, title: str, duration_weeks: int, actions: list[str], criteria: list[str], effects: dict) -> dict:
    return {
        "id": id_,
        "phase": phase,
        "title": title,
        "durationWeeks": duration_weeks,
        "actions": actions,
        "completionCriteria": criteria,
        "expectedEffects": effects,
    }


def _period_label(step: dict, index: int) -> str:
    duration = int(step.get("durationWeeks") or 4)
    start = 1 + sum(4 for _ in range(index))
    end = start + max(1, duration) - 1
    if end <= 8:
        return f"Semana {start}-{end}"
    return f"Mes {max(1, round(start / 4))}-{max(2, round(end / 4))}"


def _avg(*values: float) -> float:
    return clamp(round(sum(values) / max(len(values), 1), 1))


def _clean_statement(text: str) -> str:
    return " ".join((text or "").strip().split())[:220]


def _secondary_domains(domain: str, text: str) -> list[str]:
    lower = text.lower()
    result = []
    if domain != "finanzas" and any(word in lower for word in ["ingreso", "renta", "deuda", "ahorro", "casa"]):
        result.append("finanzas")
    if domain != "salud" and any(word in lower for word in ["salud", "energía", "energia", "dolor"]):
        result.append("salud")
    if domain != "familia" and any(word in lower for word in ["hijo", "familia", "cuidados"]):
        result.append("familia")
    return result


def _target_outcome(domain: str, goal_type: str, text: str) -> str:
    targets = {
        "carrera": "Conseguir o construir un rol laboral compatible con habilidades, renta y estilo de vida",
        "familia": "Sostener una decisión familiar con red, salud, tiempo y hogar suficientes",
        "vivienda": "Acceder a una vivienda con pie, deuda y dividendo sostenibles",
        "salud": "Mejorar capacidad funcional mediante adherencia y progresión cuidadosa",
        "emprendimiento": "Validar una oferta con clientes o audiencia antes de aumentar riesgo",
        "creatividad": "Producir obra y exposición sin sacrificar práctica ni bienestar",
        "educacion": "Convertir aprendizaje en capacidad aplicable sin sobrecarga",
    }
    return targets.get(domain, goal_type or text[:120])


def _success_criteria(domain: str, target: str) -> list[str]:
    return {
        "carrera": ["Portafolio actualizado", "Conversaciones profesionales activas", "Oferta compatible con renta y estilo de vida"],
        "familia": ["Red de apoyo activa", "Distribución corresponsable de cuidados", "Tiempo familiar suficiente"],
        "vivienda": ["Pie reunido", "Deuda cara reducida", "Dividendo sostenible"],
        "salud": ["Adherencia sostenida", "Mejor capacidad funcional", "Criterios de pausa claros"],
        "emprendimiento": ["Oferta validada", "Ingreso mínimo probado", "Fondo de transición definido"],
        "creatividad": ["Producción constante", "Portafolio o muestra", "Comunidad o exposición cuidada"],
        "educacion": ["Programa compatible", "Práctica aplicada", "Continuidad sostenible"],
    }.get(domain, [target])


def _domain_resources(domain: str) -> list[str]:
    return {
        "carrera": ["portafolio", "experiencia demostrable", "red profesional", "tiempo de búsqueda"],
        "familia": ["red de apoyo", "tiempo", "hogar", "salud", "ahorro"],
        "vivienda": ["pie", "ahorro mensual", "capacidad de dividendo", "preaprobación"],
        "salud": ["rutina mínima", "descanso", "apoyo profesional", "registro de adherencia"],
        "emprendimiento": ["oferta", "cliente", "canal", "fondo de transición"],
        "creatividad": ["práctica", "obra", "portafolio", "comunidad"],
        "educacion": ["programa", "horas semanales", "apoyo", "aplicación práctica"],
    }.get(domain, ["tiempo", "evidencia", "apoyo"])


def _profile_constraints(profile: dict) -> list[str]:
    constraints = []
    if profile.get("finances", {}).get("debtLevel") in {"Alta", "Muy alta"}:
        constraints.append("deuda")
    if profile.get("health", {}).get("limitsProjects") in {"Mucho", "Moderadamente"}:
        constraints.append("salud y energía")
    if profile.get("workTime", {}).get("weeklyHours") in {"Más de 50", "45-50"}:
        constraints.append("carga laboral")
    care = profile.get("identity", {}).get("careResponsibilities") or []
    if care and "Ninguno" not in care:
        constraints.append("responsabilidades de cuidado")
    return constraints


def _non_negotiables(profile: dict) -> list[str]:
    raw = profile.get("values", {}).get("nonNegotiables")
    if isinstance(raw, str) and raw.strip():
        return [item.strip() for item in raw.split(",") if item.strip()]
    values = profile.get("values", {}).get("topThree") or []
    return [f"cuidar {value.lower()}" for value in values[:3]]


def _months_from_estimate(estimate: str) -> int:
    digits = [int(part) for part in "".join(ch if ch.isdigit() else " " for ch in estimate).split()]
    if not digits:
        return 36
    number = max(digits)
    return number * 12 if "año" in estimate else number


def _reversibility(path: dict) -> str:
    if path.get("financialRisk") == "alto" or path.get("strategy") in {"intensiva", "financiada"}:
        return "media"
    return "alta"


def _domain_benefit(domain: str, path: dict) -> dict:
    name, metric = DOMAIN_BENEFITS.get(domain, DOMAIN_BENEFITS["general"])
    level = "alta" if path.get("energyDemand") != "alta" and path.get("financialRisk") != "alto" else "media"
    return {"name": name, "metric": metric, "level": level}


def _origin_for_metric(domain: str, label: str, resources: list[str], context: dict) -> str:
    resource = resources[0] if resources else DOMAIN_BENEFITS.get(domain, ("evidencia",))[0]
    return f"{label} nace de trabajar explícitamente {resource}"


def _stage_from_path(path: dict, index: int) -> str:
    steps = path.get("steps") or []
    if steps and isinstance(steps[0], dict):
        return steps[min(index, len(steps) - 1)].get("title", "la primera etapa").lower()
    return "la primera etapa"


def _risk_signal(domain: str, label: str) -> str:
    return {
        "carrera": "postulas sin respuesta o sacrificas sueño para preparar entrevistas",
        "familia": "la organización de cuidados depende de una sola persona",
        "vivienda": "el dividendo proyectado deja sin margen mensual",
        "salud": "sube dolor, baja sueño o abandonas por exigencia",
    }.get(domain, f"{label.lower()} empeora durante dos revisiones seguidas")
