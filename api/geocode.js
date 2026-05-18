export default async function handler(req, res) {
  const { q } = req.query
  if (!q) return res.status(400).json({ error: 'Missing q parameter' })

  const params = new URLSearchParams({
    q: `${q}, Tenerife, España`,
    format: 'json',
    limit: '1',
    countrycodes: 'es',
  })

  const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'AccesibilidadTenerife/1.0' },
  })
  const results = await r.json()

  if (!results.length) return res.status(404).json({ error: 'Dirección no encontrada' })

  const hit = results[0]
  res.json({ lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), display_name: hit.display_name })
}
