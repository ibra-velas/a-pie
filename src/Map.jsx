import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'

export const CATEGORY_COLORS = {
  salud:      '#D85A30',
  educacion:  '#1D9E75',
  ocio:       '#7F77DD',
  transporte: '#BA7517',
  comercio:   '#E0A020',
  cultura:    '#C2436A',
}

// Display colors follow the *sidebar groups*, not the DB category: the DB
// classifies heladeria as comercio but restaurante as ocio, so food showed
// in two different colors. The DB/ingestion stays untouched on purpose —
// this remap is frontend-only. Subcategories not listed here fall back to
// their CATEGORY_COLORS entry.
export const GROUP_COLORS = {
  comida:  '#C4622D',
  tiendas: '#2E86AB',
}

export const SUB_COLORS = {
  // Comida & Bebida
  restaurante:   '#F57C00',  // a juego con su marcador custom (naranja saturado)
  bar:           '#1B5E20',  // verde oscuro, a petición
  cafe:          '#6F4E37',  // coffee brown, a petición — no el terracota del grupo
  comida_rapida: '#DA291C',  // rojo fast-food (McDonald's red), a petición
  panaderia:     '#C49A6C',  // marrón kraft cálido (bolsa de papel), a petición
  heladeria:     '#F06EAA',  // candy pink, a petición
  // Alimentación fresca: mismo verde manzana que supermercado, a petición
  carniceria:    '#8DB600',
  fruteria:      '#8DB600',
  pescaderia:    '#8DB600',
  mercado:       GROUP_COLORS.comida,
  // Salud — azul de señalética hospitalaria, a petición. Farmacia lleva el
  // verde de su cruz (el marcador en sí es custom, SUB_MARKER_STYLES manda)
  farmacia:      '#00A14B',
  clinica:       '#005EB8',
  medico:        '#005EB8',
  hospital:      '#005EB8',
  // Ocio
  parque:        '#AED581',  // verde claro un poco más oscuro (jun 2026), el 🌳 contrasta encima
  discoteca:     '#B388EB',  // lavanda, a juego con su marcador (copa de martini lavanda)
  // Tiendas
  supermercado:  '#8DB600',  // verde manzana, a petición
  tienda:        GROUP_COLORS.tiendas,
  libreria:      '#F2E2C4',  // crema, a petición
  ferreteria:    '#9EA7AD',  // gris plata para pills/lista; el marcador es claro (SUB_MARKER_STYLES manda)
  peluqueria:    '#1A1A1A',  // a juego con su marcador custom (tijera sobre negro)
  floristeria:   '#F5DE6E',  // amarillo claro, a petición
  // Tiendas — retail añadido (colores 1ª pasada, a afinar)
  ropa:          '#5C6BC0',  // índigo
  calzado:       '#8D6E63',  // marrón cuero
  joyeria:       '#C9A227',  // dorado
  optica:        '#00897B',  // teal
  regalos:       '#E5447A',  // rosa regalo
  estetica:      '#F48FB1',  // rosa claro
  perfumeria:    '#C2185B',  // rosa intenso (perfumería/cosmética)
  papeleria:     '#5C9CE0',  // azul papel
  estanco:       '#8E4A49',  // granate (la "T" del estanco)
  kiosko:        '#78909C',  // gris azulado (prensa)
  muebles:       '#6D4C41',  // marrón oscuro
  electronica:   '#90A4AE',  // gris azulado claro
  // Servicios
  taller:        '#37474F',  // gris acero
}

export function colorFor(item) {
  return SUB_COLORS[item.subcategory] ?? CATEGORY_COLORS[item.category] ?? '#888'
}

const SUBCATEGORY_ICONS = {
  // Comida & Bebida
  restaurante:   '🍽️',
  bar:           '🍺',
  cafe:          '☕',
  comida_rapida: '🍔',
  panaderia:     '🍞',
  heladeria:     '🍦',
  carniceria:    '🥩',
  fruteria:      '🍎',
  pescaderia:    '🐟',
  mercado:       '🏪',
  // Comercio
  supermercado:  '🛒',
  tienda:        '🛍️',
  libreria:      '📚',
  ferreteria:    '🔧',
  peluqueria:    '✂️',
  floristeria:   '🌸',
  ropa:          '👕',
  calzado:       '👟',
  joyeria:       '💍',
  optica:        '👓',
  regalos:       '🎁',
  estetica:      '💅',
  perfumeria:    '💄',
  papeleria:     '📎',
  estanco:       '🚬',
  kiosko:        '🍬',
  muebles:       '🛋️',
  electronica:   '🔌',
  // Servicios
  taller:        '🛠️',
  // Salud
  farmacia:      '💊',
  clinica:       '🩺',
  medico:        '🩺',
  hospital:      '🏥',
  // Cultura
  biblioteca:    '📖',
  museo:         '🏛️',
  teatro:        '🎭',
  cine:          '🎬',
  // Ocio
  parque:        '🌳',
  deportes:      '⚽',
  piscina:       '🏊',
  gimnasio:      '💪',
  discoteca:     '🪩',
  // Educación
  colegio:       '🏫',
  universidad:   '🎓',
  instituto:     '🏫',
  guarderia:     '🧒',
  // Transporte
  parada_bus:    '🚌',
}

// Cruz azul claro sobre el azul de señalética: sustituye al emoji 🩺, que
// se perdía sobre el fondo azul. Ahora solo clinica (medico pasó a fonendoscopio).
const CRUZ_SANITARIA = {
  bg: '#005EB8',
  glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 2.5h6V9h6.5v6H15v6.5H9V15H2.5V9H9z" fill="#A8D8FF"/>
  </svg>`,
}

// Iconos Lucide (lucide.dev, licencia ISC). La app no carga la librería: cada
// glifo se inyecta como SVG en el marcador. strokeIcon() lleva los atributos
// compartidos para que cada entrada solo aporte sus paths + el color de trazo,
// elegido para contraste sobre su disco (blanco en discos saturados/oscuros,
// casi negro en los claros). Estudio de elección: estudio-iconos.html.
const L_DARK = '#2B2B2B'
const strokeIcon = (inner, stroke = '#fff', sw = 2.2) => s =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`

// Custom marker designs per subcategory (June 2026; emojis migrados a Lucide
// junio 2026). Cada entrada fija cara de disco, anillo y/o glifo SVG a `size`.
const SUB_MARKER_STYLES = {
  // ── Salud ──
  clinica: CRUZ_SANITARIA,
  medico:  { glyph: strokeIcon('<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>') },
  hospital:{ glyph: strokeIcon('<path d="M4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a1 1 0 0 1 1 1v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a1 1 0 0 1 1-1h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4a1 1 0 0 1-1-1V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a1 1 0 0 1-1 1z"/>') },
  // Classic pharmacy sign: green cross on white, black ring (sin tocar)
  farmacia: {
    bg: '#fff',
    ring: '#1A1A1A',
    glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 2.5h6V9h6.5v6H15v6.5H9V15H2.5V9H9z" fill="#00A14B"/>
    </svg>`,
  },
  peluqueria: { glyph: strokeIcon('<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>') },
  estetica:  { glyph: strokeIcon('<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>', L_DARK) },
  perfumeria:{ glyph: strokeIcon('<path d="M3 3h.01"/><path d="M7 5h.01"/><path d="M11 7h.01"/><path d="M3 7h.01"/><path d="M7 9h.01"/><path d="M3 11h.01"/><rect width="4" height="4" x="15" y="5"/><path d="m19 9 2 2v10c0 .6-.4 1-1 1h-6c-.6 0-1-.4-1-1V11l2-2"/><path d="m13 14 8-2"/><path d="m13 19 8-2"/>') },
  // ── Comida & Bebida ──
  restaurante:  { glyph: strokeIcon('<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>') },
  bar:          { glyph: strokeIcon('<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/>') },
  cafe:         { glyph: strokeIcon('<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>') },
  comida_rapida:{ glyph: strokeIcon('<path d="M12 16H4a2 2 0 1 1 0-4h16a2 2 0 1 1 0 4h-4.25"/><path d="M5 12a2 2 0 0 1-2-2 9 7 0 0 1 18 0 2 2 0 0 1-2 2"/><path d="M5 16a2 2 0 0 0-2 2 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 2 2 0 0 0-2-2"/><path d="m6.67 12 6.13 4.6a2 2 0 0 0 2.8-.4l3.15-4.2"/>') },
  panaderia:    { glyph: strokeIcon('<path d="M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487"/><path d="M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132"/><path d="M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42"/><path d="M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14"/><path d="M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676"/>', L_DARK) },
  heladeria:    { glyph: strokeIcon('<path d="m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11"/><path d="M17 7A5 5 0 0 0 7 7"/><path d="M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4"/>') },
  mercado:      { glyph: strokeIcon('<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>') },
  // Copa de martini lavanda sobre disco morado oscuro (sin tocar)
  discoteca: {
    bg: '#2A1A3A',
    glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="#D6BCFA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16l-8 9z"/>
      <line x1="18" y1="1.5" x2="11.5" y2="8"/>
      <line x1="12" y1="13" x2="12" y2="20"/>
      <line x1="8" y1="20" x2="16" y2="20"/>
    </svg>`,
  },
  // ── Tiendas ──
  supermercado:{ glyph: strokeIcon('<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>', L_DARK) },
  tienda:     { glyph: strokeIcon('<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>') },
  carniceria: { glyph: strokeIcon('<path d="M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3"/><path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1-2.29 7.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/><circle cx="12.5" cy="8.5" r="2.5"/>', L_DARK) },
  fruteria:   { glyph: strokeIcon('<path d="M12 6.528V3a1 1 0 0 1 1-1"/><path d="M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21"/>', L_DARK) },
  pescaderia: { glyph: strokeIcon('<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"/><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"/>', L_DARK) },
  ropa:       { glyph: strokeIcon('<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>') },
  calzado:    { glyph: strokeIcon('<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>') },
  joyeria:    { glyph: strokeIcon('<path d="M10.5 3 8 9l4 13 4-13-2.5-6"/><path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z"/><path d="M2 9h20"/>', L_DARK) },
  optica:     { glyph: strokeIcon('<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>') },
  regalos:    { glyph: strokeIcon('<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>') },
  papeleria:  { glyph: strokeIcon('<path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"/>') },
  estanco:    { glyph: strokeIcon('<path d="M17 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14"/><path d="M18 8c0-2.5-2-2.5-2-5"/><path d="M21 16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M22 8c0-2.5-2-2.5-2-5"/><path d="M7 12v4"/>') },
  kiosko:     { glyph: strokeIcon('<path d="M15 18h-5"/><path d="M18 14h-8"/><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="10" y="6" rx="1"/>') },
  muebles:    { glyph: strokeIcon('<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M4 18v2"/><path d="M20 18v2"/><path d="M12 4v9"/>') },
  electronica:{ glyph: strokeIcon('<path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="m2 22 3-3"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m18 3-4 4h6l-4 4"/>', L_DARK) },
  libreria:   { glyph: strokeIcon('<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>', L_DARK) },
  // Cara clara + anillo plata (diseño previo) ahora con la llave Lucide oscura
  ferreteria: { bg: '#F4F4F4', ring: '#9EA7AD', glyph: strokeIcon('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>', L_DARK) },
  floristeria:{ glyph: strokeIcon('<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/>', L_DARK) },
  taller:     { glyph: strokeIcon('<path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"/><path d="M7 14h.01"/><path d="M17 14h.01"/><rect width="18" height="8" x="3" y="10" rx="2"/><path d="M5 18v2"/><path d="M19 18v2"/>') },
  // ── Cultura ──
  biblioteca: { glyph: strokeIcon('<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>') },
  museo:      { glyph: strokeIcon('<path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>') },
  teatro:     { glyph: strokeIcon('<path d="M10 11h.01"/><path d="M14 6h.01"/><path d="M18 6h.01"/><path d="M6.5 13.1h.01"/><path d="M22 5c0 9-4 12-6 12s-6-3-6-12c0-2 2-3 6-3s6 1 6 3"/><path d="M17.4 9.9c-.8.8-2 .8-2.8 0"/><path d="M10.1 7.1C9 7.2 7.7 7.7 6 8.6c-3.5 2-4.7 3.9-3.7 5.6 4.5 7.8 9.5 8.4 11.2 7.4.9-.5 1.9-2.1 1.9-4.7"/><path d="M9.1 16.5c.3-1.1 1.4-1.7 2.4-1.4"/>') },
  cine:       { glyph: strokeIcon('<path d="m12.296 3.464 3.02 3.956"/><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m6.18 5.276 3.1 3.899"/>') },
  // ── Ocio ── (parque: árboles Lucide en trazo oscuro sobre disco verde #AED581)
  parque:     { glyph: strokeIcon('<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>', L_DARK) },
  deportes:   { glyph: strokeIcon('<path d="M11 7a16 16 20 0 1 10.98 4.362"/><path d="M12 12a13 13 0 0 1-8.66 5"/><path d="M16.83 13.634a16 16 0 0 1-9.267 7.328"/><path d="M20.66 17A13 13 0 0 0 12 12a13 13 0 0 1 0-10"/><path d="M8.17 15.366a16 16 0 0 1-1.713-11.69"/><circle cx="12" cy="12" r="10"/>') },
  piscina:    { glyph: strokeIcon('<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/>') },
  gimnasio:   { glyph: strokeIcon('<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/>') },
}

// Marker shape per group (June 2026): Comida & Bebida → pin gota, Tiendas →
// cuadradito redondeado, todo lo demás (Salud y belleza, Cultura y ocio) →
// círculo. The subcategory lists mirror PILL_GROUPS in Sidebar.jsx.
const TEARDROP_SUBS = new Set([
  'restaurante', 'bar', 'cafe', 'comida_rapida', 'panaderia', 'heladeria',
  'mercado', 'discoteca',
])
const SQUARE_SUBS = new Set([
  'supermercado', 'tienda', 'carniceria', 'fruteria', 'pescaderia', 'ropa',
  'calzado', 'joyeria', 'optica', 'regalos', 'papeleria', 'estanco', 'kiosko',
  'muebles', 'electronica', 'libreria', 'ferreteria', 'floristeria', 'taller',
])
function shapeFor(sub) {
  if (TEARDROP_SUBS.has(sub)) return 'teardrop'
  if (SQUARE_SUBS.has(sub)) return 'square'
  return 'circle'
}

// Below this zoom, non-selected markers are drawn as lightweight colored dots
// on a single shared <canvas> (one node for all of them, instead of one DOM
// element each) — that is what keeps zoom/pan fluid in dense areas. At/above it
// they become the full DOM pin/square/circle with icon.
const FULL_ZOOM = 17
// Canvas pin head radius (px), fixed — does not grow with zoom
const DOT_R = 7
const DOT_R_SEL = 9

// Chincheta dibujada en canvas: misma velocidad que un circleMarker (un solo
// lienzo para todos) pero con forma de pin — cabeza de color + aguja + brillo.
// La punta de la aguja se ancla a la ubicación; el área de click es la cabeza.
// El centro de la cabeza se dibuja r*HEAD_UP px por encima de la punta anclada
const HEAD_UP = 2.9
// Offset del tooltip para que el nombre quede por encima del anillo
const farTipOffset = r => [0, -Math.round(r * HEAD_UP + r + 4)]
const Pushpin = L.CircleMarker.extend({
  _headCenter() {
    const p = this._point
    return L.point(p.x, p.y - this._radius * HEAD_UP)
  },
  _updatePath() {
    const ctx = this._renderer && this._renderer._ctx
    if (!ctx) return
    const r = this._radius
    const p = this._point
    const head = this._headCenter()
    // aguja gris afilada desde la base de la cabeza hasta la punta (ubicación)
    const headBottomY = head.y + r
    ctx.beginPath()
    ctx.moveTo(p.x - r * 0.32, headBottomY)
    ctx.lineTo(p.x + r * 0.32, headBottomY)
    ctx.lineTo(p.x, p.y)
    ctx.closePath()
    ctx.fillStyle = '#5b5b5b'
    ctx.fill()
    // cabeza rellena del color de la subcategoría
    ctx.beginPath()
    ctx.arc(head.x, head.y, r, 0, Math.PI * 2)
    ctx.fillStyle = this.options.fillColor
    ctx.fill()
    // resalte de selección: aro blanco por fuera
    if (this.options.selected) {
      ctx.beginPath()
      ctx.arc(head.x, head.y, r, 0, Math.PI * 2)
      ctx.lineWidth = 2
      ctx.strokeStyle = '#fff'
      ctx.stroke()
    }
    // brillo
    ctx.beginPath()
    ctx.arc(head.x - r * 0.3, head.y - r * 0.35, r * 0.32, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fill()
  },
  // El área clicable es el anillo (que está por encima de la punta anclada)
  _containsPoint(point) {
    return point.distanceTo(this._headCenter()) <= this._radius + this._clickTolerance()
  },
  // Los bounds deben cubrir anillo + aguja para que el cull/redraw no recorte
  _updateBounds() {
    const r = this._radius + 2
    const p = this._point
    const topY = p.y - this._radius * HEAD_UP - r
    this._pxBounds = new L.Bounds(L.point(p.x - r, topY), L.point(p.x + r, p.y))
  },
})

// Tamaño de celda (px) para agrupar en rejilla a zoom lejano: puntos cuyas
// posiciones proyectadas caen en la misma celda forman un cluster. ~56px deja
// las burbujas separadas sin solaparse en pantallas densas.
const CLUSTER_CELL = 56
// Radio de la burbuja según cuántos POI agrupa (más grande = más dentro)
function clusterRadius(count) {
  if (count < 10) return 15
  if (count < 50) return 19
  if (count < 200) return 23
  return 27
}

// Burbuja-contador dibujada en el mismo canvas que las chinchetas: disco del
// color dominante + número blanco. Hereda de CircleMarker para reusar el
// renderer canvas (un solo lienzo para chinchetas y clusters).
const ClusterBubble = L.CircleMarker.extend({
  _updatePath() {
    const ctx = this._renderer && this._renderer._ctx
    if (!ctx) return
    const r = this._radius
    const p = this._point
    // disco relleno del color dominante
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = this.options.fillColor
    ctx.fill()
    // anillo blanco semitransparente para despegarlo del mapa
    ctx.lineWidth = 2.5
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.stroke()
    // número de POI agrupados
    const n = this.options.count
    ctx.fillStyle = '#fff'
    ctx.font = `600 ${r > 20 ? 13 : 11}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(n > 999 ? '999+' : String(n), p.x, p.y)
  },
  _containsPoint(point) {
    return point.distanceTo(this._point) <= this._radius + this._clickTolerance()
  },
  _updateBounds() {
    const r = this._radius + 2
    const p = this._point
    this._pxBounds = new L.Bounds(L.point(p.x - r, p.y - r), L.point(p.x + r, p.y + r))
  },
})

// Agrupa puntos por rejilla en coordenadas proyectadas al zoom dado. Devuelve
// una lista de clusters { lat, lon, items, bounds }. Estable bajo paneo (la
// rejilla vive en el espacio proyectado, no en el viewport), así que solo hay
// que recalcular al cambiar el zoom. `skipId` deja fuera el POI seleccionado
// para que conserve su chincheta, tooltip y línea al origen.
function clusterPoints(map, items, zoom, skipId) {
  // Plain object, not `new Map()`: inside this module `Map` is the React
  // component (see CLAUDE.md), so `new Map()` would instantiate the component.
  const cells = {}
  const singles = []
  for (const item of items) {
    const [lon, lat] = item.location.coordinates
    if (item.id === skipId) { singles.push(item); continue }
    const p = map.project([lat, lon], zoom)
    const key = `${Math.floor(p.x / CLUSTER_CELL)}:${Math.floor(p.y / CLUSTER_CELL)}`
    let cell = cells[key]
    if (!cell) { cell = []; cells[key] = cell }
    cell.push(item)
  }
  const clusters = []
  for (const cell of Object.values(cells)) {
    if (cell.length === 1) { singles.push(cell[0]); continue }
    let sumLat = 0, sumLon = 0
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity
    for (const it of cell) {
      const [lon, lat] = it.location.coordinates
      sumLat += lat; sumLon += lon
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
    }
    clusters.push({
      lat: sumLat / cell.length,
      lon: sumLon / cell.length,
      items: cell,
      bounds: L.latLngBounds([[minLat, minLon], [maxLat, maxLon]]),
    })
  }
  return { clusters, singles }
}

// Color de la burbuja = subcategoría más frecuente del cluster (color dominante)
function dominantColor(items) {
  const counts = {}
  let best = null, bestN = 0
  for (const it of items) {
    const n = (counts[it.subcategory] = (counts[it.subcategory] || 0) + 1)
    if (n > bestN) { bestN = n; best = it }
  }
  return best ? colorFor(best) : '#888'
}

// Banderín a cuadros de las rutas (dibujado a mano, no Lucide): el símbolo de
// la salida y de la sección «Rutas». Damero 3×2 blanco/negro con mástil oscuro.
const flagSvg = (size, style = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ${style}
  fill="none" stroke="#2B2B2B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="5" y="3" width="14" height="9" fill="#fff"/>
  <path d="M5 3h4.67v4.5H5z M14.33 3H19v4.5h-4.67z M9.67 7.5h4.66V12H9.67z" fill="#2B2B2B" stroke="none"/>
  <rect x="5" y="3" width="14" height="9"/>
  <path d="M5 22V3"/>
</svg>`

// Insignia numerada de parada de ruta: disco teal de marca con número blanco;
// la salida (n=1) lleva el banderín plantado encima. La seleccionada crece y
// oscurece (resaltado sincronizado con el panel). Escala con --poi-scale.
function routeStopIcon(n, isStart, isSelected) {
  const d = isSelected ? 32 : 26
  // Mástil plantado en el centro-arriba del disco: en el SVG el mástil está a
  // 5/24 del borde izquierdo, así que se descuenta ese offset del centro
  const flagLeft = Math.round(d / 2 - 17 * (5 / 24))
  const flag = isStart
    ? flagSvg(17, `style="position:absolute;left:${flagLeft}px;top:-13px"`)
    : ''
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${d}px;height:${d}px;
      transform:scale(var(--poi-scale, 1));transform-origin:center bottom;">
      ${flag}
      <div style="width:${d}px;height:${d}px;box-sizing:border-box;background:${isSelected ? '#145A66' : '#1C7A8A'};
        border:${isSelected ? 3.5 : 3}px solid #fff;border-radius:50%;
        box-shadow:0 2px ${isSelected ? 12 : 8}px rgba(0,0,0,${isSelected ? 0.5 : 0.35});
        display:flex;align-items:center;justify-content:center;cursor:pointer;
        color:#fff;font-weight:700;font-size:${isSelected ? 14 : 12}px;font-family:system-ui,sans-serif;">${n}</div>
    </div>`,
    iconSize: [d, d],
    iconAnchor: [d / 2, d / 2],
    tooltipAnchor: [0, -(d / 2 + 5)],
  })
}

function makeIcon(item, isSelected) {
  const custom = SUB_MARKER_STYLES[item.subcategory]
  const shape = shapeFor(item.subcategory)
  const size = isSelected ? 26 : 20
  const fontSize = isSelected ? 11 : 9
  const ring = custom?.ring ?? (isSelected ? '#fff' : 'rgba(255,255,255,0.8)')
  const bw = isSelected ? 3 : 2
  // Shadow only on the selected marker: box-shadow is the most expensive
  // property to repaint and ~700 shadowed nodes is the bulk of the zoom jank
  const shadow = isSelected ? '0 2px 8px rgba(0,0,0,0.4)' : 'none'
  const bg = custom?.bg ?? colorFor(item)
  const content = custom?.glyph
    ? custom.glyph(Math.round(size * 0.62))
    : (SUBCATEGORY_ICONS[item.subcategory] ?? '📍')

  // Pin gota: a square with one sharp corner, rotated -45° so the tip points
  // down to the location; the glyph rides in a separate un-rotated layer so it
  // stays upright. Anchored at the tip; scales from the tip so it stays pinned.
  if (shape === 'teardrop') {
    // `box` is the full disc diameter incl. border, matching the circle's
    // total size (content-box width + border). Both the bulb and the glyph
    // layer use border-box at `box`, so their centers coincide — otherwise the
    // bulb's border offsets its center and the glyph drifts up-left.
    const box = size + 2 * bw
    const h = Math.round(box * 1.21)
    return L.divIcon({
      className: '',
      html: `<div style="
        width:${box}px;height:${h}px;position:relative;cursor:pointer;
        transform:scale(var(--poi-scale, 1));transform-origin:center bottom;">
        <div style="position:absolute;left:0;top:0;width:${box}px;height:${box}px;
          box-sizing:border-box;background:${bg};border:${bw}px solid ${ring};
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:${shadow};"></div>
        <div style="position:absolute;left:0;top:0;width:${box}px;height:${box}px;
          display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;">${content}</div>
      </div>`,
      iconSize: [box, h],
      iconAnchor: [box / 2, h],
      tooltipAnchor: [0, -Math.round(box * 1.45)],
    })
  }

  const radius = shape === 'square' ? `${Math.round(size * 0.28)}px` : '50%'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border:${bw}px solid ${ring};
      border-radius:${radius};
      display:flex;align-items:center;justify-content:center;
      font-size:${fontSize}px;
      box-shadow:${shadow};
      cursor:pointer;
      transform:scale(var(--poi-scale, 1));
    ">${content}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2 + 4)],
  })
}

export default function Map({ origin, isochrone, resources, selected, onSelect, activeRoute, routeStopIdx, onSelectStop, padBottom = 40, routePadRight = 50 }) {
  const mapRef = useRef(null)
  const leaflet = useRef(null)
  const isoLayer = useRef(null)
  const markerLayer = useRef(null)
  const originMarker = useRef(null)
  const lineLayer = useRef(null)
  const routeLayer = useRef(null)
  // Distingue "salir de una ruta" (restaurar la vista de la isócrona) del
  // primer render con activeRoute=null (no tocar la cámara)
  const hadRouteRef = useRef(false)
  // Plain object on purpose: `Map` here resolves to this component,
  // not the JS built-in
  const markersById = useRef({})
  const selectedIdRef = useRef(null)
  // Whether markers are currently in far mode (zoom < FULL_ZOOM → canvas pins)
  const farRef = useRef(false)
  // Far-zoom clusters drawn this render: { marker, bounds } for the map click
  // handler (tap a bubble → zoom to its members' bounds)
  const clustersRef = useRef([])
  // Shared canvas renderer + layer group for the far-zoom dots
  const canvasRenderer = useRef(null)
  const canvasGroup = useRef(null)
  // Latest resources reachable from the once-registered zoom handler
  const resourcesRef = useRef(resources)
  resourcesRef.current = resources
  // Keep the latest onSelect reachable from handlers registered once
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  // Con ruta activa los POIs están ocultos: el click del mapa no debe poder
  // seleccionar chinchetas/burbujas invisibles (viven en grupos desacoplados)
  const activeRouteRef = useRef(null)
  activeRouteRef.current = activeRoute
  const onSelectStopRef = useRef(onSelectStop)
  onSelectStopRef.current = onSelectStop
  // Id de la ruta ya dibujada: el efecto de ruta también corre al cambiar solo
  // el resaltado de parada, y el flyTo/desacople debe pasar una vez por ruta
  const drawnRouteIdRef = useRef(null)

  // Build the active marker representation for the current zoom: at far zoom,
  // every non/selected point is a circleMarker on the shared canvas (fast);
  // up close, each is a full DOM marker with its icon. Stable identity so the
  // once-registered zoom handler can call it without going stale (reads refs).
  const renderMarkers = useCallback(() => {
    if (!leaflet.current) return
    if (!markerLayer.current) markerLayer.current = L.layerGroup().addTo(leaflet.current)
    if (!canvasGroup.current) canvasGroup.current = L.layerGroup().addTo(leaflet.current)
    markerLayer.current.clearLayers()
    canvasGroup.current.clearLayers()
    markersById.current = {}
    clustersRef.current = []
    const far = farRef.current
    const allItems = Object.values(resourcesRef.current).flat()
    if (far) {
      // Agrupa en rejilla al zoom actual; el seleccionado queda fuera para
      // conservar su chincheta resaltada. Singles → Pushpin; grupos → burbuja,
      // ambos en el mismo canvas. La selección far se resuelve en el map 'click'
      // (chincheta o burbuja más cercana), no con handlers por marcador.
      const zoom = leaflet.current.getZoom()
      const { clusters, singles } = clusterPoints(leaflet.current, allItems, zoom, selectedIdRef.current)
      singles.forEach(item => {
        const isSel = item.id === selectedIdRef.current
        const [lon, lat] = item.location.coordinates
        const cm = new Pushpin([lat, lon], {
          renderer: canvasRenderer.current,
          radius: isSel ? DOT_R_SEL : DOT_R,
          fillColor: colorFor(item),
          selected: isSel,
        }).addTo(canvasGroup.current)
        if (isSel) {
          cm.bringToFront()
          cm.bindTooltip(item.name, { direction: 'top', permanent: true, offset: farTipOffset(DOT_R_SEL) }).openTooltip()
        }
        markersById.current[item.id] = { marker: cm, item, canvas: true }
      })
      clusters.forEach(cl => {
        const bubble = new ClusterBubble([cl.lat, cl.lon], {
          renderer: canvasRenderer.current,
          radius: clusterRadius(cl.items.length),
          fillColor: dominantColor(cl.items),
          count: cl.items.length,
        }).addTo(canvasGroup.current)
        clustersRef.current.push({ marker: bubble, bounds: cl.bounds })
      })
    } else {
      allItems.forEach(item => {
        const isSel = item.id === selectedIdRef.current
        const [lon, lat] = item.location.coordinates
        const marker = L.marker([lat, lon], { icon: makeIcon(item, isSel) })
          .on('click', () => onSelectRef.current(item))
          // Selected marker keeps its name visible (permanent tooltip)
          .bindTooltip(item.name, { direction: 'top', offset: [0, 0], permanent: isSel })
          .addTo(markerLayer.current)
        markersById.current[item.id] = { marker, item, canvas: false }
      })
    }
  }, [])

  useEffect(() => {
    leaflet.current = L.map(mapRef.current, { maxZoom: 20 }).setView([28.485, -16.320], 12)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' + import.meta.env.VITE_CARTO_API_KEY, {
      attribution: '© CARTO · Datos: © OpenStreetMap',
      maxZoom: 20,
    }).addTo(leaflet.current)
    leaflet.current.createPane('linePane').style.zIndex = 450
    // Polilínea de ruta: sobre la isócrona (400) y la línea al origen (450),
    // bajo las chinchetas canvas (460); las insignias van en markerPane (600)
    leaflet.current.createPane('routePane').style.zIndex = 455
    // Dots live above the isochrone polygon (overlayPane, z400) so clicks reach
    // them; otherwise the polygon swallows the click and nothing gets selected
    leaflet.current.createPane('dotPane').style.zIndex = 460
    leaflet.current.createPane('originPane').style.zIndex = 620
    canvasRenderer.current = L.canvas({ padding: 0.5, pane: 'dotPane' })
    // Markers grow with zoom via one CSS var on the container — restyling
    // ~700 markers through setIcon on every zoom would be janky
    const applyMarkerScale = () => {
      const z = leaflet.current.getZoom()
      const scale = Math.min(1.6, Math.max(1, 1 + (z - 14) * 0.15))
      mapRef.current.style.setProperty('--poi-scale', scale)
    }
    farRef.current = leaflet.current.getZoom() < FULL_ZOOM
    // Rebuilding ~1-2k markers (DOM↔canvas swap, or far re-cluster) is the one
    // heavy op on zoom. On low-power Android, doing it synchronously inside
    // zoomend froze the gesture in dense areas. Debounce it: a multi-step
    // pinch-out fires several zoomends but rebuilds once, ~90ms after the last —
    // past the zoom animation, so the gesture itself stays smooth.
    let pendingRender = null
    const scheduleRender = () => {
      if (pendingRender) clearTimeout(pendingRender)
      pendingRender = setTimeout(() => { pendingRender = null; renderMarkers() }, 90)
    }
    leaflet.current.on('zoomend', () => {
      applyMarkerScale()
      // Swap canvas dots ↔ full DOM icons when the zoom crosses FULL_ZOOM, and
      // re-cluster while staying in far mode (grid cells are projected at the
      // current zoom, so the grouping changes with it).
      const far = leaflet.current.getZoom() < FULL_ZOOM
      const crossed = far !== farRef.current
      farRef.current = far
      if (crossed || far) scheduleRender()
    })
    applyMarkerScale()
    // Click handling. At far zoom the markers are canvas pins (no DOM node to
    // click), so pick the nearest pin head to the tap; up close, DOM markers
    // fire their own click and this just clears the selection on empty taps.
    leaflet.current.on('click', (e) => {
      // Con ruta activa: tocar mapa vacío des-resalta la parada (las insignias
      // gestionan su propio click y no llegan aquí)
      if (activeRouteRef.current) { onSelectStopRef.current?.(null); return }
      if (farRef.current) {
        const cp = e.containerPoint
        // Burbujas primero: si el tap cae dentro de una, hace zoom a sus
        // miembros (Google Maps), abriendo el cluster en vez de seleccionar
        for (const { marker, bounds } of clustersRef.current) {
          const mp = leaflet.current.latLngToContainerPoint(marker.getLatLng())
          if (cp.distanceTo(mp) <= marker.options.radius + 8) {
            leaflet.current.flyToBounds(bounds, { padding: [60, 60], maxZoom: FULL_ZOOM + 1 })
            return
          }
        }
        let best = null, bestD = Infinity, bestR = DOT_R
        for (const { marker, item, canvas } of Object.values(markersById.current)) {
          if (!canvas) continue
          const mp = leaflet.current.latLngToContainerPoint(marker.getLatLng())
          const r = marker.options.radius
          // pin ring sits r*HEAD_UP px above the anchored tip
          const head = L.point(mp.x, mp.y - r * HEAD_UP)
          const d = cp.distanceTo(head)
          if (d < bestD) { bestD = d; best = item; bestR = r }
        }
        if (best && bestD <= bestR + 16) { onSelectRef.current(best); return }
      }
      onSelectRef.current(null)
    })
    return () => { if (pendingRender) clearTimeout(pendingRender); leaflet.current.remove() }
  }, [])

  useEffect(() => {
    if (!origin) return
    originMarker.current?.remove()
    originMarker.current = L.marker([origin.lat, origin.lon], {
      icon: L.divIcon({
        className: '',
        html: `<div style="position:relative;width:24px;height:24px;">
          <div class="origin-ring"></div>
          <div class="origin-dot"></div>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
      pane: 'originPane',
      interactive: false,
    }).addTo(leaflet.current)
  }, [origin])

  useEffect(() => {
    if (!isochrone) return
    isoLayer.current?.remove()
    isoLayer.current = L.geoJSON(isochrone, {
      style: { color: '#1C7A8A', fillColor: '#3FA0B0', fillOpacity: 0.12, weight: 2 },
      interactive: false,
    }).addTo(leaflet.current)
    // Extra bottom padding keeps the isochrone above the mobile bottom sheet
    leaflet.current.fitBounds(isoLayer.current.getBounds(), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, padBottom],
    })
  }, [isochrone])

  // Ruta activa (preset «Mi ruta»): polilínea peatonal con halo blanco +
  // insignias numeradas 1…N, y flyTo a sus bounds. Al salir, restaura la vista
  // de la isócrona si la había. maxZoom 16 se queda bajo FULL_ZOOM: los POI
  // siguen en modo canvas (fluido) y la ruta se lee entera.
  useEffect(() => {
    routeLayer.current?.remove()
    routeLayer.current = null
    if (!leaflet.current) return
    if (activeRoute) {
      hadRouteRef.current = true
      const isNewRoute = drawnRouteIdRef.current !== activeRoute.id
      drawnRouteIdRef.current = activeRoute.id
      // La ruta es la experiencia: fuera POIs (chinchetas, burbujas, iconos).
      // Se DESACOPLAN los grupos del mapa, no se reconstruyen — los rebuilds
      // de marcadores durante la ruta (pills, zoom) caen en grupos invisibles
      // y al salir se reenganchan tal cual, sin coste.
      if (markerLayer.current) leaflet.current.removeLayer(markerLayer.current)
      if (canvasGroup.current) leaflet.current.removeLayer(canvasGroup.current)
      const group = L.layerGroup()
      // Sin geometría curada aún (curate_route.mjs pendiente): tramos rectos
      // discontinuos entre paradas como borrador visible en desarrollo
      const latlngs = activeRoute.geometry
        ? activeRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon])
        : activeRoute.stops.map(s => [s.lat, s.lon])
      L.polyline(latlngs, { pane: 'routePane', color: '#fff', weight: 7, opacity: 0.9, interactive: false }).addTo(group)
      L.polyline(latlngs, {
        pane: 'routePane', color: '#1C7A8A', weight: 4, opacity: 0.95, interactive: false,
        ...(activeRoute.geometry ? {} : { dashArray: '7, 9' }),
      }).addTo(group)
      activeRoute.stops.forEach((s, i) => {
        const isSel = i === routeStopIdx
        L.marker([s.lat, s.lon], {
          icon: routeStopIcon(i + 1, i === 0, isSel),
          zIndexOffset: isSel ? 2000 : 1500,
        })
          // Tocar una insignia resalta la parada aquí y en el panel (toggle);
          // la seleccionada mantiene su nombre visible
          .on('click', () => onSelectStopRef.current?.(i))
          .bindTooltip(s.name, { direction: 'top', permanent: isSel })
          .addTo(group)
      })
      group.addTo(leaflet.current)
      routeLayer.current = group
      if (isNewRoute) {
        const b = L.latLngBounds(activeRoute.stops.map(s => [s.lat, s.lon]))
        // En escritorio la tarjeta de ruta flota arriba a la derecha del mapa:
        // routePadRight reserva ese hueco para que no tape el trazado
        const opts = {
          paddingTopLeft: [50, 50],
          paddingBottomRight: [routePadRight, Math.max(50, padBottom)],
          maxZoom: 16,
        }
        // Saltos largos (otra región, p. ej. Tenerife → Torremolinos): ir
        // directo — el flyTo de Leaflet tarda una eternidad a 1.000+ km y
        // se queda a medio camino en pantalla. El vuelo, para saltos cortos.
        if (leaflet.current.getCenter().distanceTo(b.getCenter()) > 100000) {
          leaflet.current.fitBounds(b, opts)
        } else {
          leaflet.current.flyToBounds(b, opts)
        }
      }
    } else if (hadRouteRef.current) {
      hadRouteRef.current = false
      drawnRouteIdRef.current = null
      if (markerLayer.current) markerLayer.current.addTo(leaflet.current)
      if (canvasGroup.current) canvasGroup.current.addTo(leaflet.current)
      if (isoLayer.current) {
        leaflet.current.fitBounds(isoLayer.current.getBounds(), {
          paddingTopLeft: [40, 40],
          paddingBottomRight: [40, padBottom],
        })
      }
    }
    // routeStopIdx en deps: reconstruir ≤8 insignias por resaltado es trivial
    // (nada que ver con el rebuild de ~1000 POIs que evitamos con `selected`)
  }, [activeRoute, routeStopIdx])

  useEffect(() => {
    lineLayer.current?.remove()
    lineLayer.current = null
    if (selected && origin) {
      // Only draw the line if the selected item is still visible after filtering
      const stillVisible = Object.values(resources).flat().some(item => item.id === selected.id)
      if (stillVisible) {
        const [lon, lat] = selected.location.coordinates
        lineLayer.current = L.polyline(
          [[origin.lat, origin.lon], [lat, lon]],
          { color: '#1C7A8A', weight: 2, opacity: 0.9, dashArray: '8, 8', className: 'marching-line', pane: 'linePane' }
        ).addTo(leaflet.current)
      }
    }
  }, [selected, origin, resources])

  // Rebuild markers only when the resource set changes — with hundreds of
  // markers, recreating them on every selection makes taps janky
  useEffect(() => {
    renderMarkers()
  }, [resources, renderMarkers])

  // Selection change: restyle just the previous and the new marker.
  // The tooltip is re-bound because `permanent` can't be toggled in place:
  // selected = name always visible, unselected = back to hover-only.
  useEffect(() => {
    const prevId = selectedIdRef.current
    selectedIdRef.current = selected?.id ?? null
    // Far mode: the selected POI is kept out of clustering (own highlighted
    // pin), and the previous one may now fall into a cluster — so re-cluster
    // with the new skipId instead of restyling two markers.
    if (farRef.current) {
      renderMarkers()
      return
    }
    const prev = markersById.current[prevId]
    if (prev && !prev.canvas) {
      prev.marker.setIcon(makeIcon(prev.item, false))
      prev.marker.setZIndexOffset(0)
      prev.marker.unbindTooltip()
      prev.marker.bindTooltip(prev.item.name, { direction: 'top', offset: [0, 0] })
    }
    const next = selected ? markersById.current[selected.id] : null
    if (next && !next.canvas) {
      next.marker.setIcon(makeIcon(next.item, true))
      next.marker.setZIndexOffset(1000)
      next.marker.unbindTooltip()
      next.marker.bindTooltip(next.item.name, { direction: 'top', offset: [0, 0], permanent: true })
    }
  }, [selected, renderMarkers])

  return (
    <div data-tour="map" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
