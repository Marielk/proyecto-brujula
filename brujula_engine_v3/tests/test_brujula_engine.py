import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

from brujula_engine.simulation.engine import rank_scenarios, run_scenario
from brujula_engine.simulation.life_profile import profile_warnings
from brujula_engine.simulation.loader import ScenarioValidationError, load_scenario
from brujula_engine.simulation.ollama_report import generate_comparison_report, generate_scenario_report
from brujula_engine.presentation.life_report import build_life_report
from brujula_engine.simulation.run import main


PROJECT_ROOT = Path(__file__).resolve().parents[1]


class TestBrujulaEngine(unittest.TestCase):
    def test_load_scenario_does_not_depend_on_current_directory(self):
        original_cwd = Path.cwd()
        try:
            os.chdir(tempfile.gettempdir())
            scenario = load_scenario("brujula_startup")
        finally:
            os.chdir(original_cwd)

        self.assertEqual(scenario.start_year, 2026)
        self.assertEqual(scenario.end_year, 2035)

    def test_run_scenario_returns_one_state_per_year(self):
        scenario = load_scenario("stay_in_tech")
        states = run_scenario(scenario)

        self.assertEqual(len(states), 10)
        self.assertEqual(states[0].year, 2026)
        self.assertEqual(states[-1].year, 2035)
        self.assertGreater(states[-1].savings, states[0].savings)

    def test_rank_scenarios_orders_by_final_compass(self):
        scenarios = [
            load_scenario("brujula_startup"),
            load_scenario("pastry_business"),
            load_scenario("stay_in_tech"),
        ]
        ranking = rank_scenarios(scenarios)

        self.assertEqual(ranking[0]["scenario"].name, "Continuar en tecnología con preparación gradual")
        self.assertGreaterEqual(ranking[0]["compass"], ranking[-1]["compass"])

    def test_validation_rejects_missing_years(self):
        source = PROJECT_ROOT / "data" / "scenarios" / "stay_in_tech.json"
        raw = json.loads(source.read_text(encoding="utf-8"))
        raw["yearly_rules"].pop("2035")

        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "broken.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            with self.assertRaises(ScenarioValidationError):
                load_scenario("broken", Path(tmpdir))

    def test_cli_compare_prints_ranking(self):
        output = StringIO()
        with redirect_stdout(output):
            main(["--compare"])

        text = output.getvalue()
        self.assertIn("Comparación de escenarios", text)
        self.assertIn("Mejor brújula general", text)

    def test_ollama_report_uses_scenario_data(self):
        scenario = load_scenario("brujula_startup")
        client = FakeOllamaClient()

        report = generate_scenario_report(client, scenario)

        self.assertEqual(report, "lectura simulada")
        self.assertIn("Construir Brújula como startup creativa", client.last_prompt)
        self.assertIn("brujula_general", client.last_prompt)

    def test_ollama_comparison_uses_ranking_data(self):
        scenarios = [load_scenario("brujula_startup"), load_scenario("stay_in_tech")]
        client = FakeOllamaClient()

        report = generate_comparison_report(client, scenarios)

        self.assertEqual(report, "lectura simulada")
        self.assertIn("Continuar en tecnología con preparación gradual", client.last_prompt)
        self.assertIn("cuidado_principal", client.last_prompt)

    def test_life_report_view_model_has_required_sections(self):
        scenario = load_scenario("brujula_startup")
        states = run_scenario(scenario)
        summary = rank_scenarios([scenario])[0]

        report = build_life_report(scenario, states, summary)

        self.assertIn("summary", report)
        self.assertIn("lifeSummary", report)
        self.assertIn("gains", report)
        self.assertIn("sacrifices", report)
        self.assertIn("garden", report)
        self.assertEqual(len(report["indices"]), 10)
        self.assertGreaterEqual(len(report["timeline"]), 1)
        self.assertLessEqual(len(report["timeline"]), 8)
        self.assertLessEqual(len(report["rituals"]), 5)
        self.assertIn("Riesgo de Agotamiento", [item["label"] for item in report["indices"]])
        self.assertIn("serenidad", report["lifeSummary"])

    def test_life_profile_changes_simulation_inputs(self):
        scenario = load_scenario("brujula_startup")
        baseline = run_scenario(scenario)[0]
        constrained_profile = {
            "identity": {"name": "Mariel", "age": 35, "country": "Chile"},
            "workTime": {
                "mainStatus": "Trabajo dependiente tiempo completo",
                "weeklyHours": "Más de 50",
                "perceivedDemand": 5,
                "healthyBoundaries": 2,
                "personalProjectTime": "Casi nada",
            },
            "lifeGarden": {
                "physicalHealth": 2,
                "dailyEnergy": 2,
                "financialStability": 2,
                "relationships": 4,
                "creativity": 3,
                "purpose": 5,
                "freeTime": 2,
                "serenity": 2,
            },
            "health": {"limitsProjects": "Mucho", "averageEnergy": 2, "painLevel": 6},
            "finances": {"debtLevel": "Alta", "savingsLevel": "Ninguno", "financialFeeling": 2},
            "northStar": {"mainDream": "Construir una vida creativa y tranquila"},
            "values": {"selected": ["Creatividad", "Autocuidado"], "topThree": ["Creatividad", "Autocuidado"]},
            "wellbeingPreferences": {"recharges": ["Dormir"], "ritualTypes": ["Descanso"]},
        }

        personalized = run_scenario(scenario, constrained_profile)[0]
        warnings = profile_warnings(constrained_profile)

        self.assertLess(personalized.daily_energy, baseline.daily_energy)
        self.assertLess(personalized.creative_freedom, baseline.creative_freedom)
        self.assertEqual(personalized.age, 35)
        self.assertGreaterEqual(len(warnings), 3)


class FakeOllamaClient:
    def __init__(self):
        self.last_prompt = ""

    def chat(self, messages, temperature=0.35):
        self.last_prompt = messages[-1]["content"]
        return "lectura simulada"


if __name__ == "__main__":
    unittest.main()
