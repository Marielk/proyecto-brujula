# RFC-0012 --- Motor de Destinos Especializados

**Proyecto:** Brújula\
**Versión objetivo:** v0.10\
**Estado:** Aprobado para desarrollo

------------------------------------------------------------------------

# Objetivo

Evolucionar el Journey Engine para que deje de entregar recomendaciones
genéricas y comience a generar rutas específicas según el tipo de sueño
que desea alcanzar el usuario.

El sistema ya no debe interpretar únicamente un texto libre, sino
comprender **qué tipo de viaje** está simulando.

------------------------------------------------------------------------

# Problema detectado

Actualmente distintos escenarios producen resultados muy similares.

Ejemplos:

-   Comprar una casa.
-   Tener un hijo.
-   Mejorar la salud.
-   Vivir del arte.

Todos terminan mostrando recomendaciones parecidas:

-   crear un fondo de emergencia;
-   reducir deuda;
-   cuidar la energía;
-   evitar trabajar demasiado.

Aunque estos consejos son válidos, no representan correctamente el
objetivo específico del usuario.

------------------------------------------------------------------------

# Nueva arquitectura

Se incorpora un nuevo componente.

LifeProfile ↓ Goal Interpreter ↓ Journey Domain ↓ Journey Engine ↓ Life
Summary ↓ Carta de Sue

------------------------------------------------------------------------

# Nuevo componente: Goal Interpreter

Responsabilidad:

Transformar el objetivo escrito por el usuario en un objeto
estructurado.

Entrada:

"Quiero comprar una casa en 2030."

Salida:

-   dominio
-   tipo de objetivo
-   horizonte temporal
-   métricas relevantes
-   recursos necesarios
-   restricciones principales

Este objeto será utilizado por todo el motor.

------------------------------------------------------------------------

# Dominios iniciales

Implementar inicialmente cuatro dominios especializados.

## 1. Salud

Ejemplos:

-   bajar de peso
-   recuperarme físicamente
-   correr una maratón

Variables relevantes:

-   dolor
-   energía
-   sueño
-   actividad física
-   adherencia
-   apoyo profesional

Indicadores específicos:

-   Preparación física
-   Riesgo de recaída
-   Capacidad funcional
-   Adherencia esperada

------------------------------------------------------------------------

## 2. Vivienda

Ejemplos:

-   comprar una casa
-   comprar un departamento

Variables:

-   ahorro
-   pie
-   deuda
-   estabilidad laboral
-   acceso hipotecario

Indicadores:

-   Preparación hipotecaria
-   Capacidad de ahorro
-   Riesgo financiero

------------------------------------------------------------------------

## 3. Familia

Ejemplos:

-   tener un hijo

Variables:

-   salud
-   edad
-   estabilidad económica
-   red de apoyo
-   tiempo disponible
-   vivienda

Indicadores:

-   Preparación familiar
-   Fortaleza de la red de apoyo
-   Disponibilidad de tiempo

------------------------------------------------------------------------

## 4. Emprendimiento / Cambio de carrera

Ejemplos:

-   vivir del arte
-   abrir una cafetería
-   crear una startup

Variables:

-   validación
-   ingresos
-   ahorro
-   energía
-   tiempo
-   experiencia

Indicadores:

-   Preparación del negocio
-   Riesgo de transición
-   Autonomía económica

------------------------------------------------------------------------

# Reglas por dominio

Cada dominio debe implementar:

-   fortalezas específicas
-   riesgos específicos
-   hitos específicos
-   condiciones de éxito
-   acciones a evitar
-   rituales relacionados

No deben reutilizar listas genéricas.

------------------------------------------------------------------------

# Cambios en Journey Engine

Agregar:

-   GoalInterpreter
-   DomainResolver
-   DomainRuleSet
-   DomainMetricsCalculator

El Journey Engine deberá cargar automáticamente el RuleSet
correspondiente.

------------------------------------------------------------------------

# Cambios en Life Summary

Agregar:

-   domain
-   domainMetrics
-   domainRisks
-   domainMilestones
-   successConditions

La IA interpretará este objeto enriquecido.

------------------------------------------------------------------------

# Cambios en Carta de Sue

Sue debe hablar principalmente del sueño que el usuario desea lograr.

Ejemplo:

Si el objetivo es salud:

Hablar sobre descanso, hábitos, constancia y autocuidado.

No centrar la carta en deuda o emprendimiento.

------------------------------------------------------------------------

# Indicadores dinámicos

Mantener los índices generales:

-   Calidad de Vida
-   Libertad Financiera
-   Serenidad
-   Propósito

Agregar indicadores propios del dominio.

------------------------------------------------------------------------

# Escenarios no soportados

Si el Goal Interpreter no reconoce el dominio:

Mostrar:

"Este tipo de viaje todavía utiliza un modelo general. La simulación
puede ser menos precisa."

No inventar reglas específicas.

------------------------------------------------------------------------

# Criterios de aceptación

✓ Simular cuatro objetivos distintos utilizando el mismo LifeProfile.

Los resultados deben ser claramente diferentes.

✓ Los hitos cambian según el objetivo.

✓ Las fortalezas cambian.

✓ Los riesgos cambian.

✓ La Carta de Sue cambia.

✓ El primer paso cambia.

✓ El usuario reconoce que Brújula comprendió el sueño que desea
alcanzar.

------------------------------------------------------------------------

# Roadmap

v0.10 - Goal Interpreter - Cuatro dominios especializados

v0.11 - Comparación entre rutas

v0.12 - Biblioteca ampliada de dominios

v1.0 - Clasificación automática mediante IA con aprendizaje continuo
