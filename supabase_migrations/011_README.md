# 👥 Migración 011 — Apartado de Equipo (Chat + Documentación)

Esta migración crea todo lo necesario para el nuevo apartado **Equipo**:
un chat de departamento en tiempo real y una base de documentación visual
(manuales, videotutoriales, procedimientos y cambios del programa).

## ⚠️ Importante

El apartado **no funcionará** en la app hasta que ejecutes esta migración en
Supabase. El frontend ya está listo, pero necesita las tablas, políticas y el
bucket de almacenamiento que crea este script.

## 🛠️ Cómo aplicarla

1. Abre el **SQL Editor** de tu proyecto en Supabase.
2. Copia todo el contenido de `011_team_hub.sql`.
3. Pégalo y pulsa **RUN**.
4. Espera la confirmación (unos segundos). Es idempotente: puede ejecutarse
   varias veces sin romper nada.

## 📦 Qué crea

| Elemento | Descripción |
|----------|-------------|
| `team_messages` | Mensajes del chat de departamento (por workspace). |
| `team_documents` | Documentos y enlaces de la base de conocimiento. |
| `team_doc_editors` | Miembros con permiso de "editor" de documentación. |
| Bucket `team-docs` | Almacenamiento público de archivos subidos. |
| Funciones + RLS | Permisos: todos ven/usan; solo owner/admin/editores gestionan. |
| Realtime | Chat y documentos se actualizan en vivo. |

## 🔐 Permisos

- **Todos los miembros** del workspace pueden ver la documentación, abrir los
  documentos y escribir en el chat.
- **Owner y administradores** pueden subir, editar y borrar documentos, y
  además **conceder permiso de "editor"** a miembros concretos desde el botón
  *Permisos* de la pestaña Documentación.
- Un **editor** puede subir y borrar documentos, pero no gestionar permisos.

## 📁 Categorías de documentación

Se definen en el frontend (`src/features/team/constants.js`):

- **Cambios en el programa**
- **Videotutoriales**
- **Manuales del programa**
- **Procedimientos internos**

## 🎥 Sobre los vídeos

Los archivos subidos directamente tienen un límite de **50 MB**. Para
videotutoriales pesados, usa la opción **"Enlace / vídeo"** al añadir un
documento: acepta YouTube, Vimeo y Loom (se reproducen incrustados) o
cualquier otro enlace (Drive, etc.).

## 🔄 Rollback (solo emergencia)

```sql
DROP TABLE IF EXISTS team_messages CASCADE;
DROP TABLE IF EXISTS team_documents CASCADE;
DROP TABLE IF EXISTS team_doc_editors CASCADE;
DROP FUNCTION IF EXISTS can_manage_team_docs(uuid, uuid);
DROP FUNCTION IF EXISTS is_workspace_member(uuid, uuid);
DROP FUNCTION IF EXISTS is_workspace_admin(uuid, uuid);
-- El bucket 'team-docs' y sus políticas se pueden borrar desde
-- Storage en el panel de Supabase si se desea.
```
