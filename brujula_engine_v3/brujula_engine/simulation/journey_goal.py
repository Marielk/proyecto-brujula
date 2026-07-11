from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from brujula_engine.rules.scoring import clamp


@dataclass(frozen=True)
class GoalSpec:
    domain: str
    goal_type: str
    horizon_year: int | None
    metrics: list[str]
    required_resources: list[str]
    constraints: list[str]
    supported: bool = True

    def to_dict(self) -> dict:
        return {
            "domain": self.domain,
            "goalType": self.goal_type,
            "horizonYear": self.horizon_year,
            "metrics": self.metrics,
            "requiredResources": self.required_resources,
            "constraints": self.constraints,
            "supported": self.supported,
        }


def interpret_goal(text: str, life_profile: dict | None = None) -> dict:
    lower = _normalize(text)
    domain = _resolve_domain(lower)
    spec = _goal_spec(domain, lower)
    return {
        "spec": spec.to_dict(),
        "ruleSet": _domain_rule_set(spec.domain),
        "unsupportedWarning": None
        if spec.supported
        else "Este tipo de viaje todavía utiliza un modelo general. La simulación puede ser menos precisa.",
    }


def domain_metrics(goal: dict, scores: dict, summary: dict, context: dict) -> dict:
    domain = goal["spec"]["domain"]
    if domain == "salud":
        return {
            "Preparación física": _avg(scores["saludIntegral"], scores["energiaVital"], scores["serenidad"]),
            "Riesgo de recaída": clamp(100 - _avg(scores["saludIntegral"], scores["energiaVital"], 100 - scores["riesgoAgotamiento"])),
            "Capacidad funcional": _avg(scores["saludIntegral"], scores["energiaVital"]),
            "Adherencia esperada": _avg(scores["serenidad"], scores["resiliencia"], scores["proposito"]),
        }
    if domain == "vivienda":
        return {
            "Preparación hipotecaria": _avg(scores["libertadFinanciera"], scores["resiliencia"], scores["serenidad"]),
            "Capacidad de ahorro": clamp(scores["libertadFinanciera"] + max(0, scores["financialTrend"] * 2)),
            "Riesgo financiero": clamp(100 - _avg(scores["libertadFinanciera"], scores["resiliencia"])),
            "Estabilidad de ingresos": _avg(scores["libertadFinanciera"], scores["serenidad"]),
        }
    if domain == "familia":
        return {
            "Preparación familiar": _avg(scores["saludIntegral"], scores["fortalezaRelaciones"], scores["libertadFinanciera"]),
            "Fortaleza de la red de apoyo": scores["fortalezaRelaciones"],
            "Disponibilidad de tiempo": _avg(scores["energiaVital"], scores["serenidad"], 100 - scores["riesgoAgotamiento"]),
            "Seguridad del hogar": _avg(scores["libertadFinanciera"], scores["resiliencia"]),
        }
    if domain == "emprendimiento":
        return {
            "Preparación del negocio": _avg(scores["libertadCreativa"], scores["proposito"], scores["resiliencia"]),
            "Riesgo de transición": clamp(100 - _avg(scores["libertadFinanciera"], scores["energiaVital"], scores["resiliencia"])),
            "Autonomía económica": scores["libertadFinanciera"],
            "Validación creativa": _avg(scores["libertadCreativa"], scores["proposito"]),
        }
    if domain == "educacion":
        return {
            "Preparación de aprendizaje": _avg(scores["energiaVital"], scores["serenidad"], scores["resiliencia"]),
            "Tiempo de estudio disponible": _avg(scores["energiaVital"], scores["serenidad"], 100 - scores["riesgoAgotamiento"]),
            "Riesgo de sobrecarga": clamp(100 - _avg(scores["energiaVital"], scores["saludIntegral"], scores["serenidad"])),
            "Coherencia vocacional": _avg(scores["proposito"], scores["coherenciaEstrellaNorte"]),
        }
    if domain == "creatividad":
        return {
            "Pulso creativo": _avg(scores["libertadCreativa"], scores["proposito"], scores["esperanza"]),
            "Espacio de obra": _avg(scores["energiaVital"], scores["serenidad"], scores["libertadFinanciera"]),
            "Riesgo de exposición": clamp(100 - _avg(scores["resiliencia"], scores["serenidad"], scores["fortalezaRelaciones"])),
            "Coherencia artística": _avg(scores["libertadCreativa"], scores["coherenciaEstrellaNorte"]),
        }
    return {
        "Preparación general": _avg(
            scores["calidadVida"],
            scores["libertadFinanciera"],
            scores["saludIntegral"],
            scores["proposito"],
        )
    }


def domain_strengths(goal: dict, metrics: dict, scores: dict, context: dict) -> list[dict]:
    domain = goal["spec"]["domain"]
    ordered = _ordered_metric_items(metrics, reverse=True)
    if domain == "salud":
        return _items(
            ordered,
            {
                "Preparación física": "Hay una base corporal desde la que se puede construir constancia sin castigo.",
                "Capacidad funcional": "El cuerpo puede ganar margen si el avance respeta descanso y recuperación.",
                "Adherencia esperada": "La serenidad y el sentido ayudan a sostener hábitos cuando pase la motivación inicial.",
            },
        )
    if domain == "vivienda":
        return _items(
            ordered,
            {
                "Preparación hipotecaria": "Algunos pilares financieros ya permiten imaginar una ruta hacia vivienda.",
                "Capacidad de ahorro": "El ahorro es el músculo principal para acercarse al pie sin aumentar presión.",
                "Estabilidad de ingresos": "La estabilidad vuelve el objetivo menos dependiente de decisiones impulsivas.",
            },
        )
    if domain == "familia":
        return _items(
            ordered,
            {
                "Fortaleza de la red de apoyo": "La red afectiva es un recurso real para criar sin hacerlo todo sola.",
                "Preparación familiar": "Hay señales de base vital para comenzar a planificar con cuidado.",
                "Seguridad del hogar": "La estabilidad material ayuda a que el deseo familiar tenga suelo.",
            },
        )
    if domain == "emprendimiento":
        return _items(
            ordered,
            {
                "Preparación del negocio": "El propósito y la creatividad pueden convertirse en hipótesis de negocio.",
                "Validación creativa": "Existe materia viva para probar una propuesta propia antes de apostar todo.",
                "Autonomía económica": "Cada punto de margen financiero vuelve más amable la transición.",
            },
        )
    if domain == "educacion":
        return _items(
            ordered,
            {
                "Preparación de aprendizaje": "Hay base para estudiar sin depender solo de fuerza de voluntad.",
                "Coherencia vocacional": "El aprendizaje conversa con la vida que quieres construir.",
                "Tiempo de estudio disponible": "Aparece algo de espacio para sostener práctica y concentración.",
            },
        )
    if domain == "creatividad":
        return _items(
            ordered,
            {
                "Pulso creativo": "La creatividad aparece como una fuerza viva para orientar el camino.",
                "Coherencia artística": "El deseo creativo se alinea con una identidad más propia.",
                "Espacio de obra": "Hay margen para cuidar el proceso, no solo el resultado.",
            },
        )
    return _items(ordered, {})


def domain_risks(goal: dict, metrics: dict, scores: dict, context: dict) -> list[dict]:
    domain = goal["spec"]["domain"]
    ordered = _ordered_metric_items(metrics, reverse=False)
    if domain == "salud":
        return _items(
            ordered,
            {
                "Riesgo de recaída": "El plan debe evitar exigencias que disparen dolor, fatiga o abandono.",
                "Capacidad funcional": "Si el cuerpo no acompaña, el objetivo necesita versiones más graduales.",
                "Adherencia esperada": "La meta depende menos de intensidad y más de repetición posible.",
            },
            risk=True,
        )
    if domain == "vivienda":
        return _items(
            ordered,
            {
                "Riesgo financiero": "Comprar sin colchón puede transformar el sueño en deuda y tensión.",
                "Capacidad de ahorro": "Sin pie suficiente, la ruta hipotecaria se vuelve más cara y frágil.",
                "Preparación hipotecaria": "Conviene ordenar deuda e ingresos antes de elegir propiedad.",
            },
            risk=True,
        )
    if domain == "familia":
        return _items(
            ordered,
            {
                "Disponibilidad de tiempo": "La crianza exige presencia; si el calendario ya está saturado, el costo sube.",
                "Preparación familiar": "El deseo necesita conversar con salud, dinero, hogar y red de apoyo.",
                "Seguridad del hogar": "La estabilidad del hogar reduce presión en una etapa sensible.",
            },
            risk=True,
        )
    if domain == "emprendimiento":
        return _items(
            ordered,
            {
                "Riesgo de transición": "El cambio puede volverse duro si ingreso, energía y ahorro caen al mismo tiempo.",
                "Autonomía económica": "Sin margen, cada experimento creativo se vive con urgencia.",
                "Preparación del negocio": "La idea necesita validación real antes de convertirse en salto grande.",
            },
            risk=True,
        )
    if domain == "educacion":
        return _items(
            ordered,
            {
                "Riesgo de sobrecarga": "Estudiar sin proteger energía puede transformar el aprendizaje en deuda de descanso.",
                "Tiempo de estudio disponible": "El plan necesita horas reales, no solo entusiasmo.",
                "Preparación de aprendizaje": "Conviene ajustar ritmo, apoyo y foco antes de cargar demasiado.",
            },
            risk=True,
        )
    if domain == "creatividad":
        return _items(
            ordered,
            {
                "Riesgo de exposición": "Mostrar obra sin red emocional puede volver frágil el proceso.",
                "Espacio de obra": "La creación necesita tiempo protegido para no vivir de impulsos aislados.",
                "Pulso creativo": "Si la energía creativa baja, la ruta debe hacerse más amable.",
            },
            risk=True,
        )
    return _items(ordered, {}, risk=True)


def domain_success_conditions(goal: dict, metrics: dict, scores: dict, context: dict) -> list[str]:
    domain = goal["spec"]["domain"]
    if domain == "salud":
        return [
            "Definir una rutina mínima que puedas repetir incluso en semanas difíciles.",
            "Priorizar sueño y recuperación como parte del objetivo, no como premio.",
            "Buscar apoyo profesional si hay dolor, lesión o síntomas persistentes.",
            "Medir progreso por adherencia y energía, no solo por resultado final.",
        ]
    if domain == "vivienda":
        return [
            "Calcular el pie necesario y dividirlo en metas mensuales de ahorro.",
            "Reducir deuda cara antes de comprometer un dividendo.",
            "Simular gastos reales de vivienda, mantención y emergencia.",
            "Revisar estabilidad laboral e hipotecaria antes de elegir propiedad.",
        ]
    if domain == "familia":
        return [
            "Conversar con la red de apoyo sobre tiempo, cuidados y límites reales.",
            "Ordenar un colchón financiero para la primera etapa de crianza.",
            "Revisar salud, descanso y hogar antes de aumentar responsabilidades.",
            "Diseñar una distribución de cuidados que no dependa de una sola persona.",
        ]
    if domain == "emprendimiento":
        return [
            "Validar el proyecto con clientes o audiencia antes de renunciar.",
            "Separar un fondo de transición para cubrir meses de menor ingreso.",
            "Definir horas semanales sostenibles para crear sin quemarte.",
            "Construir una oferta pequeña y medible antes de escalar.",
        ]
    if domain == "educacion":
        return [
            "Reservar bloques de estudio pequeños y repetibles antes de aumentar carga.",
            "Elegir una ruta formativa compatible con trabajo, salud y descanso.",
            "Buscar apoyo, mentoría o comunidad para no estudiar en aislamiento.",
            "Medir avance por práctica sostenida, no solo por certificados.",
        ]
    if domain == "creatividad":
        return [
            "Proteger un espacio semanal de obra sin exigencia de publicación inmediata.",
            "Crear una pieza pequeña y mostrarla a una persona segura.",
            "Separar práctica creativa de validación externa al inicio.",
            "Cuidar descanso y dinero para que la obra no nazca desde urgencia.",
        ]
    return [
        "Convertir el sueño en un experimento pequeño y medible.",
        "Revisar dinero, energía y apoyo antes de tomar decisiones irreversibles.",
        "Definir una fecha de revisión para ajustar el camino con evidencia.",
    ]


def domain_avoid_list(goal: dict, metrics: dict, scores: dict, context: dict) -> list[str]:
    domain = goal["spec"]["domain"]
    if domain == "salud":
        return [
            "Empezar con una rutina extrema que no respete dolor o cansancio.",
            "Compararte con cuerpos, ritmos o metas que no son los tuyos.",
            "Ignorar señales de recaída por cumplir un calendario rígido.",
        ]
    if domain == "vivienda":
        return [
            "Comprar por ansiedad antes de tener pie y gastos claros.",
            "Usar más deuda para tapar falta de ahorro.",
            "Olvidar costos de mantención, contribuciones o emergencias.",
        ]
    if domain == "familia":
        return [
            "Romantizar la crianza sin mirar tiempo, descanso y red de apoyo.",
            "Asumir que podrás hacerlo todo sin redistribuir responsabilidades.",
            "Postergar conversaciones difíciles sobre dinero, casa y cuidados.",
        ]
    if domain == "emprendimiento":
        return [
            "Renunciar inmediatamente sin validación ni colchón.",
            "Confundir entusiasmo con demanda real del mercado.",
            "Trabajar siete días por semana hasta que el cuerpo cobre la cuenta.",
        ]
    if domain == "educacion":
        return [
            "Inscribirte en una carga alta sin revisar energía y calendario real.",
            "Estudiar de noche sacrificando descanso como estrategia permanente.",
            "Elegir un programa solo por prestigio si no conversa con tu vida.",
        ]
    if domain == "creatividad":
        return [
            "Publicar o vender antes de tener una práctica que te sostenga.",
            "Comparar tu ritmo creativo con el de otras personas.",
            "Convertir la obra en una prueba de valor personal.",
        ]
    return [
        "Tomar una decisión irreversible sin revisar datos reales.",
        "Convertir el sueño en una urgencia que borre tu bienestar.",
    ]


def domain_first_step(goal: dict, metrics: dict, scores: dict, context: dict) -> dict:
    domain = goal["spec"]["domain"]
    if domain == "salud":
        return {
            "title": "Elegir una rutina mínima de 10 minutos por 14 días.",
            "why": "La salud cambia más por adherencia amable que por intensidad inicial.",
        }
    if domain == "vivienda":
        return {
            "title": "Calcular el pie objetivo y tu ahorro mensual posible.",
            "why": "Ese número convierte la casa en ruta financiera concreta, no en deseo abstracto.",
        }
    if domain == "familia":
        return {
            "title": "Mapear tu red de apoyo y una semana real de cuidados.",
            "why": "La preparación familiar mejora cuando el tiempo y la ayuda dejan de ser supuestos.",
        }
    if domain == "emprendimiento":
        return {
            "title": "Diseñar una prueba pequeña de oferta durante cuatro semanas.",
            "why": "Validar antes de saltar reduce riesgo y muestra qué parte del sueño responde al mundo real.",
        }
    if domain == "educacion":
        return {
            "title": "Elegir un bloque de estudio de 45 minutos por semana.",
            "why": "La continuidad pequeña muestra si el deseo educativo cabe en tu vida real.",
        }
    if domain == "creatividad":
        return {
            "title": "Crear una pieza pequeña sin publicarla todavía.",
            "why": "La obra necesita un primer refugio antes de pedirle resultados.",
        }
    return {
        "title": "Escribir una hipótesis pequeña del sueño y probarla durante 30 días.",
        "why": "Una prueba acotada entrega evidencia sin exigir una apuesta total.",
    }


def domain_milestones(goal: dict, context: dict) -> list[dict]:
    domain = goal["spec"]["domain"]
    if domain == "salud":
        return [
            _milestone(2027, "Línea base amable", "Registrar sueño, energía, dolor y movimiento sin juicio."),
            _milestone(2028, "Rutina sostenible", "Consolidar hábitos mínimos y ajustar con apoyo profesional si hace falta."),
            _milestone(2030, "Capacidad funcional", "Aumentar actividad solo cuando el cuerpo muestre recuperación consistente."),
        ]
    if domain == "vivienda":
        horizon = goal["spec"].get("horizonYear") or 2030
        return [
            _milestone(2027, "Mapa financiero", "Ordenar deuda, gastos reales y capacidad de ahorro mensual."),
            _milestone(min(horizon, 2030), "Pie y preaprobación", "Revisar acceso hipotecario antes de enamorarse de una propiedad."),
            _milestone(min(horizon + 1, 2035), "Compra sostenible", "Elegir vivienda con margen para vivir, no solo para pagar."),
        ]
    if domain == "familia":
        return [
            _milestone(2027, "Conversaciones de cuidado", "Alinear expectativas, red de apoyo, salud y distribución de tiempo."),
            _milestone(2028, "Base material y emocional", "Fortalecer hogar, descanso y colchón financiero."),
            _milestone(2030, "Decisión acompañada", "Tomar la decisión con menos fantasía y más soporte real."),
        ]
    if domain == "emprendimiento":
        return [
            _milestone(2027, "Validación pequeña", "Probar oferta, audiencia o prototipo sin dejar la estabilidad."),
            _milestone(2028, "Primer ingreso propio", "Medir demanda real y aprender dónde aparece tracción."),
            _milestone(2030, "Transición gradual", "Bajar riesgo solo si ahorro, energía e ingresos alternativos acompañan."),
        ]
    if domain == "educacion":
        return [
            _milestone(2027, "Ritmo de aprendizaje", "Probar horarios, foco y apoyo antes de tomar una carga mayor."),
            _milestone(2028, "Práctica aplicada", "Usar lo aprendido en un proyecto pequeño y medible."),
            _milestone(2030, "Nueva capacidad", "Integrar el aprendizaje a una decisión laboral o vital más coherente."),
        ]
    if domain == "creatividad":
        return [
            _milestone(2027, "Espacio de obra", "Abrir una práctica creativa protegida y repetible."),
            _milestone(2028, "Primera muestra segura", "Compartir una pieza con una comunidad pequeña y amable."),
            _milestone(2030, "Voz propia", "Consolidar una forma creativa que cuide identidad, descanso y sentido."),
        ]
    return []


def domain_rituals(goal: dict, context: dict) -> list[str]:
    domain = goal["spec"]["domain"]
    if domain == "salud":
        return ["💤 Preparar una noche de sueño protegida.", "🌿 Caminar diez minutos sin convertirlo en rendimiento."]
    if domain == "vivienda":
        return ["💰 Revisar gastos una vez por semana con una bebida tranquila.", "🏡 Guardar una foto de hogar y escribir qué vida debe sostener."]
    if domain == "familia":
        return ["🏡 Conversar con alguien de confianza sobre apoyo real.", "🌙 Reservar una pausa de descanso sin justificarla."]
    if domain == "emprendimiento":
        return ["📖 Crear una pieza pequeña sin evaluar el resultado.", "✨ Mostrar una prueba a una persona segura."]
    if domain == "educacion":
        return ["📚 Preparar un bloque de estudio breve con cierre amable.", "✍️ Escribir qué aprendiste sin juzgarte."]
    if domain == "creatividad":
        return ["🎨 Abrir veinte minutos de obra sin meta pública.", "✨ Guardar una idea pequeña antes de dormir."]
    return ["☕ Tomar diez minutos para escribir el siguiente experimento pequeño."]


def _resolve_domain(lower: str) -> str:
    if any(word in lower for word in ["salud", "peso", "adelgazar", "bajar de peso", "maratón", "maraton", "correr", "recuperarme", "lesión", "lesion", "dolor"]):
        return "salud"
    if any(word in lower for word in ["casa", "departamento", "vivienda", "hipoteca", "hipotecario", "comprar un hogar", "comprar una propiedad"]):
        return "vivienda"
    if any(word in lower for word in ["hijo", "hija", "embarazo", "familia", "maternidad", "paternidad", "criar", "bebé", "bebe"]):
        return "familia"
    if any(word in lower for word in ["estudiar", "universidad", "magíster", "magister", "curso", "certificación", "certificacion", "aprender", "diplomado"]):
        return "educacion"
    if any(word in lower for word in ["escribir", "novela", "pintar", "música", "musica", "obra", "crear una obra", "ilustrar", "poesía", "poesia"]):
        return "creatividad"
    if any(word in lower for word in ["emprender", "startup", "negocio", "cafetería", "cafeteria", "pasteler", "arte", "vivir del arte", "carrera", "freelance", "brújula", "brujula"]):
        return "emprendimiento"
    return "general"


def _goal_spec(domain: str, lower: str) -> GoalSpec:
    horizon = _extract_horizon(lower)
    specs = {
        "salud": GoalSpec("salud", _health_type(lower), horizon, ["dolor", "energía", "sueño", "adherencia"], ["rutina mínima", "descanso", "apoyo profesional"], ["dolor", "fatiga", "tiempo disponible"]),
        "vivienda": GoalSpec("vivienda", _housing_type(lower), horizon, ["ahorro", "pie", "deuda", "estabilidad laboral"], ["pie", "preaprobación", "colchón de emergencia"], ["deuda", "gastos fijos", "ingreso estable"]),
        "familia": GoalSpec("familia", "tener un hijo", horizon, ["salud", "red de apoyo", "tiempo", "estabilidad económica"], ["red de apoyo", "hogar", "tiempo protegido"], ["edad", "carga de cuidado", "vivienda"]),
        "emprendimiento": GoalSpec("emprendimiento", _business_type(lower), horizon, ["validación", "ingresos", "ahorro", "energía", "tiempo"], ["oferta validada", "audiencia", "fondo de transición"], ["agotamiento", "deuda", "incertidumbre de ingresos"]),
        "educacion": GoalSpec("educacion", _education_type(lower), horizon, ["horas de estudio", "energía", "apoyo", "aplicación"], ["tiempo protegido", "programa adecuado", "mentoría"], ["sobrecarga", "costo", "cansancio"]),
        "creatividad": GoalSpec("creatividad", _creative_type(lower), horizon, ["obra", "práctica", "voz propia", "exposición"], ["tiempo creativo", "red segura", "ritmo de obra"], ["comparación", "exposición temprana", "agotamiento"]),
    }
    return specs.get(domain, GoalSpec("general", "objetivo general", horizon, ["bienestar", "finanzas", "energía", "propósito"], ["experimento pequeño", "tiempo de revisión"], ["incertidumbre"], supported=False))


def _domain_rule_set(domain: str) -> dict:
    labels = {
        "salud": "Salud",
        "vivienda": "Vivienda",
        "familia": "Familia",
        "emprendimiento": "Emprendimiento / cambio de carrera",
        "educacion": "Educación",
        "creatividad": "Creatividad",
        "general": "Modelo general",
    }
    return {"domain": domain, "label": labels.get(domain, "Modelo general")}


def _extract_horizon(lower: str) -> int | None:
    match = re.search(r"\b(20[2-4][0-9])\b", lower)
    if match:
        return int(match.group(1))
    match = re.search(r"\b([1-9]|10)\s*años?\b", lower)
    if match:
        return 2026 + int(match.group(1))
    return None


def _health_type(lower: str) -> str:
    if "marat" in lower or "correr" in lower:
        return "mejorar capacidad física"
    if "peso" in lower or "adelgazar" in lower:
        return "bajar de peso"
    if "recuper" in lower or "lesi" in lower:
        return "recuperación física"
    return "mejorar salud"


def _housing_type(lower: str) -> str:
    if "departamento" in lower:
        return "comprar departamento"
    return "comprar vivienda"


def _business_type(lower: str) -> str:
    if "arte" in lower:
        return "vivir del arte"
    if "cafeter" in lower:
        return "abrir cafetería"
    if "startup" in lower or "brujula" in lower or "brújula" in lower:
        return "crear startup"
    if "carrera" in lower:
        return "cambio de carrera"
    return "emprender"


def _education_type(lower: str) -> str:
    if "magister" in lower or "magíster" in lower:
        return "hacer un magíster"
    if "universidad" in lower:
        return "volver a la universidad"
    if "certific" in lower:
        return "obtener una certificación"
    return "aprender algo nuevo"


def _creative_type(lower: str) -> str:
    if "novela" in lower or "escribir" in lower:
        return "escribir una obra"
    if "música" in lower or "musica" in lower:
        return "crear música"
    if "pint" in lower or "ilustr" in lower:
        return "desarrollar una obra visual"
    return "desarrollar una vida creativa"


def _avg(*values: float) -> float:
    return clamp(round(sum(values) / max(len(values), 1), 1))


def _ordered_metric_items(metrics: dict, reverse: bool) -> list[tuple[str, float]]:
    return sorted(metrics.items(), key=lambda item: item[1], reverse=reverse)


def _items(ordered: list[tuple[str, float]], impacts: dict[str, str], risk: bool = False) -> list[dict]:
    selected = []
    for label, value in ordered[:4]:
        selected.append(
            {
                "label": label,
                "impact": impacts.get(label, _default_impact(label, risk)),
                "value": round(value, 1),
            }
        )
    return selected


def _default_impact(label: str, risk: bool) -> str:
    if risk:
        return f"{label} necesita atención para que el viaje no se vuelva frágil."
    return f"{label} aparece como soporte específico para este tipo de viaje."


def _milestone(year: int, title: str, description: str) -> dict:
    return {"year": year, "icon": "◇", "title": title, "description": description}


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())
