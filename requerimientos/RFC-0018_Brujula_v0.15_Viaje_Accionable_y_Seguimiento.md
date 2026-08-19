# RFC-0018 — Brújula v0.15: Viaje accionable y seguimiento de decisiones

**Proyecto:** Brújula  
**Versión objetivo:** v0.15  
**Estado:** Propuesto  
**Prioridad:** Alta  
**Fecha:** Agosto 2026

---

## 1. Resumen

Transformar el resultado del Modo Viaje en una decisión que la persona pueda llevar a la práctica, observar y revisar.

Actualmente Brújula interpreta un destino, explora rutas, compara alternativas y recomienda un camino. La experiencia termina, sin embargo, antes de comprobar si esa recomendación puede producir un cambio real. La versión v0.15 debe cerrar ese vacío mediante un ciclo explícito:

```text
Destino → Simulación → Comparación → Decisión → Experimento → Evidencia → Revisión
```

Brújula no decidirá por la persona ni presentará la simulación como predicción. La ayudará a convertir una posibilidad en un experimento pequeño, reversible y medible.

---

## 2. Problema

El resultado actual puede ser claro e inspirador, pero todavía presenta riesgos:

- La persona puede leer la recomendación sin saber qué hacer después.
- El primer paso puede quedar formulado como consejo general.
- No existe un compromiso explícito con una ruta.
- No se distinguen acciones, supuestos y señales observables.
- No existe una fecha de revisión.
- Brújula no registra qué ocurrió en la vida real.
- Una nueva simulación no aprende de decisiones anteriores.
- El valor del producto se concentra en generar un informe, no en acompañar un proceso.

Sin seguimiento, Brújula corre el riesgo de ser percibida como una experiencia narrativa interesante, pero no como una herramienta útil para tomar decisiones.

---

## 3. Objetivo

Permitir que una persona, después de recibir el resultado de un viaje:

1. Comprenda la recomendación y sus límites.
2. Elija conscientemente una de las rutas finalistas.
3. Declare qué quiere aprender antes de comprometerse más.
4. Diseñe un experimento pequeño y reversible.
5. Obtenga un plan de 7 o 30 días.
6. Defina evidencias y señales para continuar, ajustar o detenerse.
7. Programe una fecha de revisión.
8. Registre lo ocurrido.
9. Use ese aprendizaje como contexto de un viaje futuro.

---

## 4. Principios de producto

- **Decisión humana:** Brújula recomienda; la persona elige.
- **Acción antes que certeza:** el objetivo es obtener evidencia, no fingir una predicción perfecta.
- **Reversibilidad:** el primer experimento debe limitar costo, riesgo y compromiso.
- **Especificidad:** toda acción debe indicar qué hacer, cuándo y para qué.
- **Cuidado integral:** dinero, salud, tiempo, energía, relaciones y propósito siguen siendo restricciones reales.
- **Aprendizaje visible:** cambiar de opinión después de obtener evidencia no se considera fracaso.
- **Progresión gradual:** el MVP registra decisiones y revisiones sin construir todavía un Life Graph completo.
- **Privacidad:** no se enviará el contenido completo de decisiones o notas a servicios externos sin consentimiento.

---

## 5. Alcance

### Incluido

- Resumen de decisión al final del resultado.
- Elección de una ruta recomendada o alternativa.
- Declaración opcional de una ruta propia.
- Experimento reversible.
- Plan de 7 o 30 días.
- Evidencias y señales de decisión.
- Fecha de revisión.
- Estado de seguimiento.
- Registro de aprendizaje.
- Historial local de decisiones.
- Reutilización controlada del aprendizaje en nuevas simulaciones.
- Contratos estables y servicios de aplicación independientes de React.
- Eventos de producto sin contenido sensible completo.

### Fuera de alcance

- Autenticación y cuentas.
- Sincronización entre dispositivos.
- Colaboración con otras personas.
- Recordatorios por correo o notificaciones push.
- Calendario integrado.
- Life Graph completo.
- Libro de Vida.
- Recomendaciones médicas, legales o financieras profesionales.
- Ejecución automática de acciones externas.
- Entrenamiento de modelos con datos personales.

---

## 6. Experiencia principal

El resultado del viaje incorporará una nueva sección principal:

> **Convierte esta ruta en un paso real**

La sección debe guiar a la persona por cinco momentos:

```text
1. Elegir ruta
2. Definir aprendizaje
3. Diseñar experimento
4. Acordar señales
5. Programar revisión
```

No debe presentarse como otro formulario largo. Cada momento debe mostrar únicamente las preguntas necesarias y permitir guardar un borrador.

---

## 7. Momento 1 — Elegir una ruta

La persona podrá elegir:

- La ruta recomendada.
- Una de las rutas alternativas.
- “Todavía no quiero elegir”.
- “Quiero definir una ruta diferente”.

Brújula debe mostrar para cada ruta:

- nombre;
- intención;
- principal ventaja;
- principal costo o renuncia;
- nivel de reversibilidad;
- condición mínima para probarla;
- motivo por el que fue recomendada o descartada.

La interfaz debe declarar:

> Esta elección no es definitiva. Es una hipótesis que puedes probar y revisar.

Elegir una alternativa no debe presentarse como ignorar a Brújula. La aplicación debe adaptar el experimento a la decisión humana.

---

## 8. Momento 2 — Definir qué se quiere aprender

Antes de crear tareas, Brújula debe ayudar a formular una pregunta de aprendizaje.

Ejemplos:

- “¿Puedo conseguir tres clientes sin dejar todavía mi empleo?”
- “¿Mi energía mejora si reduzco dos compromisos durante un mes?”
- “¿Disfruto producir y vender mi obra de forma sostenida?”
- “¿Existe demanda real por este servicio?”
- “¿Puedo estudiar cinco horas semanales sin perjudicar mi salud?”

### Requisitos

- Una sola pregunta principal.
- Debe poder responderse mediante observación.
- Debe estar relacionada con la incertidumbre central de la ruta.
- No debe formularse como garantía de éxito.
- Puede editarse manualmente.

---

## 9. Momento 3 — Experimento reversible

El experimento será la unidad mínima de avance de Brújula.

Debe incluir:

- nombre;
- propósito;
- duración;
- acciones concretas;
- tiempo semanal máximo;
- presupuesto máximo;
- apoyos necesarios;
- riesgos que se desea limitar;
- condición de finalización;
- fecha de inicio;
- fecha de revisión.

### Restricciones

- Duración recomendada: entre 7 y 30 días.
- Debe evitar decisiones irreversibles cuando todavía falta evidencia.
- Debe respetar no negociables y restricciones del Perfil de Vida.
- No puede depender únicamente de resultados fuera del control de la persona.
- Debe contener entre una y cinco acciones principales.
- Cada acción debe comenzar con un verbo y tener una condición observable de término.

### Ejemplo

```text
Experimento: Validar un taller creativo sin dejar el empleo
Duración: 21 días
Tiempo máximo: 4 horas por semana
Presupuesto máximo: $30.000

Acciones:
1. Escribir una propuesta de taller de una página.
2. Conversar con cinco personas del público objetivo.
3. Invitar a una sesión piloto pagada.
4. Registrar interés, objeciones, energía y tiempo invertido.
```

---

## 10. Plan de 7 y 30 días

La persona podrá elegir uno de dos formatos.

### Plan de 7 días

Orientado a destrabar una decisión o conseguir evidencia inicial.

- Máximo tres acciones.
- Al menos una acción realizable durante las próximas 48 horas.
- Revisión breve al finalizar la semana.

### Plan de 30 días

Orientado a validar una ruta con mayor profundidad.

- Hasta cuatro hitos semanales.
- Máximo cinco acciones principales.
- Revisión intermedia opcional.
- Revisión final obligatoria.

Brújula debe recomendar una duración, pero la persona podrá cambiarla.

---

## 11. Señales de decisión

Todo experimento debe declarar anticipadamente:

### Señales para continuar

Evidencias que aumentan la confianza en la ruta.

### Señales para ajustar

Evidencias que sugieren cambiar ritmo, alcance, apoyo o recursos.

### Señales para detenerse

Condiciones que indican que continuar dañaría límites relevantes o que la hipótesis perdió sentido.

### Dimensiones sugeridas

- evidencia externa;
- energía y salud;
- tiempo real utilizado;
- impacto financiero;
- disfrute o sentido;
- apoyo disponible;
- efecto en relaciones y responsabilidades;
- aprendizaje inesperado.

Las señales deben evitar umbrales inventados. Cuando no existan datos suficientes, se formularán como observaciones cualitativas editables.

---

## 12. Revisión

En la fecha elegida, la persona podrá registrar:

- estado del experimento;
- acciones realizadas;
- evidencia obtenida;
- energía antes y después;
- gastos y tiempo aproximados;
- qué funcionó;
- qué fue más difícil;
- qué cambió en su comprensión;
- decisión siguiente.

### Estados

```text
draft
planned
in_progress
completed
paused
discarded
```

### Decisiones posteriores

```text
continue
adjust
stop
simulate_again
undecided
```

Brújula debe tratar `stop` y `adjust` como resultados válidos del aprendizaje.

---

## 13. Historial de decisiones

Se agregará una vista inicial de historial accesible desde el Modo Viaje.

Cada elemento mostrará:

- destino original;
- ruta elegida;
- fecha de decisión;
- experimento;
- estado;
- próxima revisión;
- último aprendizaje registrado.

### Acciones

- Abrir decisión.
- Continuar seguimiento.
- Registrar revisión.
- Usar aprendizaje en un nuevo viaje.
- Archivar.

Para v0.15 el historial puede almacenarse localmente mediante `StorageProvider`. La estructura debe permitir migrar posteriormente a almacenamiento durable.

---

## 14. Contratos de dominio

```ts
type DecisionStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "completed"
  | "paused"
  | "discarded";

type ReviewDecision =
  | "continue"
  | "adjust"
  | "stop"
  | "simulate_again"
  | "undecided";

type DecisionSignal = {
  id: string;
  kind: "continue" | "adjust" | "stop";
  description: string;
};

type ExperimentAction = {
  id: string;
  title: string;
  done: boolean;
  evidence?: string;
};

type JourneyDecision = {
  id: string;
  simulationId: string;
  goal: string;
  selectedPathId?: string;
  selectedPathName: string;
  status: DecisionStatus;
  learningQuestion: string;
  experiment: {
    title: string;
    purpose: string;
    durationDays: 7 | 30;
    weeklyTimeLimit?: number;
    budgetLimit?: number;
    actions: ExperimentAction[];
    signals: DecisionSignal[];
    startsAt?: string;
    reviewAt: string;
  };
  createdAt: string;
  updatedAt: string;
};

type JourneyReview = {
  id: string;
  decisionId: string;
  completedActions: string[];
  evidence: string[];
  energyAfter?: number;
  timeSpentHours?: number;
  moneySpent?: number;
  worked: string;
  difficult: string;
  learning: string;
  nextDecision: ReviewDecision;
  createdAt: string;
};
```

Los contratos definitivos deben validarse en tiempo de ejecución antes de persistir o recuperar información.

---

## 15. Arquitectura

Siguiendo RFC-0017:

```text
UI
└── DecisionFlow / DecisionHistory / DecisionReview

Application Layer
└── DecisionService / ReviewService

Domain
└── DecisionEngine / ExperimentPolicy

Infrastructure
└── StorageProvider / EventBus
```

### Reglas

- React no contiene reglas para decidir si un experimento es reversible.
- `DecisionService` coordina creación, actualización y revisión.
- `ExperimentPolicy` valida duración, acciones, límites y señales.
- La generación asistida por IA debe usar `AIProvider`.
- Siempre debe existir un fallback determinista editable.
- La persistencia se consume exclusivamente mediante `StorageProvider`.
- Una decisión debe poder exportarse como objeto independiente de la UI.

---

## 16. Generación asistida

Brújula podrá proponer:

- pregunta de aprendizaje;
- duración;
- acciones;
- señales;
- límites de cuidado;
- fecha de revisión sugerida.

### Guardas

- No inventar disponibilidad, dinero o apoyos.
- No recomendar renunciar, endeudarse o abandonar cuidados como primer experimento.
- No presentar resultados como probabilidades científicas.
- No sustituir ayuda profesional en decisiones de alto riesgo.
- Explicar qué información del Perfil de Vida influyó.
- Permitir editar todo antes de guardar.
- Validar la salida estructurada.
- Usar fallback local si el proveedor falla.

---

## 17. Navegación

Rutas propuestas:

```text
/viaje/resultado/[simulationId]
/viaje/decision/nueva/[simulationId]
/viaje/decision/[decisionId]
/viaje/decision/[decisionId]/revision
/viaje/historial
```

La creación comienza desde un resultado existente. No debe ejecutarse nuevamente la simulación para abrir o editar una decisión.

---

## 18. Persistencia y privacidad

- Guardar únicamente la información necesaria para seguimiento.
- Separar resultados de simulación, decisiones y revisiones.
- Mantener versiones de esquema.
- Permitir archivar y eliminar una decisión.
- No registrar notas personales completas en telemetría.
- No guardar sueños o reflexiones en servicios externos sin consentimiento.
- Informar claramente si los datos viven solamente en el navegador.
- Preparar migraciones para cambios de contrato.

### Claves iniciales sugeridas

```text
brujula.journeyDecisions.v0.15
brujula.journeyReviews.v0.15
```

---

## 19. Eventos de producto

Registrar sin texto personal completo:

- `DecisionDraftStarted`
- `PathSelected`
- `ExperimentGenerated`
- `ExperimentEdited`
- `DecisionPlanned`
- `DecisionStarted`
- `ReviewOpened`
- `ReviewCompleted`
- `DecisionContinued`
- `DecisionAdjusted`
- `DecisionStopped`
- `JourneyResimulatedFromLearning`

Propiedades permitidas:

- identificadores internos;
- dominio;
- duración elegida;
- cantidad de acciones;
- estado;
- tipo de decisión posterior;
- timestamps y duración del flujo.

---

## 20. Accesibilidad y contenido

- Navegación completa por teclado.
- Etiquetas persistentes en todos los campos.
- Errores asociados al campo correspondiente.
- Foco en el título al cambiar de paso.
- No depender únicamente del color para representar estados.
- Fechas expresadas en formato comprensible.
- Lenguaje no determinista y sin culpa.
- Confirmación antes de eliminar una decisión.
- Respetar `prefers-reduced-motion`.

### Tono

Preferir:

> Probemos esta ruta de una forma pequeña para obtener evidencia real.

Evitar:

> Esta es la decisión correcta y debes comenzar ahora.

---

## 21. Estados de error

La persona debe poder recuperarse si:

- falla la generación asistida;
- el resultado original expiró;
- el almacenamiento no está disponible;
- el contrato guardado es incompatible;
- una decisión fue eliminada;
- la fecha de revisión es inválida.

En todos los casos se debe:

- conservar el contenido editable cuando sea posible;
- explicar el problema sin detalles técnicos;
- ofrecer reintentar;
- permitir crear el experimento manualmente;
- evitar duplicar decisiones por reintentos.

---

## 22. Pruebas requeridas

### Dominio

- Valida duración de 7 o 30 días.
- Rechaza experimentos sin acciones.
- Rechaza acciones sin contenido observable.
- Conserva límites explícitos.
- Acepta continuar, ajustar o detener.

### Aplicación

- Crea un borrador desde un resultado.
- Guarda una ruta alternativa elegida por la persona.
- Actualiza sin duplicar.
- Registra una revisión.
- Recupera historial después de recargar.
- Migra una versión anterior del contrato.

### Flujo en navegador

1. Completar un viaje.
2. Elegir una ruta.
3. Generar y editar un experimento.
4. Guardar un plan.
5. Recargar la página.
6. Recuperar la decisión.
7. Registrar acciones y aprendizaje.
8. Elegir continuar, ajustar o detener.
9. Iniciar un nuevo viaje usando el aprendizaje.

### Casos de cuidado

- Perfil con baja energía.
- Perfil con deuda o poco margen financiero.
- Responsabilidades de cuidado.
- Meta de baja controlabilidad.
- Proveedor de IA no disponible.
- Almacenamiento lleno o corrupto.

---

## 23. Criterios de aceptación

La versión estará lista cuando:

- El resultado permita elegir una ruta finalista.
- La persona pueda rechazar la recomendación sin bloquear el flujo.
- Toda decisión tenga una pregunta de aprendizaje.
- Todo experimento tenga duración, acciones, límites, señales y revisión.
- Exista una acción realizable durante las próximas 48 horas.
- La persona pueda editar toda propuesta generada.
- Se pueda guardar un borrador.
- La decisión sobreviva a una recarga.
- Exista historial local.
- Se pueda registrar una revisión.
- Continuar, ajustar y detener sean resultados válidos.
- Un aprendizaje pueda incorporarse a una simulación posterior.
- Los contratos se validen en tiempo de ejecución.
- Existan fallbacks sin IA.
- No se envíe contenido personal completo a telemetría.
- El flujo principal esté cubierto por una prueba de navegador.

---

## 24. Orden de implementación

### Fase 1 — Dominio y contratos

1. Definir `JourneyDecision`, `JourneyReview` y estados.
2. Implementar validación en tiempo de ejecución.
3. Crear `ExperimentPolicy`.
4. Crear repositorio mediante `StorageProvider`.

### Fase 2 — Creación de decisión

5. Agregar llamada a la acción en resultados.
6. Implementar elección de ruta.
7. Implementar pregunta de aprendizaje.
8. Generar experimento con fallback local.
9. Permitir edición y guardado de borrador.

### Fase 3 — Seguimiento

10. Implementar detalle de decisión.
11. Marcar acciones completadas.
12. Implementar revisión.
13. Registrar decisión posterior.

### Fase 4 — Memoria inicial

14. Implementar historial.
15. Incorporar aprendizajes seleccionados en un nuevo viaje.
16. Agregar migraciones de esquema.

### Fase 5 — Calidad

17. Agregar eventos de producto.
18. Probar recuperación y almacenamiento corrupto.
19. Ejecutar pruebas de navegador.
20. Validar accesibilidad y lenguaje.

---

## 25. Métricas de validación

Durante pruebas con usuarios observar:

- porcentaje que comprende la diferencia entre recomendación y decisión;
- porcentaje que crea un experimento;
- porcentaje que modifica la propuesta;
- porcentaje que inicia al menos una acción;
- porcentaje que vuelve para revisar;
- distribución entre continuar, ajustar y detener;
- utilidad percibida del plan;
- claridad de las señales;
- tiempo necesario para crear una decisión;
- abandonos por paso.

No fijar objetivos comerciales definitivos antes de realizar las primeras pruebas cualitativas.

---

## 26. Estrategia de validación

Antes de ampliar la plataforma:

1. Preparar entre cinco y diez destinos representativos.
2. Probar el flujo con personas reales.
3. Observar sin explicar cómo usarlo.
4. Verificar si pueden expresar qué eligieron y qué harán.
5. Contactarlas nuevamente después de la fecha de revisión.
6. Identificar qué parte produjo evidencia útil.
7. Ajustar el flujo antes de incorporar cuentas, nube o Life Graph.

Preguntas principales:

- ¿La persona entiende por qué una ruta fue recomendada?
- ¿El experimento se siente posible dentro de su vida real?
- ¿Las señales ayudan a decidir o agregan complejidad?
- ¿La persona vuelve para registrar lo ocurrido?
- ¿Brújula cambia una decisión concreta o solo produce reflexión?

---

## 27. Resultado esperado

Brújula dejará de terminar en una recomendación y comenzará a acompañar un proceso verificable:

> **No necesito decidir toda mi vida hoy. Puedo elegir una hipótesis, probarla con cuidado, observar qué ocurre y volver a mirar el mapa con nueva evidencia.**

La v0.15 será exitosa si una persona puede salir del Modo Viaje sabiendo:

- qué ruta eligió;
- por qué la eligió;
- qué hará primero;
- qué desea aprender;
- qué límites protegerá;
- qué señales observará;
- cuándo revisará su decisión.

