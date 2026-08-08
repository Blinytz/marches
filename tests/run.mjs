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
const migrationPortefeuille = read("sql/002_portefeuille_eclats_reel.sql");
const workflowSync = read(".github/workflows/sync-catalogue.yml");
const workflowDeploy = read(".github/workflows/deploy-pages.yml");
const sw = read("pwa/sw.js");
const version = read("pwa/js/version.js");
const parametres = read("pwa/js/pages/parametres.js");
const sync = read("scripts/sync_catalogue.mjs");
const marketData = read("pwa/js/api/market-data.js");
const accueil = read("pwa/js/pages/accueil.js");
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
test("les statistiques utilisent uniquement le registre réel", stats.includes("etat.ledger") &&
  stats.includes("registre commun") && !stats.includes("démonstration"));
test("aucun contrôle ou solde de démonstration n'est chargé", !index.includes("barre-demo") &&
  !read("pwa/js/etat.js").includes("SOLDE_DEMO"));
test("les transactions Marchés passent par des RPC atomiques", migrationPortefeuille.includes("function public.mk_buy") &&
  migrationPortefeuille.includes("function public.mk_sell") &&
  migrationPortefeuille.includes("pg_advisory_xact_lock"));
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

// Mise à jour : sans ces trois pièces, une PWA installée continue de tourner
// avec le code chargé au premier lancement, parfois pendant des jours.
test("le service worker contourne le cache HTTP de GitHub Pages", sw.includes('cache: "no-cache"'));
test("le déploiement estampille une version", workflowDeploy.includes("pwa/version.json") &&
  workflowDeploy.includes("GITHUB_SHA"));
test("l'app relit la version au retour au premier plan",
  version.includes('fetch(`version.json?t=${Date.now()}`, { cache: "no-store" })') &&
  app.includes('document.addEventListener("visibilitychange"'));
test("les réglages affichent la version et savent la forcer",
  parametres.includes("versionCourteAffichable()") && parametres.includes('data-action="forcer-maj"') &&
  app.includes("rechargerApp({ radical: true })"));
test("une saisie en cours empêche le rechargement automatique",
  app.includes("appAuRepos()") && app.includes('bandeau-maj'));
test("« Tous les marchés » reste accessible depuis la sous-navigation",
  app.includes('lib: "Tous les marchés", href: "#/recherche"'));

// Taille du catalogue : l'API Gamma plafonne « limit » à 100 et « select=* »
// ramenait 12 Mo de raw_payload inutiles au client.
test("la synchro pagine Polymarket au lieu de demander une limite ignorée",
  sync.includes("offset=${page * 100}") && !/limit=(?:200|300)&active/.test(sync));
test("le client ne demande plus les payloads bruts",
  !marketData.includes('select: "*,mk_outcomes(*)"') &&
  marketData.includes("raw_payload->>createdAt") &&
  !/issue\.raw_payload/.test(marketData));
test("le cache hors ligne se replie quand le quota est atteint",
  marketData.includes("tentatives") && marketData.includes("marches.slice(0, 400)"));
test("le catalogue est lu page par page, trié sur la clé primaire",
  marketData.includes('order: "id.asc"') && marketData.includes("PAGES_SIMULTANEES") &&
  !marketData.includes('limit: "1000"'));
test("l'accueil ne reste pas vide sans thème suivi",
  accueil.includes("!themesSuivis.length || themesSuivis.includes(m.theme)") &&
  accueil.includes("Derniers marchés ouverts"));
test("aucune instrumentation de mise au point ne subsiste", !index.includes("__jrn"));

const jsFiles = [
  "pwa/js/app.js", "pwa/js/etat.js", "pwa/js/router.js", "pwa/js/ui.js",
  "pwa/js/api/normalize.js", "pwa/js/api/market-data.js", "pwa/js/api/market-detail.js", "pwa/js/api/supabase.js",
  ...readdirSync(pagesDir).filter((name) => name.endsWith(".js")).map((name) => `pwa/js/pages/${name}`),
  "pwa/js/integration/eclats-adapter.js", "pwa/js/integration/eclats-wallet.js",
  "pwa/js/integration/export-snapshot.js", "pwa/js/version.js"
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
