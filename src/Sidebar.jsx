import { useState } from 'react'
import { CATEGORY_COLORS } from './Map'

const CATEGORIES = [
  { id: 'salud',      label: 'Salud' },
  { id: 'educacion',  label: 'Educación' },
  { id: 'ocio',       label: 'Ocio' },
  { id: 'transporte', label: 'Transporte' },
]

export default function Sidebar({ mobile, expanded, onToggleExpand, onSearch, minutes, onMinutesChange, resources, selected, onSelect, loading, error }) {
  const [address, setAddress] = useState('')
  const [activeCats, setActiveCats] = useState(['salud', 'educacion', 'ocio', 'transporte'])

  const toggleCat = id =>
    setActiveCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const totalCount = Object.values(resources).flat().length

  const controls = (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
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

      {error && <div style={{ fontSize: 12, color: '#D85A30', marginBottom: 8 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{minutes} min a pie</span>
        <input
          type="range" min="5" max="30" step="5"
          value={minutes}
          onChange={e => onMinutesChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const active = activeCats.includes(cat.id)
          const color = CATEGORY_COLORS[cat.id]
          return (
            <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 99,
              border: `1px solid ${active ? color : '#d1d5db'}`,
              background: active ? color + '22' : 'transparent',
              color: active ? color : '#9ca3af',
              cursor: 'pointer',
            }}>
              {cat.label}
            </button>
          )
        })}
      </div>
    </>
  )

  const results = (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
      {totalCount > 0 && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
          {totalCount} recursos en {minutes} min a pie
        </div>
      )}
      {CATEGORIES.filter(c => activeCats.includes(c.id)).map(cat => {
        const items = resources[cat.id]
        if (!items?.length) return null
        return (
          <div key={cat.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
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
  )

  if (mobile) {
    const collapsedHeight = 160
    const expandedHeight = '60vh'

    return (
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.12)',
        height: expanded ? expandedHeight : collapsedHeight,
        transition: 'height 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Drag handle */}
        <div
          onClick={onToggleExpand}
          style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#d1d5db' }} />
        </div>

        <div style={{ padding: '4px 16px 12px', flexShrink: 0 }}>
          {controls}
        </div>

        {expanded && results}
      </div>
    )
  }

  return (
    <div style={{ width: 300, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Accesibilidad Tenerife</div>
        {controls}
      </div>
      {results}
    </div>
  )
}
