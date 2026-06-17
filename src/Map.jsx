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
  parque:        '#CDEBB0',  // verde muy claro, a petición — el 🌳 oscuro contrasta encima
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
      <line x1="18" y1="1.5" x2="11.5" y2="8"/>
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
  // Debug overlay: live zoom readout (preview only)
  const zoomLabelRef = useRef(null)
  // Whether markers are currently in far mode (zoom < FULL_ZOOM → canvas dots)
  const farRef = useRef(false)
  // Shared canvas renderer + layer group for the far-zoom dots
  const canvasRenderer = useRef(null)
  const canvasGroup = useRef(null)
  // Latest resources reachable from the once-registered zoom handler
  const resourcesRef = useRef(resources)
  resourcesRef.current = resources
  // Keep the latest onSelect reachable from handlers registered once
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

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
    const far = farRef.current
    Object.values(resourcesRef.current).flat().forEach(item => {
      const isSel = item.id === selectedIdRef.current
      const [lon, lat] = item.location.coordinates
      if (far) {
        // No per-pin click handler: far-zoom selection is resolved at the map
        // level (nearest pin to the tap) — more reliable than canvas hit-testing
        // and more forgiving for tiny targets on mobile. See the map 'click'.
        const c = colorFor(item)
        const cm = new Pushpin([lat, lon], {
          renderer: canvasRenderer.current,
          radius: isSel ? DOT_R_SEL : DOT_R,
          fillColor: c,
          selected: isSel,
        }).addTo(canvasGroup.current)
        if (isSel) {
          cm.bringToFront()
          cm.bindTooltip(item.name, { direction: 'top', permanent: true, offset: farTipOffset(DOT_R_SEL) }).openTooltip()
        }
        markersById.current[item.id] = { marker: cm, item, canvas: true }
      } else {
        const marker = L.marker([lat, lon], { icon: makeIcon(item, isSel) })
          .on('click', () => onSelectRef.current(item))
          // Selected marker keeps its name visible (permanent tooltip)
          .bindTooltip(item.name, { direction: 'top', offset: [0, 0], permanent: isSel })
          .addTo(markerLayer.current)
        markersById.current[item.id] = { marker, item, canvas: false }
      }
    })
  }, [])

  useEffect(() => {
    leaflet.current = L.map(mapRef.current, { maxZoom: 20 }).setView([28.485, -16.320], 12)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO · Datos: © OpenStreetMap',
      maxZoom: 20,
    }).addTo(leaflet.current)
    leaflet.current.createPane('linePane').style.zIndex = 450
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
    // Debug overlay: keep the zoom readout in sync (preview only)
    const updateZoomLabel = () => {
      if (zoomLabelRef.current) {
        const z = leaflet.current.getZoom()
        zoomLabelRef.current.textContent = `z ${z.toFixed(1)}${z < FULL_ZOOM ? ' · pin' : ' · icono'}`
      }
    }
    leaflet.current.on('zoom zoomend', updateZoomLabel)
    updateZoomLabel()
    leaflet.current.on('zoomend', () => {
      applyMarkerScale()
      // Swap canvas dots ↔ full DOM icons only when the zoom crosses FULL_ZOOM,
      // so the ~700-marker rebuild happens once per crossing, not per zoom
      const far = leaflet.current.getZoom() < FULL_ZOOM
      if (far !== farRef.current) {
        farRef.current = far
        renderMarkers()
      }
    })
    applyMarkerScale()
    // Click handling. At far zoom the markers are canvas pins (no DOM node to
    // click), so pick the nearest pin head to the tap; up close, DOM markers
    // fire their own click and this just clears the selection on empty taps.
    leaflet.current.on('click', (e) => {
      if (farRef.current) {
        const cp = e.containerPoint
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
      interactive: false,
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
    renderMarkers()
  }, [resources, renderMarkers])

  // Selection change: restyle just the previous and the new marker.
  // The tooltip is re-bound because `permanent` can't be toggled in place:
  // selected = name always visible, unselected = back to hover-only.
  useEffect(() => {
    const prev = markersById.current[selectedIdRef.current]
    if (prev) {
      if (prev.canvas) {
        prev.marker.setStyle({ radius: DOT_R, selected: false })
        prev.marker.unbindTooltip()
      } else {
        prev.marker.setIcon(makeIcon(prev.item, false))
        prev.marker.setZIndexOffset(0)
        prev.marker.unbindTooltip()
        prev.marker.bindTooltip(prev.item.name, { direction: 'top', offset: [0, 0] })
      }
    }
    const next = selected ? markersById.current[selected.id] : null
    if (next) {
      if (next.canvas) {
        next.marker.setStyle({ radius: DOT_R_SEL, selected: true })
        next.marker.bringToFront()
        next.marker.bindTooltip(next.item.name, { direction: 'top', permanent: true, offset: farTipOffset(DOT_R_SEL) }).openTooltip()
      } else {
        next.marker.setIcon(makeIcon(next.item, true))
        next.marker.setZIndexOffset(1000)
        next.marker.unbindTooltip()
        next.marker.bindTooltip(next.item.name, { direction: 'top', offset: [0, 0], permanent: true })
      }
    }
    selectedIdRef.current = selected?.id ?? null
  }, [selected])

  return (
    <div data-tour="map" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {/* Debug zoom readout (preview only) */}
      <div
        ref={zoomLabelRef}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 1000,
          padding: '3px 8px', borderRadius: 8, pointerEvents: 'none',
          background: 'rgba(0,0,0,0.65)', color: '#fff',
          font: '600 12px ui-monospace, monospace', letterSpacing: '0.02em',
        }}
      />
    </div>
  )
}
