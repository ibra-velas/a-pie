// Tenerife bounding box — same limits the ingestion script enforces
const BBOX = { latMin: 27.9, latMax: 28.6, lonMin: -16.9, lonMax: -16.1 }

// Returns { lat, lon, minutes } on success, or { error } for a 400 response.
export function validateQuery(query) {
  const lat = parseFloat(query.lat)
  const lon = parseFloat(query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: 'Missing or invalid lat/lon' }
  }
  if (lat < BBOX.latMin || lat > BBOX.latMax || lon < BBOX.lonMin || lon > BBOX.lonMax) {
    return { error: 'Coordinates outside Tenerife' }
  }
  const minutes = query.minutes === undefined ? 10 : parseInt(query.minutes)
  if (!Number.isFinite(minutes)) {
    return { error: 'Invalid minutes' }
  }
  return { lat, lon, minutes: Math.min(30, Math.max(5, minutes)) }
}
