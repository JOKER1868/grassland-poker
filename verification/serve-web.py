from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

root = Path(__file__).resolve().parents[1] / "android-shell/assets/web"
ThreadingHTTPServer(("127.0.0.1", 8765), partial(QuietHandler, directory=str(root))).serve_forever()
