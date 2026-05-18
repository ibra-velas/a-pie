import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import CompassButton from './CompassButton'
import NorthIndicator from './NorthIndicator'

export const CATEGORY_COLORS = {
  salud:      '#D85A30',
  educacion:  '#1D9E75',
  ocio:       '#7F77DD',
  transporte: '#BA7517',
}

export default function Map({ origin, isochrone, resources, selected, onSelect }) {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const leaflet = useRef(null)
  const isoLayer = useRef(null)
  const markerLayer = useRef(null)
  const originMarker = useRef(null)
  const [bearing, setBearing] = useState(0)

  useEffect(() => {
    leaflet.current = L.map(mapRef.current).setView([28.485, -16.320], 12)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO · Datos: Cabildo de Tenerife',
    }).addTo(leaflet.current)
    return () => leaflet.current.remove()
  }, [])

  // Rotate the map container to match compass bearing
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.style.transform = `rotate(${bearing}deg)`
    mapRef.current.style.transformOrigin = '50% 50%'
    // Force Leaflet to redraw tiles after rotation
    leaflet.current?.invalidateSize()
  }, [bearing])

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
    markerLayer.current?.clearLayers()
    if (!markerLayer.current) {
      markerLayer.current = L.layerGroup().addTo(leaflet.current)
    }
    Object.entries(resources).forEach(([cat, items]) => {
      items.forEach(item => {
        const [lon, lat] = item.location.coordinates
        const isSelected = selected?.id === item.id
        L.circleMarker([lat, lon], {
          radius: isSelected ? 10 : 7,
          color: '#fff',
          weight: isSelected ? 3 : 2,
          fillColor: CATEGORY_COLORS[cat] ?? '#888',
          fillOpacity: 1,
        })
          .on('click', () => onSelect(item))
          .bindTooltip(item.name, { direction: 'top', offset: [0, -8] })
          .addTo(markerLayer.current)
      })
    })
  }, [resources, selected])

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {bearing !== 0 && <NorthIndicator bearing={bearing} />}
      <CompassButton onBearing={setBearing} />
    </div>
  )
}
