import { useState, useEffect, useRef } from 'react'
import Map from './Map'
import Sidebar from './Sidebar'
import useIsMobile from './useIsMobile'

const ALL_CATS = ['salud', 'educacion', 'ocio', 'comercio', 'cultura', 'transporte']

export default function App() {
  const [origin, setOrigin] = useState(null)
  const [minutes, setMinutes] = useState(10)
  const [isochrone, setIsochrone] = useState(null)
  const [resources, setResources] = useState({})
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeCats, setActiveCats] = useState(ALL_CATS)
  const debounceRef = useRef(null)
  const isMobile = useIsMobile()

  function toggleCat(id) {
    setActiveCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  // Derive filtered resources from the full set + active cats
  const filteredResources = Object.fromEntries(
    Object.entries(resources).filter(([cat]) => activeCats.includes(cat))
  )

  async function search(address) {
    setLoading(true)
    setError(null)
    try {
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
      if (!geoRes.ok) { setError('Dirección no encontrada'); return }
      const { lat, lon } = await geoRes.json()
      setOrigin({ lat, lon })
      await fetchResources(lat, lon, minutes)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function locate(lat, lon) {
    setLoading(true)
    setError(null)
    try {
      setOrigin({ lat, lon })
      await fetchResources(lat, lon, minutes)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function fetchResources(lat, lon, mins) {
    const res = await fetch(`/api/resources?lat=${lat}&lon=${lon}&minutes=${mins}`)
    if (!res.ok) { setError('Error cargando recursos'); return }
    const data = await res.json()
    setIsochrone(data.polygon)
    setResources(data.by_category)
    setSelected(null)
  }

  useEffect(() => {
    if (!origin) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetchResources(origin.lat, origin.lon, minutes).finally(() => setLoading(false))
    }, 500)
  }, [minutes])

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar
        isMobile={isMobile}
        onSearch={search}
        onLocate={locate}
        minutes={minutes}
        onMinutesChange={setMinutes}
        resources={filteredResources}
        allResources={resources}
        activeCats={activeCats}
        onToggleCat={toggleCat}
        selected={selected}
        onSelect={setSelected}
        loading={loading}
        error={error}
      />
      <Map
        origin={origin}
        isochrone={isochrone}
        resources={filteredResources}
        selected={selected}
        onSelect={setSelected}
      />
    </div>
  )
}
