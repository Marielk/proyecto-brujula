from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from brujula_engine.llm.ollama_client import OllamaClient
from brujula_engine.simulation.journey_goal import interpret_goal
from brujula_engine.simulation.journey_personalization import (
    build_goal_profile_v2,
    genericity_guard,
    milestones_from_path,
    path_schema_v2,
    scoring_policy,
    select_goal_context,
    what_could_change_recommendation,
)
from brujula_engine.simulation.loader import scenario_from_dict, validate_scenario
from brujula_engine.presentation.life_report import refresh_report_for_selected_path


DOMAINS = {"salud", "vivienda", "familia", "emprendimiento", "educacion", "creatividad", "carrera", "general"}
DOMAIN_POLICIES = {
    "salud": {"label": "Salud", "quality": 0.20, "serenity": 0.18, "resilience": 0.18, "hope": 0.12, "values": 0.12, "sustainability": 0.20},
    "vivienda": {"label": "Vivienda", "quality": 0.14, "serenity": 0.14, "resilience": 0.22, "hope": 0.10, "values": 0.10, "sustainability": 0.30},
    "familia": {"label": "Familia", "quality": 0.18, "serenity": 0.18, "resilience": 0.20, "hope": 0.16, "values": 0.16, "sustainability": 0.12},
    "emprendimiento": {"label": "Emprendimiento", "quality": 0.14, "serenity": 0.12, "resilience": 0.18, "hope": 0.18, "values": 0.16, "sustainability": 0.22},
    "educacion": {"label": "Educacion", "quality": 0.16, "serenity": 0.18, "resilience": 0.16, "hope": 0.18, "values": 0.18, "sustainability": 0.14},
    "creatividad": {"label": "Creatividad", "quality": 0.18, "serenity": 0.14, "resilience": 0.14, "hope": 0.22, "values": 0.20, "sustainability": 0.12},
    "carrera": {"label": "Carrera", "quality": 0.12, "serenity": 0.12, "resilience": 0.16, "hope": 0.14, "values": 0.14, "sustainability": 0.14},
    "general": {"label": "General", "quality": 0.18, "serenity": 0.16, "resilience": 0.16, "hope": 0.16, "values": 0.16, "sustainability": 0.18},
}


def interpret_goal_with_ai(client: OllamaClient, text: str, life_profile: dict | None = None) -> tuple[dict, bool, str | None]:
    deterministic = interpret_goal(text, life_profile)
    prompt = f"""Analiza este objetivo de vida para Brújula y devuelve solo JSON.

Objetivo:
{text}

Perfil resumido:
{json.dumps(life_profile or {}, ensure_ascii=False)[:2500]}

Dominios disponibles: salud, vivienda, familia, emprendimiento, educacion, creatividad, carrera, general.

Forma obligatoria:
{{
  "domain": "salud|vivienda|familia|emprendimiento|educacion|creatividad|carrera|general",
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
            num_predict=1100,
        )
        raw_domain = raw.get("domain") if raw.get("domain") in DOMAINS else None
        deterministic_domain = deterministic["spec"]["domain"]
        domain = deterministic_domain if deterministic_domain != "general" and raw_domain == "general" else raw_domain or deterministic_domain
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
        ai_profile = {
            "secondaryDomains": _list_or([], raw.get("secondaryDomains")),
            "intention": raw.get("intention", ""),
            "expectedRisks": _list_or([], raw.get("expectedRisks")),
            "involvedValues": _list_or([], raw.get("involvedValues")),
            "assumptions": _list_or([], raw.get("assumptions")),
        }
        spec = build_goal_profile_v2(spec, text, life_profile, ai_profile)
        return {
            **deterministic,
            "spec": spec,
            "aiProfile": ai_profile,
            "unsupportedWarning": None
            if spec["supported"]
            else "Este tipo de viaje todavía utiliza un modelo general. La simulación puede ser menos precisa.",
        }, True, None
    except Exception as exc:
        return deterministic, False, str(exc)


def generate_candidate_paths_with_ai(client: OllamaClient, text: str, goal: dict, life_profile: dict | None = None) -> tuple[list[dict], bool, str | None]:
    context_selection = select_goal_context(life_profile, goal["spec"]["domain"])
    compact_prompt = _compact_path_prompt(text, goal, context_selection)
    prompt = f"""Crea entre 4 y 6 estrategias realmente distintas para este objetivo de Brújula. Responde JSON compacto.

Objetivo: {text}
GoalProfile v2:
{json.dumps(goal["spec"], ensure_ascii=False, indent=2)}

Contexto relevante seleccionado:
{json.dumps(context_selection, ensure_ascii=False, indent=2)[:3000]}

Reglas:
- Diferencia rutas por decisiones de estrategia, no solo por ritmo.
- Completa pasos concretos, recursos, condiciones de avance, pausas y criterio de éxito.
- Evita consejos universales salvo que sean causalmente necesarios para esta meta.
- No inventes montos, diagnósticos ni garantías.
- Si la controlabilidad es baja, no presentes la ruta como plan para provocar el evento.

Forma exacta:
{{
  "paths": [
    {{
      "id": "path_a",
      "name": "Nombre breve",
      "strategy": "pausada|gradual|intensiva|alianza|financiada",
      "domain": "{goal["spec"]["domain"]}",
      "specificOutcome": "resultado específico de la ruta",
      "description": "Una frase concreta",
      "timeEstimate": "12 meses",
      "timeEstimateMonths": 12,
      "financialRisk": "bajo|medio|alto",
      "energyDemand": "baja|media|alta",
      "reversibility": "alta|media|baja",
      "assumptions": ["..."],
      "requirements": ["..."],
      "steps": [
        {{
          "id": "audit",
          "phase": 1,
          "title": "Etapa concreta",
          "durationWeeks": 2,
          "actions": ["..."],
          "completionCriteria": ["..."],
          "expectedEffects": {{"clarity": 8, "energy": -1}}
        }}
      ],
      "advanceConditions": ["..."],
      "pauseConditions": ["..."],
      "successCriteria": ["..."],
      "tradeoffs": ["..."],
      "domainBenefit": {{"name": "empleabilidad", "level": "alta"}}
    }}
  ]
}}"""
    try:
        try:
            paths = _generate_paths_once(client, compact_prompt, goal, num_predict=1200)
        except Exception:
            paths = []
        if len(paths) < 2:
            paths = _generate_paths_once(client, prompt, goal, num_predict=1800)
        if len(paths) < 2:
            raise ValueError("Ollama gener? menos de dos caminos ?tiles.")
        return paths[:7], True, None
    except Exception as exc:
        return fallback_candidate_paths(goal), False, str(exc)


def _generate_paths_once(client: OllamaClient, prompt: str, goal: dict, num_predict: int) -> list[dict]:
    raw = client.chat_json(
        [
            {"role": "system", "content": "Eres Path Generator de Brújula. Devuelve solo JSON válido con la clave paths."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.25,
        num_predict=num_predict,
    )
    return _normalize_paths(_raw_paths(raw), goal)


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
    elif domain == "educacion":
        seeds = [
            ("bloques_suaves", "Estudio en bloques suaves", "pausada", "Aprender con bloques breves y revisiones mensuales sin sobrecargar agenda.", "bajo", "baja", "medio"),
            ("programa_formal", "Programa formal gradual", "gradual", "Tomar un curso o diplomado compatible con trabajo y descanso.", "medio", "media", "medio"),
            ("inmersion", "Inmersión intensiva", "intensiva", "Concentrar tiempo y energía para acelerar una nueva capacidad.", "medio", "alta", "alto"),
            ("mentoria", "Aprendizaje con mentoría", "alianza", "Avanzar acompañada por alguien que reduzca fricción y aislamiento.", "medio", "media", "alto"),
            ("beca_o_fondo", "Ruta financiada con beca", "financiada", "Buscar apoyo económico antes de asumir carga formativa mayor.", "bajo", "media", "alto"),
        ]
    elif domain == "creatividad":
        seeds = [
            ("obra_minima", "Obra mínima protegida", "pausada", "Crear piezas pequeñas antes de exponerlas o monetizarlas.", "bajo", "baja", "alto"),
            ("practica_publica", "Práctica pública gradual", "gradual", "Compartir obra con una comunidad pequeña y aprender de la respuesta.", "medio", "media", "alto"),
            ("residencia_creativa", "Temporada intensiva de creación", "intensiva", "Reservar una etapa de foco profundo para producir una obra mayor.", "alto", "alta", "alto"),
            ("colectivo", "Crear con colectivo o taller", "alianza", "Sostener ritmo creativo con pares y una red de cuidado.", "medio", "media", "alto"),
            ("preventa_obra", "Financiar una obra por preventa", "financiada", "Validar interés y recursos antes de dedicar más tiempo.", "alto", "media", "alto"),
        ]
    elif domain == "carrera":
        seeds = [
            ("portfolio_return", "Regreso a UX con portafolio actualizado", "gradual", "Actualizar evidencia profesional mientras mantiene ingresos actuales.", "bajo", "media", "medio"),
            ("network_market", "Activación de red y entrevistas informativas", "alianza", "Usar conversaciones profesionales para calibrar rol, renta y brechas antes de postular.", "bajo", "media", "medio"),
            ("focused_applications", "Postulación selectiva a roles compatibles", "gradual", "Preparar casos de estudio y postular a vacantes donde la experiencia previa sea ventaja.", "medio", "media", "medio"),
            ("freelance_bridge", "Puente freelance con clientes pequeños", "paralela", "Validar independencia profesional con encargos acotados antes de cambiar de base laboral.", "medio", "alta", "alto"),
            ("intensive_reskill", "Reconversión intensiva con mentoría", "intensiva", "Cerrar brechas rápido con mentoría, aceptando mayor demanda de energía por un periodo corto.", "alto", "alta", "medio"),
        ]
    else:
        seeds = [
            ("experimento", "Experimento pequeño", "pausada", "Probar el sueño durante 30 días con bajo riesgo.", "bajo", "baja", "medio"),
            ("gradual", "Ruta gradual", "gradual", "Avanzar por etapas revisando evidencia cada trimestre.", "medio", "media", "medio"),
            ("intensiva", "Ruta intensiva", "intensiva", "Acelerar el cambio aceptando más esfuerzo e incertidumbre.", "alto", "alta", "alto"),
            ("alianza", "Ruta acompañada", "alianza", "Buscar apoyo o colaboración para reducir carga individual.", "medio", "media", "medio"),
            ("pausa", "Preparar antes de actuar", "pausada", "Fortalecer bases antes de mover piezas grandes.", "bajo", "baja", "bajo"),
        ]
    paths = [
        path_schema_v2({
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
            "steps": _structured_steps(strategy, domain),
            "decisions": _structured_decisions(strategy, domain),
            "expectedEffects": _structured_effects(financial_risk, energy_demand, creative_upside),
        }, goal)
        for id_, name, strategy, description, financial_risk, energy_demand, creative_upside in seeds
    ]
    if goal["spec"].get("controllability") == "low":
        for path in paths:
            path["name"] = "Explorar escenario hipotético: " + path["name"].lower()
            path["description"] = "Este camino no intenta provocar el evento aleatorio; ordena qué decidirías si ocurriera."
            path["financialRisk"] = "bajo"
            path["energyDemand"] = "baja"
            path["successCriteria"] = ["Reformular el deseo como objetivo financiero controlable", "Definir decisiones prudentes si el evento ocurriera"]
    return paths


def expand_candidate_paths(base_paths: list[dict], goal: dict, target: int = 90) -> list[dict]:
    variants = []
    tempos = [
        ("suave", "con ritmo suave", -1, -1, 0),
        ("balanceado", "con ritmo balanceado", 0, 0, 0),
        ("acelerado", "con ritmo acelerado", 1, 1, 1),
    ]
    supports = [
        ("solo", "con revisiones personales", 0, 0, 0),
        ("red", "con red de apoyo activa", 0, -1, 1),
        ("mentor", "con mentoría o guía externa", 1, 0, 1),
    ]
    funding = [
        ("sin_deuda", "sin sumar deuda nueva", -1, 0, 0),
        ("colchon", "con colchón previo", -1, -1, 1),
        ("inversion", "con inversión o preventa", 1, 1, 1),
    ]
    for base in base_paths:
        for tempo in tempos:
            for support in supports:
                for fund in funding:
                    variant = base.copy()
                    variant["id"] = f"{base['id']}_{tempo[0]}_{support[0]}_{fund[0]}"
                    variant["name"] = f"{base['name']} ({tempo[1]})"
                    variant["description"] = f"{base['description']} Se prueba {tempo[1]}, {support[1]} y {fund[1]}."
                    variant["financialRisk"] = _shift_risk(base.get("financialRisk", "medio"), tempo[2] + fund[2])
                    variant["energyDemand"] = _shift_demand(base.get("energyDemand", "media"), tempo[3] + support[3] + fund[3])
                    variant["creativeUpside"] = _shift_upside(base.get("creativeUpside", "medio"), tempo[4] + support[4] + fund[4])
                    variant["variant"] = {"tempo": tempo[0], "support": support[0], "funding": fund[0]}
                    variant["steps"] = _structured_steps(variant["strategy"], goal["spec"]["domain"], variant["variant"])
                    variant["decisions"] = _structured_decisions(variant["strategy"], goal["spec"]["domain"], variant["variant"])
                    variant["expectedEffects"] = _structured_effects(variant["financialRisk"], variant["energyDemand"], variant["creativeUpside"])
                    variants.append(path_schema_v2(variant, goal))
                    if len(variants) >= target:
                        return variants
    return variants


def prune_candidate_paths(paths: list[dict]) -> tuple[list[dict], list[dict]]:
    unique = _dedupe_paths(paths)
    viable = []
    discarded = []
    for path in unique:
        reasons = []
        if path["financialRisk"] == "alto" and path["energyDemand"] == "alta" and path.get("strategy") == "intensiva":
            reasons.append("Combina riesgo financiero alto, demanda alta e intensidad elevada.")
        if path["financialRisk"] == "alto" and path.get("variant", {}).get("funding") == "inversion":
            reasons.append("Depende de financiamiento riesgoso antes de tener evidencia suficiente.")
        if reasons:
            discarded.append({"id": path["id"], "name": path["name"], "reasons": reasons})
        else:
            viable.append(path)
    dominated = []
    kept = []
    for path in viable:
        signature = (path["strategy"], path["variant"].get("tempo"), path["variant"].get("support"))
        competitor = next((item for item in kept if (item["strategy"], item["variant"].get("tempo"), item["variant"].get("support")) == signature), None)
        if competitor and _path_penalty(path) >= _path_penalty(competitor):
            dominated.append({"id": path["id"], "name": path["name"], "reasons": ["Ruta dominada por una variante similar con menor costo vital."]})
            continue
        if competitor:
            kept = [item for item in kept if item["id"] != competitor["id"]]
            dominated.append({"id": competitor["id"], "name": competitor["name"], "reasons": ["Ruta dominada por una variante similar con menor costo vital."]})
        kept.append(path)
    return kept, discarded + dominated


def cluster_evaluated_paths(evaluated: list[dict]) -> list[dict]:
    clusters: dict[str, list[dict]] = {}
    for path in evaluated:
        key = path.get("strategy", "gradual")
        clusters.setdefault(key, []).append(path)
    result = []
    for key, items in clusters.items():
        ranked = sorted(items, key=lambda item: item["selectionScore"], reverse=True)
        result.append(
            {
                "id": key,
                "label": _cluster_label(key),
                "size": len(items),
                "representative": ranked[0],
                "averageScore": round(sum(item["selectionScore"] for item in items) / len(items), 1),
            }
        )
    return sorted(result, key=lambda item: item["representative"]["selectionScore"], reverse=True)


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
    discarded = ranked[1:3]
    reasons = [
        f"Se recomienda '{selected['name']}' porque equilibra mejor sostenibilidad, bienestar y coherencia con valores.",
        f"Exploró {len(evaluated)} futuros viables y su puntaje fue {round(selected['selectionScore'], 1)} frente a {round(discarded[0]['selectionScore'], 1) if discarded else 'sin alternativas'} de la siguiente ruta.",
    ]
    if selected["riskLevel"] == "bajo":
        reasons.append("Tiene menor riesgo relativo para sostener el sueño sin convertirlo en urgencia.")
    if selected["preparation"] >= 65:
        reasons.append("Aparece con una base suficiente para seguir explorando sin tratarla como certeza.")
    return {"selected": selected, "discarded": discarded, "reasons": reasons, "confidence": _confidence(ranked), "confidenceScore": _confidence_score(ranked)}


def candidate_summary(path: dict, summary: dict, life_report: dict) -> dict:
    guidance = life_report["journeyGuidance"]
    life = life_report["lifeSummary"]
    domain = guidance["goal"].get("domain")
    policy = DOMAIN_POLICIES.get(domain, DOMAIN_POLICIES["general"])
    v2_policy = scoring_policy(domain or "general")
    sustainability = _sustainability_score(path, life)
    domain_score = _domain_metric_score(life.get("domainMetrics", {}), path)
    quality = life["calidadVida"]
    serenity = life["serenidad"]
    resilience = life["resiliencia"]
    hope = life["esperanza"]
    regret = 100 - _risk_number(life["probabilidadArrepentimiento"])
    values = _value_coherence(path, life)
    selection_score = (
        domain_score * v2_policy["domain"]
        + sustainability * v2_policy["sustainability"]
        + values * v2_policy["values"]
        + regret * v2_policy["regret"]
        + quality * policy["quality"] * 0.35
        + serenity * policy["serenity"] * 0.35
        + resilience * policy["resilience"] * 0.35
        + hope * policy["hope"] * 0.25
        - _path_penalty(path) * v2_policy["penalty"]
    )
    return {
        "id": path["id"],
        "name": path["name"],
        "strategy": path["strategy"],
        "description": path["description"],
        "assumptions": path.get("assumptions", []),
        "tradeoffs": path.get("tradeoffs", []),
        "steps": path.get("steps", []),
        "requirements": path.get("requirements", []),
        "advanceConditions": path.get("advanceConditions", []),
        "pauseConditions": path.get("pauseConditions", []),
        "successCriteria": path.get("successCriteria", []),
        "decisions": path.get("decisions", []),
        "expectedEffects": path.get("expectedEffects", []),
        "variant": path.get("variant", {}),
        "timeEstimate": path.get("timeEstimate", "3 a 5 años"),
        "timeEstimateMonths": path.get("timeEstimateMonths"),
        "financialRisk": path.get("financialRisk", "medio"),
        "energyDemand": path.get("energyDemand", "media"),
        "reversibility": path.get("reversibility", "alta"),
        "creativeUpside": path.get("creativeUpside", "medio"),
        "domainBenefit": path.get("domainBenefit"),
        "preparation": guidance["preparation"],
        "compass": summary["compass"],
        "selectionScore": round(selection_score, 1),
        "riskLevel": path.get("financialRisk", "medio"),
        "firstStep": guidance["firstStep"]["title"],
        "domainPolicy": policy["label"],
        "evaluationDetails": {
            "sustainability": round(sustainability, 1),
            "domainSpecific": round(domain_score, 1),
            "qualityOfLife": round(quality, 1),
            "serenity": round(serenity, 1),
            "resilience": round(resilience, 1),
            "hope": round(hope, 1),
            "regretProtection": round(regret, 1),
            "valueCoherence": round(values, 1),
        },
    }


def enrich_life_report_with_comparison(
    life_report: dict,
    comparison: dict,
    goal_ai_used: bool,
    paths_ai_used: bool,
    assumptions: list[str],
    explored_paths: int | None = None,
    clustered_paths: list[dict] | None = None,
    pruned_paths: list[dict] | None = None,
    qualitative: dict | None = None,
    decision_events: list[dict] | None = None,
) -> dict:
    selected = comparison["selected"]
    discarded = comparison["discarded"]
    qualitative = qualitative or {}
    pruned_paths = pruned_paths or []
    clustered_paths = clustered_paths or []
    decision_events = decision_events or []
    life_report["journeyGuidance"]["selectedPath"] = selected
    life_report["journeyGuidance"]["candidatePaths"] = [selected, *discarded]
    life_report["journeyGuidance"]["discardedPaths"] = discarded[:2]
    life_report["journeyGuidance"]["comparisonReasons"] = comparison["reasons"] + [item for item in [qualitative.get("recommendedReason"), qualitative.get("lifeProtection")] if item]
    life_report["journeyGuidance"]["confidence"] = comparison["confidence"]
    life_report["journeyGuidance"]["confidenceScore"] = comparison.get("confidenceScore")
    life_report["journeyGuidance"]["assumptions"] = assumptions
    life_report["journeyGuidance"]["exploredPaths"] = explored_paths or len([selected, *discarded])
    life_report["journeyGuidance"]["clusteredPaths"] = clustered_paths
    life_report["journeyGuidance"]["discardedReasons"] = qualitative.get("discardedReasons", []) or [reason for item in pruned_paths[:3] for reason in item.get("reasons", [])]
    life_report["journeyGuidance"]["domainPolicy"] = selected.get("domainPolicy")
    life_report["journeyGuidance"]["evaluationDetails"] = selected.get("evaluationDetails", {})
    life_report["journeyGuidance"]["whatCouldChangeRecommendation"] = qualitative.get("whatCouldChangeRecommendation") or what_could_change_recommendation(selected, discarded, {"spec": life_report["journeyGuidance"]["goal"]}, life_report.get("profile", {}))
    life_report["lifeSummary"]["candidatePaths"] = [selected, *discarded]
    life_report["lifeSummary"]["exploredPaths"] = explored_paths or len([selected, *discarded])
    life_report["lifeSummary"]["clusteredPaths"] = clustered_paths
    life_report["lifeSummary"]["selectedPath"] = selected
    life_report["lifeSummary"]["discardedPaths"] = discarded[:2]
    life_report["lifeSummary"]["discardedReasons"] = qualitative.get("discardedReasons", []) or [reason for item in pruned_paths[:3] for reason in item.get("reasons", [])]
    life_report["lifeSummary"]["comparisonReasons"] = life_report["journeyGuidance"]["comparisonReasons"]
    life_report["lifeSummary"]["confidence"] = comparison["confidence"]
    life_report["lifeSummary"]["confidenceScore"] = comparison.get("confidenceScore")
    life_report["lifeSummary"]["assumptions"] = assumptions
    life_report["lifeSummary"]["domainPolicy"] = selected.get("domainPolicy")
    life_report["lifeSummary"]["evaluationDetails"] = selected.get("evaluationDetails", {})
    life_report["lifeSummary"]["whatCouldChangeRecommendation"] = life_report["journeyGuidance"]["whatCouldChangeRecommendation"]
    life_report["lifeSummary"]["aiParticipation"] = {"goalInterpreter": goal_ai_used, "pathGenerator": paths_ai_used}
    if decision_events:
        life_report["timeline"] = decision_events
        life_report["lifeSummary"]["eventosCamino"] = decision_events
        life_report["lifeSummary"]["domainMilestones"] = decision_events
        life_report["journeyGuidance"]["domainMilestones"] = decision_events
    return refresh_report_for_selected_path(life_report, selected)


def _normalize_paths(paths: Any, goal: dict) -> list[dict]:
    normalized = []
    for index, item in enumerate(paths if isinstance(paths, list) else []):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("nombre") or item.get("title") or item.get("titulo") or "").strip()
        description = str(item.get("description") or item.get("descripcion") or item.get("resumen") or item.get("summary") or "").strip()
        if not name:
            continue
        if not description:
            description = f"Explorar {name.lower()} con revisión de energía, dinero y apoyo antes de escalar."
        strategy = str(item.get("strategy") or "gradual").lower()
        normalized.append(
            path_schema_v2({
                "id": str(item.get("id") or f"path_{index + 1}"),
                "name": name[:80],
                "strategy": strategy if strategy in {"paralela", "gradual", "intensiva", "alianza", "financiada", "pausada"} else "gradual",
                "description": description[:240],
                "domain": str(item.get("domain") or goal["spec"]["domain"]),
                "specificOutcome": str(item.get("specificOutcome") or goal["spec"].get("targetOutcome") or goal["spec"]["goalType"]),
                "assumptions": _list_or([], item.get("assumptions")),
                "tradeoffs": _list_or([], item.get("tradeoffs")),
                "timeEstimate": str(item.get("timeEstimate") or "3 a 5 años"),
                "timeEstimateMonths": item.get("timeEstimateMonths"),
                "financialRisk": _risk_value(item.get("financialRisk")),
                "energyDemand": _demand_value(item.get("energyDemand")),
                "reversibility": str(item.get("reversibility") or "alta"),
                "creativeUpside": _upside_value(item.get("creativeUpside")),
                "steps": _list_keep(item.get("steps")),
                "requirements": _list_or([], item.get("requirements") or item.get("requisitos")),
                "advanceConditions": _list_or([], item.get("advanceConditions") or item.get("condicionesAvance")),
                "pauseConditions": _list_or([], item.get("pauseConditions") or item.get("condicionesPausa")),
                "successCriteria": _list_or([], item.get("successCriteria") or item.get("criteriosExito")),
                "decisions": _list_or([], item.get("decisions") or item.get("decisiones")),
                "expectedEffects": _list_or([], item.get("expectedEffects") or item.get("efectosEsperados")),
                "domainBenefit": item.get("domainBenefit") if isinstance(item.get("domainBenefit"), dict) else {},
            }, goal)
        )
    for path in normalized:
        _ensure_structured_path(path, goal["spec"]["domain"])
    return _dedupe_paths(normalized) or fallback_candidate_paths(goal)


def _raw_paths(raw: Any) -> list:
    if isinstance(raw, list):
        return raw
    if not isinstance(raw, dict):
        return []
    for key in ("paths", "rutas", "routes", "caminos", "strategies", "estrategias"):
        value = raw.get(key)
        if isinstance(value, list):
            return value
    for value in raw.values():
        if isinstance(value, list) and value and isinstance(value[0], dict):
            return value
    return []


def _compact_path_prompt(text: str, goal: dict, context_selection: dict) -> str:
    return f"""Objetivo: {text}
Dominio: {goal["spec"]["domain"]}
Tipo: {goal["spec"]["goalType"]}
Resultado esperado: {goal["spec"].get("targetOutcome")}
Contexto primario: {json.dumps(context_selection.get("primaryContext", {}), ensure_ascii=False)[:1200]}

Devuelve JSON exacto:
{{
  "paths": [
    {{
      "id": "ruta_1",
      "name": "nombre concreto",
      "strategy": "gradual",
      "description": "qué decisión diferencia esta ruta",
      "timeEstimate": "12 meses",
      "financialRisk": "bajo",
      "energyDemand": "media",
      "requirements": ["requisito específico"],
      "decisions": ["decisión específica"],
      "advanceConditions": ["condición para avanzar"],
      "successCriteria": ["criterio de éxito"]
    }}
  ]
}}

Necesito 4 rutas distintas por estrategia real. No uses solo suave/balanceado/acelerado."""


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
    elif domain == "educacion":
        rule["north_star_alignment_delta"] = rule.get("north_star_alignment_delta", 0) + 1
        rule["daily_energy_delta"] = rule.get("daily_energy_delta", 0) - (1 if strategy == "intensiva" else 0)
        rule["creative_freedom_delta"] = rule.get("creative_freedom_delta", 0) + 1
    elif domain == "creatividad":
        rule["creative_freedom_delta"] = rule.get("creative_freedom_delta", 0) + (2 if upside == "alto" else 1)
        rule["north_star_alignment_delta"] = rule.get("north_star_alignment_delta", 0) + 1
        rule["daily_energy_delta"] = rule.get("daily_energy_delta", 0) - (1 if energy_demand == "alta" else 0)
    return rule


def qualitative_comparison_with_ai(client: OllamaClient, top_paths: list[dict], goal: dict, life_summary: dict) -> tuple[dict, bool, str | None]:
    payload = {
        "goal": goal["spec"],
        "topPaths": [_comparison_path_payload(path) for path in top_paths],
        "lifeSummary": {
            "calidadVida": life_summary.get("calidadVida"),
            "serenidad": life_summary.get("serenidad"),
            "resiliencia": life_summary.get("resiliencia"),
            "esperanza": life_summary.get("esperanza"),
            "valores": life_summary.get("valores", []),
        },
    }
    prompt = f"""Compara estas rutas de Brújula con JSON breve y válido.

Datos:
{json.dumps(payload, ensure_ascii=False, indent=2)}

Reglas:
- Frases cortas, máximo 18 palabras por campo.
- No repitas el nombre completo de la ruta como razón.
- Devuelve JSON cerrado y sin markdown.

Devuelve solo JSON:
{{
  "recommendedReason": "...",
  "whyNotOthers": [{{"pathId": "...", "reason": "..."}}],
  "decisionTradeoff": "...",
  "whatCouldChangeRecommendation": ["..."],
  "discardedReasons": ["..."],
  "lifeProtection": "...",
  "assumptions": ["..."]
}}"""
    try:
        raw = client.chat_json(
            [
                {"role": "system", "content": "Eres Advanced Comparator de Brújula. Comparas rutas sin absolutismos y priorizas vida sostenible."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.35,
            num_predict=1400,
        )
        return {
            "recommendedReason": str(raw.get("recommendedReason") or ""),
            "whyNotOthers": raw.get("whyNotOthers") if isinstance(raw.get("whyNotOthers"), list) else [],
            "decisionTradeoff": str(raw.get("decisionTradeoff") or ""),
            "whatCouldChangeRecommendation": _list_or([], raw.get("whatCouldChangeRecommendation")),
            "discardedReasons": _list_or([], raw.get("discardedReasons")),
            "lifeProtection": str(raw.get("lifeProtection") or ""),
            "assumptions": _list_or([], raw.get("assumptions")),
        }, True, None
    except Exception as exc:
        return {
            "recommendedReason": "La ruta elegida protege mejor el equilibrio entre avance, descanso, dinero y sentido.",
            "whyNotOthers": [{"pathId": path["id"], "reason": f"{path['name']} queda como alternativa si cambian sus supuestos principales."} for path in top_paths[1:]],
            "decisionTradeoff": "Se privilegia reversibilidad y evidencia temprana por sobre velocidad.",
            "whatCouldChangeRecommendation": [],
            "discardedReasons": [f"{path['name']} queda como alternativa si cambian sus supuestos principales." for path in top_paths[1:]],
            "lifeProtection": "La recomendación prioriza sostener la vida deseada antes que acelerar el resultado.",
            "assumptions": ["Comparación cualitativa generada por reglas locales por falta de respuesta IA."],
        }, False, str(exc)


def _comparison_path_payload(path: dict) -> dict:
    return {
        "id": path.get("id"),
        "name": path.get("name"),
        "strategy": path.get("strategy"),
        "description": path.get("description"),
        "selectionScore": path.get("selectionScore"),
        "financialRisk": path.get("financialRisk"),
        "energyDemand": path.get("energyDemand"),
        "reversibility": path.get("reversibility"),
        "requirements": path.get("requirements", [])[:3],
        "advanceConditions": path.get("advanceConditions", [])[:2],
        "tradeoffs": path.get("tradeoffs", [])[:2],
        "domainBenefit": path.get("domainBenefit"),
    }


def decision_timeline(path: dict, states: list) -> list[dict]:
    icons = ["🌱", "🦋", "☀️", "🌿"]
    years = [2027, 2028, 2030, 2033]
    decisions = path.get("decisions") or []
    effects = path.get("expectedEffects") or []
    steps = path.get("steps") or []
    items = []
    for index, decision in enumerate(decisions[:4]):
        detail = effects[index] if index < len(effects) else steps[index] if index < len(steps) else path["description"]
        items.append({"year": years[min(index, len(years) - 1)], "icon": icons[index % len(icons)], "title": decision, "description": detail})
    return items or [{"year": states[1].year, "icon": "🌱", "title": path["name"], "description": path["description"]}]


def _ensure_structured_path(path: dict, domain: str) -> None:
    path.setdefault("steps", _structured_steps(path.get("strategy", "gradual"), domain))
    path.setdefault("decisions", _structured_decisions(path.get("strategy", "gradual"), domain))
    path.setdefault("expectedEffects", _structured_effects(path.get("financialRisk", "medio"), path.get("energyDemand", "media"), path.get("creativeUpside", "medio")))
    if not path["steps"]:
        path["steps"] = _structured_steps(path.get("strategy", "gradual"), domain)
    if not path["decisions"]:
        path["decisions"] = _structured_decisions(path.get("strategy", "gradual"), domain)
    if not path["expectedEffects"]:
        path["expectedEffects"] = _structured_effects(path.get("financialRisk", "medio"), path.get("energyDemand", "media"), path.get("creativeUpside", "medio"))


def _structured_steps(strategy: str, domain: str, variant: dict | None = None) -> list[str]:
    variant = variant or {}
    tempo = variant.get("tempo", "balanceado")
    return [
        f"Definir una versión {tempo} del sueño en el dominio {DOMAIN_POLICIES.get(domain, DOMAIN_POLICIES['general'])['label']}.",
        "Probar una acción pequeña durante 30 días y registrar evidencia.",
        "Revisar dinero, energía y apoyo antes de aumentar compromiso.",
        f"Ajustar la estrategia {strategy} con una revisión trimestral.",
    ]


def _structured_decisions(strategy: str, domain: str, variant: dict | None = None) -> list[str]:
    variant = variant or {}
    support = variant.get("support", "solo")
    funding = variant.get("funding", "sin_deuda")
    return [
        "Elegir el primer experimento reversible.",
        f"Decidir si avanzas {strategy} con soporte {support}.",
        f"Definir financiamiento {funding} antes de escalar.",
        "Mantener, pausar o rediseñar según evidencia vital.",
    ]


def _structured_effects(financial_risk: str, energy_demand: str, creative_upside: str) -> list[str]:
    return [
        f"Riesgo financiero {financial_risk} observado desde el inicio.",
        f"Demanda de energía {energy_demand} integrada al ritmo.",
        f"Potencial creativo {creative_upside} sin convertirlo en obligación.",
        "Más claridad para decidir sin tratar la simulación como destino fijo.",
    ]


def _sustainability_score(path: dict, life: dict) -> float:
    base = (life["calidadVida"] + life["serenidad"] + life["resiliencia"]) / 3
    return max(0, min(100, base - _path_penalty(path) * 0.9 + _upside_score(path) * 0.08))


def _domain_metric_score(metrics: dict, path: dict) -> float:
    values = [float(value) for value in (metrics or {}).values() if isinstance(value, (int, float))]
    if not values:
        return 60
    base = sum(values) / len(values)
    benefit = path.get("domainBenefit") or {}
    if benefit.get("level") == "alta":
        base += 5
    if path.get("reversibility") == "alta":
        base += 3
    return max(0, min(100, base))


def _value_coherence(path: dict, life: dict) -> float:
    values = " ".join(life.get("valores", [])).lower()
    bonus = 8 if "creativ" in values and path.get("creativeUpside") == "alto" else 0
    bonus += 6 if "autocuidado" in values and path.get("energyDemand") != "alta" else 0
    return max(0, min(100, life.get("esperanza", 60) + bonus - _path_penalty(path) * 0.35))


def _risk_number(label: str) -> float:
    return {"Muy baja": 10, "Baja": 28, "Media": 52, "Alta": 76, "Muy alta": 90}.get(label, 50)


def _path_penalty(path: dict) -> float:
    return {"bajo": 6, "medio": 14, "alto": 26}.get(path.get("financialRisk"), 14) + {"baja": 4, "media": 10, "alta": 20}.get(path.get("energyDemand"), 10)


def _confidence_score(ranked: list[dict]) -> float:
    if len(ranked) < 2:
        return 70
    gap = ranked[0]["selectionScore"] - ranked[1]["selectionScore"]
    return round(max(35, min(92, 58 + gap * 2.4)), 1)


def _cluster_label(strategy: str) -> str:
    return {
        "paralela": "Rutas paralelas",
        "gradual": "Rutas graduales",
        "intensiva": "Rutas intensivas",
        "alianza": "Rutas acompaÃ±adas",
        "financiada": "Rutas financiadas",
        "pausada": "Rutas pausadas",
    }.get(strategy, "Rutas similares")


def _shift_risk(value: str, delta: int) -> str:
    levels = ["bajo", "medio", "alto"]
    return levels[max(0, min(2, levels.index(_risk_value(value)) + delta))]


def _shift_demand(value: str, delta: int) -> str:
    levels = ["baja", "media", "alta"]
    return levels[max(0, min(2, levels.index(_demand_value(value)) + delta))]


def _shift_upside(value: str, delta: int) -> str:
    levels = ["bajo", "medio", "alto"]
    return levels[max(0, min(2, levels.index(_upside_value(value)) + delta))]


def _list_or(default: list, value: Any) -> list:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return default


def _list_keep(value: Any) -> list:
    if isinstance(value, list):
        return [item for item in value if item]
    return []


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
