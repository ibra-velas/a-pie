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

export default function Map({ origin, isochrone, resources, selected, onSelect }) {
  const mapRef = useRef(null)
  const leaflet = useRef(null)
  const isoLayer = useRef(null)
  const markerLayer = useRef(null)
  const originMarker = useRef(null)

  useEffect(() => {
    leaflet.current = L.map(mapRef.current).setView([28.485, -16.320], 12)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO · Datos: Cabildo de Tenerife',
    }).addTo(leaflet.current)
    return () => leaflet.current.remove()
  }, [])

  useEffect(() => {
    if (!origin) return
    originMarker.current?.remove()
    originMarker.current = L.circleMarker([origin.lat, origin.lon], {
      radius: 8, color: '#fff', weight: 3, fillColor: '#185FA5', fillOpacity: 1,
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
    if (!markerLayer.current) {
      markerLayer.current = L.layerGroup().addTo(leaflet.current)
    }
    markerLayer.current.clearLayers()
    // resources is now keyed by subcategory; each item carries its own category
    Object.values(resources).flat().forEach(item => {
      const [lon, lat] = item.location.coordinates
      const isSelected = selected?.id === item.id
      L.circleMarker([lat, lon], {
        radius: isSelected ? 10 : 7,
        color: '#fff',
        weight: isSelected ? 3 : 2,
        fillColor: CATEGORY_COLORS[item.category] ?? '#888',
        fillOpacity: 1,
      })
        .on('click', () => onSelect(item))
        .bindTooltip(item.name, { direction: 'top', offset: [0, -8] })
        .addTo(markerLayer.current)
    })
  }, [resources, selected])

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
