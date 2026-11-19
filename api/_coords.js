// Parsea coordenadas introducidas por el usuario en el buscador.
// Soporta formatos habituales de Google Maps, Apple Maps, OSM y Wikipedia:
//   - Decimales:           "28.4869, -16.3182", "28.4869 -16.3182", "(28.4869, -16.3182)"
//   - Decimales con rumbo: "28.4869° N, 16.3182° W" (acepta W u O de Oeste)
//   - Coma decimal (ES):   "28,4869 -16,3182", "28,4869; -16,3182"
//   - Sexagesimal (DMS):   "28°29'12.8\"N 16°19'05.5\"W" (acepta ′/″ y DDM)
//   - Enlaces de mapas:    "https://www.google.com/maps?q=28.4869,-16.3182" o "/@28.4869,-16.3182,17z"
// Devuelve { lat, lon } si es válido o null para continuar con geocodificación normal.
export function parseCoords(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim().replace(/^\((.*)\)$/, '$1').trim()
  if (!s) return null

  const valid = (lat, lon) =>
    Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
      ? { lat, lon }
      : null

  // 1. Pares decimales (separados por coma, punto y coma o espacio)
  const dec = s.match(
    /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWO])?$/i
  )
  if (dec) {
    let lat = parseFloat(dec[1])
    let lon = parseFloat(dec[3])
    if (dec[2] && dec[2].toUpperCase() === 'S') lat = -Math.abs(lat)
    if (dec[4] && /[WO]/i.test(dec[4])) lon = -Math.abs(lon)
    return valid(lat, lon)
  }

  // 2. Coma decimal española (solo si el separador entre lat y lon es espacio o ';')
  const decComma = s.match(
    /^([+-]?\d+,\d+)\s*°?\s*([NS])?\s*[;\s]\s*([+-]?\d+,\d+)\s*°?\s*([EWO])?$/i
  )
  if (decComma) {
    let lat = parseFloat(decComma[1].replace(',', '.'))
    let lon = parseFloat(decComma[3].replace(',', '.'))
    if (decComma[2] && decComma[2].toUpperCase() === 'S') lat = -Math.abs(lat)
    if (decComma[4] && /[WO]/i.test(decComma[4])) lon = -Math.abs(lon)
    return valid(lat, lon)
  }

  // 3. Sexagesimal DMS o grados + minutos decimales (DDM)
  const dms = s.match(
    /^(\d{1,2})\s*°\s*(\d{1,2}(?:[.,]\d+)?)\s*['′]\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*["″]\s*)?([NS])\s*[,;\s]?\s*(\d{1,3})\s*°\s*(\d{1,2}(?:[.,]\d+)?)\s*['′]\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*["″]\s*)?([EWO])$/i
  )
  if (dms) {
    const num = x => parseFloat(x.replace(',', '.'))
    const toDec = (d, m, sec, hemi) => {
      const mv = num(m)
      const sv = sec ? num(sec) : 0
      if (mv >= 60 || sv >= 60) return NaN
      const v = num(d) + mv / 60 + sv / 3600
      return /[SWO]/i.test(hemi) ? -v : v
    }
    return valid(
      toDec(dms[1], dms[2], dms[3], dms[4]),
      toDec(dms[5], dms[6], dms[7], dms[8])
    )
  }

  // 4. URLs de Google/Apple Maps pegadas directamente
  if (/^https?:\/\//i.test(s)) {
    const u = s.match(/(?:@|[?&](?:q|ll)=)(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (u) return valid(parseFloat(u[1]), parseFloat(u[2]))
  }

  return null
}
