# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**A Pie** (https://a-pie.vercel.app) — web app that shows everything reachable on foot in X minutes (5–30) from any address in Tenerife: shops, food, health, culture, leisure. Walking isochrones over OpenStreetMap data. Spanish UI.

## Architecture (actual, deployed)

```
Vercel (Hobby)
├── /src   → React + Vite frontend (Leaflet map + sidebar)
└── /api   → Vercel Serverless Functions (Node.js)

Supabase (free tier)
└── Postgres + PostGIS → resource table, isochrone_cache, RPCs

GitHub Actions
├── .github/workflows/ingesta.yml   → weekly OSM ingestion (Mon 03:00 UTC + manual dispatch)
└── .github/workflows/keepalive.yml → daily Supabase ping (free tier pauses idle DBs)
```

External services: **Nominatim** (geocoding), **OpenRouteService** `foot-walking` (isochrones, free tier ~500 isochrones/day), **Overpass API** (OSM data for ingestion).

## Database (Supabase PostGIS)

`resource` table: `id, name, category, subcategory, location GEOMETRY(Point,4326), address, municipality, source, source_id, extra JSONB, updated_at`, unique on `(source, source_id)`, GIST index on location. ~12k rows, all `source='osm'`.

`isochrone_cache` table (NOT the geometry schema from the original plan): `cache_key TEXT PK` ("lat3:lon3:minutes", 3-decimal rounding ≈110m), `polygon JSONB` (GeoJSON), `minutes INT`, `created_at`. 30-day TTL enforced on read.

RLS is enabled and the API uses the **anon** key, so all DB access goes through `SECURITY DEFINER` RPCs:
- `resources_within(polygon_geojson, origin_lat, origin_lon)` — resources inside polygon + distance_m
- `iso_cache_get(p_key)` / `iso_cache_put(p_key, p_polygon, p_minutes)` — cache accessors with input validation (see `ingesta/migrate_iso_cache.py` for definitions)

Always cast to `::geography` for distances — without it the result is in degrees.

## Categories

Six categories (colors in `src/Map.jsx` `CATEGORY_COLORS`): `salud` #D85A30, `educacion` #1D9E75, `ocio` #7F77DD, `transporte` #BA7517, `comercio` #E0A020, `cultura` #C2436A.

The app filters and groups by **subcategory** (not category). Sidebar pill config lives in `src/Sidebar.jsx` `PILL_GROUPS`. Notes:
- `barberia` was merged into `peluqueria` (June 2026) — never reintroduce `barberia`.
- `transporte`/`parada_bus` is deliberately absent from the sidebar and from ingestion; ~4k stale bus-stop rows remain in the DB.

## API Endpoints (`/api`)

- `GET /api/geocode?q=` — Nominatim, appends "Tenerife, España"
- `GET /api/isochrone?lat=&lon=&minutes=` — cached isochrone (memory → Supabase → ORS)
- `GET /api/resources?lat=&lon=&minutes=` — isochrone + `resources_within`, returns `{ polygon, total, by_subcategory }` (**not** `by_category`)

Shared helpers (underscore prefix = not exposed as endpoints): `_validate.js` (rejects coords outside Tenerife bbox `lat 27.9–28.6, lon -16.9–-16.1` and bad minutes with 400), `_isochrone-fetch.js` (cache layers + ORS call), `_load-env.js` (local dev env loading).

The ORS request **must** include `options: { avoid_features: ['ferries'] }` — without it, foot-walking isochrones from coastal towns grow tentacles along ferry routes into the sea.

## Frontend (`/src`)

`App.jsx` (state + fetch orchestration, 500ms debounce on minute slider), `Map.jsx` (Leaflet, exports `CATEGORY_COLORS` and emoji icons per subcategory), `Sidebar.jsx` (search, geolocate, city shortcuts by zone, pill filters, results list), plus `Tour.jsx`, `Legal.jsx`, `InstallButton.jsx` (PWA). Inline styles throughout; no CSS framework. Default load: La Laguna catedral.

Local dev: `npm run dev` (Vite) proxies `/api` to `localhost:3001`.

## Ingestion (`/ingesta`)

`run_ingesta.py`: Overpass per `(key, value)` in `OSM_SOURCES` → bbox filter → upsert `ON CONFLICT (source, source_id)`. Rules learned the hard way:
- The `DO UPDATE` must keep updating `category`/`subcategory` too, or subcategory remaps silently never reach existing rows.
- Keep OSM names **verbatim** — `.title()` mangles "McDonald's" → "Mcdonald'S". Only the no-name fallback is title-cased.
- `DATABASE_URL` is read with `.strip()` (a trailing newline pasted into the GitHub secret once broke CI with `database "postgres\n" does not exist`).

Workflow run takes ~20 min (Overpass retries + row-by-row upserts dominate; batching is a known pending improvement).

## Environment Variables

```
SUPABASE_URL=      # also SUPABASE_REST_URL works as override
SUPABASE_KEY=      # anon key (JWT role: anon) — RPCs are the security boundary
ORS_KEY=           # openrouteservice.org
DATABASE_URL=      # Supabase POOLER url (aws-0-eu-west-1.pooler.supabase.com:6543)
```

`DATABASE_URL` is used by Python ingestion (locally and as a GitHub Actions secret). It must be the **pooler** URL: the direct `db.*.supabase.co` host is IPv6-only and GitHub runners have no IPv6.

## Gotchas

- `.gitignore` excludes `*.md` and `*.txt` (internal docs) with explicit exceptions (`!README.md`, `!CLAUDE.md`, `!ingesta/requirements.txt`). If you add a doc or data file that must be committed, add an exception.
- ORS free tier: ~500 isochrones/day. The cache + bbox validation exist to protect it; don't add code paths that call ORS without going through `fetchIsochrone`.
- Resource counts are capped by OSM coverage, not by the app — sparse categories (carnicerías, pescaderías…) are genuinely sparse in OSM for Tenerife. Adding Cabildo open-data sources is the way to improve them.
- Vercel Hobby: 100 deployments/day, 1 concurrent build. Each push to `main` deploys production.
