import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  supabase,
  cargarRegistros,
  guardarRegistro,
  actualizarRegistro,
  eliminarRegistro,
  cargarConfiguracion,
  guardarFechaSiembra,
} from "./supabaseClient.js";

const ETAPAS_FENOLOGICAS = [
  {
    id: 1,
    nombre: "Germinación y Semillero",
    duracion: "0–1 mes",
    meses: [0, 1],
    color: "#4a7c59",
    icon: "🌱",
    descripcion: "Germinación de semillas y desarrollo inicial de plántulas en semillero.",
    costosTypicos: ["Semillas certificadas", "Sustratos", "Bandejas germinación", "Riego semillero", "Fungicidas preventivos"],
  },
  {
    id: 2,
    nombre: "Trasplante y Establecimiento",
    duracion: "1–2 meses",
    meses: [1, 2],
    color: "#5a9e6f",
    icon: "🪴",
    descripcion: "Trasplante a campo definitivo, instalación de tutorado y sistema de riego.",
    costosTypicos: ["Preparación terreno", "Tutorado (postes, alambre)", "Sistema riego", "Mano de obra trasplante", "Fertilizantes base"],
  },
  {
    id: 3,
    nombre: "Desarrollo Vegetativo",
    duracion: "2–6 meses",
    meses: [2, 6],
    color: "#2d8a4e",
    icon: "🌿",
    descripcion: "Crecimiento de tallos y ramas, podas de formación, desarrollo del sistema radicular.",
    costosTypicos: ["Fertilización (N-P-K)", "Podas de formación", "Control fitosanitario", "Mano de obra mantenimiento", "Herbicidas/plateo"],
  },
  {
    id: 4,
    nombre: "Floración (Botón Floral)",
    duracion: "6–7 meses",
    meses: [6, 7],
    color: "#c084fc",
    icon: "🌸",
    descripcion: "Aparición de yemas florales, flor en antesis. Periodo crítico para polinización.",
    costosTypicos: ["Fertilización floración (P-K)", "Control plagas polinizadores", "Riego controlado", "Bioestimulantes", "Mano de obra monitoreo"],
  },
  {
    id: 5,
    nombre: "Cuajado y Llenado de Fruto",
    duracion: "7–10 meses",
    meses: [7, 10],
    color: "#f59e0b",
    icon: "🍈",
    descripcion: "Fruto cuajado, crecimiento del fruto, llenado. Fruto inmaduro en desarrollo.",
    costosTypicos: ["Fertilización fructificación", "Control botrytis", "Riego frecuente", "Calcio/Boro foliar", "Mano de obra seguimiento"],
  },
  {
    id: 6,
    nombre: "Maduración y Cosecha",
    duracion: "10–14 meses",
    meses: [10, 14],
    color: "#7c3aed",
    icon: "🫐",
    descripcion: "Fruto con coloración púrpura (30%-100%). Cosecha 2-3 veces por semana. Poscosecha para exportación.",
    costosTypicos: ["Mano de obra cosecha", "Canastillas/empaques", "Transporte", "Cadena de frío", "Certificaciones (GlobalGAP, ICA)"],
  },
  {
    id: 7,
    nombre: "Producción Continua",
    duracion: "14+ meses",
    meses: [14, 48],
    color: "#059669",
    icon: "♻️",
    descripcion: "Ciclos de producción cada 2 meses. Vida útil del cultivo: 2-4 años con buen manejo.",
    costosTypicos: ["Renovación podas", "Fertilización sostenimiento", "Control enfermedades (Fusarium)", "Cosecha continua", "Empaque exportación"],
  },
];

const CATEGORIAS = {
  costos: {
    label: "Costos",
    color: "#ef4444",
    icon: "📊",
    descripcion: "Desembolsos directamente relacionados con producir la gulupa. Sin ellos no hay fruta.",
    ejemplos: "Fertilizantes, jornales de poda y cosecha, agroquímicos, riego, tutorado, bioestimulantes.",
    clave: "Si lo quitas, la producción se detiene.",
  },
  gastos: {
    label: "Gastos",
    color: "#f97316",
    icon: "💸",
    descripcion: "Desembolsos necesarios para que el negocio funcione, pero no ligados directamente a cada fruta producida.",
    ejemplos: "Arriendo del lote, servicios públicos, transporte administrativo, celular/internet, certificación GlobalGAP, registro ICA, honorarios profesionales, seguros.",
    clave: "El negocio los necesita, pero no cambian con la cantidad de gulupa que produces.",
  },
  compras: {
    label: "Compras",
    color: "#3b82f6",
    icon: "🛒",
    descripcion: "Adquisiciones de bienes o insumos que no se consumen inmediatamente. Es la inversión en activos e inventario.",
    ejemplos: "Canastillas de empaque, fumigadora, rollos de alambre, bandejas de germinación, herramientas, tanques de agua.",
    clave: "Es el momento de adquisición del bien. El costo se registra cuando lo usas.",
  },
  ingresos: {
    label: "Ingresos",
    color: "#10b981",
    icon: "💰",
    descripcion: "Todo el dinero que entra por la venta de tu gulupa u otros productos del cultivo.",
    ejemplos: "Venta exportación (Países Bajos, Bélgica, Alemania), venta mercado nacional, subproductos.",
    clave: "Ingresos menos egresos = tu utilidad real.",
  },
};

const MESES_LABEL = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dec"];

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatCOP(n) {
  if (!n && n !== 0) return "$ 0 COP";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("es-CO");
  const sign = n < 0 ? "-" : "";
  return `${sign}$ ${formatted} COP`;
}

// Shorter version for tight spaces (no COP suffix)
function formatCOPShort(n) {
  if (!n && n !== 0) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1000000) {
    return `${n < 0 ? "-" : ""}$${(abs / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `${n < 0 ? "-" : ""}$${Math.round(abs / 1000)}K`;
  }
  return `${n < 0 ? "-" : ""}$${abs.toLocaleString("es-CO")}`;
}

function detectarEtapa(fechaSiembra) {
  if (!fechaSiembra) return null;
  const siembra = new Date(fechaSiembra);
  const hoy = new Date();
  const diffMs = hoy - siembra;
  const mesesTranscurridos = diffMs / (1000 * 60 * 60 * 24 * 30.44);
  for (let i = ETAPAS_FENOLOGICAS.length - 1; i >= 0; i--) {
    if (mesesTranscurridos >= ETAPAS_FENOLOGICAS[i].meses[0]) {
      return { etapa: ETAPAS_FENOLOGICAS[i], mesesTranscurridos: Math.round(mesesTranscurridos * 10) / 10 };
    }
  }
  return { etapa: ETAPAS_FENOLOGICAS[0], mesesTranscurridos: 0 };
}

// Animated Gulupa Plant Component
function GulupaPlant({ inversion, ingresos }) {
  const [sparkles, setSparkles] = useState([]);
  const [pulseScale, setPulseScale] = useState(1);
  const prevTotal = useRef(0);

  // Plant growth level (0-5): tallo, hojas, flores — based on INVESTMENT
  const nivelPlanta = useMemo(() => {
    if (inversion <= 0) return 0;
    if (inversion < 5000000) return 1;
    if (inversion < 15000000) return 2;
    if (inversion < 30000000) return 3;
    if (inversion < 50000000) return 4;
    return 5;
  }, [inversion]);

  // Fruit level (0-3): frutos aparecen SOLO con ingresos
  const nivelFrutos = useMemo(() => {
    if (ingresos <= 0) return 0;
    if (ingresos < 20000000) return 1;
    if (ingresos < 60000000) return 2;
    if (ingresos < 120000000) return 3;
    return 4;
  }, [ingresos]);

  // Overall display level for the progress bar (0-7)
  const nivelVisual = useMemo(() => {
    if (inversion <= 0 && ingresos <= 0) return 0;
    const plantaPart = Math.min(nivelPlanta, 5);
    const frutoPart = Math.min(nivelFrutos, 2);
    return Math.min(7, plantaPart + frutoPart);
  }, [nivelPlanta, nivelFrutos, inversion, ingresos]);

  const utilidad = ingresos - inversion;

  const nivelLabel = (() => {
    if (inversion <= 0 && ingresos <= 0) return "Semilla latente — $0";
    if (nivelPlanta <= 1) return "Germinando — inversión hasta $5M";
    if (nivelPlanta <= 2) return "Plántula — inversión hasta $15M";
    if (nivelPlanta <= 3) return "Trasplantada — inversión hasta $30M";
    if (nivelPlanta <= 4) return "Desarrollo vegetativo — inversión hasta $50M";
    if (nivelFrutos === 0) return "Planta madura — esperando primera venta";
    if (nivelFrutos === 1) return "Primeros frutos — ingresos hasta $20M";
    if (nivelFrutos === 2) return "Cosecha activa — ingresos hasta $60M";
    if (nivelFrutos === 3) return "Producción fuerte — ingresos hasta $120M";
    return "¡Exportación plena! — ingresos $120M+";
  })();

  // Sparkle effect when any money moves
  useEffect(() => {
    const currentTotal = inversion + ingresos;
    if (currentTotal > prevTotal.current && prevTotal.current > 0) {
      const isIngreso = ingresos > (prevTotal.current - inversion);
      const newSparkles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: 100 + (Math.random() - 0.5) * 120,
        y: 80 + Math.random() * 100,
        delay: Math.random() * 0.3,
        color: isIngreso ? "#10b981" : "#f5c842",
      }));
      setSparkles(newSparkles);
      setPulseScale(1.08);
      setTimeout(() => setPulseScale(1), 400);
      setTimeout(() => setSparkles([]), 1500);
    }
    prevTotal.current = currentTotal;
  }, [inversion, ingresos]);

  // Fruit color intensity based on income volume
  const fruitPurple = ingresos > 0 ? Math.min(100, (ingresos / 100000000) * 100) : 0;

  const tierra = (
    <g>
      <ellipse cx="100" cy="260" rx="85" ry="14" fill="#8B6914" opacity="0.3" />
      <path d="M15,255 Q40,248 65,252 Q100,246 135,252 Q160,248 185,255 Q185,265 100,268 Q15,265 15,255 Z" fill="#6B4E12" />
      <path d="M25,253 Q60,246 100,250 Q140,246 175,253 Q175,259 100,262 Q25,259 25,253 Z" fill="#8B6914" />
      {nivelPlanta >= 1 && (
        <>
          <path d="M40,256 Q42,254 44,256" stroke="#5a3e0a" strokeWidth="0.5" fill="none" opacity="0.5" />
          <path d="M80,254 Q82,252 84,254" stroke="#5a3e0a" strokeWidth="0.5" fill="none" opacity="0.5" />
          <path d="M130,255 Q132,253 134,255" stroke="#5a3e0a" strokeWidth="0.5" fill="none" opacity="0.5" />
        </>
      )}
    </g>
  );

  const semilla = nivelPlanta >= 1 && (
    <g>
      <ellipse cx="100" cy="248" rx={4 + nivelPlanta * 0.5} ry={3 + nivelPlanta * 0.3} fill="#3d2b0a"
        style={{ transition: "all 0.8s ease" }} />
      {nivelPlanta === 1 && (
        <path d="M100,245 Q101,240 100,236" stroke="#6aab35" strokeWidth="1.5" fill="none" strokeLinecap="round"
          style={{ animation: "growUp 2s ease infinite alternate" }} />
      )}
    </g>
  );

  const tallo = nivelPlanta >= 2 && (
    <g style={{ transition: "all 1s ease" }}>
      <path
        d={nivelPlanta <= 2
          ? "M100,248 Q100,230 100,215"
          : nivelPlanta <= 3
          ? "M100,248 Q99,220 100,190"
          : nivelPlanta <= 4
          ? "M100,248 Q98,200 100,155 Q102,130 100,110"
          : "M100,248 Q97,200 100,150 Q103,120 100,85 Q98,65 100,50"
        }
        stroke="#4a8c3f"
        strokeWidth={nivelPlanta <= 2 ? 2 : nivelPlanta <= 4 ? 3 : 4}
        fill="none"
        strokeLinecap="round"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.1))" }}
      />
      {nivelPlanta >= 4 && (
        <>
          <path d="M100,200 Q80,190 65,195" stroke="#3d7a32" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M100,170 Q120,160 140,165" stroke="#3d7a32" strokeWidth="2" fill="none" strokeLinecap="round" />
          {nivelPlanta >= 5 && (
            <>
              <path d="M100,140 Q75,128 55,135" stroke="#3d7a32" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M100,110 Q130,98 148,105" stroke="#3d7a32" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M100,85 Q70,72 50,80" stroke="#3d7a32" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d="M100,65 Q135,55 155,62" stroke="#3d7a32" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </>
          )}
        </>
      )}
    </g>
  );

  const hojas = nivelPlanta >= 2 && (
    <g style={{ transition: "all 1s ease" }}>
      {nivelPlanta >= 2 && (
        <>
          <path d="M100,215 Q88,208 82,215 Q88,220 100,215" fill="#5cb84d"
            style={{ animation: "leafSway 3s ease-in-out infinite alternate", transformOrigin: "100px 215px" }} />
          <path d="M100,215 Q112,208 118,215 Q112,220 100,215" fill="#4da63f"
            style={{ animation: "leafSway 3s ease-in-out infinite alternate-reverse", transformOrigin: "100px 215px" }} />
        </>
      )}
      {nivelPlanta >= 3 && (
        <>
          <path d="M100,190 Q82,178 72,188 Q82,196 100,190" fill="#5cb84d" style={{ animation: "leafSway 4s ease-in-out infinite alternate" }} />
          <path d="M100,190 Q118,178 128,188 Q118,196 100,190" fill="#4da63f" style={{ animation: "leafSway 4s ease-in-out infinite alternate-reverse" }} />
        </>
      )}
      {nivelPlanta >= 4 && (
        <>
          <path d="M65,195 Q50,182 42,192 Q52,202 65,195" fill="#48a038" style={{ animation: "leafSway 3.5s ease-in-out infinite alternate" }} />
          <path d="M140,165 Q155,152 162,162 Q152,172 140,165" fill="#5cb84d" style={{ animation: "leafSway 3.2s ease-in-out infinite alternate-reverse" }} />
          <path d="M100,155 Q86,142 78,153 Q88,162 100,155" fill="#3d9432" />
          <path d="M100,155 Q114,142 122,153 Q112,162 100,155" fill="#4da63f" />
        </>
      )}
      {nivelPlanta >= 5 && (
        <>
          <path d="M55,135 Q38,120 30,132 Q40,142 55,135" fill="#5cb84d" style={{ animation: "leafSway 3.8s ease-in-out infinite alternate" }} />
          <path d="M148,105 Q165,90 172,102 Q160,112 148,105" fill="#48a038" style={{ animation: "leafSway 2.9s ease-in-out infinite alternate-reverse" }} />
          <path d="M100,110 Q88,96 80,106 Q90,116 100,110" fill="#3d9432" />
          <path d="M100,110 Q112,96 120,106 Q110,116 100,110" fill="#5cb84d" />
          <path d="M50,80 Q32,65 26,78 Q36,88 50,80" fill="#4da63f" style={{ animation: "leafSway 3.3s ease-in-out infinite alternate" }} />
          <path d="M155,62 Q172,48 178,60 Q168,70 155,62" fill="#5cb84d" style={{ animation: "leafSway 4.1s ease-in-out infinite alternate-reverse" }} />
          <path d="M100,85 Q86,70 78,82 Q88,92 100,85" fill="#3d9432" />
        </>
      )}
    </g>
  );

  // FLORES: aparecen con planta madura (inversión) — se mantienen aunque no haya ingresos
  const flores = nivelPlanta >= 5 && (
    <g>
      {[
        { cx: 58, cy: 128, s: 1 },
        { cx: 145, cy: 98, s: 0.9 },
        { cx: 105, cy: 102, s: 0.8 },
        { cx: 45, cy: 74, s: 0.7 },
        { cx: 158, cy: 56, s: 0.85 },
      ].map((f, i) => (
        <g key={`flor-${i}`} transform={`translate(${f.cx},${f.cy}) scale(${f.s})`}
          style={{ animation: `flowerBounce ${2 + i * 0.3}s ease-in-out infinite alternate`, transformOrigin: `${f.cx}px ${f.cy}px` }}>
          {[0, 72, 144, 216, 288].map((angle, j) => (
            <ellipse key={j} cx={0} cy={-5} rx="3" ry="6"
              fill={nivelFrutos >= 1 ? "#e8b4f8" : "white"}
              stroke="#d4a0e8" strokeWidth="0.3"
              transform={`rotate(${angle})`}
              opacity="0.9" />
          ))}
          <circle cx="0" cy="0" r="3" fill="#f5c842" />
          <circle cx="0" cy="0" r="1.5" fill="#e8a730" />
        </g>
      ))}
    </g>
  );

  // FRUTOS: solo aparecen con INGRESOS — la plata entrando hace crecer los frutos
  const frutos = nivelFrutos >= 1 && nivelPlanta >= 4 && (
    <g>
      {[
        { cx: 72, cy: 200, s: nivelFrutos >= 3 ? 1.2 : nivelFrutos >= 2 ? 0.9 : 0.6 },
        { cx: 135, cy: 170, s: nivelFrutos >= 3 ? 1.1 : nivelFrutos >= 2 ? 0.8 : 0.5 },
        ...(nivelFrutos >= 2 ? [
          { cx: 55, cy: 142, s: nivelFrutos >= 3 ? 1.0 : 0.7 },
          { cx: 150, cy: 112, s: nivelFrutos >= 3 ? 1.05 : 0.65 },
        ] : []),
        ...(nivelFrutos >= 3 ? [
          { cx: 42, cy: 85, s: 0.95 },
          { cx: 160, cy: 68, s: 1.0 },
        ] : []),
        ...(nivelFrutos >= 4 ? [
          { cx: 85, cy: 125, s: 1.15 },
          { cx: 120, cy: 80, s: 1.1 },
        ] : []),
      ].map((f, i) => {
        const purpleAmount = nivelFrutos >= 3 ? 0.85 + Math.random() * 0.1 : 0.3 + (fruitPurple / 100) * 0.5;
        const baseColor = `rgb(${Math.round(80 - purpleAmount * 40)}, ${Math.round(60 - purpleAmount * 30)}, ${Math.round(120 + purpleAmount * 60)})`;
        return (
          <g key={`fruto-${i}`} transform={`translate(${f.cx},${f.cy}) scale(${f.s})`}
            style={{ animation: `fruitDangle ${2.5 + i * 0.4}s ease-in-out infinite alternate`, transformOrigin: `${f.cx}px ${f.cy - 8}px` }}>
            <line x1="0" y1="-8" x2="0" y2="-2" stroke="#4a8c3f" strokeWidth="1" />
            <ellipse cx="0" cy="0" rx="7" ry="8" fill={baseColor} />
            <ellipse cx="-2" cy="-2" rx="2.5" ry="3" fill="rgba(255,255,255,0.15)" />
            {nivelFrutos >= 3 && (
              <ellipse cx="0" cy="0" rx="7" ry="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            )}
          </g>
        );
      })}
    </g>
  );

  // MONEDAS: solo aparecen cuando la UTILIDAD es positiva (ingresos > gastos)
  const coins = utilidad > 0 && (
    <g>
      {[
        { cx: 30, cy: 240, d: 0 },
        { cx: 165, cy: 235, d: 0.5 },
        { cx: 60, cy: 248, d: 1 },
        { cx: 140, cy: 244, d: 1.5 },
        ...(utilidad > 50000000 ? [
          { cx: 20, cy: 230, d: 2 },
          { cx: 175, cy: 228, d: 2.5 },
        ] : []),
      ].map((c, i) => (
        <g key={`coin-${i}`} style={{ animation: `coinFloat 3s ${c.d}s ease-in-out infinite` }}>
          <circle cx={c.cx} cy={c.cy} r="6" fill="#f5c842" stroke="#d4a030" strokeWidth="0.8" />
          <text x={c.cx} y={c.cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#8a6d1b" fontWeight="bold">$</text>
        </g>
      ))}
    </g>
  );

  return (
    <div style={{
      background: "linear-gradient(180deg, #e8f5e9 0%, #f1f8e9 40%, #fffde7 100%)",
      borderRadius: 16,
      padding: "16px 8px 8px",
      marginBottom: 16,
      boxShadow: "0 2px 12px rgba(45,138,78,0.1)",
      border: "1px solid rgba(45,138,78,0.15)",
      overflow: "hidden",
      position: "relative",
    }}>
      <style>{`
        @keyframes leafSway {
          0% { transform: rotate(-3deg); }
          100% { transform: rotate(3deg); }
        }
        @keyframes flowerBounce {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-2px) scale(1.05); }
        }
        @keyframes fruitDangle {
          0% { transform: rotate(-2deg) translateY(0); }
          100% { transform: rotate(2deg) translateY(1px); }
        }
        @keyframes growUp {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes coinFloat {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes sparkle {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        @keyframes rainDrop {
          0% { transform: translateY(-20px); opacity: 0; }
          30% { opacity: 0.6; }
          100% { transform: translateY(40px); opacity: 0; }
        }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#2d8a4e" }}>Tu Gulupa</span>
        <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>{nivelLabel}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          viewBox="0 0 200 280"
          width="220"
          height="300"
          style={{
            transform: `scale(${pulseScale})`,
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            filter: nivelFrutos >= 3 ? "drop-shadow(0 0 8px rgba(124,58,237,0.3))" : "none",
          }}
        >
          {/* Sky particles for high levels */}
          {nivelPlanta >= 5 && (
            <g opacity="0.4">
              {[...Array(5)].map((_, i) => (
                <circle key={`p-${i}`} cx={30 + i * 35} cy={15 + (i % 3) * 10} r="1"
                  fill="#a0d9a0" style={{ animation: `rainDrop ${2 + i * 0.5}s ${i * 0.3}s linear infinite` }} />
              ))}
            </g>
          )}
          
          {tierra}
          {semilla}
          {tallo}
          {hojas}
          {flores}
          {frutos}
          {coins}

          {/* Sparkles on money added */}
          {sparkles.map((s) => (
            <g key={s.id} style={{ animation: `sparkle 0.8s ${s.delay}s ease-out forwards` }}>
              <circle cx={s.x} cy={s.y} r="3" fill={s.color || "#f5c842"} opacity="0.9" />
              <circle cx={s.x} cy={s.y} r="1" fill="white" />
            </g>
          ))}

          {/* Level 0 - empty pot indicator */}
          {nivelPlanta === 0 && nivelFrutos === 0 && (
            <text x="100" y="230" textAnchor="middle" fontSize="11" fill="#94a3b8" fontStyle="italic">
              Agrega registros para verla crecer
            </text>
          )}
        </svg>
      </div>

      {/* Growth progress bar - dual bar */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>🌱 Inversión</span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>🫐 Cosecha</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              borderRadius: 3,
              background: "linear-gradient(90deg, #4a7c59, #2d8a4e, #5cb84d)",
              width: `${Math.min((nivelPlanta / 5) * 100, 100)}%`,
              transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }} />
          </div>
          <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              borderRadius: 3,
              background: nivelFrutos >= 3
                ? "linear-gradient(90deg, #7c3aed, #c084fc, #f5c842)"
                : "linear-gradient(90deg, #7c3aed, #a78bfa)",
              width: `${Math.min((nivelFrutos / 4) * 100, 100)}%`,
              transition: "width 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "#94a3b8" }}>
          <span>🟢 Planta: {nivelPlanta}/5</span>
          <span>🟣 Frutos: {nivelFrutos}/4</span>
        </div>
      </div>

      {/* Financial Summary Panel */}
      {(() => {
        const utilidad = ingresos - inversion;
        const positiva = utilidad >= 0;
        return (
          <div style={{
            margin: "12px 12px 4px",
            padding: "12px 16px",
            background: positiva ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
            borderRadius: 12,
            border: `1px solid ${positiva ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}>
            {/* Utilidad principal */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {positiva ? "📈" : "📉"} Utilidad hasta el momento
              </p>
              <p style={{
                margin: "4px 0 0",
                fontSize: 26,
                fontWeight: 900,
                color: positiva ? "#10b981" : "#ef4444",
                letterSpacing: -1,
                lineHeight: 1,
              }}>
                {formatCOP(utilidad)}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "#94a3b8" }}>
                Ingresos − (Costos + Gastos + Compras)
              </p>
            </div>

            {/* Desglose visual */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(16,185,129,0.1)",
                textAlign: "center",
                minWidth: 80,
              }}>
                <p style={{ margin: 0, fontSize: 9, color: "#10b981", fontWeight: 600 }}>💰 INGRESOS</p>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: "#10b981" }}>{formatCOPShort(ingresos)}</p>
              </div>
              <div style={{
                padding: "6px 4px",
                display: "flex",
                alignItems: "center",
                fontSize: 16,
                color: "#94a3b8",
                fontWeight: 700,
              }}>−</div>
              <div style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.1)",
                textAlign: "center",
                minWidth: 80,
              }}>
                <p style={{ margin: 0, fontSize: 9, color: "#ef4444", fontWeight: 600 }}>🔥 GASTADO</p>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: "#ef4444" }}>{formatCOPShort(inversion)}</p>
              </div>
              <div style={{
                padding: "6px 4px",
                display: "flex",
                alignItems: "center",
                fontSize: 16,
                color: "#94a3b8",
                fontWeight: 700,
              }}>=</div>
              <div style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: positiva ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                textAlign: "center",
                minWidth: 80,
                border: `1.5px solid ${positiva ? "#10b981" : "#ef4444"}`,
              }}>
                <p style={{ margin: 0, fontSize: 9, color: positiva ? "#10b981" : "#ef4444", fontWeight: 600 }}>{positiva ? "✅ GANANCIA" : "⏳ POR RECUPERAR"}</p>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 900, color: positiva ? "#10b981" : "#ef4444" }}>{formatCOPShort(Math.abs(utilidad))}</p>
              </div>
            </div>

            {/* Mensaje motivacional */}
            {(inversion > 0 || ingresos > 0) && (
              <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                {positiva
                  ? nivelFrutos >= 4 ? "🏆 ¡Exportación plena! Tu gulupa es rentable y la inversión se recuperó."
                  : nivelFrutos >= 2 ? "🎉 ¡Utilidad positiva! Los frutos están dando resultado."
                  : "💚 Vas en positivo — sigue cosechando."
                  : nivelFrutos >= 1 ? "🫐 Ya hay ingresos — los frutos aparecen, falta recuperar la inversión total."
                  : nivelPlanta >= 5 ? "🌸 Planta madura y florecida — lista para producir. Registra tu primera venta para ver los frutos."
                  : nivelPlanta >= 4 ? "🌿 Desarrollo vegetativo fuerte — la floración se acerca."
                  : nivelPlanta >= 3 ? "🪴 Planta creciendo — inversión en terreno, tutorado y mantenimiento."
                  : nivelPlanta >= 1 ? "🌱 Inversión inicial — semillero y establecimiento del cultivo."
                  : "📋 Empieza a registrar gastos para ver crecer tu gulupa."}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// Tab button component
function TabBtn({ active, onClick, children, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        border: "none",
        borderBottom: active ? `3px solid ${color || "#2d8a4e"}` : "3px solid transparent",
        background: active ? "rgba(45,138,78,0.08)" : "transparent",
        color: active ? (color || "#2d8a4e") : "#64748b",
        fontWeight: active ? 700 : 500,
        fontSize: 14,
        cursor: "pointer",
        transition: "all 0.2s",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {children}
    </button>
  );
}

export default function GulupaTool() {
  const [tab, setTab] = useState("dashboard");
  const [fechaSiembra, setFechaSiembra] = useState("");
  const [registros, setRegistros] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: "costos",
    subcategoria: "",
    descripcion: "",
    monto: "",
    etapa: "",
    proveedor: "",
    soporte: "",
  });
  const [editId, setEditId] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("todos");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [dbConectada, setDbConectada] = useState(false);
  const fileInputRef = useRef(null);

  // Cargar datos de Supabase al inicio
  useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      try {
        const [regs, config] = await Promise.all([
          cargarRegistros(),
          cargarConfiguracion(),
        ]);
        setRegistros(regs);
        if (config?.fecha_siembra) {
          setFechaSiembra(config.fecha_siembra);
        }
        setDbConectada(!!supabase);
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
      setCargando(false);
    }
    cargarDatos();
  }, []);

  // Guardar fecha de siembra cuando cambie
  const handleFechaSiembra = useCallback(async (nuevaFecha) => {
    setFechaSiembra(nuevaFecha);
    await guardarFechaSiembra(nuevaFecha || null);
  }, []);

  const etapaActual = detectarEtapa(fechaSiembra);

  // Image handling for receipts
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      setImageAnalysis(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!imagePreview) return;
    setAnalyzingImage(true);
    try {
      const base64Data = imagePreview.split(",")[1];
      const mediaType = imagePreview.split(";")[0].split(":")[1];
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: mediaType, data: base64Data },
                },
                {
                  type: "text",
                  text: `Eres un experto contable agrícola colombiano. Analiza esta imagen de factura/recibo y extrae SOLO un JSON válido (sin markdown, sin backticks) con esta estructura exacta:
{"proveedor":"nombre","fecha":"YYYY-MM-DD","items":[{"descripcion":"texto","cantidad":1,"valor":0}],"total":0,"categoria":"costos|gastos|compras","subcategoria":"insumos|mano_de_obra|transporte|empaque|certificaciones|fertilizantes|agroquimicos|herramientas|servicios|otro","notas":"observaciones relevantes para cultivo de gulupa exportación"}
Si no puedes leer algún campo, usa "N/D". La categoría debe ser la más apropiada para un cultivo de gulupa de exportación.`,
                },
              ],
            },
          ],
        }),
      });
      const data = await response.json();
      const text = data.content?.map((i) => i.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setImageAnalysis(parsed);
      // Auto-fill form
      setFormData((prev) => ({
        ...prev,
        fecha: parsed.fecha !== "N/D" ? parsed.fecha : prev.fecha,
        categoria: parsed.categoria || "costos",
        subcategoria: parsed.subcategoria || "",
        descripcion: parsed.items?.map((i) => `${i.descripcion} x${i.cantidad}`).join(", ") || "",
        monto: parsed.total?.toString() || "",
        proveedor: parsed.proveedor !== "N/D" ? parsed.proveedor : "",
        soporte: "Factura/Recibo escaneado",
      }));
    } catch (err) {
      setImageAnalysis({ error: "No se pudo analizar la imagen. Intenta con otra foto más nítida." });
    }
    setAnalyzingImage(false);
  }, [imagePreview]);

  const handleSubmit = useCallback(async () => {
    if (!formData.descripcion || !formData.monto) return;
    const regData = {
      ...formData,
      monto: parseFloat(formData.monto) || 0,
      etapa: etapaActual?.etapa?.nombre || "Sin etapa",
    };

    if (editId) {
      // Actualizar en Supabase
      const updated = await actualizarRegistro(editId, regData);
      if (updated) {
        setRegistros((prev) => prev.map((r) => (r.id === editId ? updated : r)));
      } else {
        // Fallback local
        setRegistros((prev) => prev.map((r) => (r.id === editId ? { ...regData, id: editId } : r)));
      }
      setEditId(null);
    } else {
      // Insertar en Supabase
      const saved = await guardarRegistro(regData);
      if (saved) {
        setRegistros((prev) => [saved, ...prev]);
      } else {
        // Fallback local
        setRegistros((prev) => [{ ...regData, id: generarId() }, ...prev]);
      }
    }
    setFormData({ fecha: new Date().toISOString().slice(0, 10), categoria: "costos", subcategoria: "", descripcion: "", monto: "", etapa: "", proveedor: "", soporte: "" });
    setShowForm(false);
    setImagePreview(null);
    setImageAnalysis(null);
  }, [formData, editId, etapaActual]);

  const handleEdit = (reg) => {
    setFormData({ ...reg, monto: reg.monto.toString() });
    setEditId(reg.id);
    setShowForm(true);
  };

  const handleDelete = useCallback(async (id) => {
    const ok = await eliminarRegistro(id);
    if (ok) {
      setRegistros((prev) => prev.filter((r) => r.id !== id));
    }
  }, []);

  // Filtered data
  const registrosFiltrados = registros.filter((r) => {
    if (filtroCategoria !== "todos" && r.categoria !== filtroCategoria) return false;
    if (filtroMes !== "todos" && r.fecha?.slice(0, 7) !== filtroMes) return false;
    return true;
  });

  // Summary calculations
  const totalPorCategoria = Object.keys(CATEGORIAS).reduce((acc, cat) => {
    acc[cat] = registros.filter((r) => r.categoria === cat).reduce((s, r) => s + r.monto, 0);
    return acc;
  }, {});

  const totalGeneral = registros.reduce((s, r) => s + r.monto, 0);
  const totalCostosGastos = (totalPorCategoria.costos || 0) + (totalPorCategoria.gastos || 0) + (totalPorCategoria.compras || 0);
  const utilidadBruta = (totalPorCategoria.ingresos || 0) - totalCostosGastos;

  // Monthly breakdown
  const mesesUnicos = [...new Set(registros.map((r) => r.fecha?.slice(0, 7)))].sort();

  const porMes = mesesUnicos.map((m) => {
    const del_mes = registros.filter((r) => r.fecha?.slice(0, 7) === m);
    return {
      mes: m,
      costos: del_mes.filter((r) => r.categoria === "costos").reduce((s, r) => s + r.monto, 0),
      gastos: del_mes.filter((r) => r.categoria === "gastos").reduce((s, r) => s + r.monto, 0),
      compras: del_mes.filter((r) => r.categoria === "compras").reduce((s, r) => s + r.monto, 0),
      ingresos: del_mes.filter((r) => r.categoria === "ingresos").reduce((s, r) => s + r.monto, 0),
      total: del_mes.reduce((s, r) => s + r.monto, 0),
    };
  });

  const maxBarVal = Math.max(...porMes.map((m) => Math.max(m.costos + m.gastos + m.compras, m.ingresos)), 1);

  const containerStyle = {
    maxWidth: 1100,
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    background: "#f8faf9",
    minHeight: "100vh",
    color: "#1e293b",
  };

  const cardStyle = {
    background: "white",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    marginBottom: 16,
  };

  return (
    <div style={containerStyle}>
      {/* Loading screen */}
      {cargando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(248,250,249,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 64, animation: "fruitDangle 1.5s ease-in-out infinite alternate" }}>🫐</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#2d8a4e" }}>Cargando GulupaConta...</p>
          <p style={{ fontSize: 12, color: "#94a3b8" }}>Conectando con la base de datos</p>
          <style>{`@keyframes fruitDangle { 0% { transform: rotate(-5deg); } 100% { transform: rotate(5deg); } }`}</style>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a472a 0%, #2d8a4e 50%, #4a7c59 100%)", padding: "28px 24px 20px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <span style={{ fontSize: 36 }}>🫐</span>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>GulupaConta</h1>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.85, fontWeight: 500 }}>Herramienta Contable — Cultivo de Gulupa Exportación</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dbConectada ? "#4ade80" : "#fbbf24", display: "inline-block" }} />
            <span style={{ fontSize: 10, opacity: 0.8 }}>{dbConectada ? "Conectado" : "Modo local"}</span>
          </div>
        </div>
        {/* Fecha siembra */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Fecha de siembra:</label>
          <input
            type="date"
            value={fechaSiembra}
            onChange={(e) => handleFechaSiembra(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "white", fontSize: 13 }}
          />
          {etapaActual && (
            <span style={{ background: etapaActual.etapa.color, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {etapaActual.etapa.icon} {etapaActual.etapa.nombre} — Mes {etapaActual.mesesTranscurridos}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "white", borderBottom: "1px solid #e2e8f0", overflowX: "auto" }}>
        <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")}>📊 Dashboard</TabBtn>
        <TabBtn active={tab === "registros"} onClick={() => setTab("registros")}>📝 Registros</TabBtn>
        <TabBtn active={tab === "etapas"} onClick={() => setTab("etapas")}>🌱 Etapas Cultivo</TabBtn>
        <TabBtn active={tab === "presupuesto"} onClick={() => setTab("presupuesto")}>💰 Presupuesto</TabBtn>
        <TabBtn active={tab === "scanner"} onClick={() => setTab("scanner")} color="#7c3aed">📸 Escanear Factura</TabBtn>
      </div>

      <div style={{ padding: 16 }}>
        {/* ============= DASHBOARD ============= */}
        {tab === "dashboard" && (
          <div>
            {/* Etapa actual card */}
            {etapaActual && (
              <div style={{ ...cardStyle, background: `linear-gradient(135deg, ${etapaActual.etapa.color}15, ${etapaActual.etapa.color}08)`, border: `1px solid ${etapaActual.etapa.color}30` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 32 }}>{etapaActual.etapa.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: etapaActual.etapa.color }}>Etapa Actual: {etapaActual.etapa.nombre}</h3>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>{etapaActual.etapa.descripcion}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {etapaActual.etapa.costosTypicos.map((c, i) => (
                    <span key={i} style={{ background: `${etapaActual.etapa.color}20`, color: etapaActual.etapa.color, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                      {c}
                    </span>
                  ))}
                </div>
                {/* Timeline */}
                <div style={{ marginTop: 16, position: "relative" }}>
                  <div style={{ display: "flex", gap: 2, height: 8, borderRadius: 4, overflow: "hidden" }}>
                    {ETAPAS_FENOLOGICAS.map((et) => (
                      <div
                        key={et.id}
                        style={{
                          flex: et.meses[1] - et.meses[0],
                          background: et.id === etapaActual.etapa.id ? et.color : `${et.color}30`,
                          transition: "all 0.3s",
                        }}
                        title={et.nombre}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Mes 0</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Mes 6</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Mes 14</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>Mes 48</span>
                  </div>
                </div>
              </div>
            )}

            {/* Animated Gulupa Plant */}
            <GulupaPlant inversion={totalCostosGastos} ingresos={totalPorCategoria.ingresos || 0} />

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              {Object.entries(CATEGORIAS).map(([key, cat]) => (
                <div key={key} style={{ ...cardStyle, padding: 16, textAlign: "center", borderLeft: `4px solid ${cat.color}` }}>
                  <span style={{ fontSize: 22 }}>{cat.icon}</span>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{cat.label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 800, color: cat.color }}>{formatCOP(totalPorCategoria[key])}</p>
                </div>
              ))}
              <div style={{ ...cardStyle, padding: 16, textAlign: "center", borderLeft: "4px solid #dc2626", background: "linear-gradient(135deg, #fef2f2, white)" }}>
                <span style={{ fontSize: 22 }}>🔥</span>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Total Gastado</p>
                <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 800, color: "#dc2626" }}>{formatCOP(totalCostosGastos)}</p>
                <p style={{ margin: "4px 0 0", fontSize: 9, color: "#94a3b8" }}>Costos + Gastos + Compras</p>
              </div>
              <div style={{ ...cardStyle, padding: 16, textAlign: "center", borderLeft: `4px solid ${utilidadBruta >= 0 ? "#10b981" : "#ef4444"}` }}>
                <span style={{ fontSize: 22 }}>{utilidadBruta >= 0 ? "📈" : "📉"}</span>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>Utilidad</p>
                <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 800, color: utilidadBruta >= 0 ? "#10b981" : "#ef4444" }}>{formatCOP(utilidadBruta)}</p>
              </div>
            </div>

            {/* Info Panel - Guía de Categorías */}
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden", marginBottom: 16 }}>
              <button
                onClick={() => setShowInfo(!showInfo)}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: showInfo ? "#f0f9ff" : "white",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1d4ed8",
                  fontFamily: "inherit",
                }}
              >
                <span>📘 ¿Qué significa cada categoría? — Guía rápida</span>
                <span style={{ transform: showInfo ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
              </button>
              {showInfo && (
                <div style={{ padding: "0 20px 20px" }}>
                  {Object.entries(CATEGORIAS).map(([key, cat]) => (
                    <div key={key} style={{ padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{cat.icon}</span>
                        <span style={{ fontWeight: 800, color: cat.color, fontSize: 14 }}>{cat.label}</span>
                      </div>
                      <p style={{ margin: "0 0 4px", fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{cat.descripcion}</p>
                      <p style={{ margin: "0 0 4px", fontSize: 12, color: "#64748b" }}>
                        <strong style={{ color: "#475569" }}>Ejemplos:</strong> {cat.ejemplos}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: cat.color, fontWeight: 600, fontStyle: "italic" }}>
                        💡 {cat.clave}
                      </p>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, padding: 12, background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
                      <strong>¿Por qué importa clasificar bien?</strong> Al separar costos, gastos y compras puedes calcular tu <strong>costo real por kilo de gulupa exportada</strong> (solo costos directos), saber cuánto necesitas para mantener el negocio funcionando (<strong>punto de equilibrio</strong> = gastos fijos), y ver cuánto estás invirtiendo en infraestructura e inventario (compras). Ingresos menos todo lo anterior = tu <strong>utilidad real</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
            {porMes.length > 0 && (
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>📊 Resumen Mensual</h3>
                <div style={{ overflowX: "auto" }}>
                  {porMes.map((m) => {
                    const egresos = m.costos + m.gastos + m.compras;
                    return (
                      <div key={m.mes} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, width: 60, flexShrink: 0, color: "#64748b" }}>{m.mes}</span>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ height: 14, borderRadius: 3, background: "linear-gradient(90deg, #ef4444, #f97316, #3b82f6)", width: `${(egresos / maxBarVal) * 100}%`, minWidth: egresos > 0 ? 4 : 0, transition: "width 0.4s" }} />
                            <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>{formatCOP(egresos)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ height: 14, borderRadius: 3, background: "#10b981", width: `${(m.ingresos / maxBarVal) * 100}%`, minWidth: m.ingresos > 0 ? 4 : 0, transition: "width 0.4s" }} />
                            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>{formatCOP(m.ingresos)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>🔴 Egresos (Costos+Gastos+Compras)</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>🟢 Ingresos</span>
                </div>
              </div>
            )}

            {registros.length === 0 && (
              <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#94a3b8" }}>
                <span style={{ fontSize: 48 }}>📋</span>
                <p style={{ fontWeight: 600, marginTop: 8 }}>Sin registros aún</p>
                <p style={{ fontSize: 13 }}>Empieza escaneando una factura o agregando un registro manual.</p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
                  <button onClick={() => setTab("scanner")} style={{ padding: "8px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    📸 Escanear Factura
                  </button>
                  <button onClick={() => { setTab("registros"); setShowForm(true); }} style={{ padding: "8px 20px", background: "#2d8a4e", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    ➕ Agregar Manual
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============= REGISTROS ============= */}
        {tab === "registros" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📝 Registros Contables</h3>
              <button onClick={() => { setShowForm(true); setEditId(null); }} style={{ padding: "8px 18px", background: "#2d8a4e", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                ➕ Nuevo Registro
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}>
                <option value="todos">Todas las categorías</option>
                {Object.entries(CATEGORIAS).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}>
                <option value="todos">Todos los meses</option>
                {mesesUnicos.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Form Modal */}
            {showForm && (
              <div style={{ ...cardStyle, border: "2px solid #2d8a4e", marginBottom: 16 }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#2d8a4e" }}>{editId ? "✏️ Editar Registro" : "➕ Nuevo Registro"}</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Fecha</label>
                    <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Categoría</label>
                    <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}>
                      {Object.entries(CATEGORIAS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    {formData.categoria && CATEGORIAS[formData.categoria] && (
                      <p style={{ margin: "4px 0 0", fontSize: 10, color: CATEGORIAS[formData.categoria].color, lineHeight: 1.4 }}>
                        💡 {CATEGORIAS[formData.categoria].clave}
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Subcategoría</label>
                    <select value={formData.subcategoria} onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13 }}>
                      <option value="">Seleccionar...</option>
                      <option value="fertilizantes">Fertilizantes</option>
                      <option value="agroquimicos">Agroquímicos</option>
                      <option value="mano_de_obra">Mano de obra</option>
                      <option value="transporte">Transporte</option>
                      <option value="empaque">Empaque/Poscosecha</option>
                      <option value="certificaciones">Certificaciones</option>
                      <option value="herramientas">Herramientas</option>
                      <option value="insumos">Insumos generales</option>
                      <option value="servicios">Servicios públicos</option>
                      <option value="arriendo">Arriendo</option>
                      <option value="venta_exportacion">Venta exportación</option>
                      <option value="venta_nacional">Venta nacional</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Monto (COP)</label>
                    <input type="number" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: e.target.value })} placeholder="0" style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Descripción</label>
                    <input type="text" value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} placeholder="Ej: Compra fertilizante NPK 15-15-15" style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Proveedor</label>
                    <input type="text" value={formData.proveedor} onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })} placeholder="Nombre proveedor" style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Soporte</label>
                    <input type="text" value={formData.soporte} onChange={(e) => setFormData({ ...formData, soporte: e.target.value })} placeholder="No. factura, recibo, etc." style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={handleSubmit} style={{ padding: "8px 20px", background: "#2d8a4e", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    {editId ? "💾 Actualizar" : "✅ Guardar"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: "8px 20px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Records Table */}
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8faf9" }}>
                      {["Fecha", "Categoría", "Descripción", "Proveedor", "Monto (COP)", "Etapa", ""].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#94a3b8" }}>Sin registros</td>
                      </tr>
                    ) : (
                      registrosFiltrados.map((r) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{r.fecha}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: `${CATEGORIAS[r.categoria]?.color}15`, color: CATEGORIAS[r.categoria]?.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                              {CATEGORIAS[r.categoria]?.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.descripcion}</td>
                          <td style={{ padding: "10px 12px", color: "#64748b" }}>{r.proveedor || "—"}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: r.categoria === "ingresos" ? "#10b981" : "#1e293b" }}>{formatCOP(r.monto)}</td>
                          <td style={{ padding: "10px 12px", fontSize: 11, color: "#94a3b8" }}>{r.etapa}</td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            <button onClick={() => handleEdit(r)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, marginRight: 4 }}>✏️</button>
                            <button onClick={() => handleDelete(r.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>🗑️</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============= ETAPAS CULTIVO ============= */}
        {tab === "etapas" && (
          <div>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700 }}>🌱 Etapas Fenológicas — Gulupa (Passiflora edulis Sims)</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Ciclo completo de 13.5 meses hasta primera cosecha. Vida útil del cultivo: 2–4 años. Altitud recomendada: 1,800–2,400 m.s.n.m.
            </p>
            {ETAPAS_FENOLOGICAS.map((et) => {
              const isActive = etapaActual?.etapa?.id === et.id;
              return (
                <div key={et.id} style={{ ...cardStyle, borderLeft: `4px solid ${et.color}`, background: isActive ? `${et.color}08` : "white", transition: "all 0.3s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 28, lineHeight: 1 }}>{et.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h4 style={{ margin: 0, fontSize: 15, color: et.color }}>{et.nombre}</h4>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>({et.duracion})</span>
                        {isActive && <span style={{ background: et.color, color: "white", padding: "2px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>ETAPA ACTUAL</span>}
                      </div>
                      <p style={{ margin: "6px 0", fontSize: 13, color: "#475569" }}>{et.descripcion}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {et.costosTypicos.map((c, i) => (
                          <span key={i} style={{ background: `${et.color}12`, color: et.color, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600 }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ ...cardStyle, background: "#fffbeb", borderLeft: "4px solid #f59e0b" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "#b45309" }}>📌 Datos clave para exportación</h4>
              <p style={{ fontSize: 12, color: "#78716c", lineHeight: 1.7, margin: 0 }}>
                Ventanas de exportación: Feb–Jul y Ago–Dic. Principales destinos: Países Bajos (85%+), Bélgica, Alemania, Reino Unido.
                Precios varían entre $4,500/kg (temporada baja) y $6,000/kg (alta demanda). Cosecha 2–3 veces/semana.
                Requiere registro ICA (Res. 0448/2016) y preferiblemente certificación GlobalGAP.
              </p>
            </div>
          </div>
        )}

        {/* ============= PRESUPUESTO ============= */}
        {tab === "presupuesto" && (
          <div>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700 }}>💰 Control de Presupuesto Mensual</h3>

            {porMes.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: 40, color: "#94a3b8" }}>
                <p style={{ fontWeight: 600 }}>Agrega registros para ver el presupuesto desglosado</p>
              </div>
            ) : (
              <>
                {/* Summary table */}
                <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8faf9" }}>
                          {["Mes", "Costos (COP)", "Gastos (COP)", "Compras (COP)", "Total Egresos", "Ingresos (COP)", "Balance"].map((h) => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", borderBottom: "2px solid #e2e8f0" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {porMes.map((m) => {
                          const egresos = m.costos + m.gastos + m.compras;
                          const balance = m.ingresos - egresos;
                          return (
                            <tr key={m.mes} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{m.mes}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "#ef4444" }}>{formatCOP(m.costos)}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "#f97316" }}>{formatCOP(m.gastos)}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", color: "#3b82f6" }}>{formatCOP(m.compras)}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>{formatCOP(egresos)}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#10b981" }}>{formatCOP(m.ingresos)}</td>
                              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: balance >= 0 ? "#10b981" : "#ef4444" }}>{formatCOP(balance)}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: "#f0fdf4", fontWeight: 800 }}>
                          <td style={{ padding: "12px", textAlign: "right" }}>TOTAL</td>
                          <td style={{ padding: "12px", textAlign: "right", color: "#ef4444" }}>{formatCOP(totalPorCategoria.costos)}</td>
                          <td style={{ padding: "12px", textAlign: "right", color: "#f97316" }}>{formatCOP(totalPorCategoria.gastos)}</td>
                          <td style={{ padding: "12px", textAlign: "right", color: "#3b82f6" }}>{formatCOP(totalPorCategoria.compras)}</td>
                          <td style={{ padding: "12px", textAlign: "right", color: "#dc2626" }}>{formatCOP(totalCostosGastos)}</td>
                          <td style={{ padding: "12px", textAlign: "right", color: "#10b981" }}>{formatCOP(totalPorCategoria.ingresos)}</td>
                          <td style={{ padding: "12px", textAlign: "right", color: utilidadBruta >= 0 ? "#10b981" : "#ef4444" }}>{formatCOP(utilidadBruta)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cost breakdown by subcategory */}
                <div style={cardStyle}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Desglose por Subcategoría</h4>
                  {(() => {
                    const subTotals = {};
                    registros.forEach((r) => {
                      const key = r.subcategoria || "sin_clasificar";
                      subTotals[key] = (subTotals[key] || 0) + r.monto;
                    });
                    const sorted = Object.entries(subTotals).sort((a, b) => b[1] - a[1]);
                    const maxSub = Math.max(...sorted.map(([, v]) => v), 1);
                    return sorted.map(([sub, val]) => (
                      <div key={sub} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <span style={{ width: 120, fontSize: 12, fontWeight: 600, color: "#475569", textTransform: "capitalize", flexShrink: 0 }}>{sub.replace(/_/g, " ")}</span>
                        <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 20 }}>
                          <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #2d8a4e, #4a7c59)", width: `${(val / maxSub) * 100}%`, transition: "width 0.4s", display: "flex", alignItems: "center", paddingLeft: 6 }}>
                            <span style={{ fontSize: 10, color: "white", fontWeight: 700 }}>{formatCOP(val)}</span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* ============= SCANNER ============= */}
        {tab === "scanner" && (
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>📸 Escáner de Facturas y Recibos</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Sube una foto de tu factura o recibo y la IA extraerá automáticamente los datos para registrarlos como costos, gastos o compras de tu cultivo de gulupa.
            </p>

            <div style={cardStyle}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 12,
                  padding: 40,
                  textAlign: "center",
                  cursor: "pointer",
                  background: imagePreview ? "transparent" : "#f8faf9",
                  transition: "all 0.2s",
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8 }} />
                ) : (
                  <>
                    <span style={{ fontSize: 48 }}>📄</span>
                    <p style={{ fontWeight: 600, color: "#475569", marginTop: 8 }}>Toca aquí para subir factura/recibo</p>
                    <p style={{ fontSize: 12, color: "#94a3b8" }}>JPG, PNG — Fotos de facturas, recibos de compra, comprobantes</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: "none" }} />

              {imagePreview && !imageAnalysis && (
                <button
                  onClick={analyzeImage}
                  disabled={analyzingImage}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginTop: 12,
                    background: analyzingImage ? "#94a3b8" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: analyzingImage ? "wait" : "pointer",
                  }}
                >
                  {analyzingImage ? "🔄 Analizando con IA..." : "🤖 Analizar Factura con IA"}
                </button>
              )}

              {imageAnalysis && !imageAnalysis.error && (
                <div style={{ marginTop: 14, padding: 16, background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
                  <h4 style={{ margin: "0 0 10px", color: "#15803d", fontSize: 14 }}>✅ Datos extraídos</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                    <div><strong>Proveedor:</strong> {imageAnalysis.proveedor}</div>
                    <div><strong>Fecha:</strong> {imageAnalysis.fecha}</div>
                    <div><strong>Total:</strong> <span style={{ color: "#dc2626", fontWeight: 700 }}>{formatCOP(imageAnalysis.total)}</span></div>
                    <div><strong>Categoría:</strong> {imageAnalysis.categoria}</div>
                  </div>
                  {imageAnalysis.items?.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <strong style={{ fontSize: 12 }}>Ítems:</strong>
                      {imageAnalysis.items.map((item, i) => (
                        <div key={i} style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                          • {item.descripcion} × {item.cantidad} = {formatCOP(item.valor)}
                        </div>
                      ))}
                    </div>
                  )}
                  {imageAnalysis.notas && <p style={{ fontSize: 12, color: "#64748b", marginTop: 8, fontStyle: "italic" }}>💡 {imageAnalysis.notas}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => { setTab("registros"); setShowForm(true); }}
                      style={{ padding: "8px 20px", background: "#2d8a4e", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                    >
                      ✅ Confirmar y Registrar
                    </button>
                    <button
                      onClick={() => { setImagePreview(null); setImageAnalysis(null); }}
                      style={{ padding: "8px 20px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                    >
                      🔄 Escanear otra
                    </button>
                  </div>
                </div>
              )}

              {imageAnalysis?.error && (
                <div style={{ marginTop: 14, padding: 16, background: "#fef2f2", borderRadius: 10, border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 }}>
                  ⚠️ {imageAnalysis.error}
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, background: "#f0f9ff", borderLeft: "4px solid #3b82f6" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "#1d4ed8" }}>💡 Tips para mejores resultados</h4>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.7 }}>
                Toma la foto con buena iluminación y sin sombras. Asegúrate de que se lean claramente los montos, la fecha y el nombre del proveedor.
                Funciona con facturas de agroinsumos, recibos de ferretería, comprobantes de pago de jornales, y más.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 24px", textAlign: "center", borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#94a3b8" }}>
        GulupaConta v1.0 — Herramienta contable en Pesos Colombianos (COP) — Cultivo de Gulupa Exportación — Risaralda, Colombia
      </div>
    </div>
  );
}
