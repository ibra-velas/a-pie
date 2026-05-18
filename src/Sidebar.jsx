import { useState } from 'react'
import { CATEGORY_COLORS } from './Map'

// Grouped pill config — transporte intentionally omitted
export const PILL_GROUPS = [
  {
    label: 'Comida & Bebida',
    color: '#C4622D',
    pills: [
      { id: 'restaurante',   label: 'Restaurantes' },
      { id: 'bar',           label: 'Bares' },
      { id: 'cafe',          label: 'Cafés' },
      { id: 'comida_rapida', label: 'Comida rápida' },
      { id: 'panaderia',     label: 'Panaderías' },
      { id: 'carniceria',    label: 'Carnicerías' },
      { id: 'fruteria',      label: 'Fruterías' },
      { id: 'pescaderia',    label: 'Pescaderías' },
      { id: 'mercado',       label: 'Mercados' },
    ],
  },
  {
    label: 'Tiendas',
    color: '#2E86AB',
    pills: [
      { id: 'supermercado',  label: 'Supermercados' },
      { id: 'tienda',        label: 'Tiendas' },
      { id: 'libreria',      label: 'Librerías' },
      { id: 'ferreteria',    label: 'Ferreterías' },
      { id: 'barberia',      label: 'Barberías' },
      { id: 'floristeria',   label: 'Floristerías' },
    ],
  },
  {
    label: 'Salud',
    color: CATEGORY_COLORS.salud,
    pills: [
      { id: 'farmacia',      label: 'Farmacias' },
      { id: 'clinica',       label: 'Clínicas' },
      { id: 'medico',        label: 'Médicos' },
      { id: 'hospital',      label: 'Hospitales' },
    ],
  },
  {
    label: 'Cultura',
    color: CATEGORY_COLORS.cultura,
    // Single pill that covers all cultura subcategories
    pills: [{ id: '__cultura', label: 'Cultura', subs: ['biblioteca', 'museo', 'teatro', 'cine'] }],
  },
  {
    label: 'Ocio',
    color: CATEGORY_COLORS.ocio,
    // Single pill that covers all ocio subcategories
    pills: [{ id: '__ocio', label: 'Ocio', subs: ['parque', 'deportes', 'piscina', 'gimnasio'] }],
  },
]

// Flat list of all real subcategory strings that should be ON by default
export const ALL_SUBS = PILL_GROUPS.flatMap(g =>
  g.pills.flatMap(p => p.subs ?? [p.id])
)

const CITIES = ['Santa Cruz', 'La Laguna', 'Puerto de la Cruz', 'Candelaria', 'Los Cristianos']

export default function Sidebar({
  isMobile, onSearch, onLocate,
  minutes, onMinutesChange,
  resources, allResources, activeSubs,
  onToggleSub, onToggleGroup,
  selected, onSelect,
  loading, error,
}) {
  const [address, setAddress] = useState('')
  const [locating, setLocating] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  // Is a pill active? For multi-sub pills, true if ALL subs are active
  function isPillActive(pill) {
    const subs = pill.subs ?? [pill.id]
    return subs.every(s => activeSubs.has(s))
  }

  function handlePillClick(pill) {
    const subs = pill.subs ?? [pill.id]
    if (subs.length === 1) {
      onToggleSub(subs[0])
    } else {
      onToggleGroup(subs)
    }
  }

  const filteredCount = Object.values(resources).flat().length
  const totalCount = Object.values(allResources ?? {}).flat().length

  // Build a flat display list from filtered resources, preserving subcategory grouping
  const resultGroups = PILL_GROUPS.flatMap(g =>
    g.pills.flatMap(pill => {
      const subs = pill.subs ?? [pill.id]
      return subs.flatMap(sub => {
        const items = resources[sub]
        if (!items?.length) return []
        return [{ sub, label: pill.label === 'Cultura' || pill.label === 'Ocio' ? sub : pill.label, color: g.color, items }]
      })
    })
  )

  return (
    <div style={{
      width: isMobile ? '100%' : 300,
      maxHeight: isMobile ? '50vh' : 'none',
      display: 'flex',
      flexDirection: 'column',
      borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
      borderBottom: isMobile ? '1px solid #e5e7eb' : 'none',
      background: '#fff',
      // Mobile: single scroll zone so pill groups never get clipped
      overflowY: isMobile ? 'auto' : 'hidden',
      overflowX: 'hidden',
    }}>

      {/* ── Controls ── */}
      <div style={{ padding: isMobile ? '10px 14px' : 16, borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        {!isMobile && <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Accesibilidad Tenerife</div>}

        {/* Search row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button onClick={handleLocate} disabled={locating || loading} title="Usar mi ubicación"
            style={{ padding: '7px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 15, flexShrink: 0 }}>
            {locating ? '⏳' : '📍'}
          </button>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch(address)}
            placeholder="Tu dirección..."
            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
          />
          <button onClick={() => onSearch(address)} disabled={loading}
            style={{ padding: '7px 12px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            {loading ? '...' : '→'}
          </button>
        </div>

        {/* City shortcuts */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
          {CITIES.map(city => (
            <button key={city} onClick={() => { setAddress(city); onSearch(city) }} disabled={loading}
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151', cursor: 'pointer' }}>
              {city}
            </button>
          ))}
        </div>

        {error && <div style={{ fontSize: 12, color: '#D85A30', marginBottom: 8 }}>{error}</div>}

        {/* Minute slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{minutes} min a pie</span>
          <input type="range" min="5" max="30" step="5" value={minutes}
            onChange={e => onMinutesChange(Number(e.target.value))} style={{ flex: 1 }} />
        </div>

        {/* Filter toggle */}
        <button onClick={() => setFiltersOpen(o => !o)}
          style={{ width: '100%', padding: '5px 0', fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}>
          {filtersOpen ? '▲ Ocultar filtros' : '▼ Filtrar por tipo'}
        </button>

        {/* Grouped pills — shown when open */}
        {filtersOpen && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button onClick={() => onToggleGroup(ALL_SUBS)}
                style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, border: '1px solid #d1d5db', background: 'none', color: '#6b7280', cursor: 'pointer' }}>
                {ALL_SUBS.every(s => activeSubs.has(s)) ? 'Desmarcar todo' : 'Marcar todo'}
              </button>
            </div>
            {PILL_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {group.pills.map(pill => {
                    const active = isPillActive(pill)
                    const count = (pill.subs ?? [pill.id]).reduce((n, s) => n + ((allResources?.[s] ?? []).length), 0)
                    return (
                      <button key={pill.id} onClick={() => handlePillClick(pill)} style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 99,
                        border: `1px solid ${active ? group.color : '#d1d5db'}`,
                        background: active ? group.color + '22' : 'transparent',
                        color: active ? group.color : '#9ca3af',
                        cursor: 'pointer',
                        opacity: count === 0 ? 0.35 : 1,
                      }}>
                        {pill.label}{count > 0 ? ` ${count}` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Results list ── */}
      <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', padding: '10px 14px' }}>
        {totalCount > 0 && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
            {filteredCount === totalCount
              ? `${totalCount} lugares en ${minutes} min a pie`
              : `${filteredCount} de ${totalCount} · ${minutes} min a pie`}
          </div>
        )}

        {resultGroups.map(({ sub, label, color, items }) => (
          <div key={sub} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {label} · {items.length}
            </div>
            {items.map(item => {
              const [lon, lat] = item.location.coordinates
              const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`
              const isSelected = selected?.id === item.id
              return (
                <div key={item.id}>
                  <div onClick={() => onSelect(item)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 8px', borderRadius: isSelected ? '8px 8px 0 0' : 8,
                    cursor: 'pointer',
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    marginBottom: isSelected ? 0 : 2,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[item.category] ?? color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.address || item.subcategory}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{item.distance_m}m</div>
                  </div>
                  {isSelected && (
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
                      display: 'block', padding: '5px 8px 7px',
                      background: '#EFF6FF', borderRadius: '0 0 8px 8px',
                      fontSize: 12, color: '#185FA5', textDecoration: 'none',
                      marginBottom: 2,
                    }}>
                      📍 Ver en Google Maps →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
