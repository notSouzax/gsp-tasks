# 📘 Guía de Configuración: Backend Automation Triggers

## Resumen

Esta guía te mostrará cómo desplegar los triggers de automatización en Supabase para que las automatizaciones se ejecuten automáticamente cuando ocurran eventos CRM/Calendar.

---

## ⚠️ Prerrequisitos

- Proyecto Supabase creado
- Supabase CLI instalado (`npm install -g supabase`)
- CLI autenticado (`supabase login`)
- Project ID de tu proyecto

---

## Paso 1: Deploy Edge Function

### Opción A: Via Supabase CLI (Recomendado)

```bash
# Navegar al directorio del proyecto
cd C:\Users\notso\.gemini\antigravity\scratch\kanban-app

# Desplegar la función
supabase functions deploy execute-automation

# Verificar que se desplegó
supabase functions list
```

### Opción B: Via Supabase Dashboard

1. Ir a **Edge Functions** en el menú lateral
2. Click en **"Create a new function"**
3. Nombre: `execute-automation`
4. Copiar todo el contenido de `supabase/functions/execute-automation/index.ts`
5. Pegar y guardar

---

## Paso 2: Configurar Variables de Ambiente

Las siguientes configuraciones son necesarias para que los database triggers puedan llamar a la Edge Function.

### 2.1 Obtener tus credenciales

1. **Ir a** Settings → API en Supabase Dashboard
2. **Copiar**:
   - Project URL (ej: `https://xxx.supabase.co`)
   - `service_role` key (secret, no la publiques)

### 2.2 Configurar en la base de datos

Ir a **SQL Editor** en Supabase Dashboard y ejecutar:

```sql
-- Reemplaza con tus valores reales
ALTER DATABASE postgres 
SET app.supabase_url = 'https://TU-PROJECT-ID.supabase.co';

ALTER DATABASE postgres 
SET app.service_key = 'TU-SERVICE-ROLE-KEY-AQUI';
```

> **Importante**: Reemplaza `TU-PROJECT-ID` y `TU-SERVICE-ROLE-KEY-AQUI` con tus valores reales.

### 2.3 Verificar configuración

```sql
-- Debería mostrar tu URL
SELECT current_setting('app.supabase_url', true);

-- Debería mostrar tu service key (primeros caracteres)
SELECT substring(current_setting('app.service_key', true), 1, 20) || '...';
```

---

## Paso 3: Aplicar Migración SQL

### Opción A: Via SQL Editor (Recomendado para testing)

1. Ir a **SQL Editor** en Supabase Dashboard
2. Abrir el archivo `supabase_migrations/010_automation_triggers.sql`
3. Copiar TODO el contenido
4. Pegar en SQL Editor
5. Click en **"Run"**

### Opción B: Via Supabase CLI

```bash
# Aplicar migración
supabase db push --db-url "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# O si tienes linked project
supabase db push
```

---

## Paso 4: Habilitar pg_net Extension

Si recibes un error sobre `pg_net`, necesitas habilitarlo:

1. Ir a **Database** → **Extensions** en Supabase Dashboard
2. Buscar `pg_net`
3. Click en **Enable**

O via SQL:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

## Paso 5: Verificar que Funciona

### 5.1 Crear automatización de prueba

En tu aplicación, crear una automatización:

- **Trigger**: "Oportunidad creada"
- **Condición**: (ninguna, deja vacío)
- **Acción**: "Enviar email" o "Webhook" a alguna URL de prueba

### 5.2 Disparar el evento

Ir al CRM y crear una nueva oportunidad.

### 5.3 Verificar logs

#### En Edge Function

1. Ir a **Edge Functions** → **execute-automation**
2. Click en **Logs**
3. Deberías ver: `🔔 Automation trigger: opportunity.created`

#### En Database

```sql
-- Ver últimos logs de automatizaciones
SELECT * FROM automation_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Error: "Supabase URL or service key not configured"

**Causa**: Las variables `app.supabase_url` o `app.service_key` no están configuradas.

**Solución**: Repetir Paso 2.2

### Error: "extension pg_net does not exist"

**Causa**: La extensión pg_net no está habilitada.

**Solución**: Repetir Paso 4

### Los triggers no se ejecutan

**Verificar**:

1. ¿La automatización está **activa** (is_enabled = true)?

   ```sql
   SELECT id, name, is_enabled, trigger_type 
   FROM automations 
   WHERE user_id = 'tu-user-id';
   ```

2. ¿El trigger está creado en la DB?

   ```sql
   SELECT tgname, tgenabled 
   FROM pg_trigger 
   WHERE tgname LIKE 'on_%';
   ```

3. ¿Hay requests en pg_net?

   ```sql
   SELECT * FROM net._http_response 
   ORDER BY created DESC 
   LIMIT 10;
   ```

---

## Triggers Creados

| Trigger | Tabla | Evento | Automation Type |
|---------|-------|--------|-----------------|
| `on_opportunity_created` | crm_opportunities | INSERT | `opportunity.created` |
| `on_opportunity_updated` | crm_opportunities | UPDATE | `opportunity.updated` |
| `on_opportunity_won` | crm_opportunities | UPDATE | `opportunity.won` |
| `on_opportunity_lost` | crm_opportunities | UPDATE | `opportunity.lost` |
| `on_opportunity_moved` | crm_opportunities | UPDATE stage_id | `opportunity.moved_to` |
| `on_contact_created` | crm_contacts | INSERT | `contact.created` |
| `on_contact_updated` | crm_contacts | UPDATE | `contact.updated` |
| `on_activity_created` | crm_activities | INSERT | `crm_activity.created` |
| `on_activity_completed` | crm_activities | UPDATE is_done | `crm_activity.completed` |
| `on_event_created` | calendar_events | INSERT | `event.created` |
| `on_event_updated` | calendar_events | UPDATE | `event.updated` |

---

## Notas de Seguridad

- **NUNCA** compartas tu `service_role` key públicamente
- Los triggers usan `SECURITY DEFINER` para acceso elevado
- Por defecto, RLS protege las tablas para que solo el dueño vea sus datos
- La Edge Function valida que `user_id` coincida antes de ejecutar

---

## Rollback (Deshacer)

Si necesitas desactivar todos los triggers:

```sql
-- Desactivar todos los triggers
DROP TRIGGER IF EXISTS on_opportunity_created ON crm_opportunities;
DROP TRIGGER IF EXISTS on_opportunity_updated ON crm_opportunities;
DROP TRIGGER IF EXISTS on_opportunity_won ON crm_opportunities;
DROP TRIGGER IF EXISTS on_opportunity_lost ON crm_opportunities;
DROP TRIGGER IF EXISTS on_opportunity_moved ON crm_opportunities;
DROP TRIGGER IF EXISTS on_contact_created ON crm_contacts;
DROP TRIGGER IF EXISTS on_contact_updated ON crm_contacts;
DROP TRIGGER IF EXISTS on_activity_created ON crm_activities;
DROP TRIGGER IF EXISTS on_activity_completed ON crm_activities;
DROP TRIGGER IF EXISTS on_event_created ON calendar_events;
DROP TRIGGER IF EXISTS on_event_updated ON calendar_events;

-- Eliminar función
DROP FUNCTION IF EXISTS notify_automation_trigger();
```
