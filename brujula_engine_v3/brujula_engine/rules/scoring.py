def clamp(value: float, minimum: float = 0, maximum: float = 100) -> float:
    return max(minimum, min(maximum, value))


def color_level(score: float) -> str:
    if score < 30:
        return "Crítico"
    if score < 45:
        return "Frágil"
    if score < 65:
        return "En desarrollo"
    if score < 82:
        return "Sólido"
    return "Fortaleza"


def general_compass(dashboard: dict) -> float:
    weights = {
        "Capacidad física": 0.16,
        "Energía diaria": 0.14,
        "Estabilidad financiera": 0.18,
        "Libertad para crear": 0.16,
        "Relaciones": 0.12,
        "Coherencia con la Estrella del Norte": 0.14,
        "Calidad de vida proyectada": 0.10,
    }
    return round(sum(dashboard[k] * weights[k] for k in weights), 1)
