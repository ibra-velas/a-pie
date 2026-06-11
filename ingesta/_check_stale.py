import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
eng = create_engine(os.environ['DATABASE_URL'].strip())
with eng.connect() as c:
    total = c.execute(text("SELECT count(*) FROM resource WHERE source='osm'")).scalar()
    stale = c.execute(text("SELECT count(*) FROM resource WHERE source='osm' AND updated_at < now() - interval '21 days'")).scalar()
    newest = c.execute(text("SELECT max(updated_at) FROM resource WHERE source='osm'")).scalar()
    print(f'total osm:      {total}')
    print(f'stale >21 dias: {stale}')
    print(f'ultimo refresh: {newest}')
    rows = c.execute(text(
        "SELECT subcategory, count(*) FROM resource "
        "WHERE source='osm' AND updated_at < now() - interval '21 days' "
        "GROUP BY subcategory ORDER BY count(*) DESC LIMIT 12")).fetchall()
    for sub, n in rows:
        print(f'  {sub}: {n}')
