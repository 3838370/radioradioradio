# Serves this folder (the radio) on http://localhost:8765 with browser caching turned off,
# so every reload picks up the latest files.  Usage: python serve.py [port]
# It also lets the INSTRUMENTOS panel save sounds to their source files:
#   GET    /__gravar                               -> "ok" (the page knows it can save)
#   PUT    /instrumentos/<papel>/<grupo>/<nome>.inst  writes the file (body = its text)
#   DELETE /instrumentos/<papel>/<grupo>/<nome>.inst  deletes it
# and rewrites instrumentos/index.txt after each. Only .inst files under instrumentos/,
# only from this computer (127.0.0.1).
import functools
import http.server
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SOUND = re.compile(r'^/instrumentos/([a-z0-9_]+)/([a-z0-9_]+)/([a-z0-9_]+)\.inst$')


def write_index():
    base = os.path.join(ROOT, 'instrumentos')
    files = []
    for dirpath, _, names in os.walk(base):
        for n in names:
            if n.endswith('.inst'):
                files.append(os.path.relpath(os.path.join(dirpath, n), base).replace(os.sep, '/'))
    with open(os.path.join(base, 'index.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('# um ficheiro .inst por som; reescrito pelo serve.py ao gravar\n')
        f.write('\n'.join(sorted(files)) + '\n')


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # Windows may register .js as text/plain; browsers refuse ES modules served like that.
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map,
                          **{'.js': 'text/javascript', '.mjs': 'text/javascript', '.rad': 'text/plain; charset=utf-8',
                             '.inst': 'text/plain; charset=utf-8'})

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, code, text):
        body = text.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] == '/__gravar':
            return self.reply(200, 'ok')
        return super().do_GET()

    def sound_path(self):
        if self.client_address[0] != '127.0.0.1':
            self.reply(403, 'só a partir deste computador')
            return None
        m = SOUND.match(self.path.split('?')[0])
        if not m:
            self.reply(400, 'só ficheiros instrumentos/<papel>/<grupo>/<nome>.inst (letras minúsculas, números, _)')
            return None
        return os.path.join(ROOT, 'instrumentos', m.group(1), m.group(2), m.group(3) + '.inst')

    def do_PUT(self):
        path = self.sound_path()
        if not path:
            return
        text = self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8')
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        write_index()
        self.reply(200, 'gravado')

    def do_DELETE(self):
        path = self.sound_path()
        if not path:
            return
        if not os.path.exists(path):
            return self.reply(404, 'não existe')
        os.remove(path)
        folder = os.path.dirname(path)
        if not os.listdir(folder):
            os.rmdir(folder)
        write_index()
        self.reply(200, 'apagado')


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    print(f'Radio AI on http://localhost:{port}  (Ctrl+C to stop)')
    # a long queue: the site fetches ~600 files at once on start, and the default (5)
    # sometimes refuses a few ("Failed to fetch")
    http.server.ThreadingHTTPServer.request_queue_size = 256
    http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
