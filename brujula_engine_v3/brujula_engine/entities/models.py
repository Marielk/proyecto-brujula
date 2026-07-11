from dataclasses import dataclass, field
from typing import Dict, List


SCORE_FIELDS = [
    "physical_capacity",
    "daily_energy",
    "financial_stability",
    "creative_freedom",
    "relationships",
    "north_star_alignment",
    "projected_life_quality",
]

DASHBOARD_LABELS = {
    "physical_capacity": "Capacidad física",
    "daily_energy": "Energía diaria",
    "financial_stability": "Estabilidad financiera",
    "creative_freedom": "Libertad para crear",
    "relationships": "Relaciones",
    "north_star_alignment": "Coherencia con la Estrella del Norte",
    "projected_life_quality": "Calidad de vida proyectada",
}


@dataclass
class LifeState:
    year: int
    age: int
    monthly_income: int
    monthly_expenses: int
    debt_total: int
    savings: int
    physical_capacity: float
    daily_energy: float
    financial_stability: float
    creative_freedom: float
    relationships: float
    north_star_alignment: float
    projected_life_quality: float
    notes: List[str] = field(default_factory=list)

    def as_dashboard(self) -> Dict[str, float]:
        return {DASHBOARD_LABELS[field]: round(getattr(self, field), 1) for field in SCORE_FIELDS}


@dataclass
class Scenario:
    name: str
    description: str
    start_year: int
    end_year: int
    initial_state: LifeState
    yearly_rules: Dict[str, Dict]
