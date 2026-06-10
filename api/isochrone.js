import './_load-env.js'
import { fetchIsochrone } from './_isochrone-fetch.js'
import { validateQuery } from './_validate.js'

export default async function handler(req, res) {
  const v = validateQuery(req.query)
  if (v.error) return res.status(400).json({ error: v.error })

  try {
    const result = await fetchIsochrone(v.lat, v.lon, v.minutes)
    res.json(result)
  } catch (e) {
    res.status(502).json({ error: 'Error calculando isócrona', detail: e.message })
  }
}
