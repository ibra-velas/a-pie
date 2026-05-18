# Accesibilidad Tenerife — Handoff

## What this is

A mobile-first web app that calculates walking accessibility to public resources (pharmacies, schools, hospitals, parks, bus stops) from any address in Tenerife. The user enters an address, picks a walking time (5–30 min), and sees an isochrone polygon on the map with all reachable resources listed below.

## Current state

The app is fully functional locally. It has not been deployed to production yet.

**What works:**
- Address geocoding via Nominatim (OSM)
- Isochrone calculation via OpenRouteService (`foot-walking` profile)
- PostGIS query returning resources inside the isochrone, sorted by distance
- Responsive layout: side panel on desktop, bottom sheet on mobile
- Device compass with north indicator (mobile only)
- 4,464 resources loaded from OSM: 292 pharmacies, 34 schools, 13 hospitals, 6 parks, 4,119 bus stops

**What's missing / next steps:**
- Deploy to Vercel (push to GitHub, connect repo)
- Add Cabildo de Tenerife datasets (richer data than OSM, especially parks and health centers with metadata)
- Isochrone caching (Vercel KV) — currently every request hits ORS
- `resource_score` table for neighborhood comparison ("your area has 30% fewer pharmacies than average")
- `wheelchair` profile option in the compass/isochrone

## Stack

| Layer | Tech | Notes |
|---|---|---|
| Frontend | React + Leaflet | Vite, Carto Voyager tiles |
| API | Vercel Serverless Functions | `/api/geocode`, `/api/isochrone`, `/api/resources` |
| Database | Supabase (Postgres + PostGIS) | `resource` + `isochrone_cache` tables |
| Isochrones | OpenRouteService | Free tier: 2,000 req/day |
| Geocoding | Nominatim | Free, no key required |
| Ingestion | Python script | Runs manually or via GitHub Actions cron |

## Repo structure

```
/
├── api/
│   ├── _load-env.js          # dotenv loader for local dev
│   ├── _isochrone-fetch.js   # shared ORS fetch logic
│   ├── geocode.js            # GET /api/geocode?q=
│   ├── isochrone.js          # GET /api/isochrone?lat=&lon=&minutes=
│   └── resources.js          # GET /api/resources?lat=&lon=&minutes=
├── src/
│   ├── main.jsx
│   ├── App.jsx               # layout + data fetching
│   ├── Map.jsx               # Leaflet map, compass rotation
│   ├── Sidebar.jsx           # search controls + results, bottom sheet on mobile
│   ├── CompassButton.jsx     # iOS/Android compass toggle
│   ├── NorthIndicator.jsx    # SVG needle, counter-rotates with bearing
│   └── useIsMobile.js        # matchMedia hook (< 640px)
├── ingesta/
│   └── run_ingesta.py        # OSM → Supabase pipeline
├── .env.local                # secrets (gitignored) — see below
└── CLAUDE.md                 # guidance for Claude Code
```

## Environment variables

Stored in `.env.local` (local) and Vercel project settings (production).

| Variable | Where to get it |
|---|---|
| `ORS_KEY` | openrouteservice.org → Dashboard → API Key |
| `SUPABASE_KEY` | Supabase → Project Settings → Data API → `anon` key |
| `SUPABASE_REST_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_URL` | Supabase → Project Settings → Database → Connection pooler URI (session mode, port 5432) |
| `DATABASE_URL` | Same as `SUPABASE_URL` — used by the Python ingestion script |

`SUPABASE_URL` (Postgres URI) is used by the Python ingestion script. `SUPABASE_REST_URL` (HTTPS) is used by the Supabase JS client in the API functions. They are different.

## Running locally

```bash
# Install dependencies
npm install
pip install requests pandas psycopg2-binary sqlalchemy python-dotenv

# Start dev server
vercel dev

# Run data ingestion (OSM sources)
python ingesta/run_ingesta.py
```

Requires the Vercel CLI (`npm install -g vercel`) and a linked Vercel project (`vercel link`).

## Database

Hosted on Supabase. Two tables:

- `resource` — all points of interest with PostGIS `geometry(Point, 4326)` location and a GIST index
- `isochrone_cache` — unused in current implementation (caching not yet wired up)

The `resources_within(polygon_geojson, origin_lat, origin_lon)` SQL function lives in Supabase and is called via `.rpc()`. To inspect or modify it: Supabase dashboard → SQL Editor.

Upsert key: `UNIQUE(source, source_id)` — re-running the ingestion script is safe, it updates existing records.

## Data sources and licenses

| Source | License | Categories |
|---|---|---|
| OpenStreetMap (via Overpass API) | ODbL | All current categories |
| datos.tenerife.es (Cabildo) | CC0 / CC-BY | Not yet ingested |
| Ayto. Santa Cruz | CC-BY | Not yet ingested |

Attribution required in UI for CC-BY sources: "Datos: Cabildo de Tenerife" (already in map tile attribution).

## Known issues / gotchas

- **Password special chars**: The Supabase DB password contains `@` and `?` — these must be percent-encoded (`%40`, `%3F`) in the `DATABASE_URL` connection string or the Python script will fail to connect.
- **Direct DB connection is IPv6-only** on Supabase free tier. Use the connection pooler (port 5432 session mode) for the Python script.
- **`vercel dev` doesn't load `.env.local` into serverless functions** automatically. The `api/_load-env.js` workaround loads it via dotenv at function startup. This file should be removed in production (Vercel injects env vars natively).
- **Bus stops** use `highway=bus_stop` in OSM, not `amenity=bus_stop`. The ingestion script queries both tags via the `highway` key.
- **Park count is low** (6) because many green areas in Tenerife are tagged `leisure=park` rather than `amenity=park` in OSM. Cabildo data will improve this.
- **Compass on desktop**: The `CompassButton` is hidden on non-touch devices via `matchMedia('(pointer: coarse)')`. The `DeviceOrientationEvent` is only available on HTTPS (guaranteed on Vercel).

## Deploying to production

1. Push repo to GitHub
2. Import project in Vercel dashboard
3. Add all environment variables in Vercel → Project Settings → Environment Variables
4. Deploy — Vercel auto-detects Vite + `/api` functions
5. Set up GitHub Actions cron for weekly ingestion (template in `CLAUDE.md`)
