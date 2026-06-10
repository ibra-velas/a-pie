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

`resource` table: `id, name, category, subcategory, location GEOMETRY(Point,4326), address, municipality, source, source_id, extra JSONB, updated_at`, unique on `(source, source_id)`, GIST index on location. ~7.3k rows, all `source='osm'` (bus stops and unnamed pools were deleted by hand in June 2026).

`isochrone_cache` table (NOT the geometry schema from the original plan): `cache_key TEXT PK` ("lat3:lon3:minutes", 3-decimal rounding ≈110m), `polygon JSONB` (GeoJSON), `minutes INT`, `created_at`. 30-day TTL enforced on read.

RLS is enabled and the API uses the **anon** key, so all DB access goes through RPCs:
- `resources_within(polygon_geojson, origin_lat, origin_lon)` — resources inside polygon + distance_m, capped at the **80 nearest per subcategory** (was per *category*, which made restaurante/bar/cafe share one budget and cluster around the origin). Definition in `ingesta/migrate_resources_within.py`.
- `iso_cache_get(p_key)` / `iso_cache_put(p_key, p_polygon, p_minutes)` — `SECURITY DEFINER` cache accessors with input validation (see `ingesta/migrate_iso_cache.py`)

DB migrations are applied by running the one-off `ingesta/migrate_*.py` scripts against `DATABASE_URL`; they stay in the repo as the record of what was applied.

Always cast to `::geography` for distances — without it the result is in degrees.

## Categories

Six categories (colors in `src/Map.jsx` `CATEGORY_COLORS`): `salud` #D85A30, `educacion` #1D9E75, `ocio` #7F77DD, `transporte` #BA7517, `comercio` #E0A020, `cultura` #C2436A.

The app filters and groups by **subcategory** (not category). Sidebar pill config lives in `src/Sidebar.jsx` `PILL_GROUPS`. Notes:
- `barberia` was merged into `peluqueria` (June 2026) — never reintroduce `barberia`.
- `transporte`/`parada_bus` is deliberately gone: absent from the sidebar, excluded from ingestion, and its rows deleted from the DB.
- `piscina` requires a name (`NAME_REQUIRED` in `run_ingesta.py`): unnamed `leisure=swimming_pool` elements are private backyard pools (4,938 of 4,985 were junk).

## API Endpoints (`/api`)

- `GET /api/geocode?q=` — Nominatim, appends "Tenerife, España" **and** hard-bounds with `viewbox`+`bounded=1` (the text suffix alone still matched peninsular streets)
- `GET /api/isochrone?lat=&lon=&minutes=` — cached isochrone (memory → Supabase → ORS)
- `GET /api/resources?lat=&lon=&minutes=` — isochrone + `resources_within`, returns `{ polygon, total, by_subcategory }` (**not** `by_category`)

Shared helpers (underscore prefix = not exposed as endpoints): `_validate.js` (rejects coords outside Tenerife bbox `lat 27.9–28.6, lon -16.9–-16.1` and bad minutes with 400), `_isochrone-fetch.js` (cache layers + ORS call), `_load-env.js` (local dev env loading).

The ORS request **must** include `options: { avoid_features: ['ferries'] }` — without it, foot-walking isochrones from coastal towns grow tentacles along ferry routes into the sea.

## Frontend (`/src`)

`App.jsx` (state + fetch orchestration, 500ms debounce + `AbortController` on the minute slider so stale responses can't overwrite newer ones), `Map.jsx` (Leaflet, exports `CATEGORY_COLORS` and emoji icons per subcategory), `Sidebar.jsx` (search, geolocate, city shortcuts by zone, pill filters, results list), plus `Tour.jsx`, `Legal.jsx`, `InstallButton.jsx` (PWA). Inline styles throughout; no CSS framework. Default load: La Laguna catedral.

**Mobile layout is a [vaul](https://github.com/emilkowalski/vaul) bottom sheet** (Google Maps pattern) over a full-screen map; desktop keeps the fixed side panel. Key pieces:
- `SNAP_POINTS = [0.22, 0.55, 0.93]` in `App.jsx`; selecting a place collapses the sheet to peek and `Map` gets `padBottom` so `fitBounds` keeps the isochrone above the sheet.
- Deselection (✕ on the selected card, or tapping empty map) scrolls the panel back to the search controls.
- Font sizes go through the `fz()` helper in `Sidebar.jsx` (+2px on mobile). The address input is exactly **16px on mobile** — anything smaller triggers iOS auto-zoom on focus.

Local dev: `npm run dev` (Vite) proxies `/api` to `localhost:3001`.

## Ingestion (`/ingesta`)

`run_ingesta.py`: Overpass per `(key, value)` in `OSM_SOURCES` → bbox filter → upsert `ON CONFLICT (source, source_id)`. Rules learned the hard way:
- The `DO UPDATE` must keep updating `category`/`subcategory` too, or subcategory remaps silently never reach existing rows.
- Keep OSM names **verbatim** — `.title()` mangles "McDonald's" → "Mcdonald'S". Only the no-name fallback is title-cased.
- `DATABASE_URL` is read with `.strip()` (a trailing newline pasted into the GitHub secret once broke CI with `database "postgres\n" does not exist`).
- Upserts are batched with `psycopg2.extras.execute_values` (500 rows/statement); row-by-row inserts against the remote pooler used to dominate the run time.

Workflow run time is mostly Overpass fetches + retries (429/504 are normal when Overpass is loaded; the script retries 3×).

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
- The bottom sheet renders through a **portal on `document.body`** — global styles (font, color, margin) must live on `body` in `index.html`, not on the app shell div, or portaled content falls back to serif.
- Inside `Map.jsx`, `Map` refers to the component, **not** the JS built-in — `new Map()` there instantiates the React component. Use a plain object (see `markersById`).
- `scrollIntoView` is useless inside the sheet: vaul *translates* the panel instead of clipping it, so the browser thinks everything is visible. Scroll the panel container explicitly (see the selected-item effect in `Sidebar.jsx`).
- Map markers are rebuilt only when `resources` changes; selection restyles just the two affected markers via `setIcon`. Don't put `selected` back in the rebuild effect's deps — with ~700 markers it makes every tap janky.
