import os
import json
import re
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
URL_FILE = ROOT / "public_url.txt"
LOG_FILE = ROOT / "cloudflared.log"
CLOUDFLARED = ROOT / "cloudflared.exe"
COHERE_KEY_FILE = ROOT / "cohere_key.txt"
PORT = 8000
CLOUDFLARED_URL = (
    "https://github.com/cloudflare/cloudflared/releases/latest/download/"
    "cloudflared-windows-amd64.exe"
)

RESUME_CONTEXT = """
Candidate: Shahistha Sultana K
Role: Senior Business Intelligence Developer
Location: Bangalore, India
Experience: 8+ years in BI and analytics
Current company: Oracle Cerner (Dec 2022 - Present)
Previous roles: Senior Configuration Analyst (Cerner), Oracle PL/SQL Developer (HCL)
Skills: Tableau Desktop/Server, Oracle Analytics Cloud, SQL/PL-SQL, ETL/ELT, Data Warehousing,
Data Validation, ADW, Oracle, Snowflake, Vertica, Git, JIRA, Agile/Scrum.
Domain focus: Healthcare + Enterprise Reporting.
Highlights: Migrated and delivered 15+ OAC dashboards; resolved 90+ data/calculation issues.
Certifications: Leading SAFe 6.0 Agilist, OCI 2025 Generative AI Professional, Oracle 9i.
"""


def read_cohere_key() -> str:
    if not COHERE_KEY_FILE.exists():
        return ""
    return COHERE_KEY_FILE.read_text(encoding="utf-8").strip()


def local_professional_fallback(question: str) -> str:
    q = question.lower()
    if any(term in q for term in ("aws", "azure", "gcp", "cloud")):
        return (
            "I have strong experience in cloud data/reporting environments such as ADW, Oracle, "
            "and Snowflake. While this resume does not list deep AWS delivery explicitly, I adapt "
            "quickly to adjacent cloud stacks and can ramp up fast in production settings."
        )
    if "python" in q:
        return (
            "NA. Python is not listed as a primary production skill in this resume."
        )
    return "NA"


def ask_cohere(question: str) -> str:
    key = read_cohere_key()
    if not key:
        return local_professional_fallback(question)

    system_prompt = (
        "You are a professional recruiter-facing resume assistant. "
        "Answer using ONLY the supplied resume context. "
        "If question is adjacent (for example AWS when only other cloud platforms are listed), "
        "give a truthful transferable-skills response in a professional tone. "
        "If there is no evidence at all, answer exactly: NA. "
        "Keep answers concise (1-3 sentences)."
    )

    payload = {
        "model": "command-r-plus",
        "message": (
            f"Resume context:\n{RESUME_CONTEXT}\n\n"
            f"Question: {question}\n"
            "Answer:"
        ),
        "preamble": system_prompt,
        "temperature": 0.2,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.cohere.ai/v1/chat",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            parsed = json.loads(resp.read().decode("utf-8"))
            text = (parsed.get("text") or "").strip()
            return text or local_professional_fallback(question)
    except Exception:
        return local_professional_fallback(question)


class ResumeSiteHandler(SimpleHTTPRequestHandler):
    def _json_response(self, code: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/resume-chat":
            self._json_response(404, {"error": "Not found"})
            return

        try:
            content_len = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_len) if content_len else b"{}"
            body = json.loads(raw.decode("utf-8"))
            question = str(body.get("question", "")).strip()
            if not question:
                self._json_response(400, {"answer": "NA"})
                return
            answer = ask_cohere(question)
            self._json_response(200, {"answer": answer})
        except Exception:
            self._json_response(500, {"answer": "NA"})


def ensure_cloudflared() -> None:
    if CLOUDFLARED.exists():
        return
    print("Downloading cloudflared...", flush=True)
    urllib.request.urlretrieve(CLOUDFLARED_URL, str(CLOUDFLARED))


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(("127.0.0.1", port)) == 0


def start_http_server(port: int) -> ThreadingHTTPServer:
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", port), ResumeSiteHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def start_cloudflare_tunnel(port: int) -> tuple[subprocess.Popen, str]:
    cmd = [
        str(CLOUDFLARED),
        "tunnel",
        "--no-autoupdate",
        "--url",
        f"http://127.0.0.1:{port}",
    ]
    proc = subprocess.Popen(
        cmd,
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    url_pattern = re.compile(r"https://[-a-z0-9]+\.trycloudflare\.com")
    started_at = time.time()
    log_lines = []

    while True:
        if proc.stdout is None:
            break
        line = proc.stdout.readline()
        if line:
            log_lines.append(line)
            LOG_FILE.write_text("".join(log_lines), encoding="utf-8")
            match = url_pattern.search(line)
            if match:
                return proc, match.group(0)

        if proc.poll() is not None:
            break
        if time.time() - started_at > 90:
            break

    LOG_FILE.write_text("".join(log_lines), encoding="utf-8")
    raise RuntimeError(
        f"Could not start Cloudflare tunnel. Check logs at: {LOG_FILE}"
    )


def shutdown(server: ThreadingHTTPServer, tunnel_proc: subprocess.Popen | None) -> None:
    if tunnel_proc and tunnel_proc.poll() is None:
        tunnel_proc.terminate()
        try:
            tunnel_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            tunnel_proc.kill()
    server.shutdown()
    server.server_close()


def main() -> int:
    if is_port_in_use(PORT):
        print(f"Port {PORT} is already in use. Free it and run again.", flush=True)
        return 1

    ensure_cloudflared()
    server = start_http_server(PORT)
    tunnel_proc = None

    try:
        tunnel_proc, public_url = start_cloudflare_tunnel(PORT)
        URL_FILE.write_text(public_url + "\n", encoding="utf-8")
        print(f"Public resume URL: {public_url}", flush=True)
        print("Keep this window open to keep the site live.", flush=True)

        def _signal_handler(signum, frame):  # noqa: ARG001
            shutdown(server, tunnel_proc)
            sys.exit(0)

        signal.signal(signal.SIGTERM, _signal_handler)
        signal.signal(signal.SIGINT, _signal_handler)

        while True:
            if tunnel_proc.poll() is not None:
                raise RuntimeError("Tunnel process stopped unexpectedly.")
            time.sleep(1)
    except Exception as exc:
        print(str(exc), flush=True)
        shutdown(server, tunnel_proc)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
