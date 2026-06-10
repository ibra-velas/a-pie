import './_load-env.js'
import { createClient } from '@supabase/supabase-js'

let supabase = null
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_REST_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    )
  }
  return supabase
}

// Warm-instance cache; capped so a long-lived instance can't grow unbounded
const memCache = new Map()
const MEM_CACHE_MAX = 200

function memCacheSet(key, polygon) {
  if (memCache.size >= MEM_CACHE_MAX) {
    memCache.delete(memCache.keys().next().value)
  }
  memCache.set(key, polygon)
}

export async function fetchIsochrone(lat, lon, minutes) {
  const mins = Math.min(30, Math.max(5, parseInt(minutes)))
  // 3-decimal rounding (~110m) so nearby origins share one isochrone
  const key = `${parseFloat(lat).toFixed(3)}:${parseFloat(lon).toFixed(3)}:${mins}`

  if (memCache.has(key)) {
    return { polygon: memCache.get(key), minutes: mins, cached: 'memory' }
  }

  try {
    const { data } = await getSupabase().rpc('iso_cache_get', { p_key: key })
    if (data) {
      memCacheSet(key, data)
      return { polygon: data, minutes: mins, cached: 'db' }
    }
  } catch {
    // Cache lookup failure must never break the request — fall through to ORS
  }

  const r = await fetch('https://api.openrouteservice.org/v2/isochrones/foot-walking', {
    method: 'POST',
    headers: { Authorization: process.env.ORS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: [[parseFloat(lon), parseFloat(lat)]],
      range: [mins * 60],
      range_type: 'time',
    }),
  })

  if (!r.ok) throw new Error(`ORS error ${r.status}`)
  const data = await r.json()
  const polygon = data.features[0].geometry

  memCacheSet(key, polygon)
  try {
    await getSupabase().rpc('iso_cache_put', { p_key: key, p_polygon: polygon, p_minutes: mins })
  } catch {
    // Best-effort write; the isochrone is already computed
  }

  return { polygon, minutes: mins }
}
