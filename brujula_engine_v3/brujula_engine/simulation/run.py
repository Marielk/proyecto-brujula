import argparse
from pathlib import Path
from typing import Iterable, List

from brujula_engine.llm.ollama_client import DEFAULT_MODEL, DEFAULT_OLLAMA_URL, OllamaClient, OllamaError
from brujula_engine.simulation.engine import rank_scenarios, run_scenario, scenario_summary
from brujula_engine.simulation.loader import list_scenarios, load_scenario
from brujula_engine.simulation.ollama_report import generate_comparison_report, generate_scenario_report
from brujula_engine.rules.scoring import color_level, general_compass


def money(n):
    return ("$" + f"{n:,.0f}").replace(",", ".")


def print_dashboard(state):
    dashboard = state.as_dashboard()
    compass = general_compass(dashboard)
    print(f"\nAño {state.year} | Edad {state.age}")
    print(f"Brújula general: {compass}% - {color_level(compass)}")
    print("-" * 58)
    for label, value in dashboard.items():
        print(f"{label:<42} {value:>5}%  {color_level(value)}")
    print("-" * 58)
    print(f"Ingreso mensual: {money(state.monthly_income)}")
    print(f"Gastos mensuales: {money(state.monthly_expenses)}")
    print(f"Deuda total: {money(state.debt_total)}")
    print(f"Ahorro: {money(state.savings)}")


def print_yearly_table(states):
    print("\nEvolución anual:")
    print(f"{'Año':<6} {'Brújula':>8} {'Est. fin.':>10} {'Crear':>8} {'Energía':>8} {'Deuda':>14} {'Ahorro':>14}")
    print("-" * 76)
    for state in states:
        dashboard = state.as_dashboard()
        compass = general_compass(dashboard)
        print(
            f"{state.year:<6} {compass:>7.1f}% "
            f"{dashboard['Estabilidad financiera']:>9.1f}% "
            f"{dashboard['Libertad para crear']:>7.1f}% "
            f"{dashboard['Energía diaria']:>7.1f}% "
            f"{money(state.debt_total):>14} "
            f"{money(state.savings):>14}"
        )


def print_scenario(
    name: str,
    scenario_dir: Path | None = None,
    show_yearly: bool = False,
    ollama_client: OllamaClient | None = None,
):
    scenario = load_scenario(name, scenario_dir)
    states = run_scenario(scenario)
    summary = scenario_summary(scenario)

    print("\nProyecto Brújula Engine v3")
    print(f"Escenario: {scenario.name}")
    print(scenario.description)
    print_dashboard(states[0])
    print_dashboard(states[-1])

    if show_yearly:
        print_yearly_table(states)

    print("\nNotas del camino:")
    for note in states[-1].notes[-12:]:
        print(f"- {note}")

    print("\nLectura humana:")
    print(f"Mayor fortaleza proyectada: {summary['strongest']}.")
    print(f"Área que más necesita cuidado: {summary['weakest']}.")
    print("Brújula no decide por ti; muestra consecuencias probables para cuidar mejor el camino.")

    if ollama_client:
        print("\nLectura local con Ollama:")
        print(generate_scenario_report(ollama_client, scenario))


def print_comparison(names: Iterable[str], scenario_dir: Path | None = None, ollama_client: OllamaClient | None = None):
    scenarios = [load_scenario(name, scenario_dir) for name in names]
    ranking = rank_scenarios(scenarios)

    print("\nComparación de escenarios - Brújula Engine v3")
    print(f"{'#':<3} {'Escenario':<60} {'Brújula':>8} {'Deuda':>14} {'Ahorro':>14} {'Cuidado principal':<28}")
    print("-" * 134)
    for index, item in enumerate(ranking, start=1):
        scenario = item["scenario"]
        final = item["final_state"]
        print(
            f"{index:<3} {scenario.name[:60]:<60} "
            f"{item['compass']:>7.1f}% "
            f"{money(final.debt_total):>14} "
            f"{money(final.savings):>14} "
            f"{item['weakest']:<28}"
        )

    print("\nLectura breve:")
    winner = ranking[0]
    print(f"Mejor brújula general: {winner['scenario'].name} ({winner['compass']}%).")
    print("Usa este ranking como conversación con tus supuestos, no como una orden.")

    if ollama_client:
        print("\nLectura local con Ollama:")
        print(generate_comparison_report(ollama_client, scenarios))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simula y compara escenarios de Proyecto Brújula.")
    parser.add_argument("--scenario", help="Nombre del escenario a ejecutar, sin .json.")
    parser.add_argument("--compare", nargs="*", help="Compara escenarios. Sin valores compara todos.")
    parser.add_argument("--list", action="store_true", help="Lista los escenarios disponibles.")
    parser.add_argument("--yearly", action="store_true", help="Muestra la evolución anual del escenario.")
    parser.add_argument("--scenario-dir", type=Path, help="Carpeta alternativa con escenarios JSON.")
    parser.add_argument("--ollama", action="store_true", help="Agrega una lectura narrativa usando Ollama local.")
    parser.add_argument("--ollama-health", action="store_true", help="Comprueba conexión y modelos disponibles en Ollama.")
    parser.add_argument("--ollama-url", default=DEFAULT_OLLAMA_URL, help="URL de Ollama. Default: http://localhost:11434")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Modelo de Ollama. Default: {DEFAULT_MODEL}")
    return parser


def main(argv: List[str] | None = None):
    parser = build_parser()
    args = parser.parse_args(argv)
    ollama_client = OllamaClient(base_url=args.ollama_url, model=args.model) if (args.ollama or args.ollama_health) else None

    if args.ollama_health:
        _print_ollama_health(ollama_client)
        return

    if args.list:
        print("\nEscenarios disponibles:")
        for name in list_scenarios(args.scenario_dir):
            print(f"- {name}")
        return

    if args.compare is not None:
        names = args.compare or list_scenarios(args.scenario_dir)
        if ollama_client:
            ollama_client.ensure_model_available()
        print_comparison(names, args.scenario_dir, ollama_client)
        return

    if args.scenario:
        if ollama_client:
            ollama_client.ensure_model_available()
        print_scenario(args.scenario, args.scenario_dir, args.yearly, ollama_client)
        return

    parser.error("Usa --scenario, --compare o --list.")


def _print_ollama_health(client: OllamaClient):
    try:
        models = client.list_models()
    except OllamaError as exc:
        print(f"Ollama no está disponible: {exc}")
        return

    print("\nOllama disponible")
    print(f"URL: {client.base_url}")
    print("Modelos instalados:")
    for model in models:
        marker = " (modelo activo)" if model == client.model else ""
        print(f"- {model}{marker}")
    if client.model not in models:
        print(f"\nModelo seleccionado no instalado: {client.model}")
        print(f"Instálalo con: ollama pull {client.model}")


if __name__ == "__main__":
    main()
