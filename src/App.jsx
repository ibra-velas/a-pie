import { useState, useEffect, useRef } from 'react'
import Map from './Map'
import Sidebar, { ALL_SUBS } from './Sidebar'
import Tour from './Tour'
import Legal from './Legal'
import useIsMobile from './useIsMobile'

export default function App() {
  const [origin, setOrigin] = useState(null)
  const [minutes, setMinutes] = useState(10)
  const [isochrone, setIsochrone] = useState(null)
  const [resources, setResources] = useState({})   // keyed by subcategory
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeSubs, setActiveSubs] = useState(new Set(ALL_SUBS))
  const [showLegal, setShowLegal] = useState(false)
  const debounceRef = useRef(null)
  const isMobile = useIsMobile()

  function toggleSub(sub) {
    setActiveSubs(prev => {
      const next = new Set(prev)
      next.has(sub) ? next.delete(sub) : next.add(sub)
      return next
    })
  }

  function toggleGroup(subs) {
    setActiveSubs(prev => {
      const allOn = subs.every(s => prev.has(s))
      const next = new Set(prev)
      subs.forEach(s => allOn ? next.delete(s) : next.add(s))
      return next
    })
  }

  // Filter resources to only active subcategories
  const filteredResources = Object.fromEntries(
    Object.entries(resources).filter(([sub]) => activeSubs.has(sub))
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
    setResources(data.by_subcategory)
    setSelected(null)
  }

  useEffect(() => {
    // Load La Laguna (Catedral) as default on first open
    const lat = 28.4869, lon = -16.3182
    setOrigin({ lat, lon })
    setLoading(true)
    fetchResources(lat, lon, minutes).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!origin) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetchResources(origin.lat, origin.lon, minutes).finally(() => setLoading(false))
    }, 500)
  }, [minutes])

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#2B2820', background: '#FAF7F2' }}>
      <Sidebar
        isMobile={isMobile}
        onSearch={search}
        onLocate={locate}
        minutes={minutes}
        onMinutesChange={setMinutes}
        resources={filteredResources}
        allResources={resources}
        activeSubs={activeSubs}
        onToggleSub={toggleSub}
        onToggleGroup={toggleGroup}
        selected={selected}
        onSelect={setSelected}
        loading={loading}
        error={error}
        onShowLegal={() => setShowLegal(true)}
      />
      <Map
        origin={origin}
        isochrone={isochrone}
        resources={filteredResources}
        selected={selected}
        onSelect={setSelected}
      />
      <Tour />
      {showLegal && <Legal onClose={() => setShowLegal(false)} />}
    </div>
  )
}
