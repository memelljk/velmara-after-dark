// serve.ts — a small static file server for local play-testing of Velmara
// After Dark. Run `node serve.ts` (optionally `--port 8099`) and open the
// printed address. It serves only the game/ folder next to this file, picks
// the right content type for the file kinds a browser game ships, and refuses
// any path that tries to climb out of game/. Development use only.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const argv = process.argv.slice(2);
const portFlag = argv.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(argv[portFlag + 1]);
const listenPort = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

const server = createServer((req, res) => {
  let pathPart: string;
  try {
    pathPart = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (pathPart.endsWith('/')) pathPart += 'index.html';
  const target = resolve(join(gameRoot, normalize(pathPart)));
  if (target !== gameRoot && !target.startsWith(gameRoot + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let size: number;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('directory');
    size = info.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(res);
});
server.listen(listenPort, '127.0.0.1', () => {
  console.log(`Velmara After Dark is live at http://localhost:${listenPort}`);
});
