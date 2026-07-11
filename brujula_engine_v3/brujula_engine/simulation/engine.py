from copy import deepcopy
from typing import Iterable, List

from brujula_engine.entities.models import LifeState, SCORE_FIELDS, Scenario
from brujula_engine.rules.scoring import general_compass, clamp
from brujula_engine.simulation.life_profile import apply_profile_to_scenario


RULE_SCORE_FIELDS = [field for field in SCORE_FIELDS if field != "projected_life_quality"]


def apply_yearly_rule(state: LifeState, rule: dict) -> LifeState:
    s = deepcopy(state)
    s.year += 1
    s.age += 1

    s.monthly_income += rule.get("income_delta", 0)
    s.monthly_expenses += rule.get("expense_delta", 0)
    s.debt_total = max(0, s.debt_total - rule.get("debt_payment", 0))
    monthly_margin = s.monthly_income - s.monthly_expenses
    s.savings = max(
        0,
        s.savings
        + rule.get("savings_delta", 0)
        + max(0, monthly_margin * 12 * rule.get("savings_rate", 0.15)),
    )

    for field in RULE_SCORE_FIELDS:
        setattr(s, field, clamp(getattr(s, field) + rule.get(f"{field}_delta", 0)))

    if s.debt_total > 8_000_000:
        s.financial_stability = clamp(s.financial_stability - 2)
    if s.savings > 6 * s.monthly_expenses:
        s.financial_stability = clamp(s.financial_stability + 4)
        s.creative_freedom = clamp(s.creative_freedom + 2)
    if s.physical_capacity < 35:
        s.daily_energy = clamp(s.daily_energy - 4)
        s.creative_freedom = clamp(s.creative_freedom - 2)

    s.projected_life_quality = clamp(
        0.18 * s.physical_capacity
        + 0.14 * s.daily_energy
        + 0.16 * s.financial_stability
        + 0.16 * s.creative_freedom
        + 0.14 * s.relationships
        + 0.16 * s.north_star_alignment
        + 0.06 * s.projected_life_quality
    )

    if rule.get("note"):
        s.notes.append(f"{s.year}: {rule['note']}")
    return s


def run_scenario(scenario: Scenario, life_profile: dict | None = None) -> List[LifeState]:
    scenario = apply_profile_to_scenario(scenario, life_profile)
    states = [deepcopy(scenario.initial_state)]
    current = states[0]
    for year in range(scenario.start_year, scenario.end_year):
        current = apply_yearly_rule(current, scenario.yearly_rules[str(year + 1)])
        states.append(current)
    return states


def scenario_summary(scenario: Scenario, life_profile: dict | None = None) -> dict:
    scenario = apply_profile_to_scenario(scenario, life_profile)
    states = run_scenario(scenario)
    final = states[-1]
    dashboard = final.as_dashboard()
    return {
        "scenario": scenario,
        "states": states,
        "final_state": final,
        "compass": general_compass(dashboard),
        "weakest": min(dashboard, key=dashboard.get),
        "strongest": max(dashboard, key=dashboard.get),
    }


def rank_scenarios(scenarios: Iterable[Scenario], life_profile: dict | None = None) -> List[dict]:
    return sorted((scenario_summary(scenario, life_profile) for scenario in scenarios), key=lambda item: item["compass"], reverse=True)
