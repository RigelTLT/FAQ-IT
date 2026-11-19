"""Правила учебного проекта. Этот модуль не читает файлы и не открывает БД."""

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Shipment:
    org: str
    shipment_id: str
    ship_date: str
    status: str
    version: int


def parse_row(row: dict[str, str]) -> Shipment:
    org = row["org"].strip()
    shipment_id = row["shipment_id"].strip()
    status = row["status"].strip()
    if not org or not shipment_id:
        raise ValueError("организация и номер отправления обязательны")
    if status not in {"shipped", "delivered"}:
        raise ValueError(f"неизвестный статус {status!r}")
    version = int(row["version"])
    if version < 1:
        raise ValueError("версия должна быть положительной")
    ship_date = date.fromisoformat(row["ship_date"].strip()).isoformat()
    return Shipment(org, shipment_id, ship_date, status, version)
