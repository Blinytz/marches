import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const assertions = [];
function test(name, condition) {
  assertions.push({ name, condition });
  if (!condition) process.exitCode = 1;
}

const app = read("pwa/js/app.js");
const index = read("pwa/index.html");
const portfolio = read("pwa/js/pages/portefeuille.js");
const stats = read("pwa/js/pages/stats.js");
const migrationCatalogue = read("sql/001_catalogue_reel.sql");
const workflowSync = read(".github/workflows/sync-catalogue.yml");
const pagesDir = new URL("pwa/js/pages/", root);
const pageText = readdirSync(pagesDir)
  .filter((name) => name.endsWith(".js"))
  .map((name) => read(`pwa/js/pages/${name}`))
  .join("\n");

test("les libellés Portefeuille et Statistiques sont complets", index.includes(">Portefeuille<") && index.includes(">Statistiques<"));
test("le compteur de positions est neutre", index.includes('class="badge-nombre" data-badge="positions"'));
test("l'indicateur de gains est réservé aux Résultats", index.includes('class="badge-point or" data-badge="resultats"'));
test("Succès est une sous-page de Résultats", app.includes('lib: "Succès"') && app.includes('enregistrer("succes", pageSucces)'));
test("aucun libellé utilisateur P&L ne subsiste", !/P(?:&amp;|&)L/.test(pageText));
test("l'historique relie chaque événement à son marché", portfolio.includes('href="#/marche/${c.pos.marcheId}"'));
test("le registre affiche le contexte de chaque mouvement", portfolio.includes("l.application") && portfolio.includes("l.marcheId"));
test("les statistiques proposent des sous-menus", app.includes('href: "#/stats?vue=precision"') && app.includes('href: "#/stats?vue=records"') && app.includes('href: "#/stats?vue=rentabilite"') && app.includes('href: "#/stats?vue=comportement"'));
test("la page Statistiques rend une sous-section selon la vue", stats.includes("route.query") && stats.includes("sections[vue]"));
test("la migration du catalogue ne touche jamais au ledger", !/eclats_ledger/i.test(
  migrationCatalogue.replace(/--.*$/gm, "")
));
test("les écritures catalogue restent réservées au service", migrationCatalogue.includes("to service_role") &&
  migrationCatalogue.includes("revoke insert, update, delete, truncate") &&
  !/grant\s+(?:all|insert|update|delete)[^;]*to\s+(?:anon|authenticated)/i.test(migrationCatalogue));
test("le grant énumère les séquences avec la syntaxe PostgreSQL singulière",
  /grant\s+usage,\s*select\s+on\s+sequence\s+public\.mk_events_id_seq/i.test(migrationCatalogue) &&
  !/\bon\s+sequences\s+public\./i.test(migrationCatalogue));
test("le workflow ne contient aucun secret en clair", workflowSync.includes("secrets.SUPABASE_SERVICE_KEY") &&
  !/sb_secret_|service_role\\s*[:=]\\s*['\"]/i.test(workflowSync));

const jsFiles = [
  "pwa/js/app.js", "pwa/js/etat.js", "pwa/js/router.js", "pwa/js/ui.js",
  "pwa/js/api/normalize.js", "pwa/js/api/market-data.js", "pwa/js/api/market-detail.js",
  ...readdirSync(pagesDir).filter((name) => name.endsWith(".js")).map((name) => `pwa/js/pages/${name}`),
  "pwa/js/integration/eclats-adapter.js",
  "pwa/js/integration/export-snapshot.js"
  ,"scripts/sync_catalogue.mjs"
];
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { cwd: new URL(".", root), encoding: "utf8" });
  test(`syntaxe valide : ${file}`, result.status === 0);
}

for (const { name, condition } of assertions) {
  console.log(`${condition ? "✓" : "✗"} ${name}`);
}
if (process.exitCode) throw new Error("Une ou plusieurs vérifications ont échoué.");
