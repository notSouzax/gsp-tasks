# Instalación Simplificada de Supabase CLI (Windows)

## Método 1: Descarga Directa (MÁS FÁCIL) ⭐

1. **Descargar Supabase CLI:**
   - Ve a: <https://github.com/supabase/cli/releases/latest>
   - Busca el archivo: `supabase_windows_amd64.zip`
   - Descárgalo

2. **Extraer:**
   - Descomprime el ZIP a una carpeta, por ejemplo: `C:\supabase`
   - Deberías tener: `C:\supabase\supabase.exe`

3. **Añadir al PATH:**

   **Opción A - PowerShell (temporal, esta sesión):**

   ```powershell
   $env:Path += ";C:\supabase"
   ```

   **Opción B - GUI (permanente):**
   - Presiona `Win + R`
   - Escribe: `sysdm.cpl` y Enter
   - Tab "Opciones avanzadas"
   - Click "Variables de entorno"
   - En "Variables de usuario", selecciona "Path"
   - Click "Editar"
   - Click "Nuevo"
   - Añade: `C:\supabase`
   - Click "Aceptar" en todo
   - **Cierra y reabre PowerShell**

4. **Verificar:**

   ```powershell
   supabase --version
   ```

---

## Método 2: Usar npx (SI NO FUNCIONA EL MÉTODO 1)

Supabase también se puede usar via npx sin instalar:

```powershell
npx supabase login
npx supabase link --project-ref yycsfmkzwcohjlyddmdb
npx supabase secrets set RESEND_API_KEY=re_xxxxx
npx supabase functions deploy send-automation-email
```

**Desventaja:** Es más lento cada vez que ejecutas un comando.

---

## Próximos Pasos (después de instalar)

1. **Login:**

   ```powershell
   supabase login
   ```

2. **Link proyecto:**

   ```powershell
   cd c:\Users\notso\.gemini\antigravity\scratch\kanban-app
   supabase link --project-ref yycsfmkzwcohjlyddmdb
   ```

   - Necesitarás la contraseña de tu base de datos
   - La encuentras en: Supabase Dashboard > Project Settings > Database > Password

3. **Configurar secret:**

   ```powershell
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxx
   ```

   (Obtén la API key de resend.com primero)

4. **Deploy:**

   ```powershell
   supabase functions deploy send-automation-email
   ```

---

## ⚠️ Si Encuentras Problemas

### "supabase no se reconoce..."

- Verificar que añadiste la carpeta al PATH
- Cierra y reabre PowerShell
- Prueba con el path completo: `C:\supabase\supabase.exe --version`

### Alternativa: Sin Supabase CLI

Si realmente no puedes instalar el CLI:

1. Ve a tu Dashboard de Supabase
2. Functions > Deploy New Function
3. Sube manualmente el archivo `index.ts`
4. Configura los secrets desde el dashboard

---

## 📋 Checklist

- [ ] Descargar `supabase_windows_amd64.zip`
- [ ] Extraer a `C:\supabase`
- [ ] Añadir al PATH
- [ ] Verificar con `supabase --version`
- [ ] Login con `supabase login`
- [ ] Link proyecto
- [ ] Configurar secrets
- [ ] Deploy function
