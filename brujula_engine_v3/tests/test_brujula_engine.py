import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

from brujula_engine.simulation.engine import rank_scenarios, run_scenario
from brujula_engine.simulation.journey_goal import (
    domain_avoid_list,
    domain_first_step,
    domain_metrics,
    domain_success_conditions,
    interpret_goal,
)
from brujula_engine.simulation.journey_hybrid import (
    cluster_evaluated_paths,
    compare_evaluated_paths,
    expand_candidate_paths,
    fallback_candidate_paths,
    prune_candidate_paths,
    scenario_from_candidate_path,
)
from brujula_engine.simulation.journey_personalization import genericity_guard, select_goal_context
from brujula_engine.simulation.life_profile import base_state_from_profile, profile_warnings
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
        self.assertIn("journeyGuidance", report)
        self.assertIn("gains", report)
        self.assertIn("sacrifices", report)
        self.assertIn("garden", report)
        self.assertGreaterEqual(len(report["indices"]), 5)
        self.assertGreaterEqual(len(report["timeline"]), 1)
        self.assertLessEqual(len(report["timeline"]), 8)
        self.assertLessEqual(len(report["rituals"]), 5)
        self.assertIn("Preparación general", [item["label"] for item in report["indices"]])
        self.assertIn("serenidad", report["lifeSummary"])
        self.assertIn("preparacionCamino", report["lifeSummary"])
        self.assertIn("conclusion", report["journeyGuidance"])
        self.assertGreaterEqual(len(report["journeyGuidance"]["successConditions"]), 1)
        self.assertGreaterEqual(len(report["journeyGuidance"]["avoidList"]), 1)
        self.assertIn("title", report["journeyGuidance"]["firstStep"])

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

    def test_goal_interpreter_detects_initial_domains(self):
        examples = {
            "Quiero bajar de peso y mejorar mi salud": "salud",
            "Quiero comprar una casa en 2030": "vivienda",
            "Quiero tener un hijo": "familia",
            "Quiero vivir del arte": "emprendimiento",
            "Quiero estudiar un magister": "educacion",
            "Quiero escribir una novela": "creatividad",
            "Quiero volver al diseño UX": "carrera",
        }

        for text, expected_domain in examples.items():
            with self.subTest(text=text):
                goal = interpret_goal(text)
                self.assertEqual(goal["spec"]["domain"], expected_domain)
                self.assertTrue(goal["spec"]["supported"])
                self.assertIn("controllability", goal["spec"])

    def test_goal_profile_v2_detects_low_controllability_random_event(self):
        goal = interpret_goal("Quiero ganar la lotería")

        self.assertEqual(goal["spec"]["controllability"], "low")
        self.assertEqual(goal["spec"]["uncertaintyType"], "random_event")
        self.assertIn("azar", goal["unsupportedWarning"])

    def test_domain_rules_change_metrics_conditions_and_first_step(self):
        scores = {
            "calidadVida": 61,
            "libertadFinanciera": 42,
            "libertadCreativa": 72,
            "saludIntegral": 58,
            "energiaVital": 50,
            "fortalezaRelaciones": 78,
            "proposito": 86,
            "riesgoAgotamiento": 57,
            "probabilidadArrepentimiento": 38,
            "coherenciaEstrellaNorte": 86,
            "serenidad": 54,
            "resiliencia": 55,
            "esperanza": 76,
            "financialTrend": 2,
            "energyTrend": -1,
        }
        summary = {"weakest": "Estabilidad financiera"}
        context = {"savingsLevel": "Ninguno", "healthLimits": "Moderadamente"}
        texts = ["mejorar mi salud", "comprar una casa", "tener un hijo", "vivir del arte", "volver a UX"]
        first_steps = []
        metric_sets = []

        for text in texts:
            goal = interpret_goal(text)
            metrics = domain_metrics(goal, scores, summary, context)
            conditions = domain_success_conditions(goal, metrics, scores, context)
            avoid = domain_avoid_list(goal, metrics, scores, context)
            first_step = domain_first_step(goal, metrics, scores, context)
            metric_sets.append(tuple(metrics.keys()))
            first_steps.append(first_step["title"])
            self.assertGreaterEqual(len(metrics), 3)
            self.assertGreaterEqual(len(conditions), 3)
            self.assertGreaterEqual(len(avoid), 2)

        self.assertEqual(len(set(metric_sets)), 5)
        self.assertEqual(len(set(first_steps)), 5)

    def test_hybrid_fallback_creates_multiple_candidate_paths(self):
        goal = interpret_goal("Quiero comprar una casa en 2030")

        paths = fallback_candidate_paths(goal)

        self.assertGreaterEqual(len(paths), 5)
        self.assertEqual(len({path["id"] for path in paths}), len(paths))
        self.assertTrue(all(path["financialRisk"] in {"bajo", "medio", "alto"} for path in paths))

    def test_career_fallback_uses_path_schema_v2(self):
        goal = interpret_goal("Quiero volver al diseño UX y mejorar mi renta")

        paths = fallback_candidate_paths(goal)

        self.assertGreaterEqual(len(paths), 5)
        self.assertTrue(all(path["domain"] == "carrera" for path in paths))
        self.assertTrue(all(path.get("requirements") for path in paths))
        self.assertTrue(all(isinstance(path.get("steps", [])[0], dict) for path in paths))
        self.assertIn("portafolio", " ".join(paths[0]["requirements"]).lower())

    def test_context_selector_prioritizes_domain_relevant_profile(self):
        profile = {
            "identity": {"age": 35},
            "workTime": {"area": "Diseño"},
            "finances": {"debtLevel": "Media"},
            "health": {"limitsProjects": "Moderadamente"},
            "northStar": {"mainDream": "Volver a UX"},
            "values": {"selected": ["Autonomía"]},
            "wellbeingPreferences": {"recharges": ["Dormir"]},
        }

        selected = select_goal_context(profile, "carrera")

        self.assertIn("workTime", selected["primaryContext"])
        self.assertIn("finances", selected["primaryContext"])
        self.assertIn("health", selected["secondaryContext"])

    def test_candidate_path_can_be_evaluated_by_journey_engine(self):
        goal = interpret_goal("Quiero vivir del arte cuidando mi salud")
        path = fallback_candidate_paths(goal)[0]

        scenario = scenario_from_candidate_path(
            path,
            base_state_from_profile({"identity": {"age": 34}}),
            goal,
        )
        states = run_scenario(scenario)

        self.assertEqual(scenario.start_year, 2026)
        self.assertEqual(states[-1].year, 2035)
        self.assertGreaterEqual(states[-1].north_star_alignment, states[0].north_star_alignment)

    def test_path_comparator_selects_best_scored_route(self):
        evaluated = [
            {"id": "a", "name": "Ruta A", "selectionScore": 48.4, "riskLevel": "medio", "preparation": 55},
            {"id": "b", "name": "Ruta B", "selectionScore": 72.2, "riskLevel": "bajo", "preparation": 70},
            {"id": "c", "name": "Ruta C", "selectionScore": 61.0, "riskLevel": "alto", "preparation": 68},
        ]

        comparison = compare_evaluated_paths(evaluated)

        self.assertEqual(comparison["selected"]["id"], "b")
        self.assertEqual([path["id"] for path in comparison["discarded"]], ["c", "a"])
        self.assertIn(comparison["confidence"], {"baja", "media", "alta"})

    def test_genericity_guard_requires_domain_specific_content(self):
        goal = interpret_goal("Quiero volver al diseño UX")
        path = fallback_candidate_paths(goal)[0]
        report = {
            "journeyGuidance": {
                "goal": goal["spec"],
                "selectedPath": path,
                "firstStep": {"title": "Actualizar dos casos de estudio del portafolio UX"},
                "successConditions": ["Portafolio revisado por dos personas", "Tres conversaciones de networking"],
                "avoidList": ["Postular masivamente antes de actualizar evidencia"],
                "domainMilestones": [{"title": "Reconstruir portafolio", "description": "Preparar casos de estudio"}],
            }
        }

        guard = genericity_guard(report, "La decisión concreta es reconstruir portafolio antes de postular.")

        self.assertTrue(guard["passed"])
        self.assertIn("portafolio", guard["domainKeywordHits"])

    def test_path_expander_pruner_and_cluster_explore_many_futures(self):
        goal = interpret_goal("Quiero estudiar un magister sin quemarme")
        base_paths = fallback_candidate_paths(goal)

        expanded = expand_candidate_paths(base_paths, goal, target=90)
        pruned, discarded = prune_candidate_paths(expanded)
        clusters = cluster_evaluated_paths(
            [
                {
                    **path,
                    "selectionScore": 70 - index,
                    "riskLevel": path["financialRisk"],
                    "preparation": 60,
                }
                for index, path in enumerate(pruned[:12])
            ]
        )

        self.assertGreaterEqual(len(expanded), 75)
        self.assertGreaterEqual(len(pruned), 3)
        self.assertGreaterEqual(len(clusters), 1)
        self.assertIn("decisions", expanded[0])
        self.assertTrue(all("representative" in cluster for cluster in clusters))


class FakeOllamaClient:
    def __init__(self):
        self.last_prompt = ""

    def chat(self, messages, temperature=0.35):
        self.last_prompt = messages[-1]["content"]
        return "lectura simulada"


if __name__ == "__main__":
    unittest.main()
