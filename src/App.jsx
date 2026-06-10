import { useState, useEffect, useRef } from 'react'
import { Drawer } from 'vaul'
import Map from './Map'
import Sidebar, { ALL_SUBS } from './Sidebar'
import Tour from './Tour'
import Legal from './Legal'
import InstallButton from './InstallButton'
import useIsMobile from './useIsMobile'

// Bottom-sheet heights (fraction of viewport): peek / half / expanded
const SNAP_POINTS = [0.22, 0.55, 0.93]

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
  const [snap, setSnap] = useState(SNAP_POINTS[1])
  const debounceRef = useRef(null)
  const abortRef = useRef(null)
  const isMobile = useIsMobile()

  // Selecting a place collapses the sheet so the map (and the marker) is visible
  function select(item) {
    setSelected(item)
    if (item && isMobile) setSnap(SNAP_POINTS[0])
  }

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
    // App is mounted: fade out the static splash from index.html
    const splash = document.getElementById('splash')
    if (splash) {
      splash.style.opacity = '0'
      splash.style.pointerEvents = 'none'
      setTimeout(() => splash.remove(), 450)
    }
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

  const shellStyle = { fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#2B2820', background: '#FAF7F2' }

  const sidebar = (
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
      onSelect={select}
      loading={loading}
      error={error}
      onShowLegal={() => setShowLegal(true)}
    />
  )

  const map = (
    <Map
      origin={origin}
      isochrone={isochrone}
      resources={filteredResources}
      selected={selected}
      onSelect={select}
      padBottom={isMobile ? Math.round(window.innerHeight * (typeof snap === 'number' ? snap : 0.55)) : 40}
    />
  )

  if (isMobile) {
    return (
      <div style={{ ...shellStyle, display: 'flex', height: '100vh' }}>
        {map}
        <Drawer.Root
          open
          modal={false}
          dismissible={false}
          snapPoints={SNAP_POINTS}
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap}
        >
          <Drawer.Portal>
            <Drawer.Content
              aria-describedby={undefined}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                height: '100%', maxHeight: '93%',
                display: 'flex', flexDirection: 'column',
                background: '#FAF7F2',
                borderTopLeftRadius: 18, borderTopRightRadius: 18,
                boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
                zIndex: 1200,
                overflow: 'hidden',
                outline: 'none',
              }}
            >
              <Drawer.Title style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Buscador y lugares cercanos
              </Drawer.Title>
              {/* Drag handle */}
              <div aria-hidden="true" style={{ padding: '10px 0 6px', flexShrink: 0, cursor: 'grab' }}>
                <div style={{ width: 44, height: 5, borderRadius: 99, background: '#D8CFC2', margin: '0 auto' }} />
              </div>
              {sidebar}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
        <Tour />
        <InstallButton isMobile />
        {showLegal && <Legal onClose={() => setShowLegal(false)} />}
      </div>
    )
  }

  return (
    <div style={{ ...shellStyle, display: 'flex', height: '100vh' }}>
      {sidebar}
      {map}
      <Tour />
      <InstallButton />
      {showLegal && <Legal onClose={() => setShowLegal(false)} />}
    </div>
  )
}
