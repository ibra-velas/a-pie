from dotenv import load_dotenv
import os
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
from sqlalchemy import create_engine, text

engine = create_engine(os.environ["DATABASE_URL"])

COUNT_SQL = """
    SELECT count(*) FROM resource
    WHERE source = 'osm'
      AND source_id ~ '^[0-9]+$'
      AND EXISTS (
          SELECT 1 FROM resource r2
          WHERE r2.source = 'osm'
            AND (r2.source_id = 'node_' || resource.source_id
                 OR r2.source_id = 'way_' || resource.source_id)
      )
"""

DELETE_SQL = """
    DELETE FROM resource
    WHERE source = 'osm'
      AND source_id ~ '^[0-9]+$'
      AND EXISTS (
          SELECT 1 FROM resource r2
          WHERE r2.source = 'osm'
            AND (r2.source_id = 'node_' || resource.source_id
                 OR r2.source_id = 'way_' || resource.source_id)
      )
"""

with engine.connect() as conn:
    count = conn.execute(text(COUNT_SQL)).scalar()
    print(f"Old-format duplicates found: {count}")

with engine.begin() as conn:
    conn.execute(text(DELETE_SQL))
    print("Deleted.")

with engine.connect() as conn:
    total = conn.execute(text("SELECT count(*) FROM resource")).scalar()
    print(f"Total records remaining: {total}")
