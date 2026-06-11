import { useState, useEffect, useRef } from 'react'
import { CATEGORY_COLORS, GROUP_COLORS, colorFor } from './Map'

// Stroke icons instead of emoji: consistent across devices and on-palette
function LocateIcon({ spinning }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C7A8A"
      strokeWidth="2" strokeLinecap="round" aria-hidden="true"
      style={spinning ? { animation: 'spin 1s linear infinite' } : undefined}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="1.8" fill="#1C7A8A" stroke="none" />
      <line x1="12" y1="1.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22.5" y2="12" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff"
      strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.8" y1="16.8" x2="21.5" y2="21.5" />
    </svg>
  )
}

// Grouped pill config — transporte intentionally omitted
export const PILL_GROUPS = [
  {
    label: 'Comida & Bebida',
    color: GROUP_COLORS.comida,
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
    color: GROUP_COLORS.tiendas,
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
      { label: 'Taco',          lat: 28.4465, lon: -16.2993 },
      { label: 'Tegueste',      lat: 28.5231, lon: -16.3365 },
    ],
  },
  {
    zone: 'Norte',
    cities: [
      { label: 'Tacoronte',         lat: 28.4768, lon: -16.4154 },
      { label: 'La Matanza',        lat: 28.4482, lon: -16.4577 },
      { label: 'La Orotava',        lat: 28.3936, lon: -16.5195 },
      { label: 'Puerto de la Cruz', lat: 28.4170, lon: -16.5508 },
      { label: 'Los Realejos',      lat: 28.3816, lon: -16.5842 },
      { label: 'Icod de los Vinos', lat: 28.3692, lon: -16.7203 },
      { label: 'Garachico',         lat: 28.3733, lon: -16.7659 },
      { label: 'Buenavista',        lat: 28.3725, lon: -16.8514 },
    ],
  },
  {
    zone: 'Oeste',
    cities: [
      { label: 'Santiago del Teide', lat: 28.2970, lon: -16.8160 },
      { label: 'Guía de Isora',      lat: 28.2081, lon: -16.7760 },
    ],
  },
  {
    zone: 'Sur',
    cities: [
      { label: 'Adeje',       lat: 28.1219, lon: -16.7259 },
      { label: 'Costa Adeje', lat: 28.0786, lon: -16.7367 },
      { label: 'Las Américas',lat: 28.0580, lon: -16.7280 },
      { label: 'Los Cristianos', lat: 28.0503, lon: -16.7150 },
      { label: 'Arona',       lat: 28.0073, lon: -16.6560 },
      { label: 'Granadilla',  lat: 28.1193, lon: -16.5752 },
      { label: 'El Médano',   lat: 28.0462, lon: -16.5384 },
    ],
  },
  {
    zone: 'Este',
    cities: [
      { label: 'Candelaria',         lat: 28.3568, lon: -16.3712 },
      { label: 'Arafo',              lat: 28.3398, lon: -16.4186 },
      { label: 'Güímar',             lat: 28.3187, lon: -16.4082 },
      { label: 'Puertito de Güímar', lat: 28.2962, lon: -16.3746 },
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
  const rootRef = useRef(null)

  // Mobile reads at arm's length: bump every font size by 2px
  const fz = base => (isMobile ? base + 2 : base)

  useEffect(() => {
    const el = selectedItemRef.current
    if (!selected) {
      // Deselecting returns the panel to the search controls
      if (isMobile) rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!el) return
    if (isMobile && rootRef.current) {
      // The collapsed sheet only shows the top of the panel, but the browser
      // thinks the whole panel is visible (it's translated, not clipped), so
      // scrollIntoView does nothing. Scroll the item to the top explicitly.
      const root = rootRef.current
      const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
      root.scrollTo({ top: Math.max(0, top - 10), behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
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
    <div ref={rootRef} style={{
      width: isMobile ? '100%' : 300,
      display: 'flex',
      flexDirection: 'column',
      // Mobile: fills the bottom sheet (the sheet controls the height)
      flex: isMobile ? 1 : undefined,
      minHeight: isMobile ? 0 : undefined,
      borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
      background: '#FAF7F2',
      // Mobile: single scroll zone so pill groups never get clipped
      overflowY: isMobile ? 'auto' : 'hidden',
      overflowX: 'hidden',
      // Scroll must not chain to the page (chained scroll = pull-to-refresh)
      overscrollBehavior: 'contain',
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
              // Mobile: the 50vh panel is scarce — don't let the logo eat half of it
              maxWidth: isMobile ? 210 : 320,
              height: 'auto',
            }}
          />

          {/* Live stat chip */}
          {totalCount > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 10,
              padding: '5px 12px',
              background: '#fff',
              border: '1px solid rgba(28,122,138,0.25)',
              borderRadius: 99,
              fontSize: fz(11),
              fontWeight: 500,
              color: '#4b5563',
              letterSpacing: '0.01em',
              boxShadow: '0 1px 3px rgba(43,40,32,0.06)',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1C7A8A"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>
                <strong style={{ color: '#1C7A8A', fontWeight: 700 }}>{totalCount} lugares</strong>
                {' '}en {minutes} min a pie
              </span>
            </div>
          )}
        </div>

        {/* Search row — shared height and radius so the three pieces read as one control */}
        <div data-tour="address" style={{ display: 'flex', gap: 8, marginBottom: 10, height: isMobile ? 44 : 38 }}>
          <button onClick={handleLocate} disabled={locating || loading} title="Usar mi ubicación"
            aria-label="Usar mi ubicación"
            style={{
              width: isMobile ? 44 : 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#fff', border: '1px solid #DCD5C9', borderRadius: 12,
              cursor: 'pointer', flexShrink: 0, opacity: locating || loading ? 0.6 : 1,
            }}>
            <LocateIcon spinning={locating} />
          </button>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch(address)}
            placeholder="Tu dirección..."
            title="Escribe una dirección en Tenerife y pulsa Enter"
            style={{ flex: 1, padding: '0 12px', border: '1px solid #DCD5C9', borderRadius: 12, minWidth: 0,
              // 16px on mobile: anything smaller triggers iOS auto-zoom on focus
              fontSize: isMobile ? 16 : 13 }}
          />
          <button onClick={() => onSearch(address)} disabled={loading}
            title="Buscar lugares en esta dirección"
            aria-label="Buscar lugares en esta dirección"
            style={{
              width: isMobile ? 44 : 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#1C7A8A', border: 'none', borderRadius: 12,
              cursor: 'pointer', flexShrink: 0, opacity: loading ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(28,122,138,0.25)',
            }}>
            <SearchIcon />
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
                    fontSize: fz(11), padding: isMobile ? '5px 12px' : '3px 10px', borderRadius: 99, cursor: 'pointer',
                    border: `1px solid ${active ? '#1C7A8A' : '#DCD5C9'}`,
                    background: active ? '#1C7A8A' : '#fff',
                    color: active ? '#fff' : '#4b5563',
                    fontWeight: active ? 600 : 500,
                  }}>
                  {zone}
                </button>
              )
            })}
          </div>
          {/* City pills for selected zone */}
          {selectedZone && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CITY_ZONES.find(z => z.zone === selectedZone)?.cities.map(city => {
                // The clicked city lands in the address box — that's our selection marker
                const active = address === city.label
                return (
                  <button key={city.label}
                    onClick={() => { setAddress(city.label); onLocate(city.lat, city.lon) }}
                    disabled={loading}
                    title={`Centrar el mapa en ${city.label}`}
                    style={{
                      fontSize: fz(11), padding: isMobile ? '5px 12px' : '3px 9px', borderRadius: 99,
                      border: `1px solid ${active ? 'rgba(28,122,138,0.55)' : 'rgba(28,122,138,0.25)'}`,
                      background: active ? 'rgba(28,122,138,0.13)' : '#FBEFE5',
                      color: '#1C7A8A', cursor: 'pointer', whiteSpace: 'nowrap',
                      fontWeight: active ? 700 : 500,
                      transition: 'background 0.15s, border-color 0.15s',
                    }}>
                    {city.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: fz(12), color: '#D85A30', marginBottom: 8 }}>{error}</div>}

        {/* Minute slider */}
        <div data-tour="minutes" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}
             title="Cuántos minutos estás dispuesto a caminar">
          <span style={{ fontSize: fz(14), fontWeight: 700, color: '#1C7A8A', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{minutes} min a pie</span>
          <input type="range" min="5" max="30" step="5" value={minutes}
            onChange={e => onMinutesChange(Number(e.target.value))}
            style={{ flex: 1, height: isMobile ? 28 : 'auto' }}
            aria-label="Minutos dispuesto a caminar"
            title="Desliza para cambiar cuántos minutos quieres caminar" />
        </div>

        {/* Filter toggle */}
        <button onClick={() => setFiltersOpen(o => !o)}
          data-tour="filters"
          title="Mostrar u ocultar filtros por tipo de lugar"
          style={{
            width: '100%', padding: '7px 0', fontSize: fz(12), fontWeight: 600,
            color: '#1C7A8A', background: 'rgba(28,122,138,0.07)',
            border: 'none', borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {filtersOpen ? 'Ocultar filtros' : 'Filtrar por tipo'}
        </button>

        {/* Grouped pills — shown when open */}
        {filtersOpen && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button onClick={() => onToggleGroup(ALL_SUBS)}
                title="Activar o desactivar todos los filtros a la vez"
                style={{ fontSize: fz(11), padding: '2px 10px', borderRadius: 99, border: '1px solid #d1d5db', background: 'none', color: '#6b7280', cursor: 'pointer' }}>
                {ALL_SUBS.every(s => activeSubs.has(s)) ? 'Desmarcar todo' : 'Marcar todo'}
              </button>
            </div>
            {PILL_GROUPS.map(group => (
              <div key={group.label}>
                <div style={{ fontSize: fz(10), fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
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
                        fontSize: fz(11), padding: '3px 9px', borderRadius: 99,
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
          <div style={{ fontSize: fz(11), color: '#9ca3af', marginBottom: 10 }}>
            {filteredCount === totalCount
              ? `${totalCount} lugares en ${minutes} min a pie`
              : `${filteredCount} de ${totalCount} · ${minutes} min a pie`}
          </div>
        )}

        {resultGroups.map(({ sub, label, color, items }) => (
          <div key={sub} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: fz(11), fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {label} · {items.length}
            </div>
            {items.map(item => {
              const [lon, lat] = item.location.coordinates
              const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`
              const isSelected = selected?.id === item.id
              return (
                <div key={item.id} ref={isSelected ? selectedItemRef : null}>
                  <button onClick={() => onSelect(item)}
                    title="Pincha para ver en el mapa"
                    style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '7px 8px', borderRadius: isSelected ? '8px 8px 0 0' : 8,
                    cursor: 'pointer', border: 'none', textAlign: 'left',
                    font: 'inherit', color: 'inherit',
                    background: isSelected ? '#FBEFE5' : 'transparent',
                    marginBottom: isSelected ? 0 : 2,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorFor(item), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: fz(13), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize: fz(11), color: '#9ca3af' }}>{item.address || item.subcategory}</div>
                    </div>
                    <div style={{ fontSize: fz(12), color: '#9ca3af', flexShrink: 0 }}>{item.distance_m}m</div>
                  </button>
                  {isSelected && (
                    <div style={{
                      display: 'flex', alignItems: 'stretch',
                      background: '#FBEFE5', borderRadius: '0 0 8px 8px',
                      marginBottom: 2,
                    }}>
                      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{
                        flex: 1, padding: '5px 8px 7px',
                        fontSize: fz(12), color: '#1C7A8A', textDecoration: 'none',
                      }}>
                        📍 Ver en Google Maps →
                      </a>
                      <button onClick={() => onSelect(null)}
                        aria-label="Cerrar selección" title="Cerrar selección"
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          color: '#9ca3af', fontSize: fz(13), padding: '0 12px',
                        }}>
                        ✕
                      </button>
                    </div>
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
          fontSize: fz(10.5),
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
              fontSize: fz(11),
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
              fontSize: fz(11),
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

        {/* Mobile + selection: the peek sheet only shows the top of the panel,
            so the selected card must be able to scroll to the very top. Items
            near the end of the list can't (not enough content below them) —
            this spacer guarantees the scroll range. Removed on deselect, which
            scrolls back to the controls anyway. */}
        {isMobile && selected && <div aria-hidden="true" style={{ height: '75vh', flexShrink: 0 }} />}
      </div>
    </div>
  )
}
