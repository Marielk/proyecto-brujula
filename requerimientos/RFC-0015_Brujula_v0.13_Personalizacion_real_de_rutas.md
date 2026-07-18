
# RFC-0015 — Personalización real de rutas y eliminación de respuestas genéricas

**Proyecto:** Brújula  
**Versión objetivo:** v0.13  
**Estado:** Propuesto para desarrollo  
**Tipo de iteración:** Motor de simulación, contenido y experiencia de resultados  
**Prioridad:** Alta

---

## 1. Resumen ejecutivo

Las pruebas realizadas con distintos perfiles y objetivos demostraron que Brújula ya puede:

- interpretar metas;
- clasificar dominios;
- generar caminos con Ollama;
- expandir variantes;
- comparar rutas;
- presentar una recomendación narrativa.

Sin embargo, los resultados todavía reutilizan con demasiada frecuencia:

- las mismas fortalezas;
- los mismos riesgos;
- las mismas condiciones de éxito;
- el mismo primer paso;
- hitos similares;
- cartas de Sue con argumentos repetidos.

El problema no se resuelve agregando más texto ni modificando solamente el prompt. La próxima iteración debe hacer que cada resultado se construya desde:

1. el objetivo concreto;
2. el perfil de la persona;
3. las decisiones particulares de la ruta seleccionada;
4. las diferencias frente a las rutas descartadas;
5. las variables propias del dominio.

El criterio principal de éxito será que dos simulaciones diferentes no puedan intercambiar sus resultados sin que la incoherencia sea evidente.

---

## 2. Problema observado

Durante las pruebas con un segundo perfil se simularon destinos como:

- vivir de la fotografía y formar una familia;
- ganar la lotería;
- regresar al diseño UX;
- desarrollar un curso o taller;
- otros objetivos de familia, salud, creatividad y trabajo.

Aunque Ollama participó, se repitieron recomendaciones como:

- construir un fondo de emergencia;
- proteger la energía;
- revisar el financiamiento;
- avanzar con apoyo;
- mantener o rediseñar según evidencia;
- evitar decisiones irreversibles.

Estas recomendaciones pueden ser razonables como cuidados transversales, pero no deben ocupar el centro de todos los resultados.

### Causas probables

1. Las rutas estructuradas terminan completándose con funciones genéricas.
2. Las decisiones y efectos usan plantillas compartidas entre dominios.
3. Los índices generales pesan más que las métricas específicas.
4. El Perfil de Vida penaliza siempre los mismos puntos débiles.
5. La Carta de Sue recibe un resumen demasiado general.
6. El primer paso no se deriva de la ruta ganadora.
7. El sistema no distingue entre una condición necesaria y un cuidado secundario.
8. Los escenarios excepcionales o poco realistas se fuerzan dentro de un modelo normal.

---

## 3. Objetivo de la v0.13

Conseguir que Brújula produzca rutas y explicaciones realmente específicas.

Al finalizar esta versión:

- una meta de vivienda hablará principalmente de pie, deuda, capacidad hipotecaria y sostenibilidad del dividendo;
- una meta familiar hablará principalmente de salud, corresponsabilidad, red de apoyo, vivienda y disponibilidad real de tiempo;
- una meta creativa hablará principalmente de práctica, portafolio, producción, validación, comunidad e ingresos creativos;
- una meta laboral hablará principalmente de competencias, empleabilidad, portafolio, networking, renta y transición;
- una meta de salud hablará principalmente de adherencia, capacidad funcional, descanso, acompañamiento y progresión;
- una meta improbable, como ganar la lotería, no será presentada como un plan controlable.

---

## 4. Principios de implementación

### 4.1 La meta específica debe dominar el resultado

El motor puede considerar salud, dinero, energía y relaciones en todos los viajes, pero el contenido principal debe responder al destino.

### 4.2 El perfil modifica la ruta; no reemplaza el objetivo

El Perfil de Vida debe funcionar como contexto y restricción.

No debe provocar que todas las simulaciones de una persona terminen hablando principalmente de su deuda, su energía o su salud.

### 4.3 Las recomendaciones deben derivarse de decisiones simuladas

No crear listas de consejos después de calcular el resultado.

Las condiciones, riesgos, hitos y primeros pasos deben existir dentro de la ruta antes de su evaluación.

### 4.4 La IA genera alternativas; el motor exige estructura

Ollama puede proponer caminos, pero cada camino debe convertirse en un objeto validable con:

- decisiones;
- etapas;
- recursos;
- condiciones de avance;
- efectos;
- señales de revisión;
- criterio de éxito.

### 4.5 Brújula debe reconocer los límites de su control

No todos los objetivos son planificables del mismo modo.

La aplicación debe distinguir:

- objetivo controlable;
- objetivo parcialmente controlable;
- objetivo dependiente de terceros;
- evento aleatorio;
- fantasía o escenario exploratorio.

---

## 5. Nuevo modelo de objetivo: GoalProfile v2

Extender `GoalProfile` con los siguientes campos:

```json
{
  "domain": "familia",
  "secondaryDomains": ["salud", "finanzas", "vivienda"],
  "goalType": "formar_familia_con_dos_hijos",
  "goalStatement": "Vivir de la fotografía y formar una familia con dos hijos",
  "targetOutcome": "Sostener ingresos fotográficos compatibles con crianza y vida familiar",
  "horizonYear": 2035,
  "controllability": "partial",
  "uncertaintyType": "life_transition",
  "successCriteria": [
    "Ingresos fotográficos estables",
    "Red de apoyo activa",
    "Distribución corresponsable de cuidados",
    "Tiempo familiar suficiente"
  ],
  "requiredResources": [
    "portafolio",
    "clientes",
    "tiempo",
    "red de apoyo",
    "salud",
    "ahorro"
  ],
  "constraints": [
    "carga laboral",
    "energía",
    "deuda",
    "disponibilidad de cuidados"
  ],
  "nonNegotiables": [
    "no abandonar la salud",
    "mantener presencia familiar"
  ],
  "assumptions": []
}
```

### Valores de `controllability`

- `high`: depende principalmente de acciones del usuario.
- `partial`: depende de acciones propias y factores externos.
- `low`: depende principalmente de terceros o del azar.
- `exploratory`: escenario hipotético o creativo.

### Comportamiento esperado

Si la controlabilidad es baja, Brújula no debe decir:

> “Este camino puede funcionar si cumples estos pasos”.

Debe decir:

> “Este resultado depende en gran medida del azar. Puedo ayudarte a explorar qué harías si ocurriera, pero no a construir una ruta fiable para provocarlo”.

---

## 6. Rutas especializadas por dominio

Crear una capa de plantillas estructurales por dominio.

Estas plantillas no deben contener el texto final. Deben definir qué componentes necesita una ruta válida.

### 6.1 Salud

Cada ruta debe incluir:

- conducta o hábito objetivo;
- frecuencia;
- progresión;
- soporte profesional, cuando corresponda;
- barrera principal;
- criterio de adherencia;
- criterio de pausa;
- medida funcional;
- riesgo de recaída.

### 6.2 Vivienda

Cada ruta debe incluir:

- valor objetivo aproximado;
- pie necesario;
- ahorro mensual requerido;
- deuda a reducir;
- capacidad de dividendo;
- plazo;
- tipo de vivienda;
- ubicación o flexibilidad territorial;
- contingencias de mantención;
- criterio para comenzar búsqueda.

### 6.3 Familia

Cada ruta debe incluir:

- horizonte de decisión;
- salud y orientación profesional pertinente;
- red de apoyo;
- corresponsabilidad;
- vivienda;
- costo estimado;
- tiempo disponible;
- ajuste laboral;
- plan de cuidados;
- condición mínima antes de avanzar.

### 6.4 Emprendimiento

Cada ruta debe incluir:

- oferta;
- cliente;
- validación;
- canal;
- costo de prueba;
- horas semanales;
- ingreso mínimo;
- fondo de transición;
- criterio para reducir jornada o renunciar;
- señal de abandono o rediseño.

### 6.5 Creatividad

Cada ruta debe incluir:

- disciplina creativa;
- obra o producción;
- frecuencia;
- portafolio;
- aprendizaje;
- comunidad;
- exposición;
- monetización, si es parte del objetivo;
- protección de tiempo;
- criterio de progreso creativo.

### 6.6 Educación

Cada ruta debe incluir:

- programa o competencia;
- requisitos;
- costo;
- horas semanales;
- duración;
- compatibilidad laboral;
- resultado esperado;
- aplicación práctica;
- apoyo;
- criterio de continuidad.

### 6.7 Carrera y empleo

Crear un dominio especializado nuevo: `carrera`.

Debe detectar objetivos como:

- volver al diseño UX;
- cambiar de profesión;
- encontrar empleo;
- ascender;
- trabajar de forma independiente;
- mejorar renta.

Cada ruta debe incluir:

- rol objetivo;
- brecha de habilidades;
- portafolio;
- experiencia demostrable;
- networking;
- canales de búsqueda;
- renta objetivo;
- cantidad de postulaciones o conversaciones;
- plazo;
- estrategia de transición;
- criterios para aceptar una oferta.

---

## 7. PathSchema v2

Cada camino generado por Ollama o por fallback debe cumplir esta estructura:

```json
{
  "id": "career_return_gradual",
  "name": "Regreso gradual a UX con portafolio actualizado",
  "strategy": "gradual",
  "domain": "carrera",
  "specificOutcome": "Conseguir un rol Product Designer o UX Designer",
  "description": "Actualizar evidencia profesional mientras mantiene ingresos actuales.",
  "timeEstimateMonths": 12,
  "financialRisk": "bajo",
  "energyDemand": "media",
  "reversibility": "alta",
  "assumptions": [
    "Existe demanda para perfiles con experiencia SaaS",
    "Puede reservar cinco horas semanales"
  ],
  "requirements": [
    "Actualizar dos casos de estudio",
    "Practicar entrevistas",
    "Contactar red profesional"
  ],
  "steps": [
    {
      "id": "audit",
      "phase": 1,
      "title": "Auditar experiencia y brechas",
      "durationWeeks": 2,
      "actions": [
        "Seleccionar proyectos relevantes",
        "Identificar competencias faltantes"
      ],
      "completionCriteria": [
        "Lista priorizada de brechas",
        "Dos proyectos elegidos"
      ],
      "expectedEffects": {
        "careerReadiness": 6,
        "clarity": 8,
        "energy": -1
      }
    }
  ],
  "advanceConditions": [
    "Portafolio revisado por dos personas",
    "Al menos tres conversaciones profesionales"
  ],
  "pauseConditions": [
    "La preparación afecta de forma sostenida el sueño o la salud"
  ],
  "successCriteria": [
    "Conseguir una oferta compatible con renta y estilo de vida"
  ],
  "tradeoffs": [
    "Avance más lento a cambio de conservar ingresos"
  ]
}
```

---

## 8. Generación con Ollama

Actualizar el prompt del `Path Generator`.

### Requisitos

Ollama debe:

1. recibir el `GoalProfile v2`;
2. recibir solo los datos del perfil relevantes para el dominio;
3. generar entre 4 y 6 estrategias realmente distintas;
4. completar `PathSchema v2`;
5. evitar consejos universales salvo que sean causalmente necesarios;
6. indicar supuestos;
7. no inventar montos, diagnósticos ni garantías;
8. usar lenguaje concreto;
9. diferenciar rutas por decisiones, no solo por ritmo.

### Ejemplo de diferencia inválida

- Ruta suave.
- Ruta balanceada.
- Ruta acelerada.

Estas son variantes, no estrategias distintas.

### Ejemplo de diferencia válida para fotografía

- Mantener empleo y construir cartera de clientes.
- Especializarse en fotografía de eventos.
- Crear productos educativos y talleres.
- Desarrollar fotografía corporativa recurrente.
- Asociarse con productora o agencia.

Después, el `Path Expander` puede crear variantes suaves, balanceadas y aceleradas de cada estrategia.

---

## 9. Context Selector

Crear un módulo que seleccione qué partes del Perfil de Vida deben influir en cada dominio.

### Ejemplo: meta de salud

Alta relevancia:

- salud;
- sueño;
- dolor;
- energía;
- tiempo;
- preferencias de bienestar.

Relevancia secundaria:

- finanzas si condicionan tratamiento;
- red de apoyo.

Baja relevancia:

- creatividad;
- deseo de vivienda;
- otros datos no relacionados.

### Ejemplo: meta laboral

Alta relevancia:

- experiencia;
- educación;
- tiempo;
- energía;
- renta;
- estabilidad;
- valores laborales.

Relevancia secundaria:

- deuda;
- salud;
- responsabilidades de cuidado.

El selector debe entregar:

```json
{
  "primaryContext": {},
  "secondaryContext": {},
  "excludedContext": []
}
```

Esto evitará que una dificultad transversal domine todos los resultados.

---

## 10. Métricas específicas y jerarquía

Separar las métricas en tres niveles.

### Nivel A: métricas del destino

Son las principales y cambian por dominio.

Ejemplo para carrera:

- preparación profesional;
- fuerza del portafolio;
- empleabilidad;
- ajuste de mercado;
- compatibilidad de renta;
- sostenibilidad de transición.

### Nivel B: métricas de sostenibilidad vital

- salud;
- energía;
- serenidad;
- relaciones;
- resiliencia.

### Nivel C: métricas informativas

- calidad de vida global;
- esperanza;
- coherencia con valores.

### Regla de UI y narrativa

La conclusión, fortalezas, riesgos y primer paso deben derivarse primero del Nivel A.

Los niveles B y C solo complementan la respuesta.

---

## 11. Puntuación especializada

Cada política de dominio debe ponderar principalmente sus métricas específicas.

Ejemplo para carrera:

```text
25 % preparación profesional
20 % fuerza del portafolio
20 % empleabilidad
15 % compatibilidad de renta
10 % sostenibilidad vital
10 % coherencia con valores
```

Ejemplo para familia:

```text
25 % preparación familiar
20 % red de apoyo
20 % disponibilidad de tiempo
15 % salud y energía
10 % seguridad del hogar
10 % corresponsabilidad
```

No utilizar `creativeUpside` como variable universal.

Reemplazarla por un campo genérico:

```json
"domainBenefit": {
  "name": "empleabilidad",
  "level": "alta"
}
```

---

## 12. Construcción de fortalezas y riesgos

Eliminar la selección basada solamente en ordenar métricas.

Crear reglas causales.

### Una fortaleza válida debe indicar:

- qué dato la origina;
- por qué ayuda a la meta;
- en qué etapa es útil.

Ejemplo:

> “Tu experiencia previa en SaaS reduce la brecha para regresar a UX, especialmente en roles de producto B2B”.

### Un riesgo válido debe indicar:

- qué condición lo origina;
- cómo afecta la ruta;
- qué señal permitiría detectarlo.

Ejemplo:

> “Si intentas reconstruir portafolio, postular y mantener la carga laboral actual al mismo tiempo, la preparación puede volverse difícil de sostener. Revísalo si empiezas a sacrificar sueño durante dos semanas seguidas”.

---

## 13. Condiciones de éxito

Las condiciones deben provenir de:

1. `PathSchema.requirements`;
2. `advanceConditions`;
3. debilidades del dominio;
4. restricciones relevantes del perfil.

No usar siempre una lista fija de cuatro condiciones.

Mostrar entre 3 y 6, ordenadas por dependencia.

Ejemplo:

1. Actualizar dos casos de estudio.
2. Validar el portafolio con profesionales del área.
3. Iniciar conversaciones y postulaciones.
4. Comparar ofertas con renta y estilo de vida deseados.

---

## 14. Lista “Evitaría hacer esto”

Debe ser específica de la estrategia elegida.

Ejemplo para volver a UX:

- postular masivamente antes de actualizar evidencia;
- aceptar un rol que empeore de manera importante el estilo de vida;
- abandonar el ingreso actual sin señales de demanda;
- estudiar herramientas sin relación con la brecha real.

Ejemplo para familia:

- asumir que la ayuda aparecerá sin conversarla;
- concentrar todos los cuidados en una persona;
- avanzar sin revisar disponibilidad real de tiempo;
- ignorar orientación profesional de salud cuando corresponda.

---

## 15. Primer paso

El primer paso debe salir del primer elemento incompleto y de mayor impacto de la ruta seleccionada.

### Reglas

- debe poder comenzar en una semana;
- debe ser verificable;
- debe estar relacionado directamente con el destino;
- no puede ser un consejo genérico;
- debe explicar qué desbloquea.

Ejemplo:

> **Seleccionar dos proyectos para reconstruir el portafolio UX.**  
> Esto permite identificar brechas reales, ordenar la narrativa profesional y comenzar a validar el regreso antes de postular.

“Construir un fondo de emergencia” solo será primer paso cuando la simulación demuestre que sin ese fondo no se puede ejecutar ninguna etapa posterior.

---

## 16. Historia del camino

Construir la línea de tiempo directamente desde `PathSchema.steps`.

Cada hito debe incluir:

- fase;
- periodo;
- decisión;
- resultado esperado;
- condición de avance;
- señal de revisión.

No usar años fijos como 2027, 2028, 2030 y 2033 para todas las metas.

Si la meta tiene un horizonte corto, usar semanas o meses.

Ejemplo:

- Semana 1–2.
- Mes 1–2.
- Mes 3–6.
- Mes 7–12.

---

## 17. Comparación de rutas

El `Advanced Comparator` debe recibir:

- resultados específicos del dominio;
- costo vital;
- supuestos;
- reversibilidad;
- condiciones necesarias;
- diferencias concretas entre rutas.

Debe devolver:

```json
{
  "recommendedPathId": "...",
  "recommendedReason": "...",
  "whyNotOthers": [
    {
      "pathId": "...",
      "reason": "..."
    }
  ],
  "decisionTradeoff": "...",
  "whatCouldChangeRecommendation": [
    "..."
  ],
  "confidence": 0.67
}
```

### Nueva sección de UI

Agregar:

## ¿Qué podría cambiar esta recomendación?

Ejemplos:

- conseguir apoyo estable para cuidados;
- aumentar el ahorro mensual;
- recibir una oferta laboral;
- mejorar una limitación física;
- cambiar el plazo.

Esto mostrará que la recomendación no es definitiva.

---

## 18. Carta de Sue v2

La carta debe construirse desde:

- objetivo textual;
- ruta ganadora;
- dos rutas descartadas;
- una fortaleza concreta del perfil;
- un riesgo concreto;
- primer paso;
- supuesto importante;
- nivel de control del objetivo.

### Reglas

- máximo 220 palabras;
- no repetir las tarjetas;
- no enumerar métricas;
- no usar frases intercambiables;
- mencionar al menos una decisión específica;
- explicar una compensación;
- conservar un tono cariñoso y no determinista.

### Ejemplo de instrucción

> Escribe una carta que solo tendría sentido para esta persona y este viaje. Si la carta también pudiera servir para comprar una casa, bajar de peso o estudiar, debes reescribirla.

---

## 19. Detección de repetición

Crear un `GenericityGuard`.

Debe revisar el resultado antes de enviarlo a UI.

### Detectar

- frases repetidas entre dominios;
- primer paso idéntico en metas distintas;
- fortalezas sin referencia al objetivo;
- riesgos universales ocupando más del 50 % del contenido;
- hitos sin conceptos propios del dominio;
- carta que no menciona decisiones específicas.

### Comportamiento

Si falla la validación:

1. regenerar solo el bloque afectado;
2. si falla de nuevo, usar fallback específico del dominio;
3. registrar la causa en modo debug.

---

## 20. Instrumentación y modo debug

Agregar un panel técnico colapsable con:

- dominio detectado;
- controlabilidad;
- contexto primario utilizado;
- cantidad de rutas base;
- cantidad de variantes;
- rutas podadas;
- clusters;
- política de puntuación;
- participación de Ollama;
- uso de fallback;
- bloques regenerados por GenericityGuard;
- duración por fase.

Esto permitirá diagnosticar por qué dos simulaciones se parecen.

---

## 21. Cambios mínimos de UI

Esta versión se centra en contenido y motor. No requiere rediseño completo.

Agregar solamente:

1. Etiqueta de dominio detectado.
2. Etiqueta de tipo de escenario:
   - planificable;
   - parcialmente planificable;
   - exploratorio;
   - dependiente del azar.
3. Sección “¿Qué podría cambiar esta recomendación?”.
4. Historia con periodos adaptativos.
5. Mensaje honesto para objetivos de baja controlabilidad.
6. Mostrar “se utilizó modelo especializado de Carrera / Familia / Salud...”.
7. Mantener datos técnicos colapsados.

---

## 22. Requisitos de pruebas

### 22.1 Prueba de diferenciación entre dominios

Con el mismo perfil simular:

- comprar una casa;
- tener un hijo;
- volver a UX;
- mejorar salud;
- desarrollar un taller de fotografía.

Verificar:

- métricas diferentes;
- primer paso diferente;
- condiciones diferentes;
- riesgos diferentes;
- hitos diferentes;
- cartas diferentes.

### 22.2 Prueba dentro del mismo dominio

Simular:

- volver a UX;
- conseguir ascenso;
- trabajar freelance.

Las rutas deben compartir conceptos de carrera, pero no los mismos pasos.

### 22.3 Prueba de perfil

Simular el mismo destino con dos perfiles distintos.

El objetivo debe permanecer reconocible, pero deben cambiar:

- ritmo;
- restricciones;
- ruta recomendada;
- apoyo necesario;
- riesgo.

### 22.4 Prueba de evento aleatorio

Objetivo:

> “Ganar la lotería”.

Resultado esperado:

- controlabilidad baja;
- sin falsa probabilidad de éxito;
- opción de explorar qué haría si ocurriera;
- opción de reformular como objetivo financiero controlable.

### 22.5 Prueba de no intercambio

Tomar el resultado de familia y colocarlo bajo una meta laboral.

La incoherencia debe ser evidente.

---

## 23. Criterios de aceptación

La v0.13 estará lista cuando:

- cinco destinos distintos produzcan resultados claramente distintos;
- el primer paso provenga de la ruta ganadora;
- la historia use etapas propias de la meta;
- la Carta de Sue mencione decisiones concretas;
- los riesgos expliquen causalidad;
- los consejos financieros no dominen metas donde no son centrales;
- Brújula reconozca objetivos aleatorios o poco controlables;
- el modo debug permita saber qué información generó cada bloque;
- el `GenericityGuard` detecte resultados intercambiables;
- las pruebas automatizadas confirmen diversidad entre dominios.

---

## 24. Fuera de alcance

No incluir en esta versión:

- rediseño total del formulario;
- nuevas ilustraciones;
- Modo Jardín completo;
- Modo Libro completo;
- integración con datos externos;
- predicciones médicas;
- datos financieros en tiempo real;
- cálculo hipotecario oficial;
- garantías de resultados;
- entrenamiento o fine-tuning de modelos.

---

## 25. Orden recomendado de implementación

### Fase 1 — Fundaciones

1. Agregar dominio `carrera`.
2. Implementar `GoalProfile v2`.
3. Implementar controlabilidad.
4. Crear `Context Selector`.

### Fase 2 — Rutas

5. Implementar `PathSchema v2`.
6. Actualizar prompt de Ollama.
7. Crear validación estructural.
8. Crear fallbacks por dominio.

### Fase 3 — Evaluación

9. Crear políticas de puntuación específicas.
10. Reemplazar `creativeUpside` universal.
11. Crear fortalezas y riesgos causales.
12. Derivar condiciones y primer paso desde la ruta.

### Fase 4 — Narrativa

13. Crear historia desde pasos reales.
14. Actualizar `Advanced Comparator`.
15. Implementar Carta de Sue v2.
16. Agregar `GenericityGuard`.

### Fase 5 — Calidad

17. Agregar pruebas de diversidad.
18. Agregar modo debug.
19. Corregir textos con encoding dañado.
20. Documentar arquitectura y ejemplos.

---

## 26. Resultado esperado

Brújula no debe responder como una plantilla que adapta algunas palabras.

Debe sentirse como un sistema que:

1. comprendió el sueño;
2. identificó qué parte de la vida afecta;
3. exploró estrategias realmente diferentes;
4. evaluó sus consecuencias;
5. explicó por qué eligió una;
6. mostró qué tendría que cambiar;
7. propuso un primer paso específico.

La prueba emocional de esta versión será que el usuario pueda decir:

> “Esta respuesta no podría haber aparecido en ninguna otra simulación. Brújula entendió el camino que estoy intentando construir”.
