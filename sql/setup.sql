-- ==========================================
-- GulupaConta — Setup de Base de Datos
-- Ejecutar en Supabase > SQL Editor > Run
-- ==========================================

-- Tabla principal de registros contables
CREATE TABLE registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('costos', 'gastos', 'compras', 'ingresos')),
  subcategoria TEXT,
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  etapa TEXT,
  proveedor TEXT,
  soporte TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de configuración del cultivo
CREATE TABLE configuracion (
  id INTEGER PRIMARY KEY DEFAULT 1,
  fecha_siembra DATE,
  nombre_finca TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto
INSERT INTO configuracion (fecha_siembra, nombre_finca)
VALUES (NULL, 'Mi Finca');

-- Habilitar acceso público (para app sin login)
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso público registros" ON registros
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acceso público configuracion" ON configuracion
  FOR ALL USING (true) WITH CHECK (true);
