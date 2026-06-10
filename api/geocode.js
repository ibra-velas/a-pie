export default async function handler(req, res) {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'Missing q parameter' })

  const params = new URLSearchParams({
    q: `${q}, Tenerife, España`,
    format: 'json',
    limit: '1',
    countrycodes: 'es',
    // Hard-restrict results to the Tenerife bbox (lon1,lat1,lon2,lat2)
    viewbox: '-16.9,28.6,-16.1,27.9',
    bounded: '1',
  })

  let results
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'APie-Tenerife/1.0 (ibravhq@gmail.com)' },
    })
    if (!r.ok) throw new Error(`Nominatim ${r.status}`)
    results = await r.json()
  } catch (e) {
    return res.status(502).json({ error: 'Servicio de direcciones no disponible', detail: e.message })
  }

  if (!results.length) return res.status(404).json({ error: 'Dirección no encontrada' })

  const hit = results[0]
  res.json({ lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), display_name: hit.display_name })
}
