// Bootstrap du prototype Éclats Marchés (Phase A).
import { etat, surChangement, notifier, basculerFavori, notificationsNonVues, marquerNotifLue, marquerToutLu, marquerToutesVues, recupererClaim, reglerDemo, basculerTheme, totalARecuperer, marche } from "./etat.js";
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

const contenu = document.getElementById("contenu");
const rendre = demarrerRouteur(contenu, (r) => {
  majNavigation(r);
  if (r.page === "marche") accrocherTicket(rendre);
  // Consulter le centre de notifications éteint le badge de la cloche.
  if (r.page === "notifications") marquerToutesVues();
});

// ---------- En-tête, badges, bandeaux ----------

function majEntete() {
  document.getElementById("solde-valeur").textContent = `◇ ${fmt(etat.solde)}`;
  const claims = totalARecuperer();
  const elClaims = document.getElementById("solde-claims");
  elClaims.hidden = claims <= 0;
  if (claims > 0) elClaims.textContent = `+ ${fmt(claims)} à récupérer`;

  const nonVues = notificationsNonVues().length;
  const badgeN = document.getElementById("badge-notifs");
  badgeN.hidden = nonVues === 0;
  badgeN.textContent = nonVues;

  const badgeE = document.getElementById("badge-enjeu");
  badgeE.hidden = etat.positions.length === 0;
  badgeE.textContent = etat.positions.length;

  document.getElementById("badge-resultats").hidden = claims <= 0;

  const tr = document.getElementById("indicateur-tr");
  if (etat.sources.websocket.etat === "connecte") {
    tr.classList.remove("off");
    tr.innerHTML = `⚡ <span>En direct</span>`;
  } else {
    tr.classList.add("off");
    tr.innerHTML = `⚠ <span>Reconnexion…</span>`;
  }

  const bandeaux = [];
  if (etat.sources.websocket.etat !== "connecte") {
    bandeaux.push(`<div class="bandeau bandeau-ws">⚠ Connexion temps réel interrompue depuis ${etat.sources.websocket.depuisS} s :
      reconnexion automatique en cours, les prix affichés datent de la dernière synchronisation.</div>`);
  }
  if (etat.sources.polymarket.etat !== "ok") bandeaux.push(`<div class="bandeau bandeau-panne">📡 ${etat.sources.polymarket.libelle} · les marchés Polymarket déjà connus restent consultables en lecture seule.</div>`);
  if (etat.sources.manifold.etat !== "ok") bandeaux.push(`<div class="bandeau bandeau-panne">📡 ${etat.sources.manifold.libelle} · les marchés Manifold déjà connus restent consultables en lecture seule.</div>`);
  document.getElementById("bandeaux").innerHTML = bandeaux.join("");
}

function majNavigation(r) {
  const q = r.query || {};
  document.querySelectorAll("#nav-sections a").forEach((a) => a.classList.remove("actif"));
  const actifDesktop =
    r.page === "accueil" ? "accueil"
    : r.page === "enjeu" ? "enjeu"
    : r.page === "favoris" ? "favoris"
    : r.page === "recherche" && q.horizon === "24" ? "24h"
    : r.page === "recherche" && q.vue === "themes" ? "themes"
    : r.page === "recherche" && q.tri === "volume" ? "populaires"
    : r.page === "recherche" && q.tri === "nouveau" ? "nouveaux"
    : r.page === "recherche" && (q.region || "").startsWith("France") ? "fr-eu"
    : null;
  if (actifDesktop) document.querySelector(`#nav-sections a[data-section="${actifDesktop}"]`)?.classList.add("actif");

  document.querySelectorAll("#nav-mobile a").forEach((a) => a.classList.remove("actif"));
  const actifMobile = ["portefeuille", "resultats", "recherche"].includes(r.page) ? r.page : "marches";
  document.querySelector(`#nav-mobile a[data-mnav="${actifMobile}"]`)?.classList.add("actif");
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
  for (let i = 0; i < 6; i++) {
    const p = document.createElement("span");
    p.className = "particule";
    p.textContent = "◇";
    p.style.left = `${dep.left + dep.width / 2 + (i - 3) * 8}px`;
    p.style.top = `${dep.top}px`;
    document.body.appendChild(p);
    requestAnimationFrame(() => {
      setTimeout(() => {
        p.style.transform = `translate(${arr.left - dep.left - (i - 3) * 8 + arr.width / 2}px, ${arr.top - dep.top}px) scale(0.5)`;
        p.style.opacity = "0";
      }, i * 45);
    });
    setTimeout(() => p.remove(), 900 + i * 45);
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
    act.textContent = "✓ Filtre enregistré dans Ma liste";
    etat.prefs.filtresEnregistres.push({ id: "f" + Date.now(), nom: "Filtre du " + new Date().toLocaleDateString("fr-FR"), criteres: "Critères actuels de la recherche" });
    notifier();
  }
  if (a === "notif-test") {
    act.textContent = "✓ Notification de test envoyée au centre interne";
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
  accrocherTicket(() => { feuille.innerHTML = htmlTicketCourant(); });
}
voile.addEventListener("click", () => { feuille.hidden = true; voile.hidden = true; });

// ---------- Barre démo ----------

const barreDemo = document.getElementById("barre-demo");
document.getElementById("demo-toggle").addEventListener("click", () => barreDemo.classList.toggle("ouverte"));
barreDemo.addEventListener("change", (e) => {
  const c = e.target.closest("[data-demo]");
  if (c) { reglerDemo(c.dataset.demo, c.checked); rendre(); }
});
document.getElementById("demo-reset").addEventListener("click", () => {
  barreDemo.querySelectorAll("[data-demo]").forEach((c) => { c.checked = false; reglerDemo(c.dataset.demo, false); });
  rendre();
});

// ---------- Comptes à rebours vivants ----------

setInterval(() => {
  document.querySelectorAll("[data-rebours]").forEach((el) => {
    if (el.dataset.rebours) el.textContent = compteReboursCourt(el.dataset.rebours);
  });
}, 1000);

// ---------- Service worker (PWA installable) ----------

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

majEntete();
rendre();
