import { useEffect, useRef } from 'react'
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
  parque:        '#CDEBB0',  // verde muy claro, a petición — el 🌳 oscuro contrasta encima
  discoteca:     '#B388EB',  // lavanda, a juego con su marcador (copa de martini lavanda)
  // Tiendas
  supermercado:  '#8DB600',  // verde manzana, a petición
  tienda:        GROUP_COLORS.tiendas,
  libreria:      '#F2E2C4',  // crema, a petición
  ferreteria:    '#9EA7AD',  // gris plata para pills/lista; el marcador es claro (SUB_MARKER_STYLES manda)
  peluqueria:    '#1A1A1A',  // a juego con su marcador custom (tijera sobre negro)
  floristeria:   '#F5DE6E',  // amarillo claro, a petición
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
// se perdía sobre el fondo azul. Compartida por clinica y medico.
const CRUZ_SANITARIA = {
  bg: '#005EB8',
  glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 2.5h6V9h6.5v6H15v6.5H9V15H2.5V9H9z" fill="#A8D8FF"/>
  </svg>`,
}

// Custom marker designs per subcategory (hand-specified, June 2026).
// They override the generic look (group-color disc + emoji): each entry
// sets the disc face, the ring and an SVG glyph drawn at `size`.
const SUB_MARKER_STYLES = {
  clinica: CRUZ_SANITARIA,
  medico:  CRUZ_SANITARIA,
  // Classic pharmacy sign: green cross on white, black ring
  farmacia: {
    bg: '#fff',
    ring: '#1A1A1A',
    glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 2.5h6V9h6.5v6H15v6.5H9V15H2.5V9H9z" fill="#00A14B"/>
    </svg>`,
  },
  // White scissors on black
  peluqueria: {
    bg: '#1A1A1A',
    glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <line x1="20" y1="4" x2="8.12" y2="15.88"/>
      <line x1="14.47" y1="14.48" x2="20" y2="20"/>
      <line x1="8.12" y1="8.12" x2="12" y2="12"/>
    </svg>`,
  },
  // Cara clara con anillo gris plata: el fondo plata se confundía con el
  // propio emoji 🔧 (también gris) en móvil. El plata identitario va al anillo.
  ferreteria: {
    bg: '#F4F4F4',
    ring: '#9EA7AD',
  },
  // Carrito SVG gris casi negro sobre el verde manzana: el emoji 🛒 lo pinta
  // cada sistema a su manera y en Android/iOS salía gris claro sin contraste.
  supermercado: {
    bg: '#8DB600',
    glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="#2B2B2B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="8" cy="21" r="1.4"/>
      <circle cx="19" cy="21" r="1.4"/>
      <path d="M2 2.5h2l2.66 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 1.95-1.57L22 7.5H5.1"/>
    </svg>`,
  },
  // Copa de martini lavanda sobre disco morado oscuro (ocio nocturno)
  discoteca: {
    bg: '#2A1A3A',
    glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="#D6BCFA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16l-8 9z"/>
      <line x1="16" y1="3" x2="10.5" y2="10"/>
      <line x1="12" y1="13" x2="12" y2="20"/>
      <line x1="8" y1="20" x2="16" y2="20"/>
    </svg>`,
  },
  // Fork & knife tops in white on saturated orange
  restaurante: {
    bg: '#F57C00',
    glyph: s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4.5 2.5v5.5a3 3 0 0 0 3 3 3 3 0 0 0 3-3V2.5"/>
      <path d="M7.5 2.5v19"/>
      <path d="M19.5 13.5V2.5A4.5 4.5 0 0 0 15 7v4.5c0 1.1.9 2 2 2h2.5Zm0 0v8"/>
    </svg>`,
  },
}

function makeIcon(item, isSelected) {
  const custom = SUB_MARKER_STYLES[item.subcategory]
  const size = isSelected ? 26 : 20
  const fontSize = isSelected ? 11 : 9
  const ring = custom?.ring ?? (isSelected ? '#fff' : 'rgba(255,255,255,0.8)')
  const border = isSelected ? `3px solid ${ring}` : `2px solid ${ring}`
  const shadow = isSelected
    ? '0 2px 8px rgba(0,0,0,0.4)'
    : '0 1px 4px rgba(0,0,0,0.25)'
  const content = custom?.glyph
    ? custom.glyph(Math.round(size * 0.62))
    : (SUBCATEGORY_ICONS[item.subcategory] ?? '📍')

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${custom?.bg ?? colorFor(item)};
      border:${border};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${fontSize}px;
      box-shadow:${shadow};
      cursor:pointer;
      transform:scale(var(--poi-scale, 1));
      transition:transform 0.15s;
    ">${content}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2 + 4)],
  })
}

export default function Map({ origin, isochrone, resources, selected, onSelect, padBottom = 40 }) {
  const mapRef = useRef(null)
  const leaflet = useRef(null)
  const isoLayer = useRef(null)
  const markerLayer = useRef(null)
  const originMarker = useRef(null)
  const lineLayer = useRef(null)
  // Plain object on purpose: `Map` here resolves to this component,
  // not the JS built-in
  const markersById = useRef({})
  const selectedIdRef = useRef(null)
  // Keep the latest onSelect reachable from handlers registered once
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    leaflet.current = L.map(mapRef.current).setView([28.485, -16.320], 12)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO · Datos: Cabildo de Tenerife',
    }).addTo(leaflet.current)
    leaflet.current.createPane('linePane').style.zIndex = 450
    leaflet.current.createPane('originPane').style.zIndex = 620
    // Markers grow with zoom via one CSS var on the container — restyling
    // ~700 markers through setIcon on every zoom would be janky
    const applyMarkerScale = () => {
      const z = leaflet.current.getZoom()
      const scale = Math.min(1.6, Math.max(1, 1 + (z - 14) * 0.15))
      mapRef.current.style.setProperty('--poi-scale', scale)
    }
    leaflet.current.on('zoomend', applyMarkerScale)
    applyMarkerScale()
    // Tapping empty map clears the selection (markers don't bubble here)
    leaflet.current.on('click', () => onSelectRef.current(null))
    return () => leaflet.current.remove()
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
    }).addTo(leaflet.current)
    // Extra bottom padding keeps the isochrone above the mobile bottom sheet
    leaflet.current.fitBounds(isoLayer.current.getBounds(), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, padBottom],
    })
  }, [isochrone])

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
    if (!markerLayer.current) {
      markerLayer.current = L.layerGroup().addTo(leaflet.current)
    }
    markerLayer.current.clearLayers()
    markersById.current = {}
    Object.values(resources).flat().forEach(item => {
      const isSel = item.id === selectedIdRef.current
      const [lon, lat] = item.location.coordinates
      const marker = L.marker([lat, lon], { icon: makeIcon(item, isSel) })
        .on('click', () => onSelectRef.current(item))
        // Selected marker keeps its name visible (permanent tooltip)
        .bindTooltip(item.name, { direction: 'top', offset: [0, 0], permanent: isSel })
        .addTo(markerLayer.current)
      markersById.current[item.id] = { marker, item }
    })
  }, [resources])

  // Selection change: restyle just the previous and the new marker.
  // The tooltip is re-bound because `permanent` can't be toggled in place:
  // selected = name always visible, unselected = back to hover-only.
  useEffect(() => {
    const prev = markersById.current[selectedIdRef.current]
    if (prev) {
      prev.marker.setIcon(makeIcon(prev.item, false))
      prev.marker.setZIndexOffset(0)
      prev.marker.unbindTooltip()
      prev.marker.bindTooltip(prev.item.name, { direction: 'top', offset: [0, 0] })
    }
    const next = selected ? markersById.current[selected.id] : null
    if (next) {
      next.marker.setIcon(makeIcon(next.item, true))
      next.marker.setZIndexOffset(1000)
      next.marker.unbindTooltip()
      next.marker.bindTooltip(next.item.name, { direction: 'top', offset: [0, 0], permanent: true })
    }
    selectedIdRef.current = selected?.id ?? null
  }, [selected])

  return (
    <div data-tour="map" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
