// Regions the app covers. Each region groups zones of hand-picked town
// centers (see CLAUDE.md — these are NOT geocoder output; don't "fix" them
// by geocoding). Quirks on purpose: Arona points at the Las Galletas/Costa
// del Silencio coast, Taco replaced El Rosario in Metro.
//
// Backend mirrors of the per-region bbox + Nominatim hint live in
// api/_regions.js (validation + geocode) and ingesta/run_ingesta.py REGIONS
// (Overpass fetch + ghost purge). Keep the bboxes in sync across the three.
export const REGIONS = [
  {
    id: 'tenerife',
    label: 'Tenerife',
    logo: '/images/a-pie-logo-tenerife.webp',
    zones: [
      {
        zone: 'Metro',
        cities: [
          { label: 'Santa Cruz',    lat: 28.4682, lon: -16.2546 },
          { label: 'La Laguna',     lat: 28.4869, lon: -16.3182 },
          { label: 'La Cuesta',     lat: 28.4700, lon: -16.2900 },
          { label: 'San Andrés',    lat: 28.5046, lon: -16.1910 },  // Calle Dique 27
          { label: 'Taco',          lat: 28.4465, lon: -16.2993 },
          { label: 'Tegueste',      lat: 28.5231, lon: -16.3365 },
        ],
      },
      {
        zone: 'Norte',
        cities: [
          { label: 'Tacoronte',         lat: 28.4768, lon: -16.4154 },
          { label: 'La Matanza',        lat: 28.4482, lon: -16.4577 },
          { label: 'La Orotava',        lat: 28.3936, lon: -16.5195 },
          { label: 'Puerto de la Cruz', lat: 28.4170, lon: -16.5508 },
          { label: 'Los Realejos',      lat: 28.3816, lon: -16.5842 },
          { label: 'Icod de los Vinos', lat: 28.3692, lon: -16.7203 },
          { label: 'Garachico',         lat: 28.3733, lon: -16.7659 },
          { label: 'Buenavista',        lat: 28.3725, lon: -16.8514 },
        ],
      },
      {
        zone: 'Oeste',
        cities: [
          { label: 'Santiago del Teide', lat: 28.2970, lon: -16.8160 },
          { label: 'Guía de Isora',      lat: 28.2081, lon: -16.7760 },
        ],
      },
      {
        zone: 'Sur',
        cities: [
          { label: 'Adeje',       lat: 28.1219, lon: -16.7259 },
          { label: 'Costa Adeje', lat: 28.0786, lon: -16.7367 },
          { label: 'Las Américas',lat: 28.0580, lon: -16.7280 },
          { label: 'Los Cristianos', lat: 28.0503, lon: -16.7150 },
          { label: 'Arona',       lat: 28.0073, lon: -16.6560 },
          { label: 'Granadilla',  lat: 28.1193, lon: -16.5752 },
          { label: 'El Médano',   lat: 28.0462, lon: -16.5384 },
        ],
      },
      {
        zone: 'Este',
        cities: [
          { label: 'Candelaria',         lat: 28.3568, lon: -16.3712 },
          { label: 'Arafo',              lat: 28.3398, lon: -16.4186 },
          { label: 'Güímar',             lat: 28.3187, lon: -16.4082 },
          { label: 'Puertito de Güímar', lat: 28.2962, lon: -16.3746 },
        ],
      },
    ],
  },
  {
    id: 'malaga',
    label: 'Málaga',
    zones: [
      {
        zone: 'Costa del Sol',
        cities: [
          { label: 'Málaga',       lat: 36.7213, lon: -4.4214 },  // centro histórico / Catedral
          { label: 'Torremolinos', lat: 36.6203, lon: -4.4998 },  // Plaza Costa del Sol
        ],
      },
    ],
  },
]

// Default region the app opens on (La Laguna lives here).
export const DEFAULT_REGION = REGIONS[0].id
