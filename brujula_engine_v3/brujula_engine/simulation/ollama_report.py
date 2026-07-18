import json
from typing import Iterable

from brujula_engine.llm.ollama_client import OllamaClient
from brujula_engine.rules.scoring import general_compass
from brujula_engine.simulation.engine import rank_scenarios, run_scenario


SYSTEM_PROMPT = """Eres Brújula, una guía serena para analizar escenarios de vida.
No predices el futuro y no das órdenes. Lees datos transparentes, explicas tensiones,
nombras riesgos y propones próximos pasos cuidadosos. Responde siempre en español."""

SUE_PROMPT = """Eres Sue, una compañera amable dentro de Brújula.
No eres una autoridad. No das órdenes. No juzgas.
Escribes con ternura, calma y esperanza, como una carta breve."""


def scenario_payload(scenario) -> dict:
    states = run_scenario(scenario)
    final = states[-1]
    return {
        "nombre": scenario.name,
        "descripcion": scenario.description,
        "inicio": _state_payload(states[0]),
        "final": _state_payload(final),
        "notas": final.notes[-12:],
    }


def comparison_payload(scenarios: Iterable) -> list[dict]:
    items = []
    for item in rank_scenarios(scenarios):
        final = item["final_state"]
        items.append(
            {
                "nombre": item["scenario"].name,
                "brujula_general": item["compass"],
                "deuda_final": _money(final.debt_total),
                "ahorro_final": _money(final.savings),
                "mayor_fortaleza": item["strongest"],
                "cuidado_principal": item["weakest"],
            }
        )
    return items


def generate_scenario_report(client: OllamaClient, scenario) -> str:
    payload = scenario_payload(scenario)
    prompt = f"""Analiza este escenario de Proyecto Brújula.

Datos:
{json.dumps(payload, ensure_ascii=False, indent=2)}

Devuelve:
1. Lectura humana en 2 párrafos breves.
2. Tres señales a cuidar.
3. Tres próximos pasos concretos, suaves y realistas.
4. Una frase final que recuerde que la persona conserva la decisión.

No recalcules ni cambies los números. Si mencionas dinero, copia los montos tal como aparecen."""
    return client.chat(_messages(prompt))


def generate_sue_letter(client: OllamaClient, life_summary: dict) -> str:
    selected_path = life_summary.get("selectedPath") or {}
    compact_summary = {
        "domain": life_summary.get("domain"),
        "goalType": life_summary.get("goalType"),
        "controllability": life_summary.get("guiaViaje", {}).get("goal", {}).get("controllability"),
        "scenarioType": life_summary.get("guiaViaje", {}).get("goal", {}).get("controllabilityLabel"),
        "calidadVida": life_summary.get("calidadVida"),
        "serenidad": life_summary.get("serenidad"),
        "resiliencia": life_summary.get("resiliencia"),
        "esperanza": life_summary.get("esperanza"),
        "riesgoAgotamiento": life_summary.get("riesgoAgotamiento"),
        "probabilidadArrepentimiento": life_summary.get("probabilidadArrepentimiento"),
        "valores": life_summary.get("valores", [])[:5],
        "fortalezas": life_summary.get("fortalezas", [])[:3],
        "cuidados": life_summary.get("cuidados", [])[:3],
        "exploredPaths": life_summary.get("exploredPaths"),
        "selectedPath": {
            "name": selected_path.get("name"),
            "description": selected_path.get("description"),
            "strategy": selected_path.get("strategy"),
            "requirements": selected_path.get("requirements", [])[:3],
            "steps": selected_path.get("steps", [])[:3],
            "decisions": selected_path.get("decisions", [])[:3],
            "tradeoffs": selected_path.get("tradeoffs", [])[:2],
            "evaluationDetails": selected_path.get("evaluationDetails"),
        },
        "discardedPaths": [
            {"name": path.get("name"), "riskLevel": path.get("riskLevel")}
            for path in life_summary.get("discardedPaths", [])[:2]
        ],
        "comparisonReasons": life_summary.get("comparisonReasons", [])[:4],
        "whatCouldChangeRecommendation": life_summary.get("whatCouldChangeRecommendation", [])[:4],
        "firstStep": life_summary.get("guiaViaje", {}).get("firstStep"),
        "discardedReasons": life_summary.get("discardedReasons", [])[:3],
        "assumptions": life_summary.get("assumptions", [])[:3],
        "perfil": life_summary.get("perfil", {}),
    }
    prompt = f"""Escribe una Carta de Sue a partir de este LifeSummary.

LifeSummary:
{json.dumps(compact_summary, ensure_ascii=False, indent=2)}

Reglas:
- Máximo 220 palabras.
- La carta debe sentirse escrita solo para esta persona, este objetivo y esta ruta.
- No repitas porcentajes.
- No describas tablas.
- No uses lenguaje técnico.
- No juzgues y no des órdenes.
- Habla principalmente del sueño específico indicado por domain y goalType.
- Usa domainMetrics, domainRisks y successConditions si existen.
- Si existen selectedPath, candidatePaths, discardedPaths, comparisonReasons, confidence o assumptions, explica que se exploraron varios caminos antes de sugerir uno.
- Si existen exploredPaths, clusteredPaths, discardedReasons, confidenceScore, domainPolicy o evaluationDetails, explica con lenguaje humano que Brújula exploró decenas de futuros y eligió el sendero más protector.
- Nombra la ruta recomendada con suavidad y una razon humana basada en comparisonReasons.
- Menciona caminos descartados sin humillarlos: explica qué condición tendría que cambiar para que vuelvan a ser buena idea.
- Explica por qué la ruta elegida protege mejor la vida que la persona desea construir.
- Menciona una ruta alternativa solo como posibilidad futura, indicando que tendria que cambiar para ganar fuerza.
- Menciona al menos una decisión o etapa específica de la ruta ganadora.
- Explica una compensación concreta de la ruta elegida.
- Si el escenarioType es dependiente del azar, dilo con honestidad: no hay ruta fiable para provocar el evento, solo exploración de decisiones si ocurriera.
- No presentes la ruta elegida como destino obligatorio.
- Menciona una fortaleza específica del dominio.
- Menciona un cuidado concreto del dominio.
- Si el dominio es salud, centra la carta en descanso, hábitos, constancia y autocuidado.
- Si el dominio es vivienda, centra la carta en ahorro, pie, deuda y compra sostenible.
- Si el dominio es familia, centra la carta en red de apoyo, tiempo, hogar y cuidados.
- Si el dominio es emprendimiento, centra la carta en validación, ingresos, energía y transición gradual.
- Termina con esperanza.
- No uses frases que servirían igual para comprar casa, bajar de peso, estudiar o cambiar de empleo; si eso ocurre, reescribe.
- Recuerda con suavidad que la decisión sigue siendo de la persona.

Formato:
Querida Mariel:

...

Con cariño,
Sue"""
    return client.chat(
        [
            {"role": "system", "content": SUE_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.45,
        num_predict=650,
    )


def generate_comparison_report(client: OllamaClient, scenarios: Iterable) -> str:
    payload = comparison_payload(scenarios)
    prompt = f"""Compara estos escenarios de Proyecto Brújula.

Datos:
{json.dumps(payload, ensure_ascii=False, indent=2)}

Devuelve:
1. Ranking interpretado sin sonar determinista.
2. Qué gana y qué sacrifica cada camino.
3. Una recomendación prudente para decidir el siguiente experimento de bajo riesgo.

No uses tablas. No recalcules ni cambies los números. Si mencionas dinero, copia los montos tal como aparecen."""
    return client.chat(_messages(prompt))


def _state_payload(state) -> dict:
    dashboard = state.as_dashboard()
    return {
        "año": state.year,
        "edad": state.age,
        "brujula_general": general_compass(dashboard),
        "dashboard": dashboard,
        "ingreso_mensual": _money(state.monthly_income),
        "gastos_mensuales": _money(state.monthly_expenses),
        "deuda_total": _money(state.debt_total),
        "ahorro": _money(state.savings),
    }


def _money(value) -> str:
    return ("$" + f"{value:,.0f}").replace(",", ".")


def _messages(prompt: str):
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
