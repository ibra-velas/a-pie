import { REGIONS } from './_regions.js'

// True if the coordinate falls inside any covered region's bbox
const inAnyRegion = (lat, lon) =>
  REGIONS.some(({ bbox }) =>
    lat >= bbox.latMin && lat <= bbox.latMax &&
    lon >= bbox.lonMin && lon <= bbox.lonMax)

// Returns { lat, lon, minutes } on success, or { error } for a 400 response.
export function validateQuery(query) {
  const lat = parseFloat(query.lat)
  const lon = parseFloat(query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: 'Missing or invalid lat/lon' }
  }
  if (!inAnyRegion(lat, lon)) {
    return { error: 'Coordinates outside coverage area' }
  }
  const minutes = query.minutes === undefined ? 10 : parseInt(query.minutes)
  if (!Number.isFinite(minutes)) {
    return { error: 'Invalid minutes' }
  }
  return { lat, lon, minutes: Math.min(30, Math.max(5, minutes)) }
}
