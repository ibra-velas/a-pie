"""Migration: per-SUBCATEGORY result cap in resources_within.

The old function capped at 100 rows per CATEGORY, so restaurante/bar/
cafe/comida_rapida (all category 'ocio') shared one 100-row budget and
dense areas showed only places within ~400m of the origin. Each
subcategory now gets its own nearest-80 budget.
"""
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
from sqlalchemy import create_engine, text

SQL = """
CREATE OR REPLACE FUNCTION public.resources_within(
    polygon_geojson text, origin_lat double precision, origin_lon double precision)
RETURNS TABLE(id uuid, name text, category text, subcategory text,
              address text, geojson text, distance_m integer)
LANGUAGE sql STABLE
SET search_path TO 'public', 'pg_catalog'
AS $function$
    SELECT id, name, category, subcategory, address,
        ST_AsGeoJSON(location) AS geojson,
        ROUND(ST_Distance(
            location::geography,
            ST_MakePoint(origin_lon, origin_lat)::geography
        ))::INT AS distance_m
    FROM (
        SELECT *, ROW_NUMBER() OVER (
            PARTITION BY subcategory ORDER BY
            ST_Distance(location::geography, ST_MakePoint(origin_lon, origin_lat)::geography)
        ) AS rn
        FROM resource
        WHERE ST_Within(location, ST_GeomFromGeoJSON(polygon_geojson))
    ) sub
    WHERE rn <= 80
    ORDER BY distance_m ASC;
$function$
"""

engine = create_engine(os.environ["DATABASE_URL"].strip())
with engine.begin() as conn:
    conn.execute(text(SQL))
print("resources_within: cap is now 80 per subcategory")
