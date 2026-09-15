# 🔐 Permisos de la aplicación

Este documento resume qué puede hacer cada tipo de usuario. Hay **dos sistemas
de roles independientes**:

1. **Roles de Workspace** — para tableros, tareas, CRM, calendario, etc.
2. **Roles de Equipo** — para el apartado **Equipo** (Chat, Documentación, Cambios).

> Un usuario puede ser, por ejemplo, *owner* de su workspace y a la vez *member*
> de un equipo al que se unió con una clave. Son cosas separadas.

---

## 1. Roles de Workspace

Se asignan en `workspace_members.role`. Cada usuario nuevo obtiene su propio
workspace del que es **owner**. Para unirse a otro workspace se usa un código de
invitación (esto **no ha cambiado**).

| Acción | Owner | Admin | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| Ver tableros y tareas | ✅ | ✅ | ✅ | ✅ |
| Crear / editar tableros | ✅ | ✅ | ✅ | ❌ |
| Crear / mover / editar tareas | ✅ | ✅ | ✅ (las suyas) | ❌ |
| Invitar miembros al workspace | ✅ | ✅ | ❌ | ❌ |
| Expulsar miembros | ✅ | ✅ | ❌ | ❌ |
| Cambiar roles de miembros | ✅ | ❌ | ❌ | ❌ |
| Gestionar el workspace | ✅ | ❌ | ❌ | ❌ |
| **Crear un Equipo nuevo** | ✅ | ✅ | ❌ | ❌ |

> Solo **owner/admin** de un workspace ven el botón para **crear un Equipo**.
> Cualquiera puede **unirse** a un equipo con una clave o invitación.

---

## 2. Roles de Equipo (apartado "Equipo")

El apartado Equipo funciona como **canales privados**: no ves nada hasta unirte
a un equipo con una **clave de acceso** o una **invitación**. Un usuario puede
pertenecer a varios equipos.

Se asignan en `team_members.role`. El **creador** del equipo queda como `admin`.

| Acción | Admin | Editor | Member |
|---|:---:|:---:|:---:|
| Ver el contenido del equipo | ✅ | ✅ | ✅ |
| Chat: escribir mensajes | ✅ | ✅ | ✅ |
| Chat: borrar mensajes propios | ✅ | ✅ | ✅ |
| Chat: borrar cualquier mensaje | ✅ | ❌ | ❌ |
| Documentación: subir / editar / borrar | ✅ | ✅ | ❌ |
| Cambios: publicar / borrar | ✅ | ✅ | ❌ |
| Ver la clave de acceso | ✅ | ❌ | ❌ |
| Regenerar la clave de acceso | ✅ | ❌ | ❌ |
| Crear / revocar invitaciones | ✅ | ❌ | ❌ |
| Cambiar el rol de un miembro | ✅ | ❌ | ❌ |
| Expulsar miembros | ✅ | ❌ | ❌ |
| Salir del equipo | ✅ | ✅ | ✅ |

### Resumen rápido
- **Admin**: manda en el equipo. Gestiona clave, invitaciones, miembros y todo el contenido.
- **Editor**: mantiene el contenido (documentos y cambios) al día, pero no toca ajustes ni miembros.
- **Member**: lee todo y participa en el chat.

---

## 3. ¿Cómo se entra a un Equipo?

1. **Clave de acceso**: cada equipo tiene una clave (p. ej. `AB12CD34`). El admin
   la comparte y quien la introduce entra como **member**.
2. **Invitación**: el admin genera códigos de un solo uso (con un rol asignado),
   útiles para dar acceso concreto (por ejemplo, entrar directamente como editor).

El admin puede **regenerar la clave** en cualquier momento (la anterior deja de
funcionar) desde *Equipo → Ajustes*.

---

## 4. Notas técnicas (para desarrollo)

- La seguridad se aplica con **RLS** en Supabase mediante funciones auxiliares:
  `is_team_member`, `is_team_admin`, `can_manage_team_content`.
- El contenido (mensajes, documentos, cambios) está asociado a `team_id`.
- Migraciones relevantes: `011` (base de Equipo), `013` (cambios) y `014`
  (equipos privados + roles + migración de contenido).
- Caveat menor: la clave de acceso se guarda en la tabla `teams`, visible por API
  para los miembros del equipo; en la interfaz solo se muestra a administradores.
  Si en el futuro se quiere ocultar del todo a los `member`, habría que moverla a
  una tabla aparte solo-admin.

_Última actualización: migración 014 (equipos privados)._
