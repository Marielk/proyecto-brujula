import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from brujula_engine.entities.models import LifeState, SCORE_FIELDS, Scenario


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCENARIO_DIR = PROJECT_ROOT / "data" / "scenarios"

REQUIRED_SCENARIO_FIELDS = {
    "name",
    "description",
    "start_year",
    "end_year",
    "initial_state",
    "yearly_rules",
}

REQUIRED_STATE_FIELDS = {
    "year",
    "age",
    "monthly_income",
    "monthly_expenses",
    "debt_total",
    "savings",
    *SCORE_FIELDS,
}

ALLOWED_RULE_FIELDS = {
    "income_delta",
    "expense_delta",
    "debt_payment",
    "savings_delta",
    "savings_rate",
    "note",
    *(f"{field}_delta" for field in SCORE_FIELDS if field != "projected_life_quality"),
}


class ScenarioValidationError(ValueError):
    pass


def scenario_path(name: str, scenario_dir: Optional[Path] = None) -> Path:
    base = scenario_dir or DEFAULT_SCENARIO_DIR
    path = Path(name)
    if path.suffix == ".json":
        return path if path.is_absolute() else base / path
    return base / f"{name}.json"


def list_scenarios(scenario_dir: Optional[Path] = None) -> List[str]:
    base = scenario_dir or DEFAULT_SCENARIO_DIR
    return sorted(path.stem for path in base.glob("*.json"))


def load_scenario(name: str, scenario_dir: Optional[Path] = None) -> Scenario:
    path = scenario_path(name, scenario_dir)
    if not path.exists():
        available = ", ".join(list_scenarios(scenario_dir)) or "ninguno"
        raise FileNotFoundError(f"No existe el escenario: {path}. Disponibles: {available}")

    raw = json.loads(path.read_text(encoding="utf-8"))
    validate_scenario(raw, source=path)
    return scenario_from_dict(raw)


def scenario_from_dict(raw: Dict[str, Any]) -> Scenario:
    return Scenario(
        name=raw["name"],
        description=raw["description"],
        start_year=raw["start_year"],
        end_year=raw["end_year"],
        initial_state=LifeState(**raw["initial_state"]),
        yearly_rules=raw["yearly_rules"],
    )


def validate_scenario(raw: Dict[str, Any], source: Path) -> None:
    _require_fields(raw, REQUIRED_SCENARIO_FIELDS, f"escenario {source}")
    _require_fields(raw["initial_state"], REQUIRED_STATE_FIELDS, f"initial_state de {source}")

    start_year = raw["start_year"]
    end_year = raw["end_year"]
    initial_year = raw["initial_state"]["year"]
    if not isinstance(start_year, int) or not isinstance(end_year, int):
        raise ScenarioValidationError(f"{source}: start_year y end_year deben ser enteros.")
    if end_year <= start_year:
        raise ScenarioValidationError(f"{source}: end_year debe ser mayor que start_year.")
    if initial_year != start_year:
        raise ScenarioValidationError(f"{source}: initial_state.year debe coincidir con start_year.")

    for field in SCORE_FIELDS:
        _validate_score(raw["initial_state"][field], f"initial_state.{field}", source)

    for money_field in ["monthly_income", "monthly_expenses", "debt_total", "savings"]:
        if raw["initial_state"][money_field] < 0:
            raise ScenarioValidationError(f"{source}: initial_state.{money_field} no puede ser negativo.")

    yearly_rules = raw["yearly_rules"]
    if not isinstance(yearly_rules, dict):
        raise ScenarioValidationError(f"{source}: yearly_rules debe ser un objeto.")

    expected_years = {str(year) for year in range(start_year + 1, end_year + 1)}
    missing_years = sorted(expected_years - set(yearly_rules))
    if missing_years:
        raise ScenarioValidationError(f"{source}: faltan reglas para años: {', '.join(missing_years)}.")

    for year, rule in yearly_rules.items():
        if year not in expected_years:
            raise ScenarioValidationError(f"{source}: año fuera de rango en yearly_rules: {year}.")
        _validate_rule(rule, f"yearly_rules.{year}", source)


def _validate_rule(rule: Dict[str, Any], context: str, source: Path) -> None:
    if not isinstance(rule, dict):
        raise ScenarioValidationError(f"{source}: {context} debe ser un objeto.")

    unknown = sorted(set(rule) - ALLOWED_RULE_FIELDS)
    if unknown:
        raise ScenarioValidationError(f"{source}: campos no reconocidos en {context}: {', '.join(unknown)}.")

    for field, value in rule.items():
        if field == "note":
            if not isinstance(value, str):
                raise ScenarioValidationError(f"{source}: {context}.note debe ser texto.")
            continue
        if not isinstance(value, (int, float)):
            raise ScenarioValidationError(f"{source}: {context}.{field} debe ser numérico.")

    if "savings_rate" in rule and not 0 <= rule["savings_rate"] <= 1:
        raise ScenarioValidationError(f"{source}: {context}.savings_rate debe estar entre 0 y 1.")


def _require_fields(raw: Dict[str, Any], required: Iterable[str], context: str) -> None:
    missing = sorted(set(required) - set(raw))
    if missing:
        raise ScenarioValidationError(f"Faltan campos en {context}: {', '.join(missing)}.")


def _validate_score(value: Any, field: str, source: Path) -> None:
    if not isinstance(value, (int, float)):
        raise ScenarioValidationError(f"{source}: {field} debe ser numérico.")
    if not 0 <= value <= 100:
        raise ScenarioValidationError(f"{source}: {field} debe estar entre 0 y 100.")
