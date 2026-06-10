"""One-off migration: isochrone_cache as key/JSONB store + RPC accessors.

The original table used PostGIS geometry columns but was never written to.
The serverless API reads/writes through iso_cache_get / iso_cache_put
(SECURITY DEFINER), so the anon key needs no direct table access.
"""
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
from sqlalchemy import create_engine, text

SQL = """
DROP TABLE IF EXISTS isochrone_cache;

CREATE TABLE isochrone_cache (
    cache_key  TEXT PRIMARY KEY,          -- "lat3:lon3:minutes" (3-decimal rounding)
    polygon    JSONB NOT NULL,            -- GeoJSON Polygon geometry
    minutes    INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE isochrone_cache ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION iso_cache_get(p_key text)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
    SELECT polygon FROM isochrone_cache
    WHERE cache_key = p_key
      AND created_at > now() - interval '30 days'
$$;

CREATE OR REPLACE FUNCTION iso_cache_put(p_key text, p_polygon jsonb, p_minutes int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Validate: callers hold the public anon key, so trust nothing
    IF p_key !~ '^-?[0-9]+\\.[0-9]{3}:-?[0-9]+\\.[0-9]{3}:[0-9]+$' THEN RETURN; END IF;
    IF p_minutes < 5 OR p_minutes > 30 THEN RETURN; END IF;
    IF p_polygon->>'type' IS DISTINCT FROM 'Polygon' THEN RETURN; END IF;
    IF pg_column_size(p_polygon) > 200000 THEN RETURN; END IF;

    DELETE FROM isochrone_cache WHERE created_at < now() - interval '30 days';

    INSERT INTO isochrone_cache (cache_key, polygon, minutes)
    VALUES (p_key, p_polygon, p_minutes)
    ON CONFLICT (cache_key) DO UPDATE
        SET polygon = EXCLUDED.polygon,
            minutes = EXCLUDED.minutes,
            created_at = now();
END
$$;

GRANT EXECUTE ON FUNCTION iso_cache_get(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION iso_cache_put(text, jsonb, int) TO anon, authenticated, service_role;
"""

engine = create_engine(os.environ["DATABASE_URL"])
with engine.begin() as conn:
    conn.execute(text(SQL))
print("Migration applied: isochrone_cache + iso_cache_get/iso_cache_put")
