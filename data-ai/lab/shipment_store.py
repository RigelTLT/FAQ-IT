"""Хранение последней известной версии каждого отправления."""

import sqlite3

from shipment_rules import Shipment


def create_schema(db: sqlite3.Connection) -> None:
    db.execute("""
        CREATE TABLE IF NOT EXISTS shipment (
            org TEXT NOT NULL,
            shipment_id TEXT NOT NULL,
            ship_date TEXT NOT NULL,
            status TEXT NOT NULL,
            version INTEGER NOT NULL,
            PRIMARY KEY (org, shipment_id)
        )
    """)


def apply_batch(db: sqlite3.Connection, rows: list[Shipment]) -> int:
    if db.in_transaction:
        raise ValueError("apply_batch открывает собственную транзакцию")
    updated = 0
    # Начинаем запись до чтения текущих версий. Ошибка откатывает весь пакет.
    with db:
        db.execute("BEGIN IMMEDIATE")
        for row in rows:
            current = db.execute(
                "SELECT ship_date, status, version FROM shipment "
                "WHERE org = ? AND shipment_id = ?",
                (row.org, row.shipment_id),
            ).fetchone()
            if current is not None and current[2] == row.version:
                if current[:2] != (row.ship_date, row.status):
                    raise ValueError(f"конфликт версии {row.org}/{row.shipment_id}")
                continue
            cursor = db.execute("""
                INSERT INTO shipment VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (org, shipment_id) DO UPDATE SET
                    ship_date = excluded.ship_date,
                    status = excluded.status,
                    version = excluded.version
                WHERE excluded.version > shipment.version
            """, (row.org, row.shipment_id, row.ship_date, row.status, row.version))
            updated += cursor.rowcount
    return updated


def daily_report(db: sqlite3.Connection, org: str) -> list[dict]:
    result = db.execute("""
        SELECT ship_date, COUNT(*), SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)
        FROM shipment
        WHERE org = ?
        GROUP BY ship_date
        ORDER BY ship_date
    """, (org,))
    return [
        {"day": day, "shipments": total, "delivered": delivered}
        for day, total, delivered in result
    ]
