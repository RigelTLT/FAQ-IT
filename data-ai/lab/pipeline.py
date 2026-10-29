"""Минимальное ядро inbox + versioned state + mart. Не промышленный коннектор 1С."""
import argparse
import hashlib
import json
import sqlite3
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCHEMA = """
CREATE TABLE IF NOT EXISTS inbox (
 source TEXT NOT NULL, event_id TEXT NOT NULL, PRIMARY KEY(source,event_id));
CREATE TABLE IF NOT EXISTS sale_state (
 source TEXT NOT NULL, entity_key TEXT NOT NULL, version INTEGER NOT NULL,
 document_id TEXT NOT NULL, line_no INTEGER NOT NULL, org_id TEXT NOT NULL,
 sale_date TEXT NOT NULL, amount_kopecks INTEGER NOT NULL,
 posted INTEGER NOT NULL, deleted INTEGER NOT NULL,
 PRIMARY KEY(source,entity_key));
CREATE TABLE IF NOT EXISTS checkpoint (
 source TEXT PRIMARY KEY, cursor INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS mart_daily (
 org_id TEXT NOT NULL, sale_date TEXT NOT NULL, revenue_kopecks INTEGER NOT NULL,
 lines INTEGER NOT NULL, PRIMARY KEY(org_id,sale_date));
"""

def validate(event):
    for field in ("source", "event_id", "entity_key"):
        if not isinstance(event[field], str) or not event[field]:
            raise ValueError(f"invalid {field}")
    for field in ("cursor", "entity_version"):
        if type(event[field]) is not int or event[field] < 1:
            raise ValueError(f"invalid {field}")
    if event["operation"] not in ("upsert", "delete"):
        raise ValueError("unknown operation")
    payload = event["payload"]
    for field in ("document_id", "org_id"):
        if not isinstance(payload[field], str) or not payload[field]:
            raise ValueError(f"invalid payload {field}")
    if type(payload["amount_kopecks"]) is not int or type(payload["posted"]) is not bool:
        raise ValueError("invalid amount or posted")
    if type(payload["line_no"]) is not int or payload["line_no"] < 1:
        raise ValueError("invalid line_no")
    if event["entity_key"] != f"{payload['document_id']}:{payload['line_no']}":
        raise ValueError("business key mismatch")
    date.fromisoformat(payload["sale_date"])

def apply_events(connection, events, fail_before_commit=False):
    """Все события — один полный подтверждённый пакет, не произвольная HTTP-страница."""
    connection.executescript(SCHEMA)
    for event in events:
        validate(event)
    inserted = 0
    with connection:
        for event in events:
            source, eid = event["source"], event["event_id"]
            new = connection.execute("INSERT OR IGNORE INTO inbox VALUES (?,?)", (source,eid)).rowcount
            if not new:
                continue
            payload = event["payload"]
            connection.execute("""INSERT INTO sale_state VALUES (?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(source,entity_key) DO UPDATE SET
              version=excluded.version, document_id=excluded.document_id,
              line_no=excluded.line_no, org_id=excluded.org_id,
              sale_date=excluded.sale_date, amount_kopecks=excluded.amount_kopecks,
              posted=excluded.posted, deleted=excluded.deleted
             WHERE excluded.version > sale_state.version""",
             (source,event["entity_key"],event["entity_version"],payload["document_id"],
              payload["line_no"],payload["org_id"],payload["sale_date"],
              payload["amount_kopecks"],int(payload["posted"]),int(event["operation"]=="delete")))
            connection.execute("""INSERT INTO checkpoint VALUES (?,?)
             ON CONFLICT(source) DO UPDATE SET cursor=MAX(checkpoint.cursor,excluded.cursor)""",
             (source,event["cursor"]))
            inserted += 1
        connection.execute("DELETE FROM mart_daily")
        connection.execute("""INSERT INTO mart_daily
          SELECT org_id,sale_date,SUM(amount_kopecks),COUNT(*) FROM sale_state
          WHERE posted=1 AND deleted=0 GROUP BY org_id,sale_date""")
        core = connection.execute("SELECT COALESCE(SUM(amount_kopecks),0) FROM sale_state WHERE posted=1 AND deleted=0").fetchone()[0]
        mart = connection.execute("SELECT COALESCE(SUM(revenue_kopecks),0) FROM mart_daily").fetchone()[0]
        if core != mart:
            raise ValueError("core/mart mismatch")
        if fail_before_commit:
            raise RuntimeError("training failpoint before commit")
    return {"new_events":inserted,"total_kopecks":mart}

def load_verified(folder):
    raw = (folder / "events.json").read_bytes()
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    events = json.loads(raw)
    if manifest["schema_version"] != 1 or hashlib.sha256(raw).hexdigest() != manifest["sha256"]:
        raise ValueError("manifest schema/checksum mismatch")
    if len(events) != manifest["event_count"] or not events:
        raise ValueError("incomplete batch")
    if any(e["source"] != manifest["source"] for e in events):
        raise ValueError("unexpected source")
    cursors = sorted(e["cursor"] for e in events)
    if cursors != list(range(1, manifest["cutoff"]+1)):
        raise ValueError("missing or duplicate cursor in full training batch")
    return events

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="training.sqlite")
    parser.add_argument("--sample", type=Path, default=ROOT/"sample")
    parser.add_argument("--fail-before-commit", action="store_true")
    args = parser.parse_args()
    events = load_verified(args.sample)
    with sqlite3.connect(args.db) as connection:
        result = apply_events(connection,events,args.fail_before_commit)
        print(json.dumps(result))
        print("by_org:",connection.execute("SELECT org_id,SUM(revenue_kopecks) FROM mart_daily GROUP BY org_id ORDER BY org_id").fetchall())

if __name__ == "__main__":
    main()
