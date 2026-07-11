# Brújula Engine v3

Motor transparente para simular escenarios de Proyecto Brújula con lectura local vía Ollama.

La v3 conserva el corazón determinista de v2: los números salen de reglas visibles en `data/scenarios/*.json`. Ollama se usa después, para interpretar los resultados en lenguaje humano, no para inventar métricas.

## Requisitos

- Python 3.10+
- Ollama instalado y ejecutándose en `http://localhost:11434`
- Un modelo local. La configuración por defecto usa:

```bash
ollama pull llama3.2:1b
```

## Ejecutar

Desde la raíz del proyecto:

```bash
python -m brujula_engine.simulation.run --list
python -m brujula_engine.simulation.run --ollama-health
python -m brujula_engine.simulation.run --scenario brujula_startup --yearly
python -m brujula_engine.simulation.run --scenario brujula_startup --yearly --ollama
python -m brujula_engine.simulation.run --compare --ollama
```

Para usar otro modelo:

```bash
python -m brujula_engine.simulation.run --compare --ollama --model llama3.2:3b
```

## Escenarios incluidos

- `brujula_startup`
- `pastry_business`
- `stay_in_tech`

## Qué cambió en v3

- Cliente Ollama local sin dependencias externas, inspirado en el patrón de cliente LLM centralizado de MiroFish.
- `--ollama-health` para comprobar conexión y modelos instalados.
- `--ollama` para generar una lectura narrativa local de un escenario o comparación.
- Prompts diseñados para no sonar deterministas: Brújula explica tensiones, riesgos y próximos pasos.
- Tests para el flujo Ollama usando cliente falso.

## Incremento v0.6 - Informe de Vida visual y LifeSummary

La presentación del resultado ahora transforma la simulación en una guía breve de vida. El motor, las reglas y el formato JSON de escenarios se mantienen compatibles; la capa visual recibe un `LifeSummary` humano en vez de depender de la tabla anual cruda.

La UI muestra:

- Resumen inmediato "Tu Brújula", con diagnóstico del camino.
- Índices de Vida: calidad de vida, libertad financiera, libertad creativa, salud integral, energía vital, relaciones, propósito, riesgo de agotamiento, arrepentimiento y coherencia con la estrella del norte.
- Colores acompañados siempre por nivel textual.
- Línea de tiempo narrativa con los hitos más importantes.
- Evolución visual del jardín: salud, creatividad, relaciones, libertad financiera y serenidad.
- Carta de Sue generada desde `LifeSummary`, sin lenguaje técnico.
- Pequeños rituales sugeridos.
- Tabla anual como información avanzada colapsable, no como primera lectura.

Los cálculos de índices están centralizados en `brujula_engine/presentation/life_report.py`.

## Incremento v0.7 - Perfil de Vida

La UI ahora abre con un formulario multipaso "Conozcamos tu jardín" cuando no existe un perfil guardado. El perfil se guarda solo en `localStorage` del navegador y puede editarse o borrarse desde el panel lateral.

El objeto `LifeProfile` incluye:

- Identidad, edad, país, hogar y responsabilidades de cuidado.
- Trabajo, horas, exigencia, límites y tiempo disponible.
- Autoevaluación del jardín actual en escala 1-5.
- Salud, limitaciones y actividades difíciles.
- Finanzas aproximadas o exactas, deuda, ahorro y sensación financiera.
- Estrella del Norte, sueños y horizonte.
- Valores, no negociables y preferencias de bienestar.

El motor recibe `scenario_input + LifeProfile` desde `/api/simulate`. Con ese perfil:

- Inicializa el estado base con datos personales.
- Ajusta energía, salud, creatividad, estabilidad financiera y coherencia.
- Penaliza escenarios exigentes cuando hay muchas horas, límites bajos, deuda alta, sin ahorro o salud limitada.
- Personaliza `LifeSummary`, Carta de Sue y rituales sugeridos.
- Agrega advertencias suaves cuando el perfil pide cuidados concretos.

## Tests

```bash
python -m unittest discover
```

## Supuestos visibles

El motor aplica reglas anuales declaradas en `data/scenarios/*.json`. Además incorpora algunas reglas generales:

- Una deuda mayor a `$8.000.000` reduce la estabilidad financiera.
- Un ahorro mayor a 6 meses de gastos mejora estabilidad y libertad creativa.
- Una capacidad física menor a 35 reduce energía y libertad creativa.

Estos supuestos son deliberadamente simples y deberían tratarse como conversación, no como verdad estadística.
