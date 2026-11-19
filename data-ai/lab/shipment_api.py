"""FastAPI-адаптер учебного отчёта. Демонстрационные токены работают локально."""

import os
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from shipment_portal import report


DEMO_USERS = {
    "Bearer demo-anna": "anna",
    "Bearer demo-igor": "igor",
    "Bearer demo-analyst": "analyst",
}


class ReportRow(BaseModel):
    day: str
    shipments: int
    delivered: int


def current_user(authorization: Annotated[str | None, Header()] = None) -> str:
    user = DEMO_USERS.get(authorization) if authorization else None
    if user is None:
        raise HTTPException(401, "Нужен учебный токен", headers={"WWW-Authenticate": "Bearer"})
    return user


def create_app(db_path: Path) -> FastAPI:
    app = FastAPI(title="Учебный отчёт по доставке")
    read_only_db = db_path.resolve().as_uri() + "?mode=ro"

    @app.get("/organizations/{org}/report", response_model=list[ReportRow])
    def report_endpoint(org: str, user: Annotated[str, Depends(current_user)]):
        try:
            with closing(sqlite3.connect(read_only_db, uri=True)) as db:
                return report(db, user, org)
        except PermissionError as exc:
            raise HTTPException(403, "Организация недоступна") from exc
        except sqlite3.OperationalError as exc:
            raise HTTPException(503, "Отчёт временно недоступен") from exc

    return app


app = create_app(Path(os.environ.get("SHIPMENTS_DB", "shipments.sqlite")))
