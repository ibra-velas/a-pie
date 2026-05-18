import './_load-env.js'
import { createClient } from '@supabase/supabase-js'
import { fetchIsochrone } from './_isochrone-fetch.js'

const supabase = createClient(
  process.env.SUPABASE_REST_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default async function handler(req, res) {
  const { lat, lon, minutes = '10' } = req.query
  if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' })

  let polygon
  try {
    const iso = await fetchIsochrone(lat, lon, minutes)
    polygon = iso.polygon
  } catch (e) {
    return res.status(502).json({ error: 'Error calculando isócrona', detail: e.message })
  }

  const { data, error } = await supabase.rpc('resources_within', {
    polygon_geojson: JSON.stringify(polygon),
    origin_lat: parseFloat(lat),
    origin_lon: parseFloat(lon),
  })

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({ error: 'Error consultando recursos', detail: error.message })
  }

  // Group by subcategory; keep category on each item for map colour
  const by_subcategory = {}
  for (const row of data) {
    const key = row.subcategory
    if (!by_subcategory[key]) by_subcategory[key] = []
    by_subcategory[key].push({
      id: row.id,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      address: row.address,
      distance_m: row.distance_m,
      location: JSON.parse(row.geojson),
    })
  }

  res.json({
    origin: { lat: parseFloat(lat), lon: parseFloat(lon) },
    minutes: parseInt(minutes),
    polygon,
    total: data.length,
    by_subcategory,
  })
}
