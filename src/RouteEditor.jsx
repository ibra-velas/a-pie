import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { REGIONS, DEFAULT_REGION } from './regions'
import ROUTE_PRESETS from './route-presets.json'
import { colorFor } from './Map'

// ── Editor de rutas de campo (solo Ibrahim) ─────────────────────────────────
// Se abre con el hash secreto (ver EDITOR_HASH en App.jsx) y se carga con
// import() dinámico: los usuarios normales no descargan este código. Trabaja
// 100% en el navegador — no toca Supabase, ni la API, ni ORS. El resultado es
// un JSON con el formato de route-presets.json (geometry: null; la geometría
// la calcula curate_route.mjs en casa, como siempre).
//
// Pensado para usarse CAMINANDO: botón «mi posición» para añadir la parada
// donde estás, autoguardado continuo en localStorage (si muere la batería o
// Safari recarga, el borrador sobrevive), inputs a 16px (iOS no hace zoom).

const DRAFT_KEY = 'a-pie-editor-borrador'
const TEAL = '#1C7A8A'
const TEAL_DARK = '#145A66'

const today = () => new Date().toISOString().slice(0, 10)

const EMPTY_DRAFT = () => ({
  id: '', idTouched: false,
  label: '', short: '',
  region: DEFAULT_REGION, municipality: '',
  description: '', published_at: today(),
  chipText: '', chipImage: null, // dataURL (foto nueva) o ruta /carteles/… (ruta existente)
  stops: [],
})

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY))
    if (d && Array.isArray(d.stops)) return { ...EMPTY_DRAFT(), ...d }
  } catch {}
  return EMPTY_DRAFT()
}

// Slug para el id: minúsculas, sin acentos ni emojis, guiones
function slugify(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Foto de móvil (4 MB) → JPEG comprimido apto para el repo (~200 KB)
function resizeImage(file, maxDim = 1200) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

function stopIcon(n, isStart, isSel) {
  const bg = isSel ? TEAL_DARK : TEAL
  const d = isSel ? 30 : 26
  return L.divIcon({
    className: '',
    iconSize: [d, d], iconAnchor: [d / 2, d / 2],
    html: `<div style="width:${d}px;height:${d}px;border-radius:50%;background:${bg};
      border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.4);color:#fff;
      font:700 ${isSel ? 13 : 12}px 'Plus Jakarta Sans',sans-serif;
      display:flex;align-items:center;justify-content:center;">${isStart ? '➊' : n}</div>`,
  })
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', fontSize: 16, padding: '8px 10px',
  border: '1px solid #DCD5C9', borderRadius: 12, background: '#fff',
  fontFamily: 'inherit', color: 'inherit',
}
const btnStyle = {
  fontSize: 14, fontWeight: 600, padding: '9px 14px', borderRadius: 12,
  border: `1px solid rgba(28,122,138,0.4)`, background: '#fff', color: TEAL,
  cursor: 'pointer', fontFamily: 'inherit',
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#8A7F70', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      {children}
    </label>
  )
}

export default function RouteEditor({ onExit }) {
  const [draft, setDraft] = useState(loadDraft)
  const [selIdx, setSelIdx] = useState(null)
  const [status, setStatus] = useState(null)
  const [locating, setLocating] = useState(false)
  const [poiPick, setPoiPick] = useState(null)   // POI tocado, pendiente de confirmar
  const [zoomedOut, setZoomedOut] = useState(false)
  const mapRef = useRef(null)
  const leaflet = useRef(null)
  const layerRef = useRef(null)
  const poiLayerRef = useRef(null)
  const poiAbortRef = useRef(null)
  const poiPickRef = useRef(null)
  const poiClickAtRef = useRef(0)
  const draftRef = useRef(draft)
  const selRef = useRef(selIdx)
  draftRef.current = draft
  selRef.current = selIdx
  poiPickRef.current = poiPick

  const patch = p => setDraft(d => ({ ...d, ...p }))
  const patchStop = (i, p) => setDraft(d => ({
    ...d, stops: d.stops.map((s, j) => (j === i ? { ...s, ...p } : s)),
  }))

  // Autoguardado: cada cambio persiste — el modo campo no perdona pérdidas
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch {}
  }, [draft])

  function addStop(lat, lon, name) {
    setDraft(d => {
      setSelIdx(d.stops.length)
      return {
        ...d,
        stops: [...d.stops, {
          name: name || `Parada ${d.stops.length + 1}`, hint: '',
          lat: +lat.toFixed(5), lon: +lon.toFixed(5),
        }],
      }
    })
  }

  // POIs de la zona (bares, tiendas…) desde la DB vía /api/resources-near:
  // sin ellos el editor es un mapa mudo — no sabrías qué punto estás señalando.
  // Solo con zoom cercano; radio = media diagonal del viewport (cap 800 m).
  async function loadPois() {
    const m = leaflet.current
    const g = poiLayerRef.current
    if (!m || !g) return
    if (m.getZoom() < 16) {
      g.clearLayers()
      setZoomedOut(true)
      return
    }
    setZoomedOut(false)
    const c = m.getCenter()
    const radius = Math.min(800, Math.max(150, Math.round(c.distanceTo(m.getBounds().getNorthEast()))))
    poiAbortRef.current?.abort()
    const ctrl = new AbortController()
    poiAbortRef.current = ctrl
    try {
      const res = await fetch(`/api/resources-near?lat=${c.lat}&lon=${c.lng}&radius=${radius}`, { signal: ctrl.signal })
      if (!res.ok) return
      const { items } = await res.json()
      if (ctrl.signal.aborted) return
      g.clearLayers()
      for (const item of items) {
        const [ilon, ilat] = item.location.coordinates
        L.circleMarker([ilat, ilon], {
          radius: 5.5, fillColor: colorFor(item), fillOpacity: 0.95,
          color: '#fff', weight: 1.5,
        })
          .bindTooltip(item.name, { direction: 'top', offset: [0, -6] })
          // Tocar un POI no añade la parada directamente: propone (barra de
          // confirmación) — en móvil no hay hover para leer el nombre antes.
          // El timestamp evita que el click del mapa (mismo evento DOM, se
          // dispara después) añada además una parada genérica.
          .on('click', () => {
            poiClickAtRef.current = Date.now()
            setPoiPick({ name: item.name, lat: ilat, lon: ilon })
          })
          .addTo(g)
      }
    } catch {} // abort o red caída: los POIs son contexto, no bloquean nada
  }

  // Mapa: init una vez
  useEffect(() => {
    const m = L.map(mapRef.current, { maxZoom: 20 })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' + import.meta.env.VITE_CARTO_API_KEY, {
      attribution: '© CARTO · Datos: © OpenStreetMap', maxZoom: 20,
    }).addTo(m)
    const stops = draftRef.current.stops
    if (stops.length) {
      m.fitBounds(L.latLngBounds(stops.map(s => [s.lat, s.lon])), { padding: [50, 50], maxZoom: 17 })
    } else {
      m.setView([28.4869, -16.3182], 16) // La Laguna, catedral
    }
    m.on('click', e => {
      // El click de un POI llega también aquí (mismo evento DOM): ignorarlo
      if (Date.now() - poiClickAtRef.current < 300) return
      // Con una propuesta de POI pendiente, tocar el mapa la descarta (no
      // añade una parada genérica por accidente)
      if (poiPickRef.current) { setPoiPick(null); return }
      addStop(e.latlng.lat, e.latlng.lng)
    })
    leaflet.current = m
    poiLayerRef.current = L.layerGroup().addTo(m)
    layerRef.current = L.layerGroup().addTo(m)
    // moveend cubre pan y zoom; debounce corto para no disparar en cadena
    let t = null
    m.on('moveend', () => { clearTimeout(t); t = setTimeout(loadPois, 400) })
    loadPois()
    return () => { clearTimeout(t); poiAbortRef.current?.abort(); m.remove() }
  }, [])

  // Redibujar paradas + línea provisional (pocas paradas: rebuild trivial)
  useEffect(() => {
    const g = layerRef.current
    if (!g) return
    g.clearLayers()
    if (draft.stops.length > 1) {
      L.polyline(draft.stops.map(s => [s.lat, s.lon]), {
        color: TEAL, weight: 3, opacity: 0.8, dashArray: '7, 9', interactive: false,
      }).addTo(g)
    }
    draft.stops.forEach((s, i) => {
      L.marker([s.lat, s.lon], { icon: stopIcon(i + 1, i === 0, i === selIdx), draggable: true })
        .on('click', () => setSelIdx(prev => (prev === i ? null : i)))
        .on('dragend', e => {
          const { lat, lng } = e.target.getLatLng()
          patchStop(i, { lat: +lat.toFixed(5), lon: +lng.toFixed(5) })
        })
        .bindTooltip(s.name, { direction: 'top' })
        .addTo(g)
    })
  }, [draft.stops, selIdx])

  function locateAdd() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        addStop(coords.latitude, coords.longitude)
        leaflet.current?.setView([coords.latitude, coords.longitude], Math.max(leaflet.current.getZoom(), 17))
        setLocating(false)
      },
      () => { setLocating(false); flash('No se pudo obtener la posición') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function moveStop(i, dir) {
    setDraft(d => {
      const j = i + dir
      if (j < 0 || j >= d.stops.length) return d
      const stops = [...d.stops]
      ;[stops[i], stops[j]] = [stops[j], stops[i]]
      return { ...d, stops }
    })
    setSelIdx(i + dir)
  }

  function removeStop(i) {
    setDraft(d => ({ ...d, stops: d.stops.filter((_, j) => j !== i) }))
    setSelIdx(null)
  }

  function flash(msg) {
    setStatus(msg)
    setTimeout(() => setStatus(null), 3500)
  }

  // El id sigue al label salvo que se haya tocado a mano
  function onLabelChange(v) {
    patch({ label: v, ...(draft.idTouched ? {} : { id: slugify(v) }) })
  }

  async function onImagePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      patch({ chipImage: await resizeImage(file) })
    } catch { flash('No se pudo leer la imagen') }
    e.target.value = ''
  }

  function buildRoute() {
    const d = draft
    const route = {
      id: d.id || slugify(d.label) || 'ruta-sin-nombre',
      label: d.label, short: d.short || d.label,
      region: d.region, municipality: d.municipality,
      description: d.description, published_at: d.published_at,
    }
    if (d.chipText || d.chipImage) {
      route.chip = {
        ...(d.chipText ? { text: d.chipText } : {}),
        // La foto nueva viaja como archivo aparte; el JSON referencia su
        // destino en public/carteles/. Una ruta existente conserva su path.
        ...(d.chipImage ? { image: d.chipImage.startsWith('data:') ? `/carteles/${route.id}.jpg` : d.chipImage } : {}),
      }
    }
    route.stops = d.stops.map(({ name, hint, lat, lon }) => ({ name, hint, lat, lon }))
    route.geometry = null // curate_route.mjs la rellena (--force si es una edición)
    return route
  }

  async function shareOrCopy(text, filename) {
    const file = new File([text], filename, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return 'compartido' } catch {}
    }
    try { await navigator.clipboard.writeText(text); return 'copiado al portapapeles' } catch {}
    return null
  }

  async function exportJson() {
    if (!draft.stops.length) { flash('La ruta no tiene paradas'); return }
    const route = buildRoute()
    const how = await shareOrCopy(JSON.stringify(route, null, 2), `${route.id}.json`)
    flash(how ? `JSON ${how} — pégalo en route-presets.json y corre curate_route.mjs` : 'No se pudo exportar')
  }

  async function exportImage() {
    if (!draft.chipImage?.startsWith('data:')) return
    const id = draft.id || 'cartel'
    const blob = await (await fetch(draft.chipImage)).blob()
    const file = new File([blob], `${id}.jpg`, { type: 'image/jpeg' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); flash(`Cartel compartido — va a public/carteles/${id}.jpg`); return } catch {}
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${id}.jpg`
    a.click()
    URL.revokeObjectURL(a.href)
    flash(`Cartel descargado — va a public/carteles/${id}.jpg`)
  }

  function loadPreset(id) {
    const p = ROUTE_PRESETS.find(r => r.id === id)
    if (!p) return
    if (draft.stops.length && !window.confirm('¿Descartar el borrador actual y cargar esta ruta?')) return
    setDraft({
      ...EMPTY_DRAFT(),
      id: p.id, idTouched: true,
      label: p.label, short: p.short ?? '',
      region: p.region, municipality: p.municipality ?? '',
      description: p.description ?? '', published_at: p.published_at ?? today(),
      chipText: p.chip?.text ?? '', chipImage: p.chip?.image ?? null,
      stops: p.stops.map(({ name, hint, lat, lon }) => ({ name, hint: hint ?? '', lat, lon })),
    })
    setSelIdx(null)
    if (leaflet.current && p.stops.length) {
      leaflet.current.fitBounds(L.latLngBounds(p.stops.map(s => [s.lat, s.lon])), { padding: [50, 50], maxZoom: 17 })
    }
  }

  function clearDraft() {
    if (!window.confirm('¿Vaciar el borrador? Esto no se puede deshacer.')) return
    setDraft(EMPTY_DRAFT())
    setSelIdx(null)
  }

  return (
    <div style={{
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: '#2B2820',
      background: '#FAF7F2', height: '100vh', display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Mapa ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: TEAL, color: '#fff', fontSize: 12, fontWeight: 700,
          padding: '4px 14px', borderRadius: 99, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
        }}>
          {zoomedOut ? 'EDITOR · acércate para ver los lugares' : 'EDITOR · toca un lugar o el mapa'}
        </div>
        {/* Barra de confirmación del POI tocado: se ve el nombre antes de
            añadir (en móvil no hay hover); tocar el mapa vacío la descarta */}
        {poiPick && (
          <div style={{
            position: 'absolute', bottom: 62, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 8, maxWidth: 'calc(100vw - 24px)',
            background: '#fff', border: `1px solid rgba(28,122,138,0.4)`, borderRadius: 99,
            padding: '6px 6px 6px 14px', boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: '#2B2820',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {poiPick.name}
            </span>
            <button onClick={() => { addStop(poiPick.lat, poiPick.lon, poiPick.name); setPoiPick(null) }}
              style={{ ...btnStyle, background: TEAL, color: '#fff', border: 'none', padding: '6px 14px', flexShrink: 0 }}>
              Añadir parada
            </button>
            <button onClick={() => setPoiPick(null)} aria-label="Descartar"
              style={{ ...btnStyle, padding: '6px 10px', flexShrink: 0 }}>✕</button>
          </div>
        )}
        <button onClick={locateAdd} disabled={locating} title="Añadir una parada en mi posición"
          style={{
            position: 'absolute', bottom: 14, right: 12, zIndex: 1000,
            ...btnStyle, boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
            opacity: locating ? 0.6 : 1,
          }}>
          {locating ? 'Localizando…' : '📍 Parada en mi posición'}
        </button>
      </div>

      {/* ── Panel ── */}
      <div style={{ height: '48vh', overflowY: 'auto', padding: '12px 14px', borderTop: '1px solid #DCD5C9', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: TEAL }}>Editor de rutas</div>
          {status && <div style={{ fontSize: 11, color: TEAL_DARK, fontWeight: 600 }}>{status}</div>}
          <button onClick={onExit} style={{ ...btnStyle, padding: '5px 12px' }}>Salir</button>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={exportJson} style={{ ...btnStyle, background: TEAL, color: '#fff', border: 'none' }}>
            Exportar JSON
          </button>
          {draft.chipImage?.startsWith('data:') && (
            <button onClick={exportImage} style={btnStyle}>Exportar cartel</button>
          )}
          <select value="" onChange={e => e.target.value && loadPreset(e.target.value)}
            style={{ ...btnStyle, appearance: 'auto' }}>
            <option value="">Cargar existente…</option>
            {ROUTE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button onClick={clearDraft} style={{ ...btnStyle, color: '#D85A30', borderColor: 'rgba(216,90,48,0.4)' }}>
            Vaciar
          </button>
        </div>

        {/* Datos de la ruta */}
        <Field label="Nombre (label) — admite emojis 🇮🇨">
          <input style={inputStyle} value={draft.label} onChange={e => onLabelChange(e.target.value)}
            placeholder="Ruta de la tapa · Casco de La Laguna" />
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="Nombre corto (chip móvil)">
              <input style={inputStyle} value={draft.short} onChange={e => patch({ short: e.target.value })}
                placeholder="Ruta de la tapa" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Id (archivo)">
              <input style={inputStyle} value={draft.id}
                onChange={e => patch({ id: slugify(e.target.value), idTouched: true })} />
            </Field>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="Región">
              <select style={inputStyle} value={draft.region} onChange={e => patch({ region: e.target.value })}>
                {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Municipio">
              <input style={inputStyle} value={draft.municipality} onChange={e => patch({ municipality: e.target.value })}
                placeholder="San Cristóbal de La Laguna" />
            </Field>
          </div>
        </div>
        <Field label="Descripción">
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={draft.description}
            onChange={e => patch({ description: e.target.value })} />
        </Field>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Field label="Chip informativo (opcional)">
              <input style={inputStyle} value={draft.chipText} onChange={e => patch({ chipText: e.target.value })}
                placeholder="Feria de la tapa 2026" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Publicada el">
              <input style={inputStyle} value={draft.published_at} onChange={e => patch({ published_at: e.target.value })} />
            </Field>
          </div>
        </div>

        {/* Cartel */}
        <Field label="Cartel (opcional, jpg/png — se comprime solo)">
          {draft.chipImage ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {draft.chipImage.startsWith('data:')
                ? <img src={draft.chipImage} alt="Cartel" style={{ maxWidth: 120, borderRadius: 8, border: '1px solid #DCD5C9' }} />
                : <div style={{ fontSize: 12, color: '#8A7F70' }}>{draft.chipImage}</div>}
              <button onClick={() => patch({ chipImage: null })} style={{ ...btnStyle, padding: '5px 10px', fontSize: 12 }}>
                Quitar
              </button>
            </div>
          ) : (
            <input type="file" accept="image/jpeg,image/png" onChange={onImagePick} style={{ fontSize: 14 }} />
          )}
        </Field>

        {/* Paradas */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#8A7F70', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 6px' }}>
          Paradas · {draft.stops.length} — la ➊ es la salida (arrastra los pines para afinar)
        </div>
        {draft.stops.map((s, i) => (
          <div key={i} onClick={() => setSelIdx(i)} style={{
            display: 'flex', gap: 6, alignItems: 'center', padding: '6px 6px',
            borderRadius: 10, marginBottom: 4,
            background: i === selIdx ? '#FBEFE5' : 'transparent',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: i === selIdx ? TEAL_DARK : TEAL, color: '#fff',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <input style={{ ...inputStyle, padding: '5px 8px' }} value={s.name}
                onChange={e => patchStop(i, { name: e.target.value })} placeholder="Nombre" />
              <input style={{ ...inputStyle, padding: '5px 8px', fontSize: 14 }} value={s.hint}
                onChange={e => patchStop(i, { hint: e.target.value })} placeholder="Pista (calle, referencia…)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
              <button onClick={ev => { ev.stopPropagation(); moveStop(i, -1) }} disabled={i === 0}
                aria-label="Subir" style={{ ...btnStyle, padding: '2px 8px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
              <button onClick={ev => { ev.stopPropagation(); moveStop(i, 1) }} disabled={i === draft.stops.length - 1}
                aria-label="Bajar" style={{ ...btnStyle, padding: '2px 8px', opacity: i === draft.stops.length - 1 ? 0.3 : 1 }}>↓</button>
            </div>
            <button onClick={ev => { ev.stopPropagation(); removeStop(i) }} aria-label="Borrar parada"
              style={{ ...btnStyle, padding: '2px 9px', color: '#D85A30', borderColor: 'rgba(216,90,48,0.4)', flexShrink: 0 }}>✕</button>
          </div>
        ))}
        {!draft.stops.length && (
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            Toca el mapa, o usa «Parada en mi posición» cuando estés delante del sitio.
          </div>
        )}
      </div>
    </div>
  )
}
