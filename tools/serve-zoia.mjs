import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const PORT = Number.parseInt(process.env.ZOIA_PORT ?? "5173", 10);
const HOST = process.env.ZOIA_HOST ?? "127.0.0.1";
const DEFAULT_ENTRY = "/products/zoia/index.html";

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".wav", "audio/wav"],
  [".bin", "application/octet-stream"],
]);

function resolveRequestPath(requestUrl) {
  const parsed = new URL(requestUrl, `http://${HOST}:${PORT}`);
  const pathname = parsed.pathname === "/" ? DEFAULT_ENTRY : decodeURIComponent(parsed.pathname);
  const candidate = normalize(join(REPO_ROOT, pathname));
  if (candidate !== REPO_ROOT && !candidate.startsWith(`${REPO_ROOT}${sep}`)) {
    return null;
  }
  return candidate;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url ?? DEFAULT_ENTRY);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": MIME_TYPES.get(extname(filePath).toLowerCase()) ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(PORT, HOST, () => {
  console.log(`ZOIA emulator: http://${HOST}:${PORT}${DEFAULT_ENTRY}`);
});
