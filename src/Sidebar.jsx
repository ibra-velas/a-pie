import { useState } from 'react'
import { CATEGORY_COLORS } from './Map'

const CATEGORIES = [
  { id: 'salud',      label: 'Salud' },
  { id: 'educacion',  label: 'Educación' },
  { id: 'ocio',       label: 'Ocio' },
  { id: 'comercio',   label: 'Comercio' },
  { id: 'cultura',    label: 'Cultura' },
  { id: 'transporte', label: 'Transporte' },
]

const CITIES = ['Santa Cruz', 'La Laguna', 'Puerto de la Cruz', 'Candelaria', 'Los Cristianos']

export default function Sidebar({
  isMobile, onSearch, onLocate,
  minutes, onMinutesChange,
  resources, allResources, activeCats, onToggleCat,
  selected, onSelect,
  loading, error,
}) {
  const [address, setAddress] = useState('')
  const [locating, setLocating] = useState(false)

  async function handleLocate() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'Accept-Language': 'es' } }
          )
          const data = await res.json()
          const a = data.address ?? {}
          const street = [a.road, a.house_number].filter(Boolean).join(' ')
          const city = a.city ?? a.town ?? a.village ?? a.municipality ?? ''
          setAddress([street, city].filter(Boolean).join(', '))
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lon.toFixed(5)}`)
        }
        onLocate(lat, lon)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Count only active-category resources
  const filteredCount = Object.values(resources).flat().length
  // Total across all categories (for the "X of Y" hint)
  const totalCount = Object.values(allResources ?? {}).flat().length

  return (
    <div style={{
      width: isMobile ? '100%' : 300,
      maxHeight: isMobile ? '45vh' : 'none',
      display: 'flex',
      flexDirection: 'column',
      borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
      borderBottom: isMobile ? '1px solid #e5e7eb' : 'none',
      background: '#fff',
      overflow: 'hidden',
    }}>

      {/* ── Controls ── */}
      <div style={{ padding: isMobile ? '10px 14px' : 16, borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        {!isMobile && <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Accesibilidad Tenerife</div>}

        {/* Search row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button
            onClick={handleLocate}
            disabled={locating || loading}
            title="Usar mi ubicación"
            style={{ padding: '7px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 15, flexShrink: 0 }}
          >
            {locating ? '⏳' : '📍'}
          </button>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch(address)}
            placeholder="Tu dirección..."
            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
          />
          <button
            onClick={() => onSearch(address)}
            disabled={loading}
            style={{ padding: '7px 12px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
          >
            {loading ? '...' : '→'}
          </button>
        </div>

        {/* City shortcuts */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {CITIES.map(city => (
            <button
              key={city}
              onClick={() => { setAddress(city); onSearch(city) }}
              disabled={loading}
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151', cursor: 'pointer' }}
            >
              {city}
            </button>
          ))}
        </div>

        {error && <div style={{ fontSize: 12, color: '#D85A30', marginBottom: 8 }}>{error}</div>}

        {/* Minute slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{minutes} min a pie</span>
          <input
            type="range" min="5" max="30" step="5"
            value={minutes}
            onChange={e => onMinutesChange(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const active = activeCats.includes(cat.id)
            const color = CATEGORY_COLORS[cat.id]
            const count = (allResources?.[cat.id] ?? []).length
            return (
              <button key={cat.id} onClick={() => onToggleCat(cat.id)} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 99,
                border: `1px solid ${active ? color : '#d1d5db'}`,
                background: active ? color + '22' : 'transparent',
                color: active ? color : '#9ca3af',
                cursor: 'pointer',
                opacity: count === 0 ? 0.4 : 1,
              }}>
                {cat.label}{count > 0 ? ` ${count}` : ''}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Results list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {totalCount > 0 && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
            {filteredCount === totalCount
              ? `${totalCount} recursos en ${minutes} min a pie`
              : `${filteredCount} de ${totalCount} recursos · ${minutes} min a pie`}
          </div>
        )}

        {CATEGORIES.filter(c => activeCats.includes(c.id)).map(cat => {
          const items = resources[cat.id]
          if (!items?.length) return null
          return (
            <div key={cat.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: CATEGORY_COLORS[cat.id], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {cat.label} · {items.length}
              </div>
              {items.map(item => (
                <div key={item.id} onClick={() => onSelect(item)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                  background: selected?.id === item.id ? '#EFF6FF' : 'transparent',
                  marginBottom: 2,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat.id], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.subcategory}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{item.distance_m}m</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
