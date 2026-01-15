# 🤖 AI Task Assistant Avanzado - Plan Guardado

> **Estado**: Guardado para implementación futura
> **Prioridad**: Media-Alta
> **Complejidad**: Media

---

## Resumen

Sistema de IA que **aprende de los patrones del usuario** para ofrecer:

1. **Sugerencias automáticas de fechas** - Analiza historial para sugerir vencimientos inteligentes
2. **Detección de dependencias** - Detecta relaciones entre tareas automáticamente
3. **Predicción de tiempo de completado** - Estima días basado en tareas similares
4. **Aprendizaje de patrones** - Mejora con cada interacción

---

## Arquitectura Propuesta

```
User Activity → Activity Logs → AI Pattern Analyzer → User Profile Cache → Smart Suggestions → UI
```

### Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `src/utils/userPatterns.js` | Motor de análisis de patrones |
| `src/utils/aiSuggestions.js` | Motor de sugerencias inteligentes |
| `src/utils/dependencyDetector.js` | Detección de dependencias |

### Modificaciones

| Archivo | Cambio |
|---------|--------|
| `CreateTaskModal.jsx` | Añadir UI de sugerencias de fecha |
| `TaskDetailModal.jsx` | Sección de dependencias sugeridas |
| `TaskCard.jsx` | Mostrar tiempo estimado de completado |

---

## Funciones Principales

### 1. suggestDueDate(title, boards, history)

```javascript
// Busca tareas similares y calcula promedio de días hasta vencimiento
// Returns: { date, label, reason, confidence }
```

### 2. predictCompletionTime(task, history)

```javascript
// Busca tareas similares completadas y calcula tiempo promedio
// Returns: { days, confidence, reason }
```

### 3. detectDependencies(newTask, existingTasks)

```javascript
// Detecta dependencias implícitas basadas en patrones:
// - "Crear factura X" → "Enviar factura X"
// - "Revisar" → "Aprobar"
// Returns: [{ task, relationship, confidence }]
```

---

## Migración SQL (Opcional)

```sql
-- Tabla para patrones de usuario
CREATE TABLE user_patterns (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    pattern_type TEXT,  -- 'completion_time', 'due_date', 'flow'
    pattern_key TEXT,
    pattern_data JSONB,
    sample_count INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Campo para tracking de completado
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;
```

---

## Orden de Implementación Sugerido

| Fase | Componente | Esfuerzo | Impacto |
|------|------------|----------|---------|
| 1 | Sugerencias de fecha en CreateTaskModal | Bajo | Alto |
| 2 | userPatterns.js + aiSuggestions.js | Medio | Alto |
| 3 | Predicción de tiempo en TaskCard | Bajo | Medio |
| 4 | Detección de dependencias | Alto | Medio |
| 5 | Migración SQL (si se elige Supabase) | Medio | Alto |

---

## Notas de Decisión Pendientes

1. **¿Almacenamiento en Supabase o localStorage?**
   - Supabase = sincronizado entre dispositivos
   - localStorage = más rápido, sin costos

2. **¿Usar Gemini API para predicciones avanzadas?**
   - Gemini = más inteligente pero con latencia/costos
   - Local = suficiente para patrones simples

---

*Plan creado: 2025-12-20*
*Para implementar: Ejecutar el plan de implementación completo cuando esté listo*
