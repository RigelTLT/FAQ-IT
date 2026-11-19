"""Локальный пример логики кабинета: отчёт, подсказка очереди и поиск источника."""

import re
import sqlite3
from contextlib import closing
from pathlib import Path

from shipment_app import read_batch
from shipment_store import apply_batch, create_schema, daily_report


ACCESS = {"anna": {"north"}, "igor": {"volga"}, "analyst": {"north", "volga"}}
DOCUMENTS = [
    ("north", "north-tracking-v1", "статус доставка трек", "Статус отправления виден в разделе «Отправления»."),
    ("north", "north-claims-v1", "претензия повреждение", "О повреждении сообщите оператору через форму претензии."),
    ("volga", "volga-claims-v1", "претензия повреждение", "Правило учебной организации «Волга» для претензий."),
]


def require_access(user: str, org: str) -> None:
    """Имена пользователей переданы локальным сценарием. В API личность проверяет отдельный слой."""
    if org not in ACCESS.get(user, set()):
        raise PermissionError("организация недоступна")


def report(db: sqlite3.Connection, user: str, org: str) -> list[dict]:
    require_access(user, org)
    return daily_report(db, org)


def words(text: str) -> set[str]:
    return set(re.findall(r"\w+", text.casefold()))


def suggest_queue(text: str) -> str:
    """Подсказка по правилам для сравнения с обученной моделью."""
    signals = words(text)
    queues = {
        name
        for name, keywords in {
            "tracking": {"статус", "доставка", "трек"},
            "claims": {"претензия", "повреждение"},
        }.items()
        if signals & keywords
    }
    return queues.pop() if len(queues) == 1 else "operator"


def find_passage(user: str, org: str, question: str) -> tuple[str, str] | None:
    """Поиск по словам среди документов разрешённой организации."""
    require_access(user, org)
    query = words(question)
    matches = []
    for owner, doc_id, keywords, passage in DOCUMENTS:
        if owner == org:
            score = len(query & words(keywords))
            if score:
                matches.append((score, doc_id, passage))
    matches.sort(key=lambda match: match[0], reverse=True)
    if not matches or (len(matches) > 1 and matches[0][0] == matches[1][0]):
        return None
    _, doc_id, passage = matches[0]
    return doc_id, passage


def main():
    root = Path(__file__).resolve().parent
    with closing(sqlite3.connect(":memory:")) as db:
        create_schema(db)
        apply_batch(db, read_batch(root / "shipments.csv"))
        print("Первый отчёт Анны:", report(db, "anna", "north"))
        changes = read_batch(root / "shipments_update.csv")
        print("Изменено строк:", apply_batch(db, changes))
        print("При повторе:", apply_batch(db, changes))
        print("Отчёт после обновления:", report(db, "anna", "north"))
        try:
            report(db, "anna", "volga")
        except PermissionError as exc:
            print("Чужой отчёт:", exc)

    print("Подсказка очереди:", suggest_queue("Где статус?"))
    print("Источник для ответа:", find_passage("anna", "north", "Где статус?"))
    print("Без источника:", find_passage("anna", "north", "Как сменить пароль?"))


if __name__ == "__main__":
    main()
