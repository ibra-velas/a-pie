import json
import os
import time
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

ENGINE = create_engine(os.environ["DATABASE_URL"])

TENERIFE_BBOX = dict(lat_min=27.9, lat_max=28.6, lon_min=-16.9, lon_max=-16.1)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

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
    # cultura
    ("amenity", "library",        "cultura",    "biblioteca"),
    ("tourism", "museum",         "cultura",    "museo"),
    ("amenity", "theatre",        "cultura",    "teatro"),
    ("amenity", "cinema",         "cultura",    "cine"),
    # transporte
    ("highway", "bus_stop",       "transporte", "parada_bus"),
]


def fetch_osm(key: str, value: str) -> list[dict]:
    bbox = "27.9,-16.9,28.6,-16.1"
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
    return []


def parse_osm(elements: list[dict], category: str, subcategory: str) -> list[dict]:
    rows = []
    for el in elements:
        # nodes have lat/lon directly; ways have a "center" object
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat is None or lon is None:
            continue
        if not (TENERIFE_BBOX["lat_min"] <= lat <= TENERIFE_BBOX["lat_max"]):
            continue
        if not (TENERIFE_BBOX["lon_min"] <= lon <= TENERIFE_BBOX["lon_max"]):
            continue

        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:es") or subcategory.replace("_", " ").title()

        rows.append({
            "name":        name.strip().title(),
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


def upsert(rows: list[dict]):
    if not rows:
        return
    with ENGINE.begin() as conn:
        for row in rows:
            conn.execute(text("""
                INSERT INTO resource
                    (name, category, subcategory, location, address,
                     municipality, source, source_id, extra)
                VALUES (
                    :name, :category, :subcategory,
                    ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                    :address, :municipality,
                    :source, :source_id, CAST(:extra AS jsonb)
                )
                ON CONFLICT (source, source_id) DO UPDATE SET
                    name       = EXCLUDED.name,
                    location   = EXCLUDED.location,
                    extra      = EXCLUDED.extra,
                    updated_at = now()
            """), {**row, "extra": json.dumps(row["extra"])})


def run():
    for key, value, category, subcategory in OSM_SOURCES:
        print(f"Fetching OSM {key}={value}...")
        elements = fetch_osm(key, value)
        rows = parse_osm(elements, category, subcategory)
        upsert(rows)
        print(f"  {len(rows)} records upserted")
        time.sleep(2)  # be polite to Overpass


if __name__ == "__main__":
    run()
