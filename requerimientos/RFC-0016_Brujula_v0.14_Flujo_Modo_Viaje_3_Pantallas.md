# RFC-0016 — Separación del flujo de simulación del Modo Viaje

**Proyecto:** Brújula  
**Versión objetivo:** v0.14  
**Estado:** Propuesto  
**Prioridad:** Alta  
**Fecha:** Julio 2026

---

## 1. Objetivo

Separar completamente el flujo del Modo Viaje en tres etapas claramente diferenciadas para mejorar la experiencia de usuario, aumentar la sensación de estar utilizando un simulador inteligente y preparar la arquitectura para futuras simulaciones más complejas.

Actualmente la simulación ocurre dentro de una sola pantalla: el usuario escribe el escenario, espera y el resultado aparece debajo. Esto produce varios problemas:

- La aplicación parece estática.
- El usuario no percibe que realmente esté ocurriendo una simulación.
- La pantalla mezcla entrada y resultados.
- La espera parece concentrarse en la escritura de la Carta de Sue.
- Es difícil limpiar el estado y comenzar una nueva simulación.
- La página crece excesivamente y pierde jerarquía.

---

## 2. Nueva arquitectura del flujo

```text
Pantalla 1 — Definir destino
            ↓
Pantalla 2 — Explorar futuros
            ↓
Pantalla 3 — Resultado del viaje
```

Cada pantalla tendrá un único propósito y un estado claramente separado.

---

## 3. Pantalla 1 — Definir el destino

### Contenido obligatorio

- Título: **Planificar un Viaje**
- Subtítulo: **Explora el camino hacia tu sueño utilizando tu Perfil de Vida como brújula.**
- Campo multilínea: **¿Cuál es tu destino?**
- Botón principal: **Trazar ruta**
- Acceso secundario: **Revisar Perfil de Vida**

### Restricciones

- No mostrar resultados anteriores.
- No mostrar métricas ni Carta de Sue.
- Evitar scroll en escritorio.
- El foco inicial debe estar en el campo de destino.
- El selector de IA solo será visible en modo técnico.

### Acción “Trazar ruta”

1. Validar el destino.
2. Guardar el texto.
3. Limpiar errores y resultados anteriores.
4. Crear un `simulationId`.
5. Iniciar la simulación.
6. Navegar a la pantalla de exploración.

No se deben renderizar resultados parciales debajo del formulario.

---

## 4. Pantalla 2 — Exploración de futuros

### Objetivo

Representar de forma clara y honesta el proceso de simulación.

### Título principal

**Brújula está explorando muchos futuros posibles.**

### Texto de apoyo

**Estamos recorriendo distintas rutas para encontrar aquella que mejor equilibra bienestar, propósito y posibilidades reales.**

### Etapas

1. `understanding_goal` — Comprendiendo tu destino.
2. `selecting_context` — Relacionándolo con tu Perfil de Vida.
3. `generating_strategies` — Creando estrategias diferentes.
4. `expanding_paths` — Simulando variantes de cada camino.
5. `pruning_paths` — Descartando rutas frágiles o repetidas.
6. `comparing_paths` — Comparando los mejores senderos.
7. `building_result` — Preparando una explicación clara.
8. `writing_letter` — Sue está dejando por escrito lo más importante.
9. `completed` — La ruta está lista.

### Distribución visual recomendada

| Fase | Progreso aproximado |
|---|---:|
| Comprensión del objetivo | 0–10 % |
| Selección de contexto | 10–20 % |
| Generación de estrategias | 20–35 % |
| Simulación de variantes | 35–70 % |
| Poda y comparación | 70–90 % |
| Preparación del resultado | 90–97 % |
| Carta de Sue | 97–100 % |

La mayor parte de la espera debe percibirse durante la simulación, poda y comparación. La Carta de Sue debe ser el tramo final y más breve.

---

## 5. Eventos del backend

Ejemplo:

```json
{
  "simulationId": "sim_123",
  "stage": "expanding_paths",
  "progress": 58,
  "message": "Explorando distintas combinaciones de ritmo, apoyo y recursos.",
  "metadata": {
    "baseStrategies": 5,
    "variantsGenerated": 46,
    "targetVariants": 90
  }
}
```

### Requisitos

- No usar demoras artificiales.
- No avanzar a una etapa que todavía no comenzó.
- El progreso nunca debe retroceder.
- Si no existe porcentaje exacto, mostrar progreso indeterminado dentro de la etapa.
- Los mensajes deben describir la tarea real del motor.

---

## 6. Presentación visual de la espera

Elementos sugeridos:

- Ilustración de Sue leyendo un mapa.
- Sendero que se va iluminando.
- Hojas, pétalos o pequeñas luces.
- Lista de etapas completadas.
- Etapa actual destacada.
- Contador real de variantes cuando esté disponible.

Durante la simulación:

> Explorando distintas combinaciones de tiempo, apoyo y recursos.

Durante la carta:

> Sue está resumiendo lo más importante del recorrido.

No mantener el mensaje de la carta durante la mayor parte de la espera.

---

## 7. Cancelación y errores

### Botón “Cancelar simulación”

Debe:

1. Solicitar cancelación al backend cuando sea posible.
2. Ignorar respuestas tardías del proceso cancelado.
3. Limpiar progreso y resultados parciales.
4. Volver a la pantalla 1.
5. Conservar el texto del destino.

### Estado de error

Título sugerido:

**Parece que la niebla cubrió el sendero.**

Texto:

**No pudimos completar esta simulación, pero tu destino sigue guardado.**

Acciones:

- Reintentar.
- Editar destino.
- Volver al inicio.

No mostrar errores técnicos salvo en modo debug.

---

## 8. Pantalla 3 — Resultado del viaje

El formulario inicial ya no debe aparecer.

### Cabecera

- Destino simulado.
- Dominio o dominios detectados.
- Tipo de escenario.
- Ruta recomendada.
- Nivel de preparación.
- Fecha de simulación.
- Estrategias base.
- Variantes evaluadas.
- Rutas descartadas.
- Familias de caminos.
- Rutas finalistas.

Preferir:

> **Exploré 90 variantes de varios caminos posibles.**

No afirmar que son 90 futuros completamente distintos cuando son combinaciones derivadas de estrategias base.

---

## 9. Estructura del resultado

### Lectura esencial

1. Ruta recomendada.
2. Por qué fue elegida.
3. Qué podría cambiar la recomendación.
4. Primer paso.
5. Historia resumida.

### Profundizar

6. Alternativas.
7. Métricas.
8. Fortalezas y cuidados.
9. Condiciones de éxito.
10. Qué evitar.
11. Carta de Sue.
12. Datos técnicos.

Las secciones secundarias deben poder plegarse.

---

## 10. Acciones del resultado

### “Trazar un nuevo viaje”

1. Limpiar resultado, progreso y errores.
2. Conservar Perfil de Vida y preferencias.
3. Vaciar el campo de destino.
4. Volver a la pantalla 1.
5. Colocar el foco en el campo.

### “Editar este destino”

1. Volver a la pantalla 1.
2. Conservar el texto original.
3. Permitir modificarlo.
4. Crear un nuevo `simulationId` al ejecutar.
5. No reutilizar el resultado anterior como vigente.

Fuera de alcance:

- Guardar en el Libro.
- Comparar rutas.
- Compartir simulación.
- Historial permanente.

---

## 11. Estados del frontend

```ts
type JourneyStage =
  | "understanding_goal"
  | "selecting_context"
  | "generating_strategies"
  | "expanding_paths"
  | "pruning_paths"
  | "comparing_paths"
  | "building_result"
  | "writing_letter"
  | "completed";

type JourneyFlowState =
  | { status: "input"; goal: string }
  | {
      status: "loading";
      goal: string;
      simulationId: string;
      stage: JourneyStage;
      progress: number;
      message: string;
    }
  | {
      status: "result";
      goal: string;
      simulationId: string;
      result: JourneyResult;
    }
  | {
      status: "error";
      goal: string;
      simulationId?: string;
      message: string;
      recoverable: boolean;
    };
```

No mezclar formulario, carga y resultado en el mismo estado visual.

---

## 12. Rutas de navegación

```text
/viaje
/viaje/explorando
/viaje/resultado/[simulationId]
```

Beneficios:

- Navegación predecible.
- Recarga segura.
- Futuro historial y enlaces compartibles.
- Menor complejidad de estado.
- Mejor uso del botón atrás.

---

## 13. Persistencia

La pantalla de resultados debe poder recargarse sin ejecutar nuevamente la simulación.

Para el prototipo se permite:

- almacenamiento temporal del servidor;
- caché;
- base de datos;
- almacenamiento local.

Si el resultado expiró:

- informar claramente;
- conservar el destino cuando sea posible;
- ofrecer volver a simular.

---

## 14. Concurrencia

- Cada simulación debe tener un `simulationId`.
- Una simulación cancelada no puede sobrescribir una posterior.
- El frontend debe ignorar eventos de otro identificador.
- Deshabilitar “Trazar ruta” después de iniciar.
- No permitir dos simulaciones simultáneas en la misma sesión durante este MVP.

---

## 15. Accesibilidad

- Usar `aria-live` para anunciar cambios de etapa.
- No anunciar cada porcentaje.
- Permitir reducir animaciones.
- Mantener contraste AA.
- Navegación por teclado.
- Al abrir resultados, enfocar el título de la ruta.
- Al regresar, enfocar el campo de destino.
- Mantener “Cancelar” accesible durante la espera.

---

## 16. Analítica

Registrar:

- inicio;
- cancelación;
- error;
- finalización;
- duración total;
- duración por etapa;
- clic en “Editar este destino”;
- clic en “Trazar un nuevo viaje”;
- profundidad de lectura;
- secciones desplegadas.

No enviar el texto completo del destino a herramientas externas sin consentimiento.

---

## 17. Criterios de aceptación

La versión estará lista cuando:

- El formulario, la espera y el resultado sean pantallas independientes.
- El formulario no permanezca visible junto al resultado.
- La mayor parte de la espera corresponda a simulación y comparación.
- La Carta de Sue aparezca únicamente al final.
- El progreso refleje etapas reales.
- Exista cancelación.
- “Editar este destino” conserve el texto.
- “Trazar un nuevo viaje” limpie el resultado y el texto.
- El Perfil de Vida se conserve.
- Cada simulación tenga un `simulationId`.
- Respuestas tardías no sobrescriban simulaciones nuevas.
- El resultado sobreviva a una recarga.
- Los errores permitan reintentar sin rehacer el Perfil de Vida.
- La navegación se sienta como un recorrido y no como una página que crece.

---

## 18. Orden de implementación

### Fase 1 — Estado y navegación

1. Crear `JourneyFlowState`.
2. Separar rutas.
3. Crear `simulationId`.
4. Eliminar el flujo de página única.

### Fase 2 — Exploración

5. Definir eventos del backend.
6. Implementar progreso por etapas.
7. Incorporar cancelación.
8. Implementar error y reintento.

### Fase 3 — Persistencia

9. Guardar temporalmente el resultado.
10. Recuperarlo por `simulationId`.
11. Implementar recarga segura.
12. Ignorar respuestas tardías.

### Fase 4 — Acciones

13. Implementar “Editar este destino”.
14. Implementar “Trazar un nuevo viaje”.
15. Limpiar el estado.
16. Agregar foco y accesibilidad.

### Fase 5 — Calidad

17. Medir tiempos por etapa.
18. Probar Ollama, OpenAI y fallback.
19. Probar cancelación y reintento.
20. Ejecutar pruebas responsive y de accesibilidad.

---

## 19. Resultado esperado

El Modo Viaje debe sentirse como una experiencia con tres momentos claros:

1. **Declaro hacia dónde quiero ir.**
2. **Brújula recorre y compara caminos.**
3. **Recibo una ruta que puedo comprender y volver a explorar.**

La persona no debe sentir que llenó un formulario y recibió una página larga. Debe sentir que inició un viaje, esperó mientras se exploraban posibilidades y recibió una respuesta independiente, clara y reutilizable.
