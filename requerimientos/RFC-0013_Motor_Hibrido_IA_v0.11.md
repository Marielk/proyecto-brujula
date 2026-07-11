# RFC-0013 --- Integración del Motor Híbrido de IA

**Proyecto:** Brújula\
**Versión objetivo:** v0.11\
**Estado:** Aprobado para desarrollo

------------------------------------------------------------------------

# Objetivo

Evolucionar Brújula desde un simulador basado principalmente en reglas
hacia un **motor híbrido**, donde la Inteligencia Artificial (Ollama)
participe activamente en la construcción de los escenarios y no
únicamente en la redacción final.

El objetivo es que Brújula deje de responder con un único resultado y
comience a **explorar múltiples futuros posibles**, evaluarlos y
recomendar el más coherente con la vida que el usuario desea construir.

------------------------------------------------------------------------

# Problema actual

Actualmente el flujo es:

Usuario ↓ Journey Engine (reglas) ↓ Life Summary ↓ Ollama ↓ Carta de Sue

Consecuencia:

-   Ollama solo redacta.
-   El motor decide prácticamente todo.
-   Distintos escenarios producen recomendaciones muy similares.
-   La IA no participa en el razonamiento.

------------------------------------------------------------------------

# Nueva visión

La IA no será un narrador.

La IA será un explorador de futuros.

El Journey Engine no será reemplazado.

Será el verificador que evalúa la sostenibilidad de cada camino.

------------------------------------------------------------------------

# Nueva arquitectura

Usuario

↓

LifeProfile

↓

Goal Interpreter (IA)

↓

Generador de Caminos (IA)

↓

Journey Engine

↓

Comparador de Caminos

↓

Sue

------------------------------------------------------------------------

# Principios

1.  La IA imagina posibilidades.
2.  El motor valida consistencia.
3.  Sue interpreta los resultados.
4.  Nunca se presenta un único camino como verdad absoluta.
5.  Siempre se explica por qué se recomienda una ruta.

------------------------------------------------------------------------

# Nuevo flujo

## Paso 1 --- Comprender el sueño

Ollama analiza el objetivo y construye un GoalProfile.

Debe identificar:

-   dominio principal
-   dominios secundarios
-   intención
-   horizonte temporal
-   recursos necesarios
-   riesgos esperables
-   valores involucrados

Ejemplo:

Objetivo: "Quiero vivir del arte."

Resultado:

-   Emprendimiento
-   Creatividad
-   Finanzas
-   Salud

------------------------------------------------------------------------

## Paso 2 --- Generar caminos

Nuevo componente:

Path Generator

Responsabilidad:

Crear múltiples estrategias plausibles para alcanzar el mismo sueño.

Ejemplo:

Camino A Mantener empleo y construir el proyecto en paralelo.

Camino B Reducir jornada laboral.

Camino C Buscar inversión.

Camino D Asociarse con otra persona.

Cantidad inicial:

5 a 10 caminos.

------------------------------------------------------------------------

## Paso 3 --- Evaluación

Journey Engine calcula para cada camino:

-   calidad de vida
-   libertad financiera
-   libertad creativa
-   serenidad
-   resiliencia
-   esperanza
-   riesgo
-   esfuerzo
-   tiempo estimado

El cálculo sigue siendo determinístico.

------------------------------------------------------------------------

## Paso 4 --- Comparación

Nuevo componente:

Path Comparator

Responsabilidad:

Ordenar todos los caminos.

Evaluar:

-   sostenibilidad
-   coherencia con la Estrella del Norte
-   equilibrio entre riesgo y bienestar
-   esfuerzo requerido

Seleccionar la mejor ruta.

------------------------------------------------------------------------

## Paso 5 --- Carta de Sue

Sue ya no interpreta números.

Sue interpreta el camino recomendado.

Debe explicar:

-   por qué fue elegido;
-   qué caminos fueron descartados;
-   qué fortalezas observó;
-   qué cuidados recomienda.

------------------------------------------------------------------------

# Nuevos componentes

## Goal Interpreter

Comprende el sueño.

## Path Generator

Genera futuros alternativos mediante IA.

## Journey Engine

Evalúa cada camino.

## Path Comparator

Selecciona la mejor estrategia.

## Sue

Convierte el análisis en una conversación humana.

------------------------------------------------------------------------

# Cambios en el objeto LifeSummary

Agregar:

-   candidatePaths
-   selectedPath
-   discardedPaths
-   comparisonReasons
-   confidence
-   assumptions

------------------------------------------------------------------------

# Interacción con Ollama

Ollama participará en tres momentos:

1.  Comprensión del objetivo.
2.  Generación de caminos.
3.  Interpretación final.

No se utilizará para calcular índices.

------------------------------------------------------------------------

# Interfaz de usuario

El resultado debe comenzar con:

"Exploré varios caminos posibles para llegar a este sueño."

Luego mostrar:

-   Camino recomendado.
-   ¿Por qué fue elegido?
-   Otros caminos considerados.
-   Qué debería ocurrir para que otra ruta sea mejor.

El usuario debe sentir que Brújula exploró posibilidades, no que emitió
un veredicto.

------------------------------------------------------------------------

# Criterios de aceptación

✓ Un mismo objetivo genera múltiples caminos.

✓ Los caminos son diferentes entre sí.

✓ El Journey Engine evalúa cada alternativa.

✓ El usuario entiende por qué un camino fue recomendado.

✓ Sue hace referencia explícita a la comparación entre futuros.

✓ Ollama participa durante toda la simulación y no únicamente en la
generación del texto final.

------------------------------------------------------------------------

# Roadmap

v0.11 - Goal Interpreter IA - Path Generator - Path Comparator

v0.12 - Optimización del ranking de caminos. - Visualización de caminos
alternativos.

v1.0 - Simulación avanzada con múltiples futuros y recomendaciones
dinámicas.

------------------------------------------------------------------------

# Filosofía

Brújula no pretende adivinar el futuro.

Brújula explora futuros plausibles, compara caminos y ayuda a la persona
a descubrir cuál de ellos respeta mejor la vida que desea construir.

La IA imagina. El motor verifica. Sue acompaña.
