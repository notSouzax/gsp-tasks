# Instalación Supabase CLI - Git CMD

## Paso 1: Descargar e Instalar

**Descarga directa:**

1. Abre: <https://github.com/supabase/cli/releases/latest>
2. Descarga: `supabase_windows_amd64.zip`
3. Extrae a una carpeta sin espacios, ej: `C:\tools\supabase`

**Añadir al PATH (permanente):**

```cmd
setx PATH "%PATH%;C:\tools\supabase"
```

**Cierra y reabre Git CMD**, luego verifica:

```bash
supabase --version
```

---

## Paso 2: Configurar Proyecto

**Login en Supabase:**

```bash
supabase login
```

Se abrirá el navegador para autorizar.

**Link al proyecto:**

```bash
cd /c/Users/notso/.gemini/antigravity/scratch/kanban-app
supabase link --project-ref yycsfmkzwcohjlyddmdb
```

Necesitarás:

- **Database password**: Encuéntrala en Supabase > Project Settings > Database

---

## Paso 3: Obtener API Key de Resend

1. Regístrate en [resend.com](https://resend.com) (gratis)
2. Dashboard > API Keys > Create API Key
3. Copia el key que empieza con `re_...`

---

## Paso 4: Configurar y Deployar

**Configurar secret:**

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

(Reemplaza con tu API key real)

**Verificar:**

```bash
supabase secrets list
```

**Deploy la función:**

```bash
supabase functions deploy send-automation-email
```

**Verificar deploy:**

```bash
supabase functions list
```

---

## Paso 5: Probar

1. Recarga la app: <http://localhost:5174/>
2. Click en ⚡ Automatizaciones
3. Crear automatización:
   - CUANDO: Tarea creada
   - ENTONCES: Enviar email
     - Para: <tu@email.com>
     - Asunto: Test
     - Mensaje: Funciona!

4. Crea una tarea → Revisa tu email ✉️

---

## 🐛 Troubleshooting

**"supabase: command not found"**

```bash
# Verifica la instalación
ls /c/tools/supabase/

# Usa ruta completa temporalmente
/c/tools/supabase/supabase.exe --version

# Verifica PATH
echo $PATH
```

**Ver logs de la función:**

```bash
supabase functions logs send-automation-email --tail
```

---

## Alternativa: npx (sin instalar)

Si no puedes instalar, usa npx:

```bash
npx supabase login
npx supabase link --project-ref yycsfmkzwcohjlyddmdb
npx supabase secrets set RESEND_API_KEY=re_xxxxx
npx supabase functions deploy send-automation-email
```
