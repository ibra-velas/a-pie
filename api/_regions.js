// Region metadata for the API: bounding box (coordinate validation + the
// Nominatim geocode viewbox) and the text hint appended to searches.
// Frontend mirror: src/regions.js (zones/cities). Ingestion mirror:
// ingesta/run_ingesta.py REGIONS. Keep the bboxes in sync across the three.
export const REGIONS = [
  {
    id: 'tenerife',
    geocodeHint: 'Tenerife, España',
    bbox: { latMin: 27.9, latMax: 28.6, lonMin: -16.9, lonMax: -16.1 },
  },
  {
    id: 'malaga',
    geocodeHint: 'Málaga, España',
    bbox: { latMin: 36.55, latMax: 36.78, lonMin: -4.58, lonMax: -4.30 },
  },
]

export const regionById = id => REGIONS.find(r => r.id === id)
