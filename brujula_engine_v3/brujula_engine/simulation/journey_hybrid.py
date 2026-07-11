from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from brujula_engine.llm.ollama_client import OllamaClient
from brujula_engine.simulation.journey_goal import interpret_goal
from brujula_engine.simulation.loader import scenario_from_dict, validate_scenario


def interpret_goal_with_ai(client: OllamaClient, text: str, life_profile: dict | None = None) -> tuple[dict, bool, str | None]:
    deterministic = interpret_goal(text, life_profile)
    prompt = f"""Analiza este objetivo de vida para Brújula y devuelve solo JSON.

Objetivo:
{text}

Perfil resumido:
{json.dumps(life_profile or {}, ensure_ascii=False)[:2500]}

Dominios disponibles: salud, vivienda, familia, emprendimiento, general.

Forma obligatoria:
{{
  "domain": "salud|vivienda|familia|emprendimiento|general",
  "secondaryDomains": ["finanzas", "salud"],
  "goalType": "tipo breve del objetivo",
  "intention": "intención humana en una frase",
  "horizonYear": 2030,
  "requiredResources": ["..."],
  "expectedRisks": ["..."],
  "involvedValues": ["..."],
  "assumptions": ["..."]
}}"""
    try:
        raw = client.chat_json(
            [
                {
                    "role": "system",
                    "content": "Eres Goal Interpreter de Brújula. Clasificas sueños de vida sin inventar dominios nuevos.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.15,
        )
        domain = raw.get("domain") if raw.get("domain") in {"salud", "vivienda", "familia", "emprendimiento", "general"} else deterministic["spec"]["domain"]
        spec = deterministic["spec"].copy()
        spec.update(
            {
                "domain": domain,
                "goalType": raw.get("goalType") or spec["goalType"],
                "horizonYear": raw.get("horizonYear") or spec.get("horizonYear"),
                "requiredResources": _list_or(spec["requiredResources"], raw.get("requiredResources")),
                "constraints": _list_or(spec["constraints"], raw.get("expectedRisks")),
                "supported": domain != "general",
            }
        )
        return {
            **deterministic,
            "spec": spec,
            "aiProfile": {
                "secondaryDomains": _list_or([], raw.get("secondaryDomains")),
                "intention": raw.get("intention", ""),
                "expectedRisks": _list_or([], raw.get("expectedRisks")),
                "involvedValues": _list_or([], raw.get("involvedValues")),
                "assumptions": _list_or([], raw.get("assumptions")),
            },
            "unsupportedWarning": None
            if spec["supported"]
            else "Este tipo de viaje todavía utiliza un modelo general. La simulación puede ser menos precisa.",
        }, True, None
    except Exception as exc:
        return deterministic, False, str(exc)


def generate_candidate_paths_with_ai(client: OllamaClient, text: str, goal: dict, life_profile: dict | None = None) -> tuple[list[dict], bool, str | None]:
    prompt = f"""Crea entre 5 y 7 caminos alternativos plausibles para alcanzar este sueño.

Objetivo:
{text}

GoalProfile:
{json.dumps(goal, ensure_ascii=False, indent=2)}

Perfil:
{json.dumps(life_profile or {}, ensure_ascii=False)[:2500]}

Reglas:
- Los caminos deben ser diferentes entre sí.
- No calcules métricas.
- Devuelve solo JSON.

Forma:
{{
  "paths": [
    {{
      "id": "path_a",
      "name": "Mantener empleo y construir en paralelo",
      "strategy": "paralela|gradual|intensiva|alianza|financiada|pausada",
      "description": "Una frase concreta",
      "assumptions": ["..."],
      "tradeoffs": ["..."],
      "timeEstimate": "3 años",
      "financialRisk": "bajo|medio|alto",
      "energyDemand": "baja|media|alta",
      "creativeUpside": "bajo|medio|alto"
    }}
  ]
}}"""
    try:
        raw = client.chat_json(
            [
                {"role": "system", "content": "Eres Path Generator de Brújula. Imaginas futuros plausibles y concretos."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.55,
        )
        paths = _normalize_paths(raw.get("paths", []), goal)
        if len(paths) < 2:
            raise ValueError("Ollama generó menos de dos caminos útiles.")
        return paths[:7], True, None
    except Exception as exc:
        return fallback_candidate_paths(goal), False, str(exc)


def fallback_candidate_paths(goal: dict) -> list[dict]:
    domain = goal["spec"]["domain"]
    if domain == "salud":
        seeds = [
            ("rutina_minima", "Rutina mínima sostenible", "pausada", "Construir hábitos pequeños de sueño, movimiento y alimentación sin exigencia extrema.", "bajo", "baja", "medio"),
            ("acompanamiento", "Plan con apoyo profesional", "gradual", "Avanzar con guía profesional y ajustes según dolor, energía y adherencia.", "medio", "media", "medio"),
            ("meta_deportiva", "Meta física progresiva", "intensiva", "Preparar una meta concreta aumentando carga solo cuando el cuerpo responda.", "medio", "alta", "alto"),
            ("recuperacion", "Recuperación primero", "pausada", "Priorizar descanso, tratamiento y capacidad funcional antes de subir intensidad.", "bajo", "baja", "bajo"),
            ("comunidad_salud", "Hábitos con comunidad", "alianza", "Sumar una red de apoyo para sostener constancia y motivación amable.", "bajo", "media", "medio"),
        ]
    elif domain == "vivienda":
        seeds = [
            ("ahorro_pie", "Ahorro para pie antes de comprar", "gradual", "Ordenar deuda y juntar pie antes de buscar vivienda.", "bajo", "media", "bajo"),
            ("compra_pequena", "Comprar una vivienda inicial", "gradual", "Elegir una propiedad más pequeña para bajar dividendo y riesgo.", "medio", "media", "medio"),
            ("copropiedad", "Comprar con apoyo familiar o pareja", "alianza", "Compartir responsabilidades financieras y de cuidado del hogar.", "medio", "media", "medio"),
            ("arriendo_estrategico", "Arriendo estratégico mientras ahorras", "pausada", "Postergar compra para fortalecer acceso hipotecario.", "bajo", "baja", "bajo"),
            ("compra_agresiva", "Compra acelerada", "intensiva", "Intentar comprar pronto asumiendo más presión financiera.", "alto", "alta", "medio"),
        ]
    elif domain == "familia":
        seeds = [
            ("preparacion_red", "Preparar red de apoyo", "gradual", "Ordenar ayuda, tiempos y responsabilidades antes de ampliar la familia.", "bajo", "media", "medio"),
            ("base_hogar", "Fortalecer hogar y finanzas", "pausada", "Priorizar vivienda, ahorro y salud antes de tomar la decisión.", "bajo", "baja", "bajo"),
            ("decision_pronta", "Decisión familiar pronta", "intensiva", "Avanzar antes, aceptando más ajustes de tiempo, energía y dinero.", "alto", "alta", "alto"),
            ("cuidados_compartidos", "Crianza con cuidados compartidos", "alianza", "Diseñar corresponsabilidad y red activa desde el inicio.", "medio", "media", "medio"),
            ("transicion_laboral", "Ajustar trabajo antes de criar", "gradual", "Reducir carga laboral o cambiar rutinas para abrir tiempo real.", "medio", "media", "medio"),
        ]
    elif domain == "emprendimiento":
        seeds = [
            ("paralelo", "Mantener empleo y validar en paralelo", "paralela", "Probar oferta, audiencia o clientes sin soltar estabilidad.", "bajo", "media", "alto"),
            ("jornada_reducida", "Reducir jornada gradualmente", "gradual", "Comprar tiempo creativo reduciendo carga laboral paso a paso.", "medio", "media", "alto"),
            ("salto_total", "Salto a tiempo completo", "intensiva", "Apostar por el proyecto con máxima velocidad y mayor riesgo.", "alto", "alta", "alto"),
            ("alianza", "Asociarse con otra persona", "alianza", "Compartir carga, habilidades y riesgo de construcción.", "medio", "media", "alto"),
            ("financiada", "Buscar financiamiento o preventa", "financiada", "Conseguir recursos externos antes de escalar.", "alto", "alta", "alto"),
        ]
    else:
        seeds = [
            ("experimento", "Experimento pequeño", "pausada", "Probar el sueño durante 30 días con bajo riesgo.", "bajo", "baja", "medio"),
            ("gradual", "Ruta gradual", "gradual", "Avanzar por etapas revisando evidencia cada trimestre.", "medio", "media", "medio"),
            ("intensiva", "Ruta intensiva", "intensiva", "Acelerar el cambio aceptando más esfuerzo e incertidumbre.", "alto", "alta", "alto"),
            ("alianza", "Ruta acompañada", "alianza", "Buscar apoyo o colaboración para reducir carga individual.", "medio", "media", "medio"),
            ("pausa", "Preparar antes de actuar", "pausada", "Fortalecer bases antes de mover piezas grandes.", "bajo", "baja", "bajo"),
        ]
    return [
        {
            "id": id_,
            "name": name,
            "strategy": strategy,
            "description": description,
            "assumptions": ["Ruta generada por reglas locales cuando la IA no propone caminos."],
            "tradeoffs": _tradeoffs(financial_risk, energy_demand),
            "timeEstimate": "3 a 5 años",
            "financialRisk": financial_risk,
            "energyDemand": energy_demand,
            "creativeUpside": creative_upside,
        }
        for id_, name, strategy, description, financial_risk, energy_demand, creative_upside in seeds
    ]


def scenario_from_candidate_path(path: dict, base_state: dict, goal: dict):
    raw = {
        "name": path["name"],
        "description": path["description"],
        "start_year": 2026,
        "end_year": 2035,
        "initial_state": base_state,
        "yearly_rules": {},
    }
    for year in range(2027, 2036):
        raw["yearly_rules"][str(year)] = _rule_for_path(path, goal["spec"]["domain"], year)
    validate_scenario(raw, source=Path(f"camino generado {path['id']}"))
    return scenario_from_dict(raw)


def compare_evaluated_paths(evaluated: list[dict]) -> dict:
    ranked = sorted(evaluated, key=lambda item: item["selectionScore"], reverse=True)
    selected = ranked[0]
    discarded = ranked[1:]
    reasons = [
        f"Se recomienda '{selected['name']}' porque equilibra mejor preparación, bienestar y riesgo.",
        f"Su puntaje de selección fue {round(selected['selectionScore'], 1)} frente a {round(discarded[0]['selectionScore'], 1) if discarded else 'sin alternativas'} de la siguiente ruta.",
    ]
    if selected["riskLevel"] == "bajo":
        reasons.append("Tiene menor riesgo relativo para sostener el sueño sin convertirlo en urgencia.")
    if selected["preparation"] >= 65:
        reasons.append("Aparece con una base suficiente para seguir explorando sin tratarla como certeza.")
    return {"selected": selected, "discarded": discarded, "reasons": reasons, "confidence": _confidence(ranked)}


def candidate_summary(path: dict, summary: dict, life_report: dict) -> dict:
    guidance = life_report["journeyGuidance"]
    risk_penalty = {"bajo": 4, "medio": 10, "alto": 18}.get(path.get("financialRisk"), 10)
    energy_penalty = {"baja": 3, "media": 8, "alta": 15}.get(path.get("energyDemand"), 8)
    selection_score = guidance["preparation"] * 0.46 + summary["compass"] * 0.28 + _upside_score(path) * 0.16 - risk_penalty - energy_penalty
    return {
        "id": path["id"],
        "name": path["name"],
        "strategy": path["strategy"],
        "description": path["description"],
        "assumptions": path.get("assumptions", []),
        "tradeoffs": path.get("tradeoffs", []),
        "timeEstimate": path.get("timeEstimate", "3 a 5 años"),
        "financialRisk": path.get("financialRisk", "medio"),
        "energyDemand": path.get("energyDemand", "media"),
        "creativeUpside": path.get("creativeUpside", "medio"),
        "preparation": guidance["preparation"],
        "compass": summary["compass"],
        "selectionScore": round(selection_score, 1),
        "riskLevel": path.get("financialRisk", "medio"),
        "firstStep": guidance["firstStep"]["title"],
    }


def enrich_life_report_with_comparison(life_report: dict, comparison: dict, goal_ai_used: bool, paths_ai_used: bool, assumptions: list[str]) -> dict:
    selected = comparison["selected"]
    discarded = comparison["discarded"]
    life_report["journeyGuidance"]["selectedPath"] = selected
    life_report["journeyGuidance"]["candidatePaths"] = [selected, *discarded]
    life_report["journeyGuidance"]["discardedPaths"] = discarded[:4]
    life_report["journeyGuidance"]["comparisonReasons"] = comparison["reasons"]
    life_report["journeyGuidance"]["confidence"] = comparison["confidence"]
    life_report["journeyGuidance"]["assumptions"] = assumptions
    life_report["lifeSummary"]["candidatePaths"] = [selected, *discarded]
    life_report["lifeSummary"]["selectedPath"] = selected
    life_report["lifeSummary"]["discardedPaths"] = discarded[:4]
    life_report["lifeSummary"]["comparisonReasons"] = comparison["reasons"]
    life_report["lifeSummary"]["confidence"] = comparison["confidence"]
    life_report["lifeSummary"]["assumptions"] = assumptions
    life_report["lifeSummary"]["aiParticipation"] = {"goalInterpreter": goal_ai_used, "pathGenerator": paths_ai_used}
    return life_report


def _normalize_paths(paths: Any, goal: dict) -> list[dict]:
    normalized = []
    for index, item in enumerate(paths if isinstance(paths, list) else []):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("nombre") or "").strip()
        description = str(item.get("description") or item.get("descripcion") or "").strip()
        if not name or not description:
            continue
        strategy = str(item.get("strategy") or "gradual").lower()
        normalized.append(
            {
                "id": str(item.get("id") or f"path_{index + 1}"),
                "name": name[:80],
                "strategy": strategy if strategy in {"paralela", "gradual", "intensiva", "alianza", "financiada", "pausada"} else "gradual",
                "description": description[:240],
                "assumptions": _list_or([], item.get("assumptions")),
                "tradeoffs": _list_or([], item.get("tradeoffs")),
                "timeEstimate": str(item.get("timeEstimate") or "3 a 5 años"),
                "financialRisk": _risk_value(item.get("financialRisk")),
                "energyDemand": _demand_value(item.get("energyDemand")),
                "creativeUpside": _upside_value(item.get("creativeUpside")),
            }
        )
    return _dedupe_paths(normalized) or fallback_candidate_paths(goal)


def _rule_for_path(path: dict, domain: str, year: int) -> dict:
    phase = year - 2026
    strategy = path.get("strategy", "gradual")
    financial_risk = path.get("financialRisk", "medio")
    energy_demand = path.get("energyDemand", "media")
    upside = path.get("creativeUpside", "medio")
    rule = {
        "debt_payment": max(450000, 1400000 - phase * 70000),
        "savings_rate": 0.08 + min(0.08, phase * 0.008),
        "note": f"{path['name']}: se prueba esta ruta durante {year}, revisando evidencia antes de acelerar.",
    }
    if strategy in {"intensiva", "financiada"}:
        rule["financial_stability_delta"] = -2 if year < 2030 else 1
        rule["daily_energy_delta"] = -2 if energy_demand == "alta" else -1
        rule["north_star_alignment_delta"] = 2
        rule["creative_freedom_delta"] = 2 if upside == "alto" else 1
        rule["savings_rate"] = max(0.03, rule["savings_rate"] - 0.04)
    elif strategy in {"pausada", "paralela"}:
        rule["financial_stability_delta"] = 1
        rule["daily_energy_delta"] = 0 if energy_demand != "alta" else -1
        rule["creative_freedom_delta"] = 1
        rule["north_star_alignment_delta"] = 1
        rule["savings_rate"] += 0.04
    elif strategy == "alianza":
        rule["relationships_delta"] = 1
        rule["daily_energy_delta"] = 0
        rule["creative_freedom_delta"] = 1
        rule["north_star_alignment_delta"] = 1
    else:
        rule["financial_stability_delta"] = 0 if financial_risk == "medio" else 1
        rule["daily_energy_delta"] = -1 if energy_demand == "alta" else 0
        rule["creative_freedom_delta"] = 1
        rule["north_star_alignment_delta"] = 1

    if domain == "salud":
        rule["physical_capacity_delta"] = 2 if strategy in {"pausada", "gradual", "alianza"} else 1
        rule["daily_energy_delta"] = rule.get("daily_energy_delta", 0) + (1 if strategy != "intensiva" else -1)
        rule["creative_freedom_delta"] = max(0, rule.get("creative_freedom_delta", 0) - 1)
    elif domain == "vivienda":
        rule["financial_stability_delta"] = rule.get("financial_stability_delta", 0) + (2 if strategy in {"pausada", "gradual"} else -1)
        rule["savings_rate"] = min(0.24, rule["savings_rate"] + (0.06 if strategy != "intensiva" else 0.01))
    elif domain == "familia":
        rule["relationships_delta"] = rule.get("relationships_delta", 0) + 1
        rule["daily_energy_delta"] = rule.get("daily_energy_delta", 0) - (1 if strategy == "intensiva" else 0)
        rule["financial_stability_delta"] = rule.get("financial_stability_delta", 0) + (1 if strategy in {"pausada", "gradual"} else 0)
    elif domain == "emprendimiento":
        rule["creative_freedom_delta"] = rule.get("creative_freedom_delta", 0) + (2 if upside == "alto" else 1)
        rule["north_star_alignment_delta"] = rule.get("north_star_alignment_delta", 0) + 1
        if strategy == "paralela":
            rule["daily_energy_delta"] = rule.get("daily_energy_delta", 0) - 1
    return rule


def _list_or(default: list, value: Any) -> list:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return default


def _risk_value(value: Any) -> str:
    value = str(value or "medio").lower()
    return value if value in {"bajo", "medio", "alto"} else "medio"


def _demand_value(value: Any) -> str:
    value = str(value or "media").lower()
    return value if value in {"baja", "media", "alta"} else "media"


def _upside_value(value: Any) -> str:
    value = str(value or "medio").lower()
    return value if value in {"bajo", "medio", "alto"} else "medio"


def _tradeoffs(financial_risk: str, energy_demand: str) -> list[str]:
    return [f"Riesgo financiero {financial_risk}.", f"Demanda de energía {energy_demand}."]


def _upside_score(path: dict) -> float:
    return {"bajo": 45, "medio": 62, "alto": 78}.get(path.get("creativeUpside"), 62)


def _confidence(ranked: list[dict]) -> str:
    if len(ranked) < 2:
        return "media"
    gap = ranked[0]["selectionScore"] - ranked[1]["selectionScore"]
    if gap >= 12:
        return "alta"
    if gap >= 5:
        return "media"
    return "baja"


def _dedupe_paths(paths: list[dict]) -> list[dict]:
    seen = set()
    unique = []
    for path in paths:
        key = path["name"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(path)
    return unique
