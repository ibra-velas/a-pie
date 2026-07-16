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
  {
    id: 'gran-canaria',
    label: 'Gran Canaria',
    zones: [
      {
        zone: 'Las Palmas GC',
        cities: [
          { label: 'Vegueta',       lat: 28.1006, lon: -15.4136 },  // Catedral de Santa Ana
          { label: 'Triana',        lat: 28.1069, lon: -15.4172 },  // Calle Mayor de Triana
          { label: 'Mesa y López',  lat: 28.1290, lon: -15.4370 },  // zona comercial
          { label: 'Las Canteras',  lat: 28.1394, lon: -15.4327 },  // paseo, tramo central
        ],
      },
      {
        zone: 'Este',
        cities: [
          { label: 'Telde',      lat: 28.0035, lon: -15.4140 },  // Basílica de San Juan Bautista
          { label: 'Ingenio',    lat: 27.9340, lon: -15.4410 },  // Ayuntamiento
          { label: 'Agüimes',    lat: 27.9069, lon: -15.4469 },  // Plaza del Rosario
          { label: 'Vecindario', lat: 27.8451, lon: -15.4505 },  // Ayuntamiento de Santa Lucía
        ],
      },
      {
        zone: 'Sur',
        cities: [
          { label: 'Playa del Inglés', lat: 27.7575, lon: -15.5684 },  // zona Yumbo / Av. de Tirajana
          { label: 'Maspalomas',       lat: 27.7344, lon: -15.5965 },  // Faro de Maspalomas
          { label: 'San Fernando',     lat: 27.7687, lon: -15.5852 },
        ],
      },
      {
        zone: 'Norte',
        cities: [
          { label: 'Arucas', lat: 28.1188, lon: -15.5232 },  // Iglesia de San Juan Bautista
          { label: 'Teror',  lat: 28.0594, lon: -15.5479 },  // Basílica del Pino
          { label: 'Firgas', lat: 28.1071, lon: -15.5632 },  // Paseo de Gran Canaria
          { label: 'Moya',   lat: 28.1109, lon: -15.5841 },
          { label: 'Gáldar', lat: 28.1452, lon: -15.6552 },  // Plaza de Santiago
          { label: 'Agaete', lat: 28.1003, lon: -15.6997 },
        ],
      },
      {
        zone: 'Centro',
        cities: [
          { label: 'Santa Brígida',     lat: 28.0358, lon: -15.4974 },
          { label: 'Vega de San Mateo', lat: 28.0097, lon: -15.5318 },
          { label: 'Tejeda',            lat: 27.9951, lon: -15.6155 },
        ],
      },
      {
        zone: 'Suroeste',
        cities: [
          { label: 'Arguineguín',     lat: 27.7608, lon: -15.6806 },
          { label: 'Puerto Rico',     lat: 27.7851, lon: -15.7133 },  // playa
          { label: 'Puerto de Mogán', lat: 27.8175, lon: -15.7652 },  // puerto
        ],
      },
      {
        zone: 'Oeste',
        cities: [
          { label: 'La Aldea', lat: 27.9821, lon: -15.7798 },  // La Aldea de San Nicolás
        ],
      },
    ],
  },
]

// Default region the app opens on (La Laguna lives here).
export const DEFAULT_REGION = REGIONS[0].id
