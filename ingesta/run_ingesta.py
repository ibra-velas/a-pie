import json
import os
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

ENGINE = create_engine(os.environ["DATABASE_URL"])

TENERIFE_BBOX = dict(lat_min=27.9, lat_max=28.6, lon_min=-16.9, lon_max=-16.1)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

OSM_SOURCES = [
    ("pharmacy",   "salud",      "farmacia"),
    ("school",     "educacion",  "colegio"),
    ("hospital",   "salud",      "hospital"),
    ("park",       "ocio",       "parque"),
    ("bus_stop",   "transporte", "parada_bus"),   # OSM: highway=bus_stop
]


def fetch_osm(amenity: str) -> list[dict]:
    # bbox: south,west,north,east (Tenerife)
    bbox = "27.9,-16.9,28.6,-16.1"
    query = f"""
    [out:json][timeout:60];
    (
      node["amenity"="{amenity}"]({bbox});
      node["leisure"="{amenity}"]({bbox});
      node["highway"="{amenity}"]({bbox});
    );
    out body;
    """
    headers = {"User-Agent": "AccesibilidadTenerife/1.0", "Content-Type": "application/x-www-form-urlencoded"}
    r = requests.post(OVERPASS_URL, data=f"data={requests.utils.quote(query)}", headers=headers, timeout=90)
    if not r.ok:
        print(f"  Overpass error {r.status_code}: {r.text[:300]}")
        r.raise_for_status()
    return r.json().get("elements", [])


def parse_osm(elements: list[dict], category: str, subcategory: str) -> list[dict]:
    rows = []
    for el in elements:
        lat = el.get("lat")
        lon = el.get("lon")
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
            "source_id":   str(el["id"]),
            "extra":       {k: v for k, v in tags.items()
                           if k not in ("name", "name:es", "amenity", "leisure",
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
    for amenity, category, subcategory in OSM_SOURCES:
        print(f"Fetching OSM {amenity}...")
        elements = fetch_osm(amenity)
        rows = parse_osm(elements, category, subcategory)
        upsert(rows)
        print(f"  {len(rows)} records upserted")


if __name__ == "__main__":
    run()
