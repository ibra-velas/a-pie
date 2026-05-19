import { useState, useEffect, useRef } from 'react'
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
      { id: 'heladeria',     label: 'Heladerías' },
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
      { id: 'peluqueria',    label: 'Peluquerías' },
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

const CITY_ZONES = [
  {
    zone: 'Metro',
    cities: [
      { label: 'Santa Cruz',    lat: 28.4682, lon: -16.2546 },
      { label: 'La Laguna',     lat: 28.4869, lon: -16.3182 },
      { label: 'La Cuesta',     lat: 28.4700, lon: -16.2900 },
      { label: 'San Andrés',    lat: 28.5046, lon: -16.1910 },  // Calle Dique 27
      { label: 'El Rosario',    lat: 28.4524, lon: -16.2935 },
      { label: 'Tegueste',      lat: 28.5105, lon: -16.3290 },
    ],
  },
  {
    zone: 'Norte',
    cities: [
      { label: 'Tacoronte',         lat: 28.4761, lon: -16.4197 },
      { label: 'La Matanza',        lat: 28.4517, lon: -16.4628 },
      { label: 'La Orotava',        lat: 28.3896, lon: -16.5225 },
      { label: 'Puerto de la Cruz', lat: 28.4142, lon: -16.5487 },
      { label: 'Los Realejos',      lat: 28.3821, lon: -16.5889 },
      { label: 'Icod de los Vinos', lat: 28.3704, lon: -16.7168 },
      { label: 'Garachico',         lat: 28.3720, lon: -16.7624 },
      { label: 'Buenavista',        lat: 28.3787, lon: -16.8649 },
    ],
  },
  {
    zone: 'Oeste',
    cities: [
      { label: 'Santiago del Teide', lat: 28.2970, lon: -16.8160 },
      { label: 'Guía de Isora',      lat: 28.2100, lon: -16.7749 },
    ],
  },
  {
    zone: 'Sur',
    cities: [
      { label: 'Adeje',       lat: 28.1219, lon: -16.7259 },
      { label: 'Costa Adeje', lat: 28.0786, lon: -16.7367 },
      { label: 'Las Américas',lat: 28.0580, lon: -16.7280 },
      { label: 'Los Cristianos', lat: 28.0503, lon: -16.7150 },
      { label: 'Arona',       lat: 28.0990, lon: -16.6421 },
      { label: 'Granadilla',  lat: 28.1193, lon: -16.5752 },
      { label: 'El Médano',   lat: 28.0462, lon: -16.5384 },
    ],
  },
  {
    zone: 'Este',
    cities: [
      { label: 'Candelaria',         lat: 28.3568, lon: -16.3712 },
      { label: 'Arafo',              lat: 28.3336, lon: -16.3924 },
      { label: 'Güímar',             lat: 28.3103, lon: -16.4093 },
      { label: 'Puertito de Güímar', lat: 28.2847, lon: -16.3962 },
    ],
  },
]

export default function Sidebar({
  isMobile, onSearch, onLocate,
  minutes, onMinutesChange,
  resources, allResources, activeSubs,
  onToggleSub, onToggleGroup,
  selected, onSelect,
  loading, error,
  onShowLegal,
}) {
  const [address, setAddress] = useState('La Laguna')
  const [locating, setLocating] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [selectedZone, setSelectedZone] = useState(null)
  const selectedItemRef = useRef(null)

  useEffect(() => {
    if (selected && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selected])

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
      background: '#FAF7F2',
      // Mobile: single scroll zone so pill groups never get clipped
      overflowY: isMobile ? 'auto' : 'hidden',
      overflowX: 'hidden',
    }}>

      {/* ── Controls ── */}
      <div style={{ padding: isMobile ? '10px 14px' : 16, borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          {/* Brand image — includes illustration, title and tagline */}
          <img
            src="/images/a-pie-logo.webp"
            alt="A Pie · Vive tu barrio · Tenerife"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: 320,
              height: 'auto',
            }}
          />

          {/* Live stat chip */}
          {totalCount > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              padding: '4px 10px',
              background: '#FBEFE5',
              border: '1px solid rgba(216, 124, 63, 0.25)',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 600,
              color: '#B65F26',
              letterSpacing: '0.01em',
            }}>
              <span style={{ fontSize: 12 }}>🗺️</span>
              {totalCount} lugares en {minutes} min a pie
            </div>
          )}
        </div>

        {/* Search row */}
        <div data-tour="address" style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button onClick={handleLocate} disabled={locating || loading} title="Usar mi ubicación"
            style={{ padding: '7px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontSize: 15, flexShrink: 0 }}>
            {locating ? '⏳' : '📍'}
          </button>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch(address)}
            placeholder="Tu dirección..."
            title="Escribe una dirección en Tenerife y pulsa Enter"
            style={{ flex: 1, padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}
          />
          <button onClick={() => onSearch(address)} disabled={loading}
            title="Buscar lugares en esta dirección"
            style={{ padding: '7px 12px', background: '#1C7A8A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            {loading ? '...' : '→'}
          </button>
        </div>

        {/* City shortcuts — zone → cities */}
        <div style={{ marginBottom: 8 }}>
          {/* Zone pills */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            {CITY_ZONES.map(({ zone }) => {
              const active = selectedZone === zone
              return (
                <button key={zone}
                  onClick={() => setSelectedZone(active ? null : zone)}
                  title={`Ver ciudades de la zona ${zone}`}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 99, cursor: 'pointer',
                    border: `1px solid ${active ? '#1C7A8A' : '#d1d5db'}`,
                    background: active ? '#1C7A8A' : '#f9fafb',
                    color: active ? '#fff' : '#374151',
                    fontWeight: active ? 600 : 400,
                  }}>
                  {zone}
                </button>
              )
            })}
          </div>
          {/* City pills for selected zone */}
          {selectedZone && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CITY_ZONES.find(z => z.zone === selectedZone)?.cities.map(city => (
                <button key={city.label}
                  onClick={() => { setAddress(city.label); onLocate(city.lat, city.lon) }}
                  disabled={loading}
                  title={`Centrar el mapa en ${city.label}`}
                  style={{ fontSize: 11, padding: '3px 9px', borderRadius: 99, border: '1px solid #d1d5db', background: '#FBEFE5', color: '#1C7A8A', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {city.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: 12, color: '#D85A30', marginBottom: 8 }}>{error}</div>}

        {/* Minute slider */}
        <div data-tour="minutes" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
             title="Cuántos minutos estás dispuesto a caminar">
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1C7A8A', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{minutes} min a pie</span>
          <input type="range" min="5" max="30" step="5" value={minutes}
            onChange={e => onMinutesChange(Number(e.target.value))} style={{ flex: 1 }}
            title="Desliza para cambiar cuántos minutos quieres caminar" />
        </div>

        {/* Filter toggle */}
        <button onClick={() => setFiltersOpen(o => !o)}
          data-tour="filters"
          title="Mostrar u ocultar filtros por tipo de lugar"
          style={{ width: '100%', padding: '5px 0', fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}>
          {filtersOpen ? '▲ Ocultar filtros' : '▼ Filtrar por tipo'}
        </button>

        {/* Grouped pills — shown when open */}
        {filtersOpen && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button onClick={() => onToggleGroup(ALL_SUBS)}
                title="Activar o desactivar todos los filtros a la vez"
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
                    const hasSearched = Object.keys(allResources ?? {}).length > 0
                    if (hasSearched && count === 0) return null
                    return (
                      <button key={pill.id} onClick={() => handlePillClick(pill)}
                        title={active ? `Ocultar ${pill.label.toLowerCase()} del mapa` : `Mostrar ${pill.label.toLowerCase()} en el mapa`}
                        style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 99,
                        border: `1px solid ${active ? group.color : '#d1d5db'}`,
                        background: active ? group.color + '22' : 'transparent',
                        color: active ? group.color : '#9ca3af',
                        cursor: 'pointer',
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
                <div key={item.id} ref={isSelected ? selectedItemRef : null}>
                  <div onClick={() => onSelect(item)}
                    title="Pincha para ver en el mapa"
                    style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 8px', borderRadius: isSelected ? '8px 8px 0 0' : 8,
                    cursor: 'pointer',
                    background: isSelected ? '#FBEFE5' : 'transparent',
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
                      background: '#FBEFE5', borderRadius: '0 0 8px 8px',
                      fontSize: 12, color: '#1C7A8A', textDecoration: 'none',
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

        {/* Footer with legal link and attribution */}
        <div style={{
          marginTop: 24,
          paddingTop: 14,
          borderTop: '1px solid rgba(28,122,138,0.12)',
          fontSize: 10.5,
          color: '#8A7F70',
          lineHeight: 1.6,
        }}>
          <button
            onClick={onShowLegal}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#1C7A8A',
              fontSize: 11,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(28,122,138,0.35)',
              fontFamily: 'inherit',
            }}
          >
            Aviso legal y privacidad
          </button>
          <span style={{ margin: '0 6px', color: '#C9BFB0' }}>·</span>
          <a
            href="mailto:ibravhq@gmail.com?subject=A%20Pie%20—%20Contacto"
            style={{
              color: '#1C7A8A',
              fontSize: 11,
              textDecoration: 'underline',
              textDecorationColor: 'rgba(28,122,138,0.35)',
            }}
          >
            Contacto
          </a>
          <div style={{ marginTop: 6 }}>
            Datos © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: '#8A7F70' }}>OpenStreetMap</a> ·
            Tiles © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" style={{ color: '#8A7F70' }}>CARTO</a>
          </div>
        </div>
      </div>
    </div>
  )
}
