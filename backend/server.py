"""
KharchaWise Fullstack Server
Native Python 3 - Zero external pip dependencies required.
Serves both the RESTful API and the Frontend Single Page Application.
"""

import sys
import os
import json
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

# Add current folder to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import db

PORT = int(os.environ.get("PORT", 8000))
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

class KharchaWiseHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {self.command} {self.path} - {format%args}\n")

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def send_json(self, status_code, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            return {}
        body = self.rfile.read(content_length).decode("utf-8")
        return json.loads(body)

    # ------------------ GET Requests ------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # API Endpoints
        if path == "/api/health":
            return self.send_json(200, {
                "status": "healthy",
                "service": "KharchaWise Fullstack Server",
                "database": "SQLite (Connected)",
                "currency": "PKR (Rs.)"
            })

        if path == "/api/data":
            try:
                data = db.fetch_all_data()
                return self.send_json(200, data)
            except Exception as e:
                return self.send_json(500, {"error": str(e)})

        # Serve Frontend Static Files
        self.serve_frontend(path)

    # ------------------ POST Requests ------------------
    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            body = self.read_json_body()

            if path == "/api/transactions":
                created = db.add_transaction(body)
                return self.send_json(201, created)

            if path == "/api/budget/overall":
                amt = float(body.get("overall", body.get("amount", 0)))
                res = db.set_overall_budget(amt)
                return self.send_json(200, res)

            if path == "/api/budget/category":
                cat = body.get("category")
                amt = float(body.get("limit", body.get("amount", 0)))
                res = db.set_category_limit(cat, amt)
                return self.send_json(200, res)

            if path == "/api/goals":
                created = db.add_goal(body)
                return self.send_json(201, created)

            if path.startswith("/api/goals/") and path.endswith("/contributions"):
                # Pattern: /api/goals/<goal_id>/contributions
                parts = path.strip("/").split("/")
                goal_id = parts[2]
                amt = float(body.get("amount", 0))
                date_str = body.get("date")
                res = db.add_contribution(goal_id, amt, date_str)
                return self.send_json(200, res)

            if path == "/api/reset":
                res = db.reset_all_data()
                return self.send_json(200, res)

            if path == "/api/restore":
                res = db.restore_data(body)
                return self.send_json(200, res)

            return self.send_json(404, {"error": f"API endpoint not found: {path}"})
        except Exception as e:
            return self.send_json(400, {"error": str(e)})

    # ------------------ PUT Requests ------------------
    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            body = self.read_json_body()

            if path.startswith("/api/transactions/"):
                tx_id = path.split("/api/transactions/")[1].strip("/")
                updated = db.update_transaction(tx_id, body)
                return self.send_json(200, updated)

            if path.startswith("/api/goals/"):
                goal_id = path.split("/api/goals/")[1].strip("/")
                updated = db.update_goal(goal_id, body)
                return self.send_json(200, updated)

            return self.send_json(404, {"error": f"API endpoint not found: {path}"})
        except Exception as e:
            return self.send_json(400, {"error": str(e)})

    # ------------------ DELETE Requests ------------------
    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            if path.startswith("/api/transactions/"):
                tx_id = path.split("/api/transactions/")[1].strip("/")
                res = db.delete_transaction(tx_id)
                return self.send_json(200, res)

            if path.startswith("/api/goals/"):
                goal_id = path.split("/api/goals/")[1].strip("/")
                res = db.delete_goal(goal_id)
                return self.send_json(200, res)

            return self.send_json(404, {"error": f"API endpoint not found: {path}"})
        except Exception as e:
            return self.send_json(400, {"error": str(e)})

    # ------------------ Static File & SPA Serving ------------------
    def serve_frontend(self, path):
        # Normalize relative path
        rel_path = path.lstrip("/")
        if not rel_path:
            rel_path = "index.html"

        file_path = os.path.join(FRONTEND_DIR, rel_path)

        # HTML5 History fallback: if path doesn't have an extension and isn't a file, serve index.html
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(FRONTEND_DIR, "index.html")

        if not os.path.exists(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return

        content_type, _ = mimetypes.guess_type(file_path)
        if content_type is None:
            if file_path.endswith(".css"):
                content_type = "text/css"
            elif file_path.endswith(".js"):
                content_type = "application/javascript"
            else:
                content_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()

            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_cors_headers()
            # Cache static assets but not index.html
            if "index.html" in file_path:
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            else:
                self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f"Error serving file: {e}".encode("utf-8"))

def main():
    print("=" * 60)
    print("KharchaWise Fullstack Server initializing...")
    print(f"Database: {db.DB_PATH}")
    print(f"Frontend Static Directory: {FRONTEND_DIR}")
    print("=" * 60)
    
    db.init_db(seed_if_empty=True)
    print("Database initialized and verified.")

    server_address = ("", PORT)
    httpd = HTTPServer(server_address, KharchaWiseHandler)
    print(f"\nServer live and listening on http://localhost:{PORT}")
    print(f" - Landing:      http://localhost:{PORT}/")
    print(f" - Dashboard:    http://localhost:{PORT}/dashboard")
    print(f" - Transactions: http://localhost:{PORT}/transactions")
    print(f" - Budget:       http://localhost:{PORT}/budget")
    print(f" - Savings:      http://localhost:{PORT}/savings")
    print(f" - Settings:     http://localhost:{PORT}/settings")
    print(f" - Health API:   http://localhost:{PORT}/api/health")
    print(f" - Data API:     http://localhost:{PORT}/api/data\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down gracefully.")
        httpd.server_close()

if __name__ == "__main__":
    main()
