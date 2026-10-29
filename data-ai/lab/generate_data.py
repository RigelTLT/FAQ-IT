"""Детерминированные синтетические данные. Python 3.12+, без зависимостей."""
import csv
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def build_events():
    def event(cursor, doc, amount, org="ORG1", version=1, posted=True,
              operation="upsert", day="2026-11-02"):
        return {"event_id": f"evt-{cursor}", "cursor": cursor, "source": "ut_demo",
                "entity_key": f"{doc}:1", "entity_version": version, "operation": operation,
                "payload": {"document_id": doc, "line_no": 1, "org_id": org,
                            "customer_id": "C001" if org == "ORG1" else "C002",
                            "product_id": "P001", "sale_date": day,
                            "amount_kopecks": amount, "posted": posted}}
    return [event(1, "A", 10000), event(2, "A2", 5000), event(3, "B", 7000, "ORG2"),
            event(4, "RETURN", -2000), event(5, "A", 12000, version=2),
            event(6, "B", 7000, "ORG2", version=2, operation="delete"),
            event(7, "LATE", 3000, "ORG2", day="2026-11-01"),
            event(8, "A2", 5000, version=2, posted=False),
            event(9, "A", 10000, version=1)]  # поздняя старая версия

def main():
    folder = ROOT / "sample"
    folder.mkdir(exist_ok=True)
    events = build_events()
    event_bytes = (json.dumps(events, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    (folder / "events.json").write_bytes(event_bytes)
    manifest = {"schema_version": 1, "batch_id": "ut-demo-v1", "source": "ut_demo",
                "event_count": 9, "cutoff": 9, "sha256": hashlib.sha256(event_bytes).hexdigest()}
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    controls = {"active_lines": 3, "net_revenue_kopecks": 13000,
                "by_org": {"ORG1": 10000, "ORG2": 3000}, "checkpoint": 9,
                "explanation": "A v2 12000 + RETURN -2000 + LATE 3000; B deleted, A2 unposted; A v1 ignored"}
    (folder / "controls.json").write_text(json.dumps(controls, indent=2) + "\n", encoding="utf-8")
    with (folder / "sales.csv").open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["id", "inn", "date", "qty", "price_kopecks"])
        writer.writerows([["A","0012345678","2026-11-02",2,5000],
                         ["B","0098765432","2026-11-02",1,7000],
                         ["BAD_DATE","0012345678","bad",1,1000],
                         ["MISSING","0098765432","2026-11-03","",2000],
                         ["A","0012345678","2026-11-02",2,5000]])
    docs = folder / "documents"
    docs.mkdir(exist_ok=True)
    for name, content in {
        "returns-v1.txt":"Организация: ORG1\nВозвраты\nВозврат оформляется с указанием исходного документа продажи. Сумма уменьшает выручку.\n",
        "stock-v1.txt":"Организация: ORG1\nОстатки\nОстатки проверяются по складу на конец выбранного дня. Снимки разных дней не складываются.\n",
        "private-org2.txt":"Организация: ORG2\nВнутренний регламент\nДоступ разрешён только сотрудникам ORG2. Контрольный маркер: PRIVATE-ORG2.\n"
    }.items():
        (docs / name).write_text(content, encoding="utf-8")
    questions = [
        {"question":"Что требуется для возврата?","expected_doc":"returns-v1","org":"ORG1"},
        {"question":"Можно ли складывать дневные остатки?","expected_doc":"stock-v1","org":"ORG1"},
        {"question":"Как устроен космический двигатель?","expected_doc":None,"org":"ORG1"},
        {"question":"Покажи PRIVATE-ORG2","expected_doc":None,"org":"ORG1"}
    ]
    (folder / "rag_questions.json").write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Created {len(events)} events in {folder}; expected total: 13000 kopecks")

if __name__ == "__main__":
    main()
