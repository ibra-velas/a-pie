import { REGIONS, regionById } from './_regions.js'

export default async function handler(req, res) {
  const { q, region } = req.query
  if (!q) return res.status(400).json({ error: 'Missing q parameter' })

  // Bias + hard-bound the search to the requested region (default: first)
  const r = regionById(region) || REGIONS[0]
  const { bbox } = r

  const params = new URLSearchParams({
    q: `${q}, ${r.geocodeHint}`,
    format: 'json',
    limit: '1',
    countrycodes: 'es',
    // Hard-restrict results to the region bbox (lon1,lat1,lon2,lat2)
    viewbox: `${bbox.lonMin},${bbox.latMax},${bbox.lonMax},${bbox.latMin}`,
    bounded: '1',
  })

  let results
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'APie/1.0 (ibravhq@gmail.com)' },
    })
    if (!resp.ok) throw new Error(`Nominatim ${resp.status}`)
    results = await resp.json()
  } catch (e) {
    return res.status(502).json({ error: 'Servicio de direcciones no disponible', detail: e.message })
  }

  if (!results.length) return res.status(404).json({ error: 'Dirección no encontrada' })

  const hit = results[0]
  res.json({ lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), display_name: hit.display_name })
}
