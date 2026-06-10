import { useState, useEffect, useRef } from 'react'
import Map from './Map'
import Sidebar, { ALL_SUBS } from './Sidebar'
import Tour from './Tour'
import Legal from './Legal'
import InstallButton from './InstallButton'
import useIsMobile from './useIsMobile'

export default function App() {
  const [origin, setOrigin] = useState(null)
  const [minutes, setMinutes] = useState(5)
  const [isochrone, setIsochrone] = useState(null)
  const [resources, setResources] = useState({})   // keyed by subcategory
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeSubs, setActiveSubs] = useState(new Set(['bar', 'cafe', 'comida_rapida']))
  const [showLegal, setShowLegal] = useState(false)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)
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
      if (!geoRes.ok) { setError('Dirección no encontrada'); setLoading(false); return }
      const { lat, lon } = await geoRes.json()
      setOrigin({ lat, lon })
      await fetchResources(lat, lon, minutes)
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  async function locate(lat, lon) {
    setOrigin({ lat, lon })
    await fetchResources(lat, lon, minutes)
  }

  // Each call aborts the previous in-flight request so a slow stale
  // response can never overwrite a newer one (slider race condition)
  async function fetchResources(lat, lon, mins) {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/resources?lat=${lat}&lon=${lon}&minutes=${mins}`, { signal: ctrl.signal })
      if (!res.ok) { setError('Error cargando recursos'); return }
      const data = await res.json()
      setIsochrone(data.polygon)
      setResources(data.by_subcategory)
      setSelected(null)
    } catch (e) {
      if (e.name !== 'AbortError') setError('Error de conexión')
    } finally {
      // Only the still-current request may clear the spinner
      if (abortRef.current === ctrl) setLoading(false)
    }
  }

  useEffect(() => {
    // Load La Laguna (Catedral) as default on first open
    const lat = 28.4869, lon = -16.3182
    setOrigin({ lat, lon })
    fetchResources(lat, lon, minutes)
  }, [])

  useEffect(() => {
    if (!origin) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResources(origin.lat, origin.lon, minutes)
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
      <InstallButton />
      {showLegal && <Legal onClose={() => setShowLegal(false)} />}
    </div>
  )
}
