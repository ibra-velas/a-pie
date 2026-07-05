// Curación de rutas predefinidas «Mi ruta» (docs/proyecto-mi-ruta.md §3).
// Lee src/route-presets.json y, para cada preset SIN geometría (o todos con
// --force), llama UNA vez a ORS /optimization (VROOM, foot-walking, ruta
// abierta: la primera parada es el start y no hay end) y escribe de vuelta:
//   - stops reordenados al orden óptimo de visita
//   - geometry: GeoJSON LineString (polyline decodificada)
//   - legs: [{ minutes, meters }] entre paradas consecutivas
//   - total: { minutes, meters }
// Una ruta = una llamada a ORS en toda su vida; mostrarla no gasta cuota.
//
// Uso: node ingesta/curate_route.mjs [--force]

import { readFileSync, writeFileSync } from 'node:fs'

// --- env (mismos ficheros que api/_load-env.js; sin dependencia dotenv) ---
for (const f of ['.env.local', '.env']) {
  try {
    for (const line of readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      // quitar comillas envolventes como hace dotenv: ORS_KEY="eyJh…" debe
      // enviar la key SIN comillas (con ellas ORS responde 403 "disallowed")
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, '$2')
    }
  } catch {}
}
if (!process.env.ORS_KEY) {
  console.error('ORS_KEY no encontrada en .env.local/.env')
  process.exit(1)
}

// Decodificador de polyline (Google encoded, precisión 5 — lo que emite VROOM).
// Sin dependencia; si el constructor (F2) lo necesita, moverlo a api/_route-fetch.js.
function decodePolyline(str, precision = 5) {
  const factor = 10 ** precision
  const coords = []
  let index = 0, lat = 0, lon = 0
  while (index < str.length) {
    for (const acc of [0, 1]) {
      let result = 0, shift = 0, byte
      do {
        byte = str.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (acc === 0) lat += delta
      else lon += delta
    }
    coords.push([lon / factor, lat / factor]) // orden GeoJSON [lon, lat]
  }
  return coords
}

async function optimize(preset) {
  const [start, ...rest] = preset.stops
  const body = {
    jobs: rest.map((s, i) => ({ id: i + 1, location: [s.lon, s.lat] })),
    vehicles: [
      // sin "end" → ruta abierta (acabas en la última tasca, no en la primera)
      { id: 1, profile: 'foot-walking', start: [start.lon, start.lat] },
    ],
    options: { g: true },
  }
  const r = await fetch('https://api.openrouteservice.org/optimization', {
    method: 'POST',
    headers: { Authorization: process.env.ORS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`ORS /optimization HTTP ${r.status}: ${text.slice(0, 400)}`)
  const data = JSON.parse(text)
  if (data.unassigned?.length) {
    throw new Error(`Paradas sin asignar (inaccesibles a pie?): ${JSON.stringify(data.unassigned)}`)
  }
  const route = data.routes?.[0]
  if (!route?.geometry) throw new Error('Respuesta sin geometría (options.g no respetado?)')

  // steps: start → job… (sin end). Reordenar stops y derivar tramos.
  const ordered = [start]
  const legs = []
  let prev = null
  for (const step of route.steps) {
    if (step.type === 'start') { prev = step; continue }
    if (step.type !== 'job') continue
    ordered.push(rest[step.job - 1])
    legs.push({
      minutes: Math.round((step.arrival - prev.arrival) / 60),
      meters: Math.round(step.distance - prev.distance),
    })
    prev = step
  }
  return {
    stops: ordered,
    legs,
    total: { minutes: Math.round(route.duration / 60), meters: Math.round(route.distance) },
    geometry: { type: 'LineString', coordinates: decodePolyline(route.geometry) },
  }
}

const FORCE = process.argv.includes('--force')
const path = new URL('../src/route-presets.json', import.meta.url)
const presets = JSON.parse(readFileSync(path, 'utf8'))

let curated = 0
for (const preset of presets) {
  if (preset.geometry && !FORCE) {
    console.log(`— ${preset.id}: ya curada, se salta (usa --force para recalcular)`)
    continue
  }
  console.log(`→ ${preset.id}: optimizando ${preset.stops.length} paradas…`)
  const result = await optimize(preset)
  Object.assign(preset, result)
  curated++
  console.log(`  orden: ${result.stops.map((s) => s.name).join(' → ')}`)
  console.log(
    `  total: ${result.total.minutes} min · ${result.total.meters} m · ` +
    `tramos: ${result.legs.map((l) => `${l.minutes}min`).join(', ')} · ` +
    `geometría: ${result.geometry.coordinates.length} puntos`
  )
}

if (curated) {
  writeFileSync(path, JSON.stringify(presets, null, 2) + '\n')
  console.log(`\n✓ ${curated} ruta(s) escritas en src/route-presets.json`)
} else {
  console.log('\nNada que curar.')
}
