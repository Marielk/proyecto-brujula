# RFC-0017 - Arquitectura v1.0: Plataforma Evolutiva para Brújula

## Objetivo

Convertir Brújula desde una aplicación de simulación a una plataforma modular de crecimiento personal, preparada para incorporar nuevos modos, proveedores de IA, memoria, eventos y mundos interactivos sin reescribir el núcleo.

## Principios

- La UI coordina experiencias, no contiene reglas de negocio.
- Toda nueva funcionalidad debe poder desarrollarse como módulo independiente.
- Los motores de dominio no dependen de React, Next ni componentes visuales.
- Los proveedores de IA se consumen detrás de una interfaz común.
- La persistencia se accede mediante proveedores intercambiables.
- Los eventos deben registrar telemetría útil sin guardar sueños completos sin consentimiento.

## Capas

```text
UI
Application Layer
Domain Engines
Infrastructure
```

## Módulos Objetivo

- `JourneyEngine`: objetivos, rutas, escenarios, comparación y `JourneySummary`.
- `LifeEngine`: Perfil de Vida, señales, bienestar, restricciones y Life Graph.
- `GardenEngine`: estaciones, rituales, jardín, progreso y crecimiento.
- `StoryEngine`: Sue, Libro, narrativa, recuerdos e historia de vida.
- `AIEngine`: proveedores, prompts, structured outputs, validación, retry y fallback.
- `MemoryEngine`: sueños, simulaciones, conversaciones, preferencias, valores y decisiones.

## Contratos Iniciales

- `AIProvider`
- `StorageProvider`
- `EventBus`
- `FeatureFlags`
- `JourneyResult`
- `JourneyProgressEvent`

## Roadmap

1. Crear contratos de plataforma e infraestructura local.
2. Mover simulación a servicios de aplicación.
3. Extraer hooks por modo.
4. Extraer motores de dominio desde el backend Python.
5. Conectar proveedores IA intercambiables.
6. Implementar memoria y Life Graph.
7. Reducir `page.tsx` por debajo de 200 líneas.

## Criterios de Aceptación

- Cambiar Ollama por otro proveedor implica modificar un módulo.
- Agregar un nuevo modo no requiere cambios en Journey.
- Toda simulación devuelve un contrato estable.
- Perfil de Vida es independiente de React.
- Sue puede usar cualquier proveedor IA.
- El almacenamiento puede cambiar sin afectar lógica de negocio.
- Existe separación clara entre UI, dominio e infraestructura.
