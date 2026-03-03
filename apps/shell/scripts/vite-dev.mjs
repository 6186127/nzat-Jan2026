import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Vite 7 expects Node 20.19+ where crypto.hash exists.
// Keep local dev working on Node 18 by providing the same helper.
if (typeof crypto.hash !== "function") {
  crypto.hash = (algorithm, data, outputEncoding) =>
    crypto.createHash(algorithm).update(data).digest(outputEncoding);
}

const rootDir = fileURLToPath(new URL("..", import.meta.url));
process.chdir(rootDir);

function readCliFlag(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const host = readCliFlag("--host");
const portValue = readCliFlag("--port");
const port = portValue ? Number(portValue) : undefined;

const vite = await import("vite");
const server = await vite.createServer({
  server: {
    host,
    port: Number.isFinite(port) ? port : undefined,
  },
});

await server.listen();
server.printUrls();

if (typeof server.bindCLIShortcuts === "function") {
  server.bindCLIShortcuts({ print: true });
}
