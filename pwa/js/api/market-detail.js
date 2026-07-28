import { normaliserMarcheManifold } from "./normalize.js";

const CLOB = "https://clob.polymarket.com";
const MANIFOLD = "https://api.manifold.markets/v0";

async function lireJson(url, delaiMs = 10000) {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), delaiMs);
  try {
    const reponse = await fetch(url, {
      signal: controleur.signal,
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
    return await reponse.json();
  } finally {
    clearTimeout(minuterie);
  }
}

const lignesCarnet = (lignes) => (Array.isArray(lignes) ? lignes : [])
  .map((ligne) => [Number(ligne.price ?? ligne[0]), Number(ligne.size ?? ligne[1])])
  .filter(([prix, taille]) => Number.isFinite(prix) && Number.isFinite(taille));

function appliquerComplementBinaire(marche, issueModifiee) {
  if (marche.marketType !== "BINARY" || issueModifiee.prob == null) return;
  const autre = marche.issues.find((i) => i.id !== issueModifiee.id);
  if (autre) autre.prob = 1 - issueModifiee.prob;
}

export async function enrichirPolymarket(marche, issueId) {
  const issue = marche.issues.find((i) => i.id === issueId && i.tokenId)
    || marche.issues.find((i) => i.tokenId);
  if (!issue?.tokenId) throw new Error("Identifiant CLOB absent");
  const token = encodeURIComponent(issue.tokenId);
  const [carnetResultat, historiqueResultat, milieuResultat] = await Promise.allSettled([
    lireJson(`${CLOB}/book?token_id=${token}`),
    lireJson(`${CLOB}/prices-history?market=${token}&interval=max&fidelity=60`),
    lireJson(`${CLOB}/midpoint?token_id=${token}`)
  ]);

  if (carnetResultat.status === "fulfilled") {
    const brut = carnetResultat.value;
    const bids = lignesCarnet(brut.bids).sort((a, b) => b[0] - a[0]).slice(0, 12);
    const asks = lignesCarnet(brut.asks).sort((a, b) => a[0] - b[0]).slice(0, 12);
    marche.carnet = { bids, asks, tokenId: issue.tokenId };
    if (bids.length && asks.length) marche.spread = Math.max(0, asks[0][0] - bids[0][0]);
    marche.profondeurFaible = bids.length + asks.length < 4;
  }
  if (historiqueResultat.status === "fulfilled") {
    issue.history = (historiqueResultat.value.history || [])
      .map((point) => ({ t: Number(point.t) * 1000, p: Number(point.p) }))
      .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.p));
    if (issue.history.length) {
      const cible = Date.now() - 24 * 3600e3;
      issue.prev24h = issue.history.reduce((a, b) =>
        Math.abs(b.t - cible) < Math.abs(a.t - cible) ? b : a).p;
    }
  }
  if (milieuResultat.status === "fulfilled" && Number.isFinite(Number(milieuResultat.value.mid))) {
    issue.prob = Number(milieuResultat.value.mid);
    appliquerComplementBinaire(marche, issue);
  }
  marche.fraicheurS = 0;
  marche.detailEtat = "ok";
  return marche;
}

export async function enrichirManifold(marche) {
  const detail = await lireJson(`${MANIFOLD}/market/${encodeURIComponent(marche.externalId)}`);
  const normalise = normaliserMarcheManifold(detail);
  if (!normalise) throw new Error("Réponse Manifold invalide");
  const historiques = new Map(marche.issues.map((i) => [i.id, i.history]));
  Object.assign(marche, normalise);
  marche.issues.forEach((issue) => { issue.history = historiques.get(issue.id) || issue.history || []; });
  marche.detailEtat = "ok";
  marche.fraicheurS = 0;
  return marche;
}

export async function enrichirMarche(marche, issueId) {
  marche.detailEtat = "chargement";
  try {
    return marche.source === "POLYMARKET"
      ? await enrichirPolymarket(marche, issueId)
      : await enrichirManifold(marche);
  } catch (erreur) {
    marche.detailEtat = "erreur";
    marche.detailErreur = erreur?.message || "Détail indisponible";
    throw erreur;
  }
}

let socketActif = null;
let marcheSuivi = null;
let minuterieReconnexion = null;

function fermerSuivi() {
  clearTimeout(minuterieReconnexion);
  minuterieReconnexion = null;
  const socket = socketActif;
  socketActif = null;
  marcheSuivi = null;
  if (socket && socket.readyState < 2) socket.close();
}

function prixDepuisMessage(message) {
  const valeur = message.price ?? message.mid ?? message.best_bid ?? message.last_trade_price;
  const prix = Number(valeur);
  return Number.isFinite(prix) ? prix : null;
}

function appliquerMessagePolymarket(marche, message) {
  const messages = Array.isArray(message) ? message : [message];
  let change = false;
  for (const evenement of messages) {
    if (evenement?.bids || evenement?.asks) {
      const issue = marche.issues.find((i) => i.tokenId === String(evenement.asset_id));
      if (issue) {
        const bids = lignesCarnet(evenement.bids).sort((a, b) => b[0] - a[0]).slice(0, 12);
        const asks = lignesCarnet(evenement.asks).sort((a, b) => a[0] - b[0]).slice(0, 12);
        marche.carnet = { bids, asks, tokenId: issue.tokenId };
        if (bids.length && asks.length) {
          issue.prob = (bids[0][0] + asks[0][0]) / 2;
          marche.spread = asks[0][0] - bids[0][0];
          appliquerComplementBinaire(marche, issue);
        }
        change = true;
      }
    }
    const changements = evenement?.price_changes || [evenement];
    for (const changement of changements) {
      const issue = marche.issues.find((i) => i.tokenId === String(changement?.asset_id));
      const prix = prixDepuisMessage(changement || {});
      if (issue && prix != null) {
        issue.prob = prix;
        appliquerComplementBinaire(marche, issue);
        change = true;
      }
    }
  }
  return change;
}

function trouverContratManifold(message) {
  const candidats = [message?.data, message?.contract, message?.data?.contract, message];
  return candidats.find((x) => x && typeof x === "object" && x.id && Number.isFinite(Number(x.probability)));
}

export function suivreTempsReel(marche, surMiseAJour) {
  if (!marche || marche.status !== "OPEN") {
    fermerSuivi();
    return;
  }
  if (marcheSuivi === marche.id && socketActif) return;
  fermerSuivi();
  marcheSuivi = marche.id;
  const identifiant = marche.id;
  const url = marche.source === "POLYMARKET"
    ? "wss://ws-subscriptions-clob.polymarket.com/ws/market"
    : "wss://api.manifold.markets/ws";

  const connecter = () => {
    if (marcheSuivi !== identifiant) return;
    const socket = new WebSocket(url);
    socketActif = socket;
    socket.onopen = () => {
      if (marche.source === "POLYMARKET") {
        const tokens = marche.issues.map((i) => i.tokenId).filter(Boolean);
        if (tokens.length) socket.send(JSON.stringify({ assets_ids: tokens, type: "market" }));
      } else {
        socket.send(JSON.stringify({
          type: "subscribe",
          txid: Date.now(),
          topics: [`contract/${marche.externalId}`]
        }));
      }
    };
    socket.onmessage = (evenement) => {
      try {
        const message = JSON.parse(evenement.data);
        let change = false;
        if (marche.source === "POLYMARKET") {
          change = appliquerMessagePolymarket(marche, message);
        } else {
          const contrat = trouverContratManifold(message);
          if (contrat?.id === marche.externalId) {
            const oui = marche.issues.find((i) => i.id === "oui");
            if (oui) {
              oui.prob = Number(contrat.probability);
              appliquerComplementBinaire(marche, oui);
              change = true;
            }
          }
        }
        if (change) {
          marche.fraicheurS = 0;
          surMiseAJour?.();
        }
      } catch {
        // Les messages de contrôle non JSON utile sont ignorés.
      }
    };
    socket.onclose = () => {
      if (socketActif === socket) socketActif = null;
      if (marcheSuivi === identifiant) minuterieReconnexion = setTimeout(connecter, 3000);
    };
  };
  connecter();
}
