from copy import deepcopy

from brujula_engine.rules.scoring import clamp
from brujula_engine.simulation.text_scenario import BASE_INITIAL_STATE


def normalize_profile(profile: dict | None) -> dict:
    return profile if isinstance(profile, dict) else {}


def base_state_from_profile(profile: dict | None) -> dict:
    profile = normalize_profile(profile)
    state = deepcopy(BASE_INITIAL_STATE)
    identity = profile.get("identity", {})
    garden = profile.get("lifeGarden", {})
    health = profile.get("health", {})
    finances = profile.get("finances", {})
    work = profile.get("workTime", {})
    values = profile.get("values", {})
    north_star = profile.get("northStar", {})

    state["age"] = _int(identity.get("age"), state["age"])
    state["monthly_income"] = _monthly_income(finances, state["monthly_income"])
    state["monthly_expenses"] = _monthly_expenses(finances, state["monthly_expenses"], state["monthly_income"])
    state["debt_total"] = _debt_total(finances, state["debt_total"], state["monthly_income"])
    state["savings"] = _savings(finances, state["monthly_expenses"])

    state["physical_capacity"] = _score_from_scale(garden.get("physicalHealth"), state["physical_capacity"])
    state["daily_energy"] = _score_from_scale(garden.get("dailyEnergy") or health.get("averageEnergy"), state["daily_energy"])
    state["financial_stability"] = _financial_score(finances, garden.get("financialStability"), state["financial_stability"])
    state["relationships"] = _score_from_scale(garden.get("relationships"), state["relationships"])
    state["creative_freedom"] = _creative_score(garden, work, state["creative_freedom"])
    state["north_star_alignment"] = _north_star_score(garden, values, north_star, state["north_star_alignment"])

    pain_level = _int(health.get("painLevel"), 0)
    if pain_level >= 7:
        state["physical_capacity"] = clamp(state["physical_capacity"] - 10)
        state["daily_energy"] = clamp(state["daily_energy"] - 7)
    elif pain_level >= 4:
        state["physical_capacity"] = clamp(state["physical_capacity"] - 5)

    if health.get("limitsProjects") == "Mucho":
        state["physical_capacity"] = clamp(state["physical_capacity"] - 12)
        state["creative_freedom"] = clamp(state["creative_freedom"] - 8)
    elif health.get("limitsProjects") == "Moderadamente":
        state["physical_capacity"] = clamp(state["physical_capacity"] - 6)
        state["creative_freedom"] = clamp(state["creative_freedom"] - 4)

    if work.get("weeklyHours") == "Más de 50":
        state["daily_energy"] = clamp(state["daily_energy"] - 10)
        state["creative_freedom"] = clamp(state["creative_freedom"] - 8)
    elif work.get("weeklyHours") == "41 a 50":
        state["daily_energy"] = clamp(state["daily_energy"] - 5)

    if _int(work.get("perceivedDemand"), 0) >= 4 and _int(work.get("healthyBoundaries"), 5) <= 2:
        state["daily_energy"] = clamp(state["daily_energy"] - 8)
        state["creative_freedom"] = clamp(state["creative_freedom"] - 5)

    state["projected_life_quality"] = _life_quality(state, garden)
    state["notes"] = [_profile_note(profile)]
    return state


def apply_profile_to_scenario(scenario, profile: dict | None):
    if not profile:
        return scenario

    scenario = deepcopy(scenario)
    scenario.initial_state = type(scenario.initial_state)(**base_state_from_profile(profile))
    scenario.yearly_rules = _rules_with_profile_adjustments(scenario.yearly_rules, profile)
    return scenario


def profile_context(profile: dict | None) -> dict:
    profile = normalize_profile(profile)
    identity = profile.get("identity", {})
    values = profile.get("values", {})
    north_star = profile.get("northStar", {})
    wellbeing = profile.get("wellbeingPreferences", {})
    health = profile.get("health", {})
    finances = profile.get("finances", {})

    highlights = []
    if identity.get("name"):
        highlights.append(f"Nombre o apodo: {identity['name']}")
    if north_star.get("mainDream"):
        highlights.append(f"Sueño principal: {north_star['mainDream']}")
    if finances.get("savingsLevel") == "Ninguno":
        highlights.append("Conviene cuidar un fondo de emergencia pequeño.")
    if health.get("limitsProjects") in ["Moderadamente", "Mucho"]:
        highlights.append("La salud pide adaptar ritmo y exigencia.")

    return {
        "name": identity.get("name", ""),
        "age": identity.get("age"),
        "country": identity.get("country", ""),
        "city": identity.get("city", ""),
        "values": values.get("selected") or values.get("topThree") or [],
        "topValues": values.get("topThree") or values.get("selected") or [],
        "nonNegotiables": values.get("nonNegotiables", ""),
        "dreams": _profile_dreams(north_star),
        "tenYearDay": north_star.get("tenYearDay", ""),
        "mainDream": north_star.get("mainDream", ""),
        "recharges": wellbeing.get("recharges", []),
        "drains": wellbeing.get("drains", []),
        "supportTone": wellbeing.get("supportTone", ""),
        "ritualTypes": wellbeing.get("ritualTypes", []),
        "healthLimits": health.get("limitsProjects", ""),
        "savingsLevel": finances.get("savingsLevel", ""),
        "highlights": highlights[:5],
    }


def profile_warnings(profile: dict | None) -> list[str]:
    profile = normalize_profile(profile)
    warnings = []
    work = profile.get("workTime", {})
    finances = profile.get("finances", {})
    health = profile.get("health", {})
    if work.get("weeklyHours") == "Más de 50":
        warnings.append("Tu perfil indica más de 50 horas semanales; Brújula aumentó el cuidado por agotamiento.")
    if _int(work.get("perceivedDemand"), 0) >= 4 and _int(work.get("healthyBoundaries"), 5) <= 2:
        warnings.append("La exigencia laboral alta con límites bajos ajustó energía, creatividad y rituales de descanso.")
    if finances.get("savingsLevel") == "Ninguno":
        warnings.append("El perfil no registra ahorro actual; el informe prioriza resiliencia y fondo de emergencia.")
    if finances.get("debtLevel") in ["Alta", "Muy alta"]:
        warnings.append("La deuda alta del perfil aumenta el cuidado financiero del escenario.")
    if health.get("limitsProjects") == "Mucho":
        warnings.append("La salud aparece como restricción fuerte; el informe baja velocidad y carga creativa.")
    return warnings


def _rules_with_profile_adjustments(yearly_rules: dict, profile: dict) -> dict:
    rules = deepcopy(yearly_rules)
    work = profile.get("workTime", {})
    health = profile.get("health", {})
    finances = profile.get("finances", {})
    values = profile.get("values", {}).get("selected", [])
    dreams = profile.get("northStar", {}).get("dreams", [])

    for year, rule in rules.items():
        notes = []
        if work.get("weeklyHours") == "Más de 50":
            rule["daily_energy_delta"] = rule.get("daily_energy_delta", 0) - 1
            rule["creative_freedom_delta"] = rule.get("creative_freedom_delta", 0) - 1
            notes.append("el descanso sigue siendo parte del plan")
        if _int(work.get("perceivedDemand"), 0) >= 4 and _int(work.get("healthyBoundaries"), 5) <= 2:
            rule["daily_energy_delta"] = rule.get("daily_energy_delta", 0) - 1
        if health.get("limitsProjects") == "Mucho":
            rule["physical_capacity_delta"] = rule.get("physical_capacity_delta", 0) - 1
            rule["creative_freedom_delta"] = rule.get("creative_freedom_delta", 0) - 1
            notes.append("el cuerpo marca el ritmo posible")
        if finances.get("debtLevel") in ["Alta", "Muy alta"]:
            rule["financial_stability_delta"] = rule.get("financial_stability_delta", 0) - 1
        if finances.get("savingsLevel") == "Ninguno":
            rule["savings_rate"] = max(0.03, rule.get("savings_rate", 0.1) - 0.02)
        if "Creatividad" in values:
            rule["north_star_alignment_delta"] = rule.get("north_star_alignment_delta", 0) + 1
        if "Autocuidado" in values and rule.get("daily_energy_delta", 0) < 0:
            rule["north_star_alignment_delta"] = rule.get("north_star_alignment_delta", 0) - 1
        if any(dream in dreams for dream in ["Vivir del arte", "Emprender"]):
            rule["north_star_alignment_delta"] = rule.get("north_star_alignment_delta", 0) + 1

        if notes:
            existing = rule.get("note", "")
            suffix = "; ".join(notes)
            rule["note"] = f"{existing} ({suffix})." if existing else suffix.capitalize() + "."
        rules[year] = rule
    return rules


def _score_from_scale(value, default):
    mapping = {1: 24, 2: 42, 3: 60, 4: 78, 5: 92}
    return mapping.get(_int(value, 0), default)


def _monthly_income(finances, default):
    if _has_number(finances.get("monthlyIncome")):
        return int(finances["monthlyIncome"])
    return {
        "Sin ingresos": 0,
        "Bajo": 850000,
        "Medio": 1800000,
        "Alto": 3300000,
    }.get(finances.get("incomeMode"), default)


def _monthly_expenses(finances, default, income):
    if _has_number(finances.get("monthlyExpenses")):
        return int(finances["monthlyExpenses"])
    mode = finances.get("expensesMode")
    if mode == "Menores que mis ingresos":
        return int(max(350000, income * 0.78))
    if mode == "Similares a mis ingresos":
        return int(max(350000, income * 0.98))
    if mode == "Mayores que mis ingresos":
        return int(max(450000, income * 1.12))
    return default


def _debt_total(finances, default, income):
    if _has_number(finances.get("debtAmount")):
        return int(finances["debtAmount"])
    return {
        "Sin deuda": 0,
        "Baja": int(income * 1.5),
        "Media": int(income * 4),
        "Alta": int(income * 7),
        "Muy alta": int(income * 12),
    }.get(finances.get("debtLevel"), default)


def _savings(finances, expenses):
    return {
        "Ninguno": 0,
        "Menos de 1 mes de gastos": int(expenses * 0.5),
        "1 a 3 meses": int(expenses * 2),
        "3 a 6 meses": int(expenses * 4.5),
        "Más de 6 meses": int(expenses * 7),
    }.get(finances.get("savingsLevel"), BASE_INITIAL_STATE["savings"])


def _financial_score(finances, garden_value, default):
    score = _score_from_scale(garden_value, default)
    if finances.get("debtLevel") == "Alta":
        score -= 12
    elif finances.get("debtLevel") == "Muy alta":
        score -= 20
    if finances.get("savingsLevel") == "Ninguno":
        score -= 10
    feeling = _int(finances.get("financialFeeling"), 0)
    if feeling:
        score = (score + _score_from_scale(feeling, score)) / 2
    return clamp(score)


def _creative_score(garden, work, default):
    score = _score_from_scale(garden.get("creativity"), default)
    personal_time = work.get("personalProjectTime")
    if personal_time == "Casi nada":
        score -= 14
    elif personal_time == "1 a 3 horas":
        score -= 8
    elif personal_time == "8 a 14 horas":
        score += 6
    elif personal_time == "Más de 14 horas":
        score += 10
    return clamp(score)


def _north_star_score(garden, values, north_star, default):
    score = _score_from_scale(garden.get("purpose"), default)
    if north_star.get("mainDream") or north_star.get("tenYearDay"):
        score += 5
    if values.get("selected"):
        score += min(6, len(values["selected"]) * 1.5)
    return clamp(score)


def _life_quality(state, garden):
    free_time = _score_from_scale(garden.get("freeTime"), 55)
    serenity = _score_from_scale(garden.get("serenity"), 55)
    return clamp(
        round(
            state["physical_capacity"] * 0.18
            + state["daily_energy"] * 0.18
            + state["financial_stability"] * 0.15
            + state["relationships"] * 0.15
            + state["north_star_alignment"] * 0.16
            + free_time * 0.09
            + serenity * 0.09,
            1,
        )
    )


def _profile_note(profile):
    context = profile_context(profile)
    name = context["name"] or "la persona"
    place = ", ".join(part for part in [context["city"], context["country"]] if part)
    suffix = f" en {place}" if place else ""
    return f"2026: Perfil de vida inicial cargado para {name}{suffix}."


def _profile_dreams(north_star):
    dreams = []
    if north_star.get("mainDream"):
        dreams.append(north_star["mainDream"])
    dreams.extend(north_star.get("dreams", []))
    if north_star.get("tenYearDay"):
        dreams.append("Vivir un día cotidiano parecido a la Estrella del Norte descrita.")
    return dreams[:5]


def _int(value, default):
    try:
        if value in ("", None):
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _has_number(value):
    return isinstance(value, (int, float)) and value >= 0
