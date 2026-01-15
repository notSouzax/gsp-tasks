# 📚 API de Contextos - Kanban App

Documentación completa de los contextos React disponibles en la aplicación.

---

## 🔐 AuthContext

**Archivo:** `src/context/AuthContext.jsx`

### Hook

```jsx
import { useAuth } from '../context/AuthContext';
const { currentUser, signIn, signUp, signOut, loading } = useAuth();
```

### API

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `currentUser` | `User \| null` | Usuario autenticado actual |
| `loading` | `boolean` | Estado de carga de autenticación |
| `signIn(email, password)` | `async function` | Iniciar sesión |
| `signUp(email, password)` | `async function` | Registrar nuevo usuario |
| `signOut()` | `async function` | Cerrar sesión |

### Ejemplo

```jsx
const MyComponent = () => {
    const { currentUser, signOut } = useAuth();
    
    if (!currentUser) return <LoginModal />;
    
    return (
        <div>
            <span>Hola, {currentUser.email}</span>
            <button onClick={signOut}>Salir</button>
        </div>
    );
};
```

---

## ⚙️ SettingsContext

**Archivo:** `src/context/SettingsContext.jsx`

### Hook

```jsx
import { useSettings } from '../context/SettingsContext';
const { settings, updateSettings, toggleTheme, isDark, resolvedTheme } = useSettings();
```

### API

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `settings` | `object` | Configuración actual del usuario |
| `settings.theme` | `'dark' \| 'light' \| 'system'` | Preferencia de tema |
| `settings.columnWidth` | `number` | Ancho de columnas en px |
| `resolvedTheme` | `'dark' \| 'light'` | Tema efectivo aplicado |
| `isDark` | `boolean` | `true` si tema oscuro activo |
| `updateSettings(updates)` | `function` | Actualizar configuración |
| `toggleTheme()` | `function` | Alternar dark/light |
| `useSystemTheme()` | `function` | Usar preferencia del sistema |
| `resetSettings()` | `function` | Restaurar valores por defecto |

### Ejemplo

```jsx
const ThemeToggle = () => {
    const { isDark, toggleTheme, settings } = useSettings();
    
    return (
        <button onClick={toggleTheme}>
            {isDark ? '🌙' : '☀️'} 
            {settings.theme === 'system' && '(Auto)'}
        </button>
    );
};
```

---

## 🏢 WorkspaceContext

**Archivo:** `src/context/WorkspaceContext.jsx`

### Hook

```jsx
import { useWorkspace } from '../context/WorkspaceContext';
const { currentWorkspace, userRole, loading, switchWorkspace } = useWorkspace();
```

### API

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `currentWorkspace` | `Workspace \| null` | Espacio de trabajo actual |
| `userRole` | `'owner' \| 'admin' \| 'member' \| 'viewer'` | Rol del usuario |
| `loading` | `boolean` | Estado de carga |
| `workspaces` | `Workspace[]` | Lista de workspaces del usuario |
| `switchWorkspace(id)` | `function` | Cambiar de workspace |
| `createWorkspace(name)` | `async function` | Crear nuevo workspace |
| `inviteMember(email, role)` | `async function` | Invitar miembro |

### Permisos por Rol

```
owner  → Todo
admin  → Todo excepto eliminar workspace
member → CRUD de tareas, comentar
viewer → Solo lectura
```

---

## 📊 ActivityContext

**Archivo:** `src/context/ActivityContext.jsx`

### Hook

```jsx
import { useActivity } from '../context/ActivityContext';
const { activities, loading, fetchActivities, logActivity } = useActivity();
```

### API

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `activities` | `Activity[]` | Lista de actividades |
| `loading` | `boolean` | Estado de carga |
| `filters` | `object` | Filtros activos |
| `fetchActivities(boardId, limit, offset)` | `async function` | Obtener actividades |
| `logActivity(data)` | `async function` | Registrar nueva actividad |
| `updateFilters(filters)` | `function` | Actualizar filtros |
| `resetFilters()` | `function` | Limpiar filtros |
| `formatActivityForDisplay(activity)` | `function` | Formatear para UI |
| `getActivityHeatmap(boardId, days)` | `async function` | Datos para heatmap |

### Tipos de Actividad

```typescript
type EntityType = 'task' | 'column' | 'board' | 'comment';
type ActionType = 'create' | 'update' | 'move' | 'delete';

interface Activity {
    id: string;
    user_id: string;
    board_id: string;
    entity_type: EntityType;
    action_type: ActionType;
    entity_id: string;
    metadata: object;
    created_at: string;
}
```

### Ejemplo

```jsx
const ActivityLog = () => {
    const { activities, formatActivityForDisplay } = useActivity();
    
    return (
        <ul>
            {activities.map(activity => {
                const formatted = formatActivityForDisplay(activity);
                return (
                    <li key={activity.id}>
                        {formatted.icon} {formatted.displayText}
                    </li>
                );
            })}
        </ul>
    );
};
```

---

## 🔧 Helpers Disponibles

### Date Helpers

```jsx
import { 
    formatRelativeTime,  // "hace 3 horas"
    formatDateTime,      // "18 de diciembre a las 20:30"
    formatDate,          // "18/12/2024"
    formatDateGroup      // "Hoy" | "Ayer" | "20 de diciembre de 2024"
} from '../utils/dateHelpers';
```

### Permissions

```jsx
import { 
    canEditBoard,
    canDeleteBoard,
    canCreateTask,
    canInviteMembers,
    getRoleName
} from '../utils/permissions';
```

---

## 📁 Estructura de Archivos

```
src/
├── context/
│   ├── AuthContext.jsx      # Autenticación
│   ├── SettingsContext.jsx  # Preferencias de usuario
│   ├── WorkspaceContext.jsx # Espacios de trabajo
│   └── ActivityContext.jsx  # Historial de actividad
├── hooks/
│   ├── useVoiceInput.js     # Reconocimiento de voz
│   └── useActivities.js     # Hook legacy (usar ActivityContext)
└── utils/
    ├── dateHelpers.js       # Formateo de fechas
    ├── helpers.jsx          # Utilidades generales
    ├── permissions.js       # Lógica de permisos
    ├── logger.js            # Sistema de logging
    └── aiService.js         # Integración con Gemini AI
```
