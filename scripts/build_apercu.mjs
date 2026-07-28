// Empaquette la PWA (pwa/) en une page autonome unique : apercu.html
//
// Pourquoi : l'aperçu partageable doit tenir dans un seul fichier, sans aucune
// requête externe (CSS, JS, images inlinés). Le prototype lui-même reste
// multi-fichiers ; ce script est la seule source de l'aperçu publié.
//
// Usage : node scripts/build_apercu.mjs
//
// Les modules ES sont concaténés dans l'ordre des dépendances et fusionnés dans
// une seule portée : les lignes `import` sont supprimées et `export ` retiré.
// Le script échoue si deux modules déclarent le même identifiant de premier
// niveau (sinon la fusion casserait silencieusement).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const pwa = join(racine, "pwa");
const lire = (...p) => readFileSync(join(pwa, ...p), "utf8");

// Ordre des dépendances : chaque module ne dépend que des précédents
const MODULES = [
  "js/data/fixtures.js",
  "js/api/normalize.js",
  "js/api/market-data.js",
  "js/api/market-detail.js",
  "js/etat.js",
  "js/ui.js",
  "js/router.js",
  "js/pages/accueil.js",
  "js/pages/recherche.js",
  "js/pages/fiche.js",
  "js/pages/enjeu.js",
  "js/pages/portefeuille.js",
  "js/pages/resultats.js",
  "js/pages/favoris.js",
  "js/pages/parametres.js",
  "js/pages/notifications.js",
  "js/pages/stats.js",
  "js/pages/succes.js",
  "js/app.js"
];

// ---------- 1. Images en data URI ----------

const imagesDir = join(pwa, "img");
const images = new Map();
for (const f of readdirSync(imagesDir).filter((f) => f.endsWith(".svg"))) {
  const svg = readFileSync(join(imagesDir, f), "utf8");
  images.set(`img/${f}`, `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`);
}

// ---------- 2. Fusion des modules ----------

const RE_IMPORT = /^\s*import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm;
const RE_EXPORT = /^export\s+(?=(const|let|var|function|class|async))/gm;
const RE_DECLARATION = /^(?:export\s+)?(?:const|let|var|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm;

const declarations = new Map();
const morceaux = [];

for (const chemin of MODULES) {
  const source = lire(chemin);

  for (const m of source.matchAll(RE_DECLARATION)) {
    const nom = m[1];
    if (declarations.has(nom)) {
      throw new Error(
        `Conflit de nom « ${nom} » entre ${declarations.get(nom)} et ${chemin} : ` +
        `renommez-le, la fusion en une seule portée l'exige.`
      );
    }
    declarations.set(nom, chemin);
  }

  let code = source.replace(RE_IMPORT, "").replace(RE_EXPORT, "");
  if (/^\s*(import|export)\s/m.test(code)) {
    throw new Error(`Import/export non traité dans ${chemin}`);
  }
  morceaux.push(`\n/* ================= ${chemin} ================= */\n${code.trim()}\n`);
}

let js = morceaux.join("\n");

// Pas de service worker dans l'aperçu publié (origine distante, CSP stricte)
js = js.replace('"serviceWorker" in navigator && location.protocol !== "file:"', "false");

// Images inlinées
for (const [chemin, dataUri] of images) {
  js = js.split(`"${chemin}"`).join(`"${dataUri}"`);
}

// ---------- 3. Corps HTML ----------

const html = lire("index.html");
const corps = html.slice(html.indexOf("<body>") + 6, html.lastIndexOf("</body>"))
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .trim();

const css = lire("css/style.css");

const page = `<title>Marchés · données réelles</title>
<style>
${css}
/* L'aperçu publié n'a pas de barre d'adresse : on garde le fond de l'app partout */
html { background: var(--bg); }
</style>

${corps}

<script type="module">
${js}
</script>
`;

const sortie = join(racine, "apercu.html");
writeFileSync(sortie, page, "utf8");

const ko = (n) => `${Math.round(n / 1024)} Ko`;
console.log(`apercu.html écrit : ${ko(Buffer.byteLength(page))} ` +
  `(${MODULES.length} modules, ${images.size} images inlinées, ${declarations.size} déclarations)`);
