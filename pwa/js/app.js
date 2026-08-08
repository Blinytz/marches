// Bootstrap de Marchés.
import { etat, surChangement, notifier, basculerFavori, notificationsNonVues, marquerNotifLue, marquerToutLu, marquerToutesVues, recupererClaim, basculerTheme, totalARecuperer, marche, chargerDonneesReelles, chargerDetailMarche, chargerCompteReel } from "./etat.js";
import { connexion, deconnexion } from "./api/supabase.js";
import { suivreTempsReel } from "./api/market-detail.js";
import { enregistrer, demarrerRouteur, routeCourante } from "./router.js";
import { fmt, fmtEclats, compteReboursCourt } from "./ui.js";
import { pageAccueil } from "./pages/accueil.js";
import { pageRecherche } from "./pages/recherche.js";
import { pageFiche, accrocherTicket, ticketPourFeuille, htmlTicketCourant } from "./pages/fiche.js";
import { pageEnjeu } from "./pages/enjeu.js";
import { pagePortefeuille } from "./pages/portefeuille.js";
import { pageResultats } from "./pages/resultats.js";
import { pageFavoris } from "./pages/favoris.js";
import { pageParametres } from "./pages/parametres.js";
import { pageNotifications } from "./pages/notifications.js";
import { pageStats } from "./pages/stats.js";
import { pageSucces } from "./pages/succes.js";
import { telechargerExportEclatsMarches } from "./integration/export-snapshot.js";

// Architecture en 3 piliers. La sous-navigation dépend du pilier actif.
const SOUS_NAV = {
  marches: [
    { lib: "Pour moi", href: "#/accueil", actif: (r) => r.page === "accueil" },
    { lib: "Tous les marchés", href: "#/recherche",
      actif: (r) => r.page === "recherche" && !r.query.horizon && !r.query.vue
        && r.query.tri !== "volume" && !(r.query.region || "").startsWith("France") },
    { lib: "Populaires", href: "#/recherche?tri=volume", actif: (r) => r.page === "recherche" && r.query.tri === "volume" },
    { lib: "24 h", href: "#/recherche?horizon=24", actif: (r) => r.page === "recherche" && r.query.horizon === "24" },
    { lib: "France & Europe", href: "#/recherche?region=France%20%26%20Europe", actif: (r) => r.page === "recherche" && (r.query.region || "").startsWith("France") },
    { lib: "Thèmes", href: "#/recherche?vue=themes", actif: (r) => r.page === "recherche" && r.query.vue === "themes" },
    { lib: "Favoris", href: "#/favoris", actif: (r) => r.page === "favoris" }
  ],
  positions: [],
  portefeuille: [],
  resultats: [
    { lib: "Résultats", href: "#/resultats", actif: (r) => r.page === "resultats" },
    { lib: "Succès", href: "#/succes", actif: (r) => r.page === "succes" }
  ],
  stats: [
    { lib: "Vue d'ensemble", href: "#/stats", actif: (r) => r.page === "stats" && !r.query.vue },
    { lib: "Précision", href: "#/stats?vue=precision", actif: (r) => r.page === "stats" && r.query.vue === "precision" },
    { lib: "Rentabilité", href: "#/stats?vue=rentabilite", actif: (r) => r.page === "stats" && r.query.vue === "rentabilite" },
    { lib: "Comportement", href: "#/stats?vue=comportement", actif: (r) => r.page === "stats" && r.query.vue === "comportement" },
    { lib: "Records", href: "#/stats?vue=records", actif: (r) => r.page === "stats" && r.query.vue === "records" }
  ]
};

function sectionPrimaire(page) {
  if (page === "enjeu") return "positions";
  if (page === "portefeuille") return "portefeuille";
  if (page === "resultats" || page === "succes") return "resultats";
  if (page === "stats") return "stats";
  return "marches";
}

document.documentElement.dataset.theme = etat.theme;

enregistrer("accueil", pageAccueil);
enregistrer("recherche", pageRecherche);
enregistrer("marche", pageFiche);
enregistrer("enjeu", pageEnjeu);
enregistrer("portefeuille", pagePortefeuille);
enregistrer("resultats", pageResultats);
enregistrer("favoris", pageFavoris);
enregistrer("parametres", pageParametres);
enregistrer("notifications", pageNotifications);
enregistrer("stats", pageStats);
enregistrer("succes", pageSucces);

const contenu = document.getElementById("contenu");
function rendreTicketIntegre() {
  const zone = document.getElementById("zone-ticket");
  if (!zone) return;
  zone.innerHTML = htmlTicketCourant();
  accrocherTicket(rendreTicketIntegre, zone);
}
const rendre = demarrerRouteur(contenu, (r) => {
  majNavigation(r);
  if (r.page === "marche") {
    accrocherTicket(rendreTicketIntegre);
    const cible = marche(r.params[0]);
    chargerDetailMarche(r.params[0], r.query.issue).then((charge) => { if (charge) rendre(); });
    suivreTempsReel(cible, () => rendre());
  } else {
    suivreTempsReel(null);
  }
  // Consulter le centre de notifications éteint le badge de la cloche.
  if (r.page === "notifications") marquerToutesVues();
});

// Passe à vrai quand une nouvelle version a été déployée pendant que l'app
// était ouverte : voir la section « Détection des déploiements » plus bas.
let majDisponible = false;

// ---------- En-tête, badges, bandeaux ----------

function majEntete() {
  document.getElementById("solde-valeur").textContent = etat.chargementCompte
    ? "◇ …"
    : etat.compteConnecte && etat.solde != null ? `◇ ${fmt(etat.solde)}` : "◇ Connexion";
  const boutonSession = document.getElementById("bouton-session");
  boutonSession.textContent = etat.compteConnecte ? "Déconnexion" : "Connexion";
  boutonSession.dataset.action = etat.compteConnecte ? "deconnexion" : "ouvrir-connexion";
  const claims = totalARecuperer();
  const elClaims = document.getElementById("solde-claims");
  elClaims.hidden = claims <= 0;
  if (claims > 0) elClaims.textContent = `+ ${fmt(claims)} à récupérer`;

  const nonVues = notificationsNonVues();
  const badgeN = document.getElementById("badge-notifs");
  badgeN.hidden = nonVues === 0;
  badgeN.textContent = nonVues;

  // Positions : simple compteur informatif (combien de paris sont en cours).
  document.querySelectorAll('[data-badge^="positions"]').forEach((el) => {
    el.hidden = etat.positions.length === 0;
    el.textContent = etat.positions.length;
  });
  // Résultats : point doré uniquement quand des Éclats attendent d'être récupérés.
  document.querySelectorAll('[data-badge^="resultats"]').forEach((el) => { el.hidden = claims <= 0; });

  const tr = document.getElementById("indicateur-tr");
  if (etat.chargementCatalogue) {
    tr.classList.add("off");
    tr.innerHTML = `<span>Chargement des marchés…</span>`;
  } else if (etat.modeDonnees === "supabase" || etat.modeDonnees === "reseau") {
    tr.classList.remove("off");
    tr.innerHTML = `● <span>Données réelles</span>`;
  } else if (etat.modeDonnees === "cache") {
    tr.classList.add("off");
    tr.innerHTML = `◷ <span>Cache hors ligne</span>`;
  } else {
    tr.classList.add("off");
    tr.innerHTML = `⚠ <span>Données indisponibles</span>`;
  }

  const bandeaux = [];
  if (majDisponible) {
    bandeaux.push(`<div class="bandeau bandeau-maj">✨ Nouvelle version disponible.
      <button class="btn btn-discret" data-action="recharger-app">Actualiser</button></div>`);
  }
  if (etat.modeDonnees === "cache") {
    bandeaux.push(`<div class="bandeau bandeau-ws">⚠ Les API sont injoignables. Le dernier catalogue réel enregistré est affiché.</div>`);
  } else if (etat.modeDonnees === "aucune") {
    bandeaux.push(`<div class="bandeau bandeau-ws">⚠ Aucun catalogue réel n’est disponible pour le moment.</div>`);
  }
  if (etat.erreurCompte) bandeaux.push(`<div class="bandeau bandeau-panne">Portefeuille Éclats indisponible : ${etat.erreurCompte}</div>`);
  if (etat.sources.polymarket.etat !== "ok") bandeaux.push(`<div class="bandeau bandeau-panne">📡 ${etat.sources.polymarket.libelle} · les marchés Polymarket déjà connus restent consultables en lecture seule.</div>`);
  if (etat.sources.manifold.etat !== "ok") bandeaux.push(`<div class="bandeau bandeau-panne">📡 ${etat.sources.manifold.libelle} · les marchés Manifold déjà connus restent consultables en lecture seule.</div>`);
  document.getElementById("bandeaux").innerHTML = bandeaux.join("");
}

function majNavigation(r) {
  const pilier = sectionPrimaire(r.page);
  document.querySelectorAll("[data-primaire]").forEach((a) => a.classList.toggle("actif", a.dataset.primaire === pilier));

  const sousNav = document.getElementById("sous-nav");
  const items = SOUS_NAV[pilier] || [];
  sousNav.innerHTML = items.map((it) =>
    `<a href="${it.href}" class="${it.actif(r) ? "actif" : ""}">${it.lib}</a>`).join("");
}

surChangement(majEntete);

// ---------- Animation de récupération d'un claim ----------

function animerTransfertClaim(depuisEl, montant) {
  const solde = document.getElementById("solde-valeur");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !depuisEl) {
    solde.classList.add("solde-flash");
    setTimeout(() => solde.classList.remove("solde-flash"), 800);
    return;
  }
  const dep = depuisEl.getBoundingClientRect();
  const arr = solde.getBoundingClientRect();
  const formes = ["✦", "◆", "●", "✧", "★"];
  const couleurs = ["#F5A518", "#6B4EF6", "#FF5FA2", "#10B981", "#FFC948"];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement("span");
    p.className = "particule";
    p.textContent = formes[i % formes.length];
    p.style.color = couleurs[i % couleurs.length];
    p.style.fontSize = `${0.7 + Math.random() * 0.7}rem`;
    const jitterX = (Math.random() - 0.5) * dep.width;
    p.style.left = `${dep.left + dep.width / 2 + jitterX}px`;
    p.style.top = `${dep.top + dep.height / 2}px`;
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      setTimeout(() => {
        // La moitié converge vers le solde, l'autre gicle façon confettis.
        if (i % 2 === 0) {
          p.style.transform = `translate(${arr.left - dep.left - jitterX + arr.width / 2}px, ${arr.top - dep.top}px) scale(0.4) rotate(${Math.random() * 360}deg)`;
        } else {
          p.style.transform = `translate(${(Math.random() - 0.5) * 220}px, ${60 + Math.random() * 120}px) rotate(${Math.random() * 540}deg)`;
        }
        p.style.opacity = "0";
      }, i * 28);
    });
    setTimeout(() => p.remove(), 1000 + i * 28);
  }
  // Compteur : de l'ancien au nouveau solde
  const cible = etat.solde;
  const depart = cible - montant;
  const t0 = performance.now();
  const duree = 650;
  function tick(t) {
    const x = Math.min(1, (t - t0) / duree);
    solde.textContent = `◇ ${fmt(depart + (cible - depart) * (1 - Math.pow(1 - x, 3)))}`;
    if (x < 1) requestAnimationFrame(tick);
  }
  setTimeout(() => {
    solde.classList.add("solde-flash");
    requestAnimationFrame(tick);
    setTimeout(() => solde.classList.remove("solde-flash"), 900);
  }, 500);
}

// ---------- Délégation d'événements globale ----------

document.body.addEventListener("click", async (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) { e.preventDefault(); basculerFavori(fav.dataset.fav); rendre(); return; }

  const act = e.target.closest("[data-action]");
  if (!act) return;
  const a = act.dataset.action;

  if (a === "recharger-app") {
    e.preventDefault();
    rechargerApp();
  }
  if (a === "ticket") {
    e.preventDefault();
    location.hash = `#/marche/${act.dataset.marche}?issue=${act.dataset.issue}&t=1`;
  }
  if (a === "ticket-mobile") {
    e.preventDefault();
    ouvrirFeuille(ticketPourFeuille(act.dataset.marche, act.dataset.issue));
  }
  if (a === "recuperer") {
    e.preventDefault();
    const bouton = act;
    const carte = bouton.closest("[data-claim-carte]");
    bouton.disabled = true;
    bouton.textContent = "Récupération…";
    try {
      const res = await recupererClaim(bouton.dataset.claim);
      carte?.classList.add("joue");
      animerTransfertClaim(bouton, res.montant);
      setTimeout(() => rendre(), 750);
    } catch {
      rendre(); // état relu : le bouton reflète la réalité (jamais deviné)
    }
  }
  if (a === "deplier-pos") {
    e.preventDefault();
    const r = routeCourante();
    const dejaOuvert = r.query.detail === act.dataset.pos;
    const q = new URLSearchParams({ ...r.query });
    if (dejaOuvert) q.delete("detail"); else q.set("detail", act.dataset.pos);
    location.hash = `#/enjeu?${q.toString()}`;
  }
  if (a === "basculer-theme") { basculerTheme(); rendre(); }
  if (a === "tout-lu") { marquerToutLu(); rendre(); }
  if (a === "lire-notif") { marquerNotifLue(act.dataset.notif); }
  if (a === "suivre-theme") {
    const t = act.dataset.theme;
    const i = etat.prefs.themesSuivis.indexOf(t);
    if (i >= 0) etat.prefs.themesSuivis.splice(i, 1); else etat.prefs.themesSuivis.push(t);
    notifier(); rendre();
  }
  if (a === "suivre-region") {
    const r = act.dataset.region;
    const i = etat.prefs.regionsSuivies.indexOf(r);
    if (i >= 0) etat.prefs.regionsSuivies.splice(i, 1); else etat.prefs.regionsSuivies.push(r);
    notifier(); rendre();
  }
  if (a === "demasquer") {
    e.preventDefault();
    etat.prefs.masques = etat.prefs.masques.filter((t) => t !== act.dataset.theme);
    notifier(); rendre();
  }
  if (a === "enregistrer-filtre") {
    // Capture les VRAIS critères de la recherche courante (query du hash) et
    // en fait un libellé lisible, pour pouvoir restaurer le filtre à l'identique.
    const requete = (location.hash.split("?")[1] || "");
    const params = new URLSearchParams(requete);
    const LIB = { q: "Recherche", source: "Source", theme: "Thème", region: "Région",
      horizon: "Horizon", tradable: "Tradable", favoris: "Favoris",
      position: "Avec position", tri: "Tri", statut: "Statut" };
    const morceaux = [...params.entries()]
      .filter(([, v]) => v && v !== "0")
      .map(([k, v]) => `${LIB[k] || k}: ${v === "1" ? "oui" : v}`);
    const criteres = morceaux.length ? morceaux.join(" · ") : "Tous les marchés";
    const nomDefaut = params.get("q") || params.get("theme") || params.get("region") || criteres;
    const nom = (prompt("Nom du filtre :", nomDefaut.slice(0, 40)) || "").trim();
    if (!nom) return;
    etat.prefs.filtresEnregistres.push({
      id: "f" + Date.now(), nom, criteres, requete: params.toString()
    });
    act.textContent = "✓ Filtre enregistré dans Ma liste";
    notifier();
  }
  if (a === "supprimer-filtre") {
    e.preventDefault();
    etat.prefs.filtresEnregistres = etat.prefs.filtresEnregistres.filter((f) => f.id !== act.dataset.id);
    notifier(); rendre();
  }
  if (a === "notif-test") {
    act.textContent = "✓ Notification de test envoyée au centre interne";
  }
  if (a === "exporter-donnees") {
    telechargerExportEclatsMarches(etat, { userId: etat.compteUtilisateur?.id || "non-connecte" });
    act.textContent = "✓ Export téléchargé";
  }
  if (a === "ouvrir-connexion") document.getElementById("dialogue-connexion").showModal();
  if (a === "fermer-connexion") document.getElementById("dialogue-connexion").close();
  if (a === "deconnexion") {
    deconnexion();
    await chargerCompteReel();
    rendre();
  }
});

// Recherche globale (entête) et recherche de page
document.getElementById("champ-recherche").addEventListener("keydown", (e) => {
  if (e.key === "Enter") location.hash = `#/recherche?q=${encodeURIComponent(e.target.value)}`;
});
document.body.addEventListener("keydown", (e) => {
  const el = e.target;
  if (el.id === "champ-recherche-page" && e.key === "Enter") {
    const r = routeCourante();
    const q = new URLSearchParams({ ...r.query, q: el.value });
    location.hash = `#/recherche?${q.toString()}`;
  }
  if (el.closest?.("[data-action=filtre-reglages]") && e.key === "Enter") {
    location.hash = `#/parametres?n=systeme&f=${encodeURIComponent(el.value)}`;
  }
});
window.addEventListener("keydown", (e) => {
  if ((e.key === "/" || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    e.preventDefault();
    document.getElementById("champ-recherche").focus();
  }
});

// ---------- Feuille basse mobile ----------

const voile = document.getElementById("voile");
const feuille = document.getElementById("feuille-basse");
function ouvrirFeuille(html) {
  feuille.innerHTML = html;
  feuille.hidden = false;
  voile.hidden = false;
  accrocherTicket(() => { feuille.innerHTML = htmlTicketCourant(); }, feuille);
}
voile.addEventListener("click", () => { feuille.hidden = true; voile.hidden = true; });

document.getElementById("formulaire-connexion").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erreur = document.getElementById("erreur-connexion");
  erreur.hidden = true;
  const donnees = new FormData(e.currentTarget);
  try {
    await connexion(donnees.get("email"), donnees.get("password"));
    await chargerCompteReel();
    document.getElementById("dialogue-connexion").close();
    e.currentTarget.reset();
    rendre();
  } catch (cause) {
    erreur.textContent = cause.message;
    erreur.hidden = false;
  }
});

// ---------- Comptes à rebours vivants ----------

setInterval(() => {
  document.querySelectorAll("[data-rebours]").forEach((el) => {
    if (el.dataset.rebours) el.textContent = compteReboursCourt(el.dataset.rebours);
  });
}, 1000);

// ---------- Service worker (PWA installable) ----------

let inscriptionSW = null;
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").then((reg) => { inscriptionSW = reg; }).catch(() => {});
}

// ---------- Détection des déploiements ----------
//
// Une PWA installée peut rester ouverte des jours : elle continue de faire
// tourner le code chargé au premier lancement, même après un déploiement.
// On note la version au démarrage puis on la recompare à chaque retour dans
// l'app ; si elle a changé, on recharge (ou on propose de le faire si une
// saisie est en cours, pour ne pas perdre un ordre en préparation).

let versionAuChargement = null;
let derniereVerification = 0;

async function lireVersionDeployee() {
  try {
    const reponse = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!reponse.ok) return null;
    const contenu = await reponse.json();
    return contenu?.version || null;
  } catch {
    return null; // hors ligne : rien à conclure
  }
}

function appAuRepos() {
  if (document.getElementById("dialogue-connexion")?.open) return false;
  if (!document.getElementById("feuille-basse")?.hidden) return false;
  // Un montant déjà saisi dans le ticket : on ne recharge pas dans le dos.
  return ![...document.querySelectorAll("#zone-ticket input, #feuille-basse input")]
    .some((champ) => String(champ.value || "").trim() !== "");
}

function rechargerApp() {
  caches.keys()
    .then((noms) => Promise.all(noms.map((nom) => caches.delete(nom))))
    .catch(() => {})
    .finally(() => location.reload());
}

async function verifierVersion() {
  if (Date.now() - derniereVerification < 10000) return; // anti-rafale, rien de plus
  derniereVerification = Date.now();
  inscriptionSW?.update?.().catch(() => {});
  const deployee = await lireVersionDeployee();
  if (!deployee) return;
  if (versionAuChargement === null) { versionAuChargement = deployee; return; }
  if (deployee === versionAuChargement || majDisponible) return;
  if (appAuRepos()) { rechargerApp(); return; }
  majDisponible = true;
  majEntete();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") verifierVersion();
});
window.addEventListener("focus", () => verifierVersion());
setInterval(() => { if (document.visibilityState === "visible") verifierVersion(); }, 15 * 60 * 1000);
lireVersionDeployee().then((v) => { versionAuChargement = v; });

majEntete();
rendre();
chargerDonneesReelles().then(() => rendre()).catch(() => rendre());
chargerCompteReel().then(() => rendre()).catch(() => rendre());
