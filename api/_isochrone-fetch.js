export async function fetchIsochrone(lat, lon, minutes) {
  const ORS_KEY = process.env.ORS_KEY
  const mins = Math.min(30, Math.max(5, parseInt(minutes)))

  const r = await fetch('https://api.openrouteservice.org/v2/isochrones/foot-walking', {
    method: 'POST',
    headers: { Authorization: ORS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: [[parseFloat(lon), parseFloat(lat)]],
      range: [mins * 60],
      range_type: 'time',
    }),
  })

  if (!r.ok) throw new Error(`ORS error ${r.status}`)
  const data = await r.json()
  return { polygon: data.features[0].geometry, minutes: mins }
}
