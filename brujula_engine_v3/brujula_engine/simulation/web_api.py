import argparse
import json
import os
import sys
from typing import List

from brujula_engine.llm.ollama_client import DEFAULT_MODEL, DEFAULT_OLLAMA_URL, OllamaClient
from brujula_engine.presentation.life_report import build_life_report
from brujula_engine.rules.scoring import general_compass
from brujula_engine.simulation.engine import run_scenario, scenario_summary
from brujula_engine.simulation.life_profile import base_state_from_profile, profile_warnings
from brujula_engine.simulation.ollama_report import generate_sue_letter
from brujula_engine.simulation.text_scenario import fallback_scenario_from_text, generate_scenario_from_text


def money(value) -> str:
    return ("$" + f"{value:,.0f}").replace(",", ".")


def state_to_dict(state) -> dict:
    dashboard = state.as_dashboard()
    return {
        "year": state.year,
        "age": state.age,
        "compass": general_compass(dashboard),
        "dashboard": dashboard,
        "monthlyIncome": state.monthly_income,
        "monthlyExpenses": state.monthly_expenses,
        "debtTotal": state.debt_total,
        "savings": state.savings,
        "money": {
            "monthlyIncome": money(state.monthly_income),
            "monthlyExpenses": money(state.monthly_expenses),
            "debtTotal": money(state.debt_total),
            "savings": money(state.savings),
        },
    }


def simulate_from_text(text: str, model: str, ollama_url: str, life_profile: dict | None = None) -> dict:
    warnings = profile_warnings(life_profile)
    ollama_timeout = int(os.getenv("BRUJULA_OLLAMA_TIMEOUT", "20"))
    client = OllamaClient(base_url=ollama_url, model=model, timeout=ollama_timeout)
    used_ollama_for_scenario = True
    used_ollama_for_report = True
    base_state = base_state_from_profile(life_profile)

    try:
        client.ensure_model_available()
        scenario = generate_scenario_from_text(client, text, base_state)
    except Exception as exc:
        used_ollama_for_scenario = False
        warnings.append("Ollama no pudo construir el escenario. Brújula usó un generador local heurístico para continuar.")
        warnings.append(str(exc))
        scenario = fallback_scenario_from_text(text, base_state)

    states = run_scenario(scenario, life_profile)
    summary = scenario_summary(scenario, life_profile)
    life_report = build_life_report(summary["scenario"], states, summary, life_profile)

    try:
        report = generate_sue_letter(client, life_report["lifeSummary"])
    except Exception as exc:
        used_ollama_for_report = False
        warnings.append("Ollama no pudo generar la Carta de Sue. Se usó una carta determinista.")
        warnings.append(str(exc))
        report = deterministic_report(life_report)

    return {
        "scenario": {
            "name": scenario.name,
            "description": scenario.description,
            "startYear": scenario.start_year,
            "endYear": scenario.end_year,
        },
        "states": [state_to_dict(state) for state in states],
        "final": state_to_dict(states[-1]),
        "summary": {
            "strongest": summary["strongest"],
            "weakest": summary["weakest"],
            "compass": summary["compass"],
        },
        "notes": states[-1].notes[-12:],
        "report": report,
        "lifeReport": life_report,
        "lifeProfile": life_profile or {},
        "warnings": warnings,
        "llm": {
            "scenario": used_ollama_for_scenario,
            "report": used_ollama_for_report,
            "model": model,
        },
    }


def deterministic_report(life_report: dict) -> str:
    summary = life_report["summary"]
    rituals = life_report["rituals"]
    profile = life_report.get("lifeSummary", {}).get("perfil", {})
    name = profile.get("nombre") or "Mariel"
    dream = profile.get("suenoPrincipal") or "construir una vida más propia"
    highlight = ""
    if profile.get("destacados"):
        highlight = f" También tengo presente esto de tu perfil: {profile['destacados'][0].lower()}"
    ritual = rituals[0] if rituals else "hacer una pausa breve para escuchar cómo se siente este camino"
    return (
        f"Querida {name}:\n\n"
        f"Al mirar este camino, veo {summary['strongest'].lower()} como una luz importante. "
        f"También aparece un cuidado concreto: {summary['mainCare'].lower()}. No significa detenerte; "
        f"significa avanzar con una forma que no te deje atrás.{highlight}\n\n"
        f"Tu sueño de {dream.lower()} no necesita resolverse de golpe. "
        f"Quizás esta semana baste con algo pequeño, como {ritual.lower()} "
        "La decisión sigue siendo tuya, y todavía hay maneras suaves de ajustar el rumbo.\n\n"
        "Con cariño,\nSue"
    )


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--ollama-url", default=DEFAULT_OLLAMA_URL)
    args = parser.parse_args(argv)

    try:
        request = json.loads(sys.stdin.read() or "{}")
        result = simulate_from_text(request.get("text", ""), args.model, args.ollama_url, request.get("lifeProfile"))
        print(json.dumps({"success": True, "data": result}, ensure_ascii=True))
        return 0
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}, ensure_ascii=True))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
