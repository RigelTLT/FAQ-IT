"""Точка входа: файл → проверка → хранилище → сводка."""

import argparse
import csv
import sqlite3
from contextlib import closing
from pathlib import Path

from shipment_rules import Shipment, parse_row
from shipment_store import apply_batch, create_schema, daily_report


def read_batch(path: Path) -> list[Shipment]:
    shipments = []
    with path.open(encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        expected = {"org", "shipment_id", "ship_date", "status", "version"}
        fields = reader.fieldnames or []
        if set(fields) != expected or len(fields) != len(expected):
            raise ValueError("неверные заголовки CSV")
        for row in reader:
            try:
                if None in row or None in row.values():
                    raise ValueError("число значений не совпадает с числом столбцов")
                shipments.append(parse_row(row))
            except (KeyError, ValueError) as exc:
                raise ValueError(f"{path.name}, строка {reader.line_num}: {exc}") from exc
    return shipments


def main():
    parser = argparse.ArgumentParser(description="Сводка по учебным отправлениям")
    parser.add_argument("file", type=Path)
    parser.add_argument("--db", default="shipments.sqlite")
    parser.add_argument("--org", choices=["north", "volga"], default="north")
    args = parser.parse_args()

    rows = read_batch(args.file)
    with closing(sqlite3.connect(args.db)) as db:
        create_schema(db)
        updated = apply_batch(db, rows)
        print("Изменено строк:", updated)
        for row in daily_report(db, args.org):
            print(f"{row['day']} · {args.org} · доставлено {row['delivered']} из {row['shipments']}")


if __name__ == "__main__":
    main()
