import os
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
PORT = 8000
CLOUDFLARED_URL = (
    "https://github.com/cloudflare/cloudflared/releases/latest/download/"
    "cloudflared-windows-amd64.exe"
)


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
    server = ThreadingHTTPServer(("127.0.0.1", port), SimpleHTTPRequestHandler)
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
