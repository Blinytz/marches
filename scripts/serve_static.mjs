import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const racine = fileURLToPath(new URL("../pwa/", import.meta.url));
const port = Number(process.argv[2] || 8123);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

createServer(async (requete, reponse) => {
  try {
    const cheminUrl = decodeURIComponent(new URL(requete.url, "http://localhost").pathname);
    const relatif = cheminUrl === "/" ? "index.html" : cheminUrl.replace(/^\/+/, "");
    const chemin = normalize(join(racine, relatif));
    if (!chemin.startsWith(normalize(racine))) throw new Error("Chemin refusé");
    const info = await stat(chemin);
    if (!info.isFile()) throw new Error("Fichier absent");
    reponse.writeHead(200, {
      "Content-Type": types[extname(chemin)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(chemin).pipe(reponse);
  } catch {
    reponse.writeHead(404).end("Introuvable");
  }
}).listen(port, "127.0.0.1", () => console.log(`Marchés : http://127.0.0.1:${port}`));
