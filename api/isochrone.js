import './_load-env.js'
import { fetchIsochrone } from './_isochrone-fetch.js'

export default async function handler(req, res) {
  const { lat, lon, minutes = '10' } = req.query
  if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' })

  try {
    const result = await fetchIsochrone(lat, lon, minutes)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: 'Error calculando isócrona', detail: e.message })
  }
}
