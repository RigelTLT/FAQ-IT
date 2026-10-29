"""Read-only custom feed для localhost. Не эмулятор стандартного OData."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit
from generate_data import build_events

EVENTS = build_events()

class Handler(BaseHTTPRequestHandler):
    def send_json(self,status,payload):
        raw = json.dumps(payload,ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Content-Length",str(len(raw)))
        if status == 429:
            self.send_header("Retry-After","1")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        parts = urlsplit(self.path)
        params = parse_qs(parts.query)
        if parts.path == "/health":
            return self.send_json(200,{"status":"ok","type":"training-custom-feed"})
        if parts.path == "/metadata":
            return self.send_json(200,{"schema_version":1,"source":"ut_demo","feed":"/changes",
                "cursor":"monotonic integer in this mock only","max_cursor":len(EVENTS),
                "note":"Not a real 1C configuration or standard OData interface"})
        if parts.path != "/changes":
            return self.send_json(404,{"code":"NOT_FOUND","message":"Use /changes; mock is not OData"})
        try:
            cursor = int(params.get("cursor",["0"])[0])
            limit = int(params.get("limit",["3"])[0])
            cutoff = int(params.get("cutoff",[str(len(EVENTS))])[0])
            if cursor<0 or not 1<=limit<=1000 or not 0<=cutoff<=len(EVENTS) or cursor>cutoff:
                raise ValueError("cursor/limit/cutoff out of range")
            fail = params.get("fail",[""])[0]
            if fail in ("429","500"):
                return self.send_json(int(fail),{"code":"TRAINING_FAILURE"})
            available = [e for e in EVENTS if cursor<e["cursor"]<=cutoff]
            page = available[:limit]
            next_cursor = page[-1]["cursor"] if page else cursor
            if page and params.get("duplicate",["0"])[0]=="1":
                page = page+[page[0]]
            self.send_json(200,{"schema_version":1,"source":"ut_demo","events":page,
                "next_cursor":next_cursor,"has_more":len(available)>limit,"snapshot_cutoff":cutoff})
        except (ValueError,KeyError) as error:
            self.send_json(400,{"code":"BAD_REQUEST","message":str(error)})

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port",type=int,default=8011)
    args = parser.parse_args()
    print(f"Training mock: http://127.0.0.1:{args.port}",flush=True)
    ThreadingHTTPServer(("127.0.0.1",args.port),Handler).serve_forever()
