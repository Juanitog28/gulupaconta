# 🫐 GulupaConta

Herramienta contable para cultivo de gulupa (*Passiflora edulis Sims*) tipo exportación — Risaralda, Colombia.

## Características

- 📊 Dashboard con KPIs en tiempo real (costos, gastos, compras, ingresos, utilidad)
- 🌱 Gulupa animada que crece con tu inversión y da frutos con tus ventas
- 📝 Registro contable completo con clasificación por categoría
- 📸 Escáner de facturas con IA (análisis automático de imágenes)
- 💰 Control de presupuesto mensual
- 🌿 7 etapas fenológicas del cultivo con detección automática

## Configuración

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el SQL de `sql/setup.sql` en el SQL Editor
3. Copia `.env.example` como `.env` y llena con tus credenciales
4. `npm install`
5. `npm run dev`

## Despliegue

Conecta el repositorio con [Vercel](https://vercel.com) y agrega las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Moneda

Todo en **Pesos Colombianos (COP)**. Inversión estimada del cultivo: $80M - $150M COP.
