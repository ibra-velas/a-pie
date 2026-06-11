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
      transform:scale(var(--poi-scale, 1));
      transition:transform 0.15s;
    ">${emoji}</div>`,
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
      const [lon, lat] = item.location.coordinates
      const marker = L.marker([lat, lon], { icon: makeIcon(item, item.id === selectedIdRef.current) })
        .on('click', () => onSelectRef.current(item))
        .bindTooltip(item.name, { direction: 'top', offset: [0, 0] })
        .addTo(markerLayer.current)
      markersById.current[item.id] = { marker, item }
    })
  }, [resources])

  // Selection change: restyle just the previous and the new marker
  useEffect(() => {
    const prev = markersById.current[selectedIdRef.current]
    if (prev) {
      prev.marker.setIcon(makeIcon(prev.item, false))
      prev.marker.setZIndexOffset(0)
    }
    const next = selected ? markersById.current[selected.id] : null
    if (next) {
      next.marker.setIcon(makeIcon(next.item, true))
      next.marker.setZIndexOffset(1000)
    }
    selectedIdRef.current = selected?.id ?? null
  }, [selected])

  return (
    <div data-tour="map" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
