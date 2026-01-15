# Supabase Edge Functions - Kanban Automations

## 📧 send-automation-email

Función para enviar emails desde automatizaciones usando Resend API.

### Configuración

1. **Obtener API Key de Resend**:
   - Regístrate en [resend.com](https://resend.com)
   - Crea un API key en el dashboard
   - Verifica tu dominio para mejores deliverability rates

2. **Configurar Secret en Supabase**:

   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxx
   ```

3. **Deploy la función**:

   ```bash
   supabase functions deploy send-automation-email
   ```

### Uso desde ActionRegistry

```javascript
const { data, error } = await supabase.functions.invoke('send-automation-email', {
    body: {
        to: 'user@example.com',  // o array: ['user1@example.com', 'user2@example.com']
        subject: 'Tarea completada',
        text: 'La tarea fue completada exitosamente',
        // O usar html en vez de text:
        // html: '<h1>Tarea completada</h1><p>Detalles...</p>'
    }
});
```

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `to` | string \| string[] | ✅ | Email(s) destinatarios |
| `subject` | string | ✅ | Asunto del email |
| `text` | string | * | Contenido en texto plano |
| `html` | string | * | Contenido HTML |
| `from` | string | ❌ | Remitente (default: configurado en función) |

\* Requerido al menos uno: `text` o `html`

### Respuesta

**Éxito (200)**:

```json
{
  "success": true,
  "emailId": "abc123",
  "message": "Email sent successfully"
}
```

**Error (400)**:

```json
{
  "success": false,
  "error": "Missing required fields: to, subject, and html or text"
}
```

### Seguridad

- ✅ Requiere autenticación de Supabase (JWT token)
- ✅ Solo usuarios autenticados pueden enviar emails
- ✅ CORS configurado para `*` (puedes restringirlo a tu dominio)

### Logs

Para ver logs de ejecución:

```bash
supabase functions logs send-automation-email
```

### Testing Local

```bash
supabase functions serve send-automation-email
```

Luego hacer request:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-automation-email' \
  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "test@example.com",
    "subject": "Test",
    "text": "Hello World"
  }'
```

---

## 🔄 Próximas Edge Functions (Fase 4+)

### send-scheduled-notification

Para triggers programados (`schedule.daily`, `schedule.weekly`)

- Ejecutar via Supabase Cron
- Verificar tareas vencidas
- Enviar notificaciones batch

### process-long-action

Para acciones que toman mucho tiempo

- Procesamiento async
- Webhooks con timeout alto
- Operaciones batch

---

## 📚 Recursos

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Resend API Docs](https://resend.com/docs/introduction)
- [Deno Deploy](https://deno.com/deploy)
