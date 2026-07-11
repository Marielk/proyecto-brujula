# RFC-0011 --- Rediseño de la respuesta del Modo Viaje

**Estado:** Aprobado para desarrollo\
**Versión objetivo:** v0.9

------------------------------------------------------------------------

# Objetivo

Transformar el resultado del simulador desde un **reporte técnico** a
una **guía comprensible y humana**.

El usuario debe terminar una simulación entendiendo:

-   si el camino es viable;
-   por qué Brújula llegó a esa conclusión;
-   qué necesita cultivar para aumentar las probabilidades de éxito;
-   cuál es el primer paso concreto que debería dar.

La sensación final debe ser de **esperanza y claridad**, nunca de
juicio.

------------------------------------------------------------------------

# Problema actual

La pantalla muestra indicadores y porcentajes, pero no responde las
preguntas que realmente tiene el usuario.

Ejemplo:

> Probabilidad: 27%

El usuario inmediatamente piensa:

-   ¿Por qué?
-   ¿Qué significa?
-   ¿Qué debería cambiar?
-   ¿Cómo aumento ese porcentaje?

Hoy la aplicación no responde esas preguntas de forma clara.

------------------------------------------------------------------------

# Principio de diseño

Brújula **no predice el futuro**.

Brújula ayuda a descubrir:

> **¿Qué tendría que cambiar para que este sueño sea posible?**

Ese debe ser el foco de toda la experiencia.

------------------------------------------------------------------------

# Nuevo flujo del resultado

## 1. Conclusión inmediata

Eliminar el inicio basado únicamente en porcentajes.

Mostrar primero un diagnóstico humano.

Ejemplos:

### Camino prometedor

🌱 Este camino parece posible.

Necesitará paciencia y una buena base financiera, pero es coherente con
la vida que deseas construir.

------------------------------------------------------------------------

### Camino exigente

🌿 Este camino puede funcionar.

Sin embargo, antes conviene fortalecer algunos pilares para que el
cambio sea sostenible.

------------------------------------------------------------------------

### Camino frágil

🌧️ Hoy este escenario parece demasiado riesgoso.

No porque tu sueño sea imposible, sino porque las condiciones actuales
todavía no lo sostienen.

------------------------------------------------------------------------

## 2. Explicación del razonamiento

Nueva sección:

## ¿Por qué llegué a esta conclusión?

Dividir en dos bloques.

### Flores que encontré

-   propósito sólido
-   creatividad alta
-   relaciones fuertes
-   buena resiliencia
-   ahorro adecuado

### Cuidados importantes

-   deuda alta
-   poca energía
-   poco tiempo libre
-   agotamiento
-   salud frágil

Cada punto debe explicar brevemente su impacto.

------------------------------------------------------------------------

## 3. Qué necesita ocurrir

Nueva sección.

## Para que este sueño tenga muchas posibilidades de hacerse realidad

Mostrar entre 3 y 5 condiciones concretas.

Ejemplo:

✅ Reducir la deuda.

✅ Construir un fondo de emergencia.

✅ Validar el emprendimiento antes de renunciar.

✅ Mantener límites saludables con el trabajo.

✅ Mejorar energía y descanso.

Estas condiciones deben generarse desde los índices calculados por el
motor.

------------------------------------------------------------------------

## 4. Qué evitar

Nueva sección.

## Evitaría hacer esto

Ejemplos:

❌ Renunciar inmediatamente.

❌ Financiar el proyecto con más deuda.

❌ Trabajar siete días por semana.

❌ Descuidar la salud.

Debe adaptarse al escenario.

------------------------------------------------------------------------

## 5. Primer paso

Nueva sección.

## Si hoy solo dieras un paso

El sistema selecciona la acción con mayor impacto esperado.

Ejemplo:

Construir un fondo de emergencia de tres meses de gastos.

Explicar por qué ese paso modifica el camino.

------------------------------------------------------------------------

# Cambio de lenguaje

Eliminar:

-   Probabilidad
-   Riesgo crítico
-   Diagnóstico técnico

Preferir:

-   Camino prometedor
-   Camino exigente
-   Camino frágil
-   Flores del camino
-   Cuidados del jardín
-   Lo que fortalecería este viaje

------------------------------------------------------------------------

# Cambio de indicador principal

El porcentaje principal deja de representar una predicción absoluta.

Nuevo concepto:

## Preparación del Camino

Representa cuánto del camino ya está construido para sostener ese sueño.

Depende de:

-   salud
-   energía
-   libertad financiera
-   propósito
-   relaciones
-   resiliencia
-   tiempo disponible

Debe explicarse claramente.

------------------------------------------------------------------------

# Cambios requeridos en JourneyEngine

Agregar funciones:

-   explainConclusion()
-   identifyStrengths()
-   identifyWeaknesses()
-   buildSuccessConditions()
-   buildAvoidList()
-   chooseHighestImpactAction()

La IA recibe un objeto LifeSummary enriquecido y produce una narrativa
consistente.

------------------------------------------------------------------------

# Criterios de aceptación

La versión estará lista cuando:

-   un usuario comprenda el resultado en menos de 30 segundos;
-   pueda explicar con sus palabras por qué un escenario es favorable o
    desfavorable;
-   identifique al menos una acción concreta para mejorar su camino;
-   termine la simulación con sensación de esperanza, incluso si el
    escenario es difícil;
-   el porcentaje principal se interprete como progreso del camino y no
    como un veredicto definitivo.
