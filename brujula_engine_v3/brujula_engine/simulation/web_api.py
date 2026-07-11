import argparse
import json
import os
import sys
from typing import List

from brujula_engine.llm.ollama_client import DEFAULT_MODEL, DEFAULT_OLLAMA_URL, OllamaClient
from brujula_engine.presentation.life_report import build_life_report
from brujula_engine.rules.scoring import general_compass
from brujula_engine.simulation.engine import run_scenario, scenario_summary
from brujula_engine.simulation.journey_hybrid import (
    candidate_summary,
    cluster_evaluated_paths,
    compare_evaluated_paths,
    decision_timeline,
    enrich_life_report_with_comparison,
    expand_candidate_paths,
    generate_candidate_paths_with_ai,
    interpret_goal_with_ai,
    prune_candidate_paths,
    qualitative_comparison_with_ai,
    scenario_from_candidate_path,
)
from brujula_engine.simulation.life_profile import base_state_from_profile, profile_warnings
from brujula_engine.simulation.ollama_report import generate_sue_letter


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
    used_ollama_for_goal = True
    used_ollama_for_paths = True
    used_ollama_for_comparison = True
    used_ollama_for_report = True
    base_state = base_state_from_profile(life_profile)
    try:
        client.ensure_model_available()
        goal, used_ollama_for_goal, goal_error = interpret_goal_with_ai(client, text, life_profile)
    except Exception as exc:
        from brujula_engine.simulation.journey_goal import interpret_goal

        goal = interpret_goal(text, life_profile)
        used_ollama_for_goal = False
        goal_error = str(exc)

    if goal_error:
        warnings.append("Ollama no pudo interpretar completamente el objetivo. Brújula usó el intérprete local.")
        warnings.append(goal_error)
    if goal.get("unsupportedWarning"):
        warnings.append(goal["unsupportedWarning"])

    base_paths, used_ollama_for_paths, path_error = generate_candidate_paths_with_ai(client, text, goal, life_profile)
    if path_error:
        warnings.append("Ollama no pudo generar todos los caminos alternativos. Brújula usó rutas locales del dominio.")
        warnings.append(path_error)

    expanded_paths = expand_candidate_paths(base_paths, goal, target=90)
    paths, pruned_paths = prune_candidate_paths(expanded_paths)
    if len(paths) < 3:
        paths = expanded_paths[:12]

    evaluated = []
    for path in paths:
        scenario = scenario_from_candidate_path(path, base_state, goal)
        states = run_scenario(scenario, life_profile)
        summary = scenario_summary(scenario, life_profile)
        life_report = build_life_report(summary["scenario"], states, summary, life_profile, goal)
        payload = candidate_summary(path, summary, life_report)
        evaluated.append({**payload, "scenario": scenario, "states": states, "summary": summary, "lifeReport": life_report})

    clusters = cluster_evaluated_paths([_public_candidate(item) for item in evaluated])
    comparison = compare_path_results(evaluated)
    selected_eval = comparison["selected"]
    scenario = selected_eval["scenario"]
    states = selected_eval["states"]
    summary = selected_eval["summary"]
    top_public = [_public_candidate(selected_eval), *[_public_candidate(item) for item in comparison["discarded"]]]
    qualitative, used_ollama_for_comparison, qualitative_error = qualitative_comparison_with_ai(
        client,
        top_public,
        goal,
        selected_eval["lifeReport"]["lifeSummary"],
    )
    if qualitative_error:
        warnings.append("Ollama no pudo completar la segunda lectura comparativa. Brújula usó comparación local.")
        warnings.append(qualitative_error)
    assumptions = list(
        dict.fromkeys(
            goal.get("aiProfile", {}).get("assumptions", [])
            + selected_eval.get("assumptions", [])
            + qualitative.get("assumptions", [])
        )
    )
    life_report = enrich_life_report_with_comparison(
        selected_eval["lifeReport"],
        {
            "selected": _public_candidate(selected_eval),
            "discarded": [_public_candidate(item) for item in comparison["discarded"]],
            "reasons": comparison["reasons"],
            "confidence": comparison["confidence"],
            "confidenceScore": comparison.get("confidenceScore"),
        },
        used_ollama_for_goal,
        used_ollama_for_paths,
        assumptions,
        explored_paths=len(expanded_paths),
        clustered_paths=clusters,
        pruned_paths=pruned_paths,
        qualitative=qualitative,
        decision_events=decision_timeline(selected_eval, states),
    )

    visible_candidates = top_public
    life_report["journeyGuidance"]["candidatePaths"] = visible_candidates
    life_report["lifeSummary"]["candidatePaths"] = visible_candidates

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
        "goal": goal["spec"],
        "candidatePaths": visible_candidates,
        "selectedPath": _public_candidate(selected_eval),
        "exploredPaths": len(expanded_paths),
        "clusteredPaths": clusters,
        "lifeProfile": life_profile or {},
        "warnings": warnings,
        "llm": {
            "scenario": used_ollama_for_paths,
            "goal": used_ollama_for_goal,
            "paths": used_ollama_for_paths,
            "comparison": used_ollama_for_comparison,
            "report": used_ollama_for_report,
            "model": model,
        },
    }


def compare_path_results(evaluated: list[dict]) -> dict:
    public = [
        {key: value for key, value in item.items() if key not in {"scenario", "states", "summary", "lifeReport"}}
        for item in evaluated
    ]
    comparison = compare_evaluated_paths(public)
    selected_id = comparison["selected"]["id"]
    discarded_ids = {item["id"] for item in comparison["discarded"]}
    selected = next(item for item in evaluated if item["id"] == selected_id)
    discarded = [item for item in evaluated if item["id"] in discarded_ids]
    return {**comparison, "selected": selected, "discarded": discarded}


def _public_candidate(item: dict) -> dict:
    return {key: value for key, value in item.items() if key not in {"scenario", "states", "summary", "lifeReport"}}


def deterministic_report(life_report: dict) -> str:
    summary = life_report["summary"]
    rituals = life_report["rituals"]
    guidance = life_report.get("journeyGuidance", {})
    goal = guidance.get("goal", {})
    profile = life_report.get("lifeSummary", {}).get("perfil", {})
    name = profile.get("nombre") or "Mariel"
    dream = profile.get("suenoPrincipal") or goal.get("goalType") or "construir una vida más propia"
    highlight = ""
    if profile.get("destacados"):
        highlight = f" También tengo presente esto de tu perfil: {profile['destacados'][0].lower()}"
    ritual = rituals[0] if rituals else "hacer una pausa breve para escuchar cómo se siente este camino"
    return (
        f"Querida {name}:\n\n"
        f"Al mirar este viaje de {goal.get('goalType', dream).lower()}, veo una pregunta concreta: "
        f"{guidance.get('focusQuestion', 'qué tendría que cambiar para que este sueño sea posible').lower()} "
        f"También aparece un cuidado importante: {summary['mainCare'].lower()}. No significa detenerte; "
        f"significa preparar el terreno correcto para este tipo de sueño.{highlight}\n\n"
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
