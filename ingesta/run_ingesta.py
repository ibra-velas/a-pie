import json
import os
import time
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values
from sqlalchemy import create_engine

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# .strip() guards against trailing newlines pasted into the GitHub secret
ENGINE = create_engine(os.environ["DATABASE_URL"].strip())

# Regions to ingest. bbox mirrors api/_regions.js and src/regions.js —
# keep the three in sync. The purge is scoped per-region by this bbox, so
# regions must not overlap (Tenerife and Málaga are ~900 km apart).
REGIONS = [
    dict(id="tenerife", lat_min=27.9,  lat_max=28.6,  lon_min=-16.9, lon_max=-16.1),
    dict(id="malaga",   lat_min=36.55, lat_max=36.78, lon_min=-4.58, lon_max=-4.30),
]

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Subcategories where unnamed OSM elements are junk (e.g. leisure=
# swimming_pool matches thousands of private backyard pools — public
# pools virtually always carry a name)
NAME_REQUIRED = {"piscina"}

# Each entry: (osm_key, osm_value, category, subcategory)
OSM_SOURCES = [
    # salud
    ("amenity", "pharmacy",       "salud",      "farmacia"),
    ("amenity", "hospital",       "salud",      "hospital"),
    ("amenity", "clinic",         "salud",      "clinica"),
    ("amenity", "doctors",        "salud",      "medico"),
    # educacion
    ("amenity", "school",         "educacion",  "colegio"),
    ("amenity", "university",     "educacion",  "universidad"),
    ("amenity", "college",        "educacion",  "instituto"),
    ("amenity", "kindergarten",   "educacion",  "guarderia"),
    # ocio – naturaleza
    ("leisure", "park",           "ocio",       "parque"),
    # ocio – restauracion
    ("amenity", "restaurant",     "ocio",       "restaurante"),
    ("amenity", "cafe",           "ocio",       "cafe"),
    ("amenity", "bar",            "ocio",       "bar"),
    ("amenity", "fast_food",      "ocio",       "comida_rapida"),
    ("amenity", "ice_cream",      "comercio",   "heladeria"),
    # ocio – noche
    ("amenity", "nightclub",      "ocio",       "discoteca"),
    # ocio – deporte
    ("leisure", "sports_centre",  "ocio",       "deportes"),
    ("leisure", "swimming_pool",  "ocio",       "piscina"),
    ("leisure", "fitness_centre", "ocio",       "gimnasio"),
    # comercio — supermarkets use shop= tag in OSM
    ("shop",    "supermarket",    "comercio",   "supermercado"),
    ("shop",    "convenience",    "comercio",   "tienda"),
    ("shop",    "variety_store",  "comercio",   "tienda"),
    ("shop",    "bakery",         "comercio",   "panaderia"),
    ("shop",    "hairdresser",    "comercio",   "peluqueria"),
    ("shop",    "barber",         "comercio",   "peluqueria"),
    ("shop",    "hardware",       "comercio",   "ferreteria"),
    ("shop",    "doityourself",   "comercio",   "ferreteria"),
    ("shop",    "greengrocer",    "comercio",   "fruteria"),
    ("shop",    "butcher",        "comercio",   "carniceria"),
    ("shop",    "seafood",        "comercio",   "pescaderia"),
    ("shop",    "books",          "comercio",   "libreria"),
    ("shop",    "florist",        "comercio",   "floristeria"),
    ("amenity", "marketplace",    "comercio",   "mercado"),
    # comercio — retail con subcategoría propia
    ("shop",    "clothes",        "comercio",   "ropa"),
    ("shop",    "shoes",          "comercio",   "calzado"),
    ("shop",    "jewelry",        "comercio",   "joyeria"),
    ("shop",    "optician",       "comercio",   "optica"),
    ("shop",    "gift",           "comercio",   "regalos"),
    ("shop",    "beauty",         "comercio",   "estetica"),
    ("shop",    "perfumery",      "comercio",   "perfumeria"),
    ("shop",    "cosmetics",      "comercio",   "perfumeria"),
    ("shop",    "chemist",        "comercio",   "perfumeria"),
    ("shop",    "stationery",     "comercio",   "papeleria"),
    ("shop",    "tobacco",        "comercio",   "estanco"),
    ("shop",    "kiosk",          "comercio",   "kiosko"),
    ("shop",    "furniture",      "comercio",   "muebles"),
    ("shop",    "electronics",    "comercio",   "electronica"),
    # servicios
    ("shop",    "car_repair",     "comercio",   "taller"),
    # cultura
    ("amenity", "library",        "cultura",    "biblioteca"),
    ("tourism", "museum",         "cultura",    "museo"),
    ("amenity", "theatre",        "cultura",    "teatro"),
    ("amenity", "cinema",         "cultura",    "cine"),
    # transporte: parada_bus excluida a propósito — el sidebar no la muestra
    # y eran ~4000 filas que dominaban el tiempo de ingesta
]


def fetch_osm(key: str, value: str, region: dict) -> list[dict] | None:
    """Returns the element list, or None if Overpass failed after retries.

    The distinction matters: an empty list is a legitimate "OSM has none"
    (its stale rows deserve purging), while None means "we don't know" —
    and the purge must be skipped for that region.
    """
    bbox = (f"{region['lat_min']},{region['lon_min']},"
            f"{region['lat_max']},{region['lon_max']}")
    query = f"""
    [out:json][timeout:60];
    (
      node["{key}"="{value}"]({bbox});
      way["{key}"="{value}"]({bbox});
    );
    out body center;
    """
    headers = {"User-Agent": "AccesibilidadTenerife/1.0"}
    for attempt in range(3):
        try:
            r = requests.post(OVERPASS_URL, data={"data": query}, headers=headers, timeout=90)
            if r.ok:
                return r.json().get("elements", [])
            print(f"  Overpass error {r.status_code} (attempt {attempt+1})")
        except Exception as e:
            print(f"  Request error: {e} (attempt {attempt+1})")
        time.sleep(10)
    return None


def parse_osm(elements: list[dict], category: str, subcategory: str,
              region: dict) -> list[dict]:
    rows = []
    for el in elements:
        # nodes have lat/lon directly; ways have a "center" object
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        if not (region["lat_min"] <= lat <= region["lat_max"]):
            continue
        if not (region["lon_min"] <= lon <= region["lon_max"]):
            continue

        tags = el.get("tags", {})
        # Keep OSM names verbatim — .title() mangles "McDonald's" → "Mcdonald'S".
        # Only the subcategory fallback (no name in OSM) gets title-cased.
        name = tags.get("name") or tags.get("name:es")
        if not name and subcategory in NAME_REQUIRED:
            continue
        name = name.strip() if name else subcategory.replace("_", " ").title()

        rows.append({
            "name":        name,
            "category":    category,
            "subcategory": subcategory,
            "lat":         lat,
            "lon":         lon,
            "address":     tags.get("addr:street", ""),
            "municipality":tags.get("addr:city", "").upper(),
            "source":      "osm",
            "source_id":   f"{el['type']}_{el['id']}",
            "extra":       {k: v for k, v in tags.items()
                           if k not in ("name", "name:es", "amenity", "leisure",
                                        "shop", "tourism", "highway",
                                        "addr:street", "addr:city")},
        })
    return rows


UPSERT_SQL = """
    INSERT INTO resource
        (name, category, subcategory, location, address,
         municipality, source, source_id, extra)
    VALUES %s
    ON CONFLICT (source, source_id) DO UPDATE SET
        name         = EXCLUDED.name,
        category     = EXCLUDED.category,
        subcategory  = EXCLUDED.subcategory,
        location     = EXCLUDED.location,
        address      = EXCLUDED.address,
        municipality = EXCLUDED.municipality,
        extra        = EXCLUDED.extra,
        updated_at   = now()
"""

UPSERT_TEMPLATE = (
    "(%(name)s, %(category)s, %(subcategory)s, "
    "ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326), "
    "%(address)s, %(municipality)s, %(source)s, %(source_id)s, %(extra)s::jsonb)"
)


def upsert(rows: list[dict]):
    if not rows:
        return
    payload = [{**row, "extra": json.dumps(row["extra"])} for row in rows]
    # Batched multi-VALUES insert: one round trip per 500 rows instead of
    # one per row — the remote pooler latency dominated ingestion time
    with ENGINE.begin() as conn:
        with conn.connection.cursor() as cur:
            execute_values(cur, UPSERT_SQL, payload,
                           template=UPSERT_TEMPLATE, page_size=500)


# Ghost purge: every upserted row refreshes updated_at, so rows OSM no
# longer returns go stale. 21 days = 3 missed weekly runs of tolerance.
PURGE_THRESHOLD = "21 days"
# If the purge would delete more than this fraction of the table, assume
# something went wrong upstream (partial Overpass data, broken runs) and
# abort instead of mass-deleting.
PURGE_MAX_FRACTION = 0.20


def purge_stale(region: dict):
    # Scope the purge to this region's bbox so ingesting one region never
    # touches another's rows. `&&` on a point uses the GIST index and is
    # true iff the point falls inside the envelope.
    rid = region["id"]
    in_bbox = ("location && ST_MakeEnvelope("
               "%(lon_min)s, %(lat_min)s, %(lon_max)s, %(lat_max)s, 4326)")
    p = {k: region[k] for k in ("lon_min", "lat_min", "lon_max", "lat_max")}
    with ENGINE.begin() as conn:
        with conn.connection.cursor() as cur:
            cur.execute(
                f"SELECT count(*) FROM resource WHERE source = 'osm' AND {in_bbox}", p)
            total = cur.fetchone()[0]
            cur.execute(
                f"SELECT count(*) FROM resource WHERE source = 'osm' AND {in_bbox} "
                "AND updated_at < now() - interval %(thr)s", {**p, "thr": PURGE_THRESHOLD})
            stale = cur.fetchone()[0]
            if stale == 0:
                print(f"Purge [{rid}]: nothing stale")
                return
            if total and stale / total > PURGE_MAX_FRACTION:
                print(f"Purge [{rid}] ABORTED: {stale}/{total} rows stale "
                      f"(> {PURGE_MAX_FRACTION:.0%}) — check the ingestion")
                return
            cur.execute(
                f"DELETE FROM resource WHERE source = 'osm' AND {in_bbox} "
                "AND updated_at < now() - interval %(thr)s", {**p, "thr": PURGE_THRESHOLD})
            print(f"Purge [{rid}]: {stale} stale rows deleted (gone from OSM)")


def run():
    for region in REGIONS:
        rid = region["id"]
        print(f"=== Region: {rid} ===")
        region_ok = True
        for key, value, category, subcategory in OSM_SOURCES:
            print(f"Fetching OSM {key}={value} [{rid}]...")
            elements = fetch_osm(key, value, region)
            if elements is None:
                # Unknown state for this category — its rows weren't refreshed,
                # so purging this region now would delete live places
                region_ok = False
                print("  FAILED after retries — purge disabled for this region")
                continue
            rows = parse_osm(elements, category, subcategory, region)
            upsert(rows)
            print(f"  {len(rows)} records upserted")
            time.sleep(2)  # be polite to Overpass

        # Purge only after the upserts, and only on a complete region run:
        # even after weeks of broken CI, the first good run refreshes
        # everything alive before anything gets deleted
        if region_ok:
            purge_stale(region)
        else:
            print(f"Skipping purge [{rid}]: at least one Overpass fetch failed")


if __name__ == "__main__":
    run()
