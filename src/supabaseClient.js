import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ GulupaConta: Falta configurar Supabase.\n' +
    'Crea un archivo .env en la raíz del proyecto con:\n' +
    'VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=tu-anon-key\n\n' +
    'La app funcionará en modo local (sin guardar datos).'
  )
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// === FUNCIONES DE BASE DE DATOS ===

// --- REGISTROS ---

export async function cargarRegistros() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .order('fecha', { ascending: false })
  if (error) {
    console.error('Error cargando registros:', error)
    return []
  }
  return data || []
}

export async function guardarRegistro(registro) {
  if (!supabase) return registro
  const { data, error } = await supabase
    .from('registros')
    .insert([{
      fecha: registro.fecha,
      categoria: registro.categoria,
      subcategoria: registro.subcategoria,
      descripcion: registro.descripcion,
      monto: registro.monto,
      etapa: registro.etapa,
      proveedor: registro.proveedor,
      soporte: registro.soporte,
    }])
    .select()
    .single()
  if (error) {
    console.error('Error guardando registro:', error)
    return null
  }
  return data
}

export async function actualizarRegistro(id, registro) {
  if (!supabase) return registro
  const { data, error } = await supabase
    .from('registros')
    .update({
      fecha: registro.fecha,
      categoria: registro.categoria,
      subcategoria: registro.subcategoria,
      descripcion: registro.descripcion,
      monto: registro.monto,
      etapa: registro.etapa,
      proveedor: registro.proveedor,
      soporte: registro.soporte,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('Error actualizando registro:', error)
    return null
  }
  return data
}

export async function eliminarRegistro(id) {
  if (!supabase) return true
  const { error } = await supabase
    .from('registros')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('Error eliminando registro:', error)
    return false
  }
  return true
}

// --- CONFIGURACIÓN ---

export async function cargarConfiguracion() {
  if (!supabase) return { fecha_siembra: null, nombre_finca: 'Mi Finca' }
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) {
    console.error('Error cargando configuración:', error)
    return { fecha_siembra: null, nombre_finca: 'Mi Finca' }
  }
  return data
}

export async function guardarFechaSiembra(fecha) {
  if (!supabase) return true
  const { error } = await supabase
    .from('configuracion')
    .update({ fecha_siembra: fecha, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) {
    console.error('Error guardando fecha de siembra:', error)
    return false
  }
  return true
}
