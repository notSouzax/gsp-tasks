-- ============================================
-- MIGRACIÓN: Workspaces & Activity Logs
-- Fecha: 2025-12-18
-- Descripción: Sistema de espacios de trabajo y logs de auditoría completos
-- ============================================

-- ============================================
-- 1. WORKSPACES (Espacios de Trabajo)
-- ============================================

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por slug
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- ============================================
-- 2. WORKSPACE MEMBERS (Miembros del Workspace)
-- ============================================

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
  invited_by UUID REFERENCES auth.users,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

-- ============================================
-- 3. MODIFICAR TABLA BOARDS (agregar workspace_id)
-- ============================================

-- Agregar columna workspace_id a boards
ALTER TABLE boards ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Índice para búsquedas por workspace
CREATE INDEX IF NOT EXISTS idx_boards_workspace ON boards(workspace_id);

-- ============================================
-- 4. ACTIVITY LOGS (Sistema de Historial Visual)
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contexto
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  board_id BIGINT REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  
  -- Qué pasó
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'column', 'board', 'comment', 'attachment', 'tag', 'assignment')),
  entity_id TEXT NOT NULL, -- ID del objeto (almacenado como texto para flexibilidad)
  action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'move', 'delete', 'archive', 'restore', 'assign', 'unassign')),
  
  -- Detalles del cambio (Snapshots para comparación visual)
  previous_value JSONB DEFAULT '{}'::jsonb,
  new_value JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb, -- Información adicional para UI (colores, nombres legibles, etc.)
  
  -- Información de auditoría
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para filtrado rápido en la UI de historial
CREATE INDEX idx_activity_logs_board ON activity_logs(board_id, created_at DESC);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_workspace ON activity_logs(workspace_id, created_at DESC);

-- ============================================
-- 5. RLS POLICIES (Seguridad a Nivel de Fila)
-- ============================================

-- Workspaces: Solo miembros pueden ver
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver workspaces propios" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_members.workspace_id = workspaces.id 
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Crear workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Actualizar workspaces (solo owners/admins)" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_members.workspace_id = workspaces.id 
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Eliminar workspaces (solo owners)" ON workspaces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_members.workspace_id = workspaces.id 
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role = 'owner'
    )
  );

-- Workspace Members: Ver miembros del workspace
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver miembros del workspace" ON workspace_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = workspace_members.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Invitar miembros (owners/admins)" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_members.workspace_id = workspace_members.workspace_id 
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Actualizar miembros (owners/admins)" ON workspace_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = workspace_members.workspace_id 
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Eliminar miembros (owners/admins)" ON workspace_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = workspace_members.workspace_id 
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Activity Logs: Solo lectura para miembros del workspace
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver historial del workspace" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_members.workspace_id = activity_logs.workspace_id 
      AND workspace_members.user_id = auth.uid()
    )
    OR
    -- Fallback para boards sin workspace asignado (legacy)
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = activity_logs.board_id 
      AND boards.user_id = auth.uid()
    )
  );

-- NO permitir INSERT/UPDATE/DELETE manual desde la API
-- Los logs solo se crean mediante triggers automáticos

-- ============================================
-- 6. FUNCIONES PARA LOGGING AUTOMÁTICO
-- ============================================

-- Función helper para extraer workspace_id de un board
CREATE OR REPLACE FUNCTION get_workspace_id_from_board(board_id_param BIGINT)
RETURNS UUID AS $$
DECLARE
  workspace_id_result UUID;
BEGIN
  SELECT workspace_id INTO workspace_id_result
  FROM boards
  WHERE id = board_id_param;
  
  RETURN workspace_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper para extraer board_id de una columna
CREATE OR REPLACE FUNCTION get_board_id_from_column(column_id_param BIGINT)
RETURNS BIGINT AS $$
DECLARE
  board_id_result BIGINT;
BEGIN
  SELECT board_id INTO board_id_result
  FROM columns
  WHERE id = column_id_param;
  
  RETURN board_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper para extraer board_id de una tarea
CREATE OR REPLACE FUNCTION get_board_id_from_task(task_id_param BIGINT)
RETURNS BIGINT AS $$
DECLARE
  board_id_result BIGINT;
BEGIN
  SELECT c.board_id INTO board_id_result
  FROM tasks t
  JOIN columns c ON t.column_id = c.id
  WHERE t.id = task_id_param;
  
  RETURN board_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. TRIGGERS PARA LOGGING AUTOMÁTICO
-- ============================================

-- TRIGGER: Log cuando se crea un Board
CREATE OR REPLACE FUNCTION log_board_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (
    workspace_id,
    board_id,
    user_id,
    entity_type,
    entity_id,
    action_type,
    new_value,
    metadata
  ) VALUES (
    NEW.workspace_id,
    NEW.id,
    NEW.user_id,
    'board',
    NEW.id::TEXT,
    'create',
    jsonb_build_object('title', NEW.title),
    jsonb_build_object('display_text', 'Creó el tablero "' || NEW.title || '"')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_board_create
  AFTER INSERT ON boards
  FOR EACH ROW
  EXECUTE FUNCTION log_board_create();

-- TRIGGER: Log cuando se actualiza un Board
CREATE OR REPLACE FUNCTION log_board_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.title != NEW.title THEN
    INSERT INTO activity_logs (
      workspace_id,
      board_id,
      user_id,
      entity_type,
      entity_id,
      action_type,
      previous_value,
      new_value,
      metadata
    ) VALUES (
      NEW.workspace_id,
      NEW.id,
      NEW.user_id,
      'board',
      NEW.id::TEXT,
      'update',
      jsonb_build_object('title', OLD.title),
      jsonb_build_object('title', NEW.title),
      jsonb_build_object('display_text', 'Renombró el tablero de "' || OLD.title || '" a "' || NEW.title || '"')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_board_update
  AFTER UPDATE ON boards
  FOR EACH ROW
  EXECUTE FUNCTION log_board_update();

-- TRIGGER: Log cuando se elimina un Board
CREATE OR REPLACE FUNCTION log_board_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (
    workspace_id,
    board_id,
    user_id,
    entity_type,
    entity_id,
    action_type,
    previous_value,
    metadata
  ) VALUES (
    OLD.workspace_id,
    OLD.id,
    OLD.user_id,
    'board',
    OLD.id::TEXT,
    'delete',
    jsonb_build_object('title', OLD.title),
    jsonb_build_object('display_text', 'Eliminó el tablero "' || OLD.title || '"')
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_board_delete
  BEFORE DELETE ON boards
  FOR EACH ROW
  EXECUTE FUNCTION log_board_delete();

-- TRIGGER: Log cuando se crea una Columna
CREATE OR REPLACE FUNCTION log_column_create()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id_val UUID;
BEGIN
  workspace_id_val := get_workspace_id_from_board(NEW.board_id);
  
  INSERT INTO activity_logs (
    workspace_id,
    board_id,
    user_id,
    entity_type,
    entity_id,
    action_type,
    new_value,
    metadata
  ) VALUES (
    workspace_id_val,
    NEW.board_id,
    auth.uid(),
    'column',
    NEW.id::TEXT,
    'create',
    jsonb_build_object('title', NEW.title, 'color', NEW.color),
    jsonb_build_object('display_text', 'Creó la columna "' || NEW.title || '"', 'color', NEW.color)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_column_create
  AFTER INSERT ON columns
  FOR EACH ROW
  EXECUTE FUNCTION log_column_create();

-- TRIGGER: Log cuando se actualiza una Columna
CREATE OR REPLACE FUNCTION log_column_update()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id_val UUID;
BEGIN
  workspace_id_val := get_workspace_id_from_board(NEW.board_id);
  
  IF OLD.title != NEW.title OR OLD.color != NEW.color THEN
    INSERT INTO activity_logs (
      workspace_id,
      board_id,
      user_id,
      entity_type,
      entity_id,
      action_type,
      previous_value,
      new_value,
      metadata
    ) VALUES (
      workspace_id_val,
      NEW.board_id,
      auth.uid(),
      'column',
      NEW.id::TEXT,
      'update',
      jsonb_build_object('title', OLD.title, 'color', OLD.color),
      jsonb_build_object('title', NEW.title, 'color', NEW.color),
      jsonb_build_object('display_text', 'Modificó la columna "' || OLD.title || '"')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_column_update
  AFTER UPDATE ON columns
  FOR EACH ROW
  EXECUTE FUNCTION log_column_update();

-- TRIGGER: Log cuando se elimina una Columna
CREATE OR REPLACE FUNCTION log_column_delete()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id_val UUID;
BEGIN
  workspace_id_val := get_workspace_id_from_board(OLD.board_id);
  
  INSERT INTO activity_logs (
    workspace_id,
    board_id,
    user_id,
    entity_type,
    entity_id,
    action_type,
    previous_value,
    metadata
  ) VALUES (
    workspace_id_val,
    OLD.board_id,
    auth.uid(),
    'column',
    OLD.id::TEXT,
    'delete',
    jsonb_build_object('title', OLD.title, 'color', OLD.color),
    jsonb_build_object('display_text', 'Eliminó la columna "' || OLD.title || '"')
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_column_delete
  BEFORE DELETE ON columns
  FOR EACH ROW
  EXECUTE FUNCTION log_column_delete();

-- TRIGGER: Log cuando se crea una Tarea
CREATE OR REPLACE FUNCTION log_task_create()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id_val UUID;
  board_id_val BIGINT;
  column_title TEXT;
BEGIN
  board_id_val := get_board_id_from_task(NEW.id);
  workspace_id_val := get_workspace_id_from_board(board_id_val);
  
  SELECT title INTO column_title FROM columns WHERE id = NEW.column_id;
  
  INSERT INTO activity_logs (
    workspace_id,
    board_id,
    user_id,
    entity_type,
    entity_id,
    action_type,
    new_value,
    metadata
  ) VALUES (
    workspace_id_val,
    board_id_val,
    auth.uid(),
    'task',
    NEW.id::TEXT,
    'create',
    jsonb_build_object('title', NEW.title, 'column', column_title),
    jsonb_build_object('display_text', 'Creó la tarea "' || NEW.title || '" en "' || column_title || '"', 'column', column_title)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_task_create
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_create();

-- TRIGGER: Log cuando se actualiza una Tarea (incluye movimientos)
CREATE OR REPLACE FUNCTION log_task_update()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id_val UUID;
  board_id_val BIGINT;
  old_column_title TEXT;
  new_column_title TEXT;
BEGIN
  board_id_val := get_board_id_from_task(NEW.id);
  workspace_id_val := get_workspace_id_from_board(board_id_val);
  
  -- Si cambió de columna (movimiento)
  IF OLD.column_id != NEW.column_id THEN
    SELECT title INTO old_column_title FROM columns WHERE id = OLD.column_id;
    SELECT title INTO new_column_title FROM columns WHERE id = NEW.column_id;
    
    INSERT INTO activity_logs (
      workspace_id,
      board_id,
      user_id,
      entity_type,
      entity_id,
      action_type,
      previous_value,
      new_value,
      metadata
    ) VALUES (
      workspace_id_val,
      board_id_val,
      auth.uid(),
      'task',
      NEW.id::TEXT,
      'move',
      jsonb_build_object('column', old_column_title),
      jsonb_build_object('column', new_column_title),
      jsonb_build_object(
        'display_text', 'Movió "' || NEW.title || '" de "' || old_column_title || '" a "' || new_column_title || '"',
        'from_column', old_column_title,
        'to_column', new_column_title
      )
    );
  -- Si cambió el título o descripción
  ELSIF OLD.title != NEW.title OR COALESCE(OLD.description, '') != COALESCE(NEW.description, '') THEN
    INSERT INTO activity_logs (
      workspace_id,
      board_id,
      user_id,
      entity_type,
      entity_id,
      action_type,
      previous_value,
      new_value,
      metadata
    ) VALUES (
      workspace_id_val,
      board_id_val,
      auth.uid(),
      'task',
      NEW.id::TEXT,
      'update',
      jsonb_build_object('title', OLD.title, 'description', OLD.description),
      jsonb_build_object('title', NEW.title, 'description', NEW.description),
      jsonb_build_object('display_text', 'Actualizó la tarea "' || NEW.title || '"')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_task_update
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_update();

-- TRIGGER: Log cuando se elimina una Tarea
CREATE OR REPLACE FUNCTION log_task_delete()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id_val UUID;
  board_id_val BIGINT;
  column_title TEXT;
BEGIN
  board_id_val := get_board_id_from_task(OLD.id);
  workspace_id_val := get_workspace_id_from_board(board_id_val);
  
  SELECT title INTO column_title FROM columns WHERE id = OLD.column_id;
  
  INSERT INTO activity_logs (
    workspace_id,
    board_id,
    user_id,
    entity_type,
    entity_id,
    action_type,
    previous_value,
    metadata
  ) VALUES (
    workspace_id_val,
    board_id_val,
    auth.uid(),
    'task',
    OLD.id::TEXT,
    'delete',
    jsonb_build_object('title', OLD.title, 'column', column_title),
    jsonb_build_object('display_text', 'Eliminó la tarea "' || OLD.title || '"')
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_task_delete
  BEFORE DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_delete();

-- TRIGGER: Log cuando se crea un Comentario
CREATE OR REPLACE FUNCTION log_comment_create()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id_val UUID;
  board_id_val BIGINT;
  task_title TEXT;
BEGIN
  board_id_val := get_board_id_from_task(NEW.task_id);
  workspace_id_val := get_workspace_id_from_board(board_id_val);
  
  SELECT title INTO task_title FROM tasks WHERE id = NEW.task_id;
  
  INSERT INTO activity_logs (
    workspace_id,
    board_id,
    user_id,
    entity_type,
    entity_id,
    action_type,
    new_value,
    metadata
  ) VALUES (
    workspace_id_val,
    board_id_val,
    NEW.user_id,
    'comment',
    NEW.id::TEXT,
    'create',
    jsonb_build_object('text', NEW.text, 'task_id', NEW.task_id),
    jsonb_build_object('display_text', 'Comentó en "' || task_title || '"', 'task_title', task_title, 'comment_preview', LEFT(NEW.text, 100))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_comment_create
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_create();

-- TRIGGER: Log cuando se elimina un Comentario
CREATE OR REPLACE FUNCTION log_comment_delete()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id_val UUID;
  board_id_val BIGINT;
  task_title TEXT;
BEGIN
  board_id_val := get_board_id_from_task(OLD.task_id);
  workspace_id_val := get_workspace_id_from_board(board_id_val);
  
  SELECT title INTO task_title FROM tasks WHERE id = OLD.task_id;
  
  INSERT INTO activity_logs (
    workspace_id,
    board_id,
    user_id,
    entity_type,
    entity_id,
    action_type,
    previous_value,
    metadata
  ) VALUES (
    workspace_id_val,
    board_id_val,
    OLD.user_id,
    'comment',
    OLD.id::TEXT,
    'delete',
    jsonb_build_object('text', OLD.text),
    jsonb_build_object('display_text', 'Eliminó un comentario de "' || task_title || '"')
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_comment_delete
  BEFORE DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_delete();

-- ============================================
-- 8. MIGRACIÓN DE DATOS EXISTENTES
-- ============================================

-- Crear workspace por defecto para cada usuario existente
DO $$
DECLARE
  user_record RECORD;
  new_workspace_id UUID;
BEGIN
  FOR user_record IN SELECT DISTINCT user_id, email FROM boards b JOIN profiles p ON b.user_id = p.id
  LOOP
    -- Crear workspace personal
    INSERT INTO workspaces (name, slug, created_by, settings)
    VALUES (
      'Mi Espacio de Trabajo',
      'workspace-' || REPLACE(user_record.user_id::TEXT, '-', ''),
      user_record.user_id,
      '{"is_default": true}'::jsonb
    )
    RETURNING id INTO new_workspace_id;
    
    -- Agregar usuario como owner del workspace
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, user_record.user_id, 'owner');
    
    -- Asignar todos los boards del usuario al nuevo workspace
    UPDATE boards
    SET workspace_id = new_workspace_id
    WHERE user_id = user_record.user_id;
  END LOOP;
END $$;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
