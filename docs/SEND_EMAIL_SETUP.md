# 📧 Guía Paso a Paso: Configurar send_email

## Paso 1: Crear Cuenta en Resend (5 min)

1. Ve a [resend.com](https://resend.com)
2. Click en "Sign Up" (es gratis con 100 emails/día)
3. Verifica tu email
4. Inicia sesión en el dashboard

---

## Paso 2: Obtener API Key (2 min)

1. En el dashboard de Resend, ve a **API Keys** (menú izquierdo)
2. Click en **"Create API Key"**
3. Dale un nombre: `kanban-automations`
4. Copia la API key que empieza con `re_...`
   - ⚠️ **IMPORTANTE**: Guárdala en un lugar seguro, solo se muestra una vez

---

## Paso 3: Instalar Supabase CLI (3 min)

### Windows (PowerShell como admin)

**Opción A - Con Scoop (recomendado):**

```powershell
# Instalar scoop si no lo tienes
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Opción B - Download directo:**

1. Ve a <https://github.com/supabase/cli/releases>
2. Descarga `supabase_windows_amd64.zip`
3. Extrae y añade al PATH

**Verificar instalación:**

```powershell
supabase --version
```

---

## Paso 4: Configurar Supabase CLI (3 min)

1. **Login en Supabase:**

   ```powershell
   supabase login
   ```

   - Se abrirá el navegador
   - Autoriza el acceso
   - Vuelve a la terminal

2. **Link a tu proyecto:**

   ```powershell
   cd c:\Users\notso\.gemini\antigravity\scratch\kanban-app
   supabase link --project-ref yycsfmkzwcohjlyddmdb
   ```

   - Te pedirá la contraseña de la base de datos
   - Encuéntrala en Supabase > Project Settings > Database

---

## Paso 5: Configurar Variables de Entorno (1 min)

```powershell
# Reemplaza re_xxxxx con tu API key real de Resend
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

**Verificar:**

```powershell
supabase secrets list
```

Deberías ver:

```
RESEND_API_KEY (set)
```

---

## Paso 6: Deploy Edge Function (2 min)

```powershell
supabase functions deploy send-automation-email
```

**Salida esperada:**

```
Deploying send-automation-email (project ref: yycsfmkzwcohjlyddmdb)
✓ Deployed send-automation-email
```

**Verificar:**

```powershell
supabase functions list
```

---

## Paso 7: Verificar Dominio en Resend (OPCIONAL pero recomendado)

Para evitar que los emails caigan en spam:

1. En Resend dashboard > **Domains**
2. Click **"Add Domain"**
3. Ingresa tu dominio (ej: `tudominio.com`)
4. Sigue las instrucciones para añadir registros DNS
5. Espera verificación (puede tardar 24h)

**Mientras tanto**, puedes usar el dominio por defecto de Resend, pero los emails se enviarán desde `onboarding@resend.dev`

---

## Paso 8: Actualizar configuración del remitente (2 min)

Edita el archivo Edge Function para usar tu dominio:

**Archivo:** `supabase/functions/send-automation-email/index.ts`

**Línea 53**, cambia:

```typescript
from: from || 'Kanban App <noreply@yourdomain.com>',
```

Por tu dominio verificado:

```typescript
from: from || 'Kanban App <notificaciones@tudominio.com>',
```

**Re-deploy:**

```powershell
supabase functions deploy send-automation-email
```

---

## Paso 9: Probar con una Automatización (5 min)

### En la app (<http://localhost:5174/>)

1. **Recarga la página** (F5) para cargar el nuevo código
2. Click en **⚡ Automatizaciones**
3. Click **"Nueva Automatización"**

**Configuración:**

- **Nombre**: Test Email
- **Icono**: 📧

**CUANDO:**

- Trigger: "Tarea creada"

**ENTONCES:**

- Click "Añadir Acción"
- Selecciona **"Enviar email"** (categoría Notifications)
- **Destinatario**: tu email real
- **Asunto**: `Nueva tarea: {{task.title}}`
- **Mensaje**: `Se creó la tarea "{{task.title}}" en la columna {{column.title}}`
- **Formato**: text

4. Click **"Crear Automatización"**
5. Crea una nueva tarea en cualquier columna
6. **¡Revisa tu email!** (incluso spam/promociones)

---

## ✅ Checklist Final

- [ ] Cuenta Resend creada
- [ ] API key obtenida
- [ ] Supabase CLI instalado
- [ ] CLI logueado
- [ ] Proyecto linkeado
- [ ] Secret RESEND_API_KEY configurado
- [ ] Edge Function deployada
- [ ] Automatización de prueba creada
- [ ] Email recibido ✉️

---

## 🐛 Solución de Problemas

### "Error: Unauthorized"

**Causa:** Edge Function no tiene el secret
**Solución:**

```powershell
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase functions deploy send-automation-email
```

### "Error: Missing authorization header"

**Causa:** Usuario no autenticado
**Solución:** Recarga la app (F5) y asegúrate de estar logueado

### "Resend API error: ..."

**Causa:** API key inválida o email no permitido
**Solución:**

- Verifica el API key en Resend dashboard
- Si no has verificado dominio, asegúrate que el destinatario no sea tu propio email de trabajo

### Email no llega

1. Revisa **spam/promociones**
2. Revisa logs:

   ```powershell
   supabase functions logs send-automation-email --tail
   ```

3. Verifica dominio en Resend (puede tomar 24h)

### "Command not found: supabase"

**Windows:**

- Cierra y reabre PowerShell
- Verifica PATH: `$env:Path`
- Re-instala con scoop

---

## 🎯 Ejemplos de Uso

### Email al completar tarea

```
CUANDO: Tarea movida a columna = "Completado"
ENTONCES: Enviar email
  Para: manager@empresa.com
  Asunto: ✅ Tarea completada
  Mensaje: {{task.title}} fue marcada como completada
```

### Email diario de resumen (requiere Fase 4)

```
CUANDO: Schedule.daily (9:00 AM)
ENTONCES: Enviar email
  Para: equipo@empresa.com
  Asunto: 📊 Resumen diario
  Mensaje: HTML con estadísticas
```

### Email urgente

```
CUANDO: Tarea movida a columna = "Urgente"
SI: Prioridad = "alta"
ENTONCES: Enviar email
  Para: jefe@empresa.com
  Asunto: 🚨 URGENTE: {{task.title}}
  Mensaje: Requiere atención inmediata
```

---

## 💰 Límites de Resend

**Plan Gratuito:**

- 100 emails/día
- 3,000 emails/mes
- Sin verificación de dominio

**Si necesitas más:**

- Plan Pro: $20/mes → 50,000 emails/mes
- [Ver precios](https://resend.com/pricing)

---

## 📚 Recursos

- [Resend Dashboard](https://resend.com/emails)
- [Supabase Functions Docs](https://supabase.com/docs/guides/functions)
- [Edge Function Code](file:///c:/Users/notso/.gemini/antigravity/scratch/kanban-app/supabase/functions/send-automation-email/index.ts)
