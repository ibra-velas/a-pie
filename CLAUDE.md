# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Accesibilidad Tenerife** — a web app that calculates walking-time accessibility to public resources (health centers, schools, pharmacies, parks, public transport) from any address in Tenerife, Spain. Uses isochrone mapping (what you can reach on foot in X minutes) over open government data from the Cabildo de Tenerife.

## Planned Architecture

The full design is documented in `handoff.txt`. The intended stack:

```
Vercel
├── /src          → React frontend (Leaflet map + sidebar)
├── /api          → Vercel Serverless Functions (Node.js)
└── KV            → isochrone cache (Redis)

Supabase
└── Postgres + PostGIS  → resources table + spatial index

GitHub Actions
└── /ingesta/run_ingesta.py  → weekly data ingestion cron
```

## Data Sources & Licenses

| Source | License | Notes |
|---|---|---|
| datos.tenerife.es (Cabildo) | CC0 / CC-BY | Health, education, recreation |
| Ayto. Santa Cruz | CC-BY | Must attribute source |
| OpenStreetMap | ODbL | Used as fallback via Overpass API |

Nominatim (OSM) for geocoding. OpenRouteService (`foot-walking` profile) for isochrone calculation.

## Database Schema (PostGIS on Supabase)

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE resource (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    category     TEXT NOT NULL,        -- 'salud' | 'educacion' | 'ocio' | 'transporte'
    subcategory  TEXT,
    location     GEOMETRY(Point, 4326) NOT NULL,
    address      TEXT,
    municipality TEXT,
    source       TEXT NOT NULL,        -- 'tenerifedata' | 'cabildo' | 'osm'
    source_id    TEXT NOT NULL,
    extra        JSONB DEFAULT '{}',   -- category-specific fields
    updated_at   TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_source UNIQUE (source, source_id)
);

CREATE INDEX idx_resource_location ON resource USING GIST (location);

CREATE TABLE isochrone_cache (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin     GEOMETRY(Point, 4326) NOT NULL,
    minutes    INT NOT NULL,
    polygon    GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_iso_origin ON isochrone_cache USING GIST (origin);
```

The `extra` JSONB column stores category-specific data without schema changes (e.g. `{"turno_guardia": true}` for pharmacies).

## API Endpoints (Vercel Serverless Functions)

- `GET /api/geocode?q=<address>` — Nominatim lookup, appends "Tenerife, España"
- `GET /api/isochrone?lat=&lon=&minutes=` — calls ORS `foot-walking`, caches result in Vercel KV with key `iso:{lat*1000}:{lon*1000}:{minutes}` (30-day TTL)
- `GET /api/resources?lat=&lon=&minutes=[&categories=]` — computes isochrone then calls Supabase RPC `resources_within()`, returns `{ polygon, by_category: { salud: [...], educacion: [...] } }`

The PostGIS query pattern: `ST_Within(location, ST_GeomFromGeoJSON(...))` for filtering, `ST_Distance(location::geography, ...)` for meter-accurate distance. Always cast to `::geography` for distances — without it the result is in degrees.

## Frontend Components

Three React components:
- `App.jsx` — orchestrates state (origin, minutes, isochrone, resources, selected)
- `Map.jsx` — Leaflet map, renders isochrone polygon in blue + colored circle markers per category
- `Sidebar.jsx` — address input, minute slider (5–30 step 5), category pill filters, resource list

Category colors: `salud=#D85A30`, `educacion=#1D9E75`, `ocio=#7F77DD`, `transporte=#BA7517`

The minute slider needs a 500ms debounce before re-fetching resources to avoid hammering the API on every tick.

## Data Ingestion

Script at `ingesta/run_ingesta.py`. Pipeline per source: fetch GeoJSON → parse → validate Tenerife bbox (`lat 27.9–28.6, lon -16.9–-16.1`) → upsert via `ON CONFLICT (source, source_id)`. OSM resources fetched via Overpass API as fallback.

GitHub Actions cron: Mondays at 03:00 UTC (`.github/workflows/ingesta.yml`). `DATABASE_URL` stored as a GitHub secret.

## Environment Variables

```
SUPABASE_URL=
SUPABASE_KEY=
ORS_KEY=           # openrouteservice.org free tier (2000 req/day)
VITE_API_URL=      # backend URL for local dev (production uses relative /api)
```

## Deployment

- **Frontend + Functions + KV**: Vercel Hobby plan (free, non-commercial only; Pro at 20€/seat/month for commercial use)
- **Database**: Supabase free tier (500MB PostGIS)
- **Ingestion**: GitHub Actions free tier

Vercel Hobby pauses the app (no throttling) when limits are exceeded — important to know for demos.
