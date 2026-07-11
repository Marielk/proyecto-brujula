from pathlib import Path
from typing import Any, Dict

from brujula_engine.llm.ollama_client import OllamaClient
from brujula_engine.simulation.loader import ScenarioValidationError, scenario_from_dict, validate_scenario


BASE_INITIAL_STATE = {
    "year": 2026,
    "age": 35,
    "monthly_income": 2300000,
    "monthly_expenses": 1831000,
    "debt_total": 14247000,
    "savings": 0,
    "physical_capacity": 42,
    "daily_energy": 48,
    "financial_stability": 48,
    "creative_freedom": 35,
    "relationships": 82,
    "north_star_alignment": 88,
    "projected_life_quality": 63,
    "notes": ["2026: Estado inicial cargado con datos base de Brújula."],
}


PROMPT_TEMPLATE = """Convierte el texto de la persona en un escenario JSON para Proyecto Brújula.

Texto libre:
{scenario_text}

Reglas estrictas:
- Devuelve solo JSON válido, sin markdown.
- Usa start_year 2026 y end_year 2035.
- Copia exactamente initial_state desde el objeto base entregado.
- Crea yearly_rules para todos los años 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034 y 2035.
- Cada regla puede usar solo estos campos:
  income_delta, expense_delta, debt_payment, savings_delta, savings_rate, note,
  physical_capacity_delta, daily_energy_delta, financial_stability_delta,
  creative_freedom_delta, relationships_delta, north_star_alignment_delta.
- savings_rate debe estar entre 0 y 1.
- Las notas deben ser breves, humanas y relacionadas con el escenario.
- No seas extremo: usa cambios graduales salvo que el texto indique un giro fuerte.

Objeto base exacto para initial_state:
{base_state}

Forma obligatoria:
{{
  "name": "Nombre breve del escenario",
  "description": "Descripción en una frase",
  "start_year": 2026,
  "end_year": 2035,
  "initial_state": {{ ... objeto base exacto ... }},
  "yearly_rules": {{
    "2027": {{ "debt_payment": 1500000, "savings_rate": 0.1, "note": "..." }},
    "2028": {{ }},
    "2029": {{ }},
    "2030": {{ }},
    "2031": {{ }},
    "2032": {{ }},
    "2033": {{ }},
    "2034": {{ }},
    "2035": {{ }}
  }}
}}"""


def generate_scenario_from_text(client: OllamaClient, scenario_text: str, base_initial_state: dict | None = None):
    if not scenario_text.strip():
        raise ScenarioValidationError("El texto del escenario no puede estar vacío.")

    base_state = base_initial_state or BASE_INITIAL_STATE
    prompt = PROMPT_TEMPLATE.format(
        scenario_text=scenario_text.strip(),
        base_state=base_state,
    )
    raw = client.chat_json(
        [
            {
                "role": "system",
                "content": "Eres un diseñador cuidadoso de escenarios para un simulador de vida. Respondes solo JSON válido.",
            },
            {"role": "user", "content": prompt},
        ]
    )
    raw["initial_state"] = base_state
    validate_scenario(raw, source=Path("escenario generado desde texto"))
    return scenario_from_dict(raw)


def fallback_scenario_from_text(scenario_text: str, base_initial_state: dict | None = None):
    text = scenario_text.strip()
    if not text:
        raise ScenarioValidationError("El texto del escenario no puede estar vacío.")

    base_state = base_initial_state or BASE_INITIAL_STATE
    lower = text.lower()
    is_transition = any(word in lower for word in ["dejar", "renunciar", "bajar horas", "transición", "freelance"])
    is_health = any(word in lower for word in ["salud", "cuerpo", "energía", "descanso", "rutina"])
    is_business = any(word in lower for word in ["emprender", "startup", "negocio", "pasteler", "ventas", "brújula"])

    raw = {
        "name": _scenario_name(text),
        "description": text[:220],
        "start_year": 2026,
        "end_year": 2035,
        "initial_state": base_state,
        "yearly_rules": {},
    }

    for year in range(2027, 2036):
        phase = year - 2026
        rule = {
            "debt_payment": max(700000, 1700000 - phase * 90000),
            "savings_rate": min(0.22, 0.09 + phase * 0.015),
            "creative_freedom_delta": 2 if is_business else 1,
            "north_star_alignment_delta": 1 if is_business else 0,
            "note": f"Se avanza con cautela en el escenario descrito, revisando supuestos durante {year}.",
        }

        if is_transition and year >= 2028:
            rule["income_delta"] = -60000 if year in [2028, 2029] else 20000
            rule["financial_stability_delta"] = -1 if year < 2031 else 2
            rule["creative_freedom_delta"] = rule["creative_freedom_delta"] + 3

        if is_health:
            rule["physical_capacity_delta"] = 1 if year >= 2028 else 0
            rule["daily_energy_delta"] = 1 if year >= 2028 else 0
        elif is_business and year in [2028, 2029, 2030]:
            rule["daily_energy_delta"] = -1

        raw["yearly_rules"][str(year)] = rule

    validate_scenario(raw, source=Path("escenario heurístico desde texto"))
    return scenario_from_dict(raw)


def _scenario_name(text: str) -> str:
    words = " ".join(text.split())
    if len(words) <= 46:
        return words
    return words[:43].rstrip() + "..."
