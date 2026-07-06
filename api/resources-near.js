import './_load-env.js'
import { createClient } from '@supabase/supabase-js'
import { validateQuery } from './_validate.js'

// Lugares alrededor de un punto SIN isócrona: reutiliza la RPC resources_within
// con un polígono circular generado aquí — cero llamadas a ORS, solo Postgres.
// Lo usa el editor de rutas de campo (RouteEditor.jsx) para pintar los POIs de
// la zona y poder crear paradas tocando el bar en vez de adivinar en un mapa
// mudo. Radio corto y acotado: es contexto de "qué tengo delante", no búsqueda.

const supabase = createClient(
  process.env.SUPABASE_REST_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// Polígono circular (32 lados) de `radiusM` metros alrededor de lat/lon
function circlePolygon(lat, lon, radiusM, sides = 32) {
  const dLat = radiusM / 111320
  const dLon = radiusM / (111320 * Math.cos((lat * Math.PI) / 180))
  const ring = []
  for (let i = 0; i <= sides; i++) {
    const a = (2 * Math.PI * i) / sides
    ring.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)])
  }
  return { type: 'Polygon', coordinates: [ring] }
}

export default async function handler(req, res) {
  const v = validateQuery(req.query)
  if (v.error) return res.status(400).json({ error: v.error })
  const { lat, lon } = v
  const radius = Math.min(800, Math.max(100, parseInt(req.query.radius) || 500))

  const { data, error } = await supabase.rpc('resources_within', {
    polygon_geojson: JSON.stringify(circlePolygon(lat, lon, radius)),
    origin_lat: lat,
    origin_lon: lon,
  })

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({ error: 'Error consultando recursos', detail: error.message })
  }

  res.json({
    origin: { lat, lon },
    radius,
    total: data.length,
    items: data.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      distance_m: row.distance_m,
      location: JSON.parse(row.geojson),
    })),
  })
}
