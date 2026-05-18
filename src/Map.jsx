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

const SUBCATEGORY_ICONS = {
  // Comida & Bebida
  restaurante:   '🍽️',
  bar:           '🍺',
  cafe:          '☕',
  comida_rapida: '🍔',
  panaderia:     '🥖',
  heladeria:     '🍦',
  carniceria:    '🥩',
  fruteria:      '🍎',
  pescaderia:    '🐟',
  mercado:       '🏪',
  // Comercio
  supermercado:  '🛒',
  tienda:        '🏬',
  libreria:      '📚',
  ferreteria:    '🔧',
  barberia:      '✂️',
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
  // Educación
  colegio:       '🏫',
  universidad:   '🎓',
  instituto:     '🏫',
  guarderia:     '🧒',
  // Transporte
  parada_bus:    '🚌',
}

function makeIcon(item, isSelected) {
  const emoji = SUBCATEGORY_ICONS[item.subcategory] ?? '📍'
  const color = CATEGORY_COLORS[item.category] ?? '#888'
  const size = isSelected ? 26 : 20
  const fontSize = isSelected ? 11 : 9
  const border = isSelected ? `3px solid #fff` : `2px solid rgba(255,255,255,0.8)`
  const shadow = isSelected
    ? '0 2px 8px rgba(0,0,0,0.4)'
    : '0 1px 4px rgba(0,0,0,0.25)'

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:${border};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${fontSize}px;
      box-shadow:${shadow};
      cursor:pointer;
      transition:transform 0.1s;
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2 + 4)],
  })
}

export default function Map({ origin, isochrone, resources, selected, onSelect }) {
  const mapRef = useRef(null)
  const leaflet = useRef(null)
  const isoLayer = useRef(null)
  const markerLayer = useRef(null)
  const originMarker = useRef(null)
  const lineLayer = useRef(null)

  useEffect(() => {
    leaflet.current = L.map(mapRef.current).setView([28.485, -16.320], 12)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO · Datos: Cabildo de Tenerife',
    }).addTo(leaflet.current)
    leaflet.current.createPane('linePane').style.zIndex = 450
    leaflet.current.createPane('originPane').style.zIndex = 620
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
      style: { color: '#185FA5', fillColor: '#378ADD', fillOpacity: 0.12, weight: 2 },
    }).addTo(leaflet.current)
    leaflet.current.fitBounds(isoLayer.current.getBounds(), { padding: [40, 40] })
  }, [isochrone])

  useEffect(() => {
    lineLayer.current?.remove()
    lineLayer.current = null
    if (selected && origin) {
      const [lon, lat] = selected.location.coordinates
      lineLayer.current = L.polyline(
        [[origin.lat, origin.lon], [lat, lon]],
        { color: '#185FA5', weight: 2, opacity: 0.9, dashArray: '8, 8', className: 'marching-line', pane: 'linePane' }
      ).addTo(leaflet.current)
    }
  }, [selected, origin])

  useEffect(() => {
    if (!markerLayer.current) {
      markerLayer.current = L.layerGroup().addTo(leaflet.current)
    }
    markerLayer.current.clearLayers()
    Object.values(resources).flat().forEach(item => {
      const [lon, lat] = item.location.coordinates
      const isSelected = selected?.id === item.id
      L.marker([lat, lon], { icon: makeIcon(item, isSelected) })
        .on('click', () => onSelect(item))
        .bindTooltip(item.name, { direction: 'top', offset: [0, 0] })
        .addTo(markerLayer.current)
    })
  }, [resources, selected])

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
