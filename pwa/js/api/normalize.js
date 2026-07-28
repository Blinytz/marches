// Normalisation pure des catalogues publics Polymarket et Manifold.
// Aucun de ces adaptateurs ne place d'ordre sur les plateformes sources.

const nombre = (valeur, defaut = 0) => {
  const n = Number(valeur);
  return Number.isFinite(n) ? n : defaut;
};

function tableau(valeur) {
  if (Array.isArray(valeur)) return valeur;
  if (typeof valeur !== "string") return [];
  try {
    const resultat = JSON.parse(valeur);
    return Array.isArray(resultat) ? resultat : [];
  } catch {
    return [];
  }
}

const identifiant = (valeur) => String(valeur ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function themeDepuis(...valeurs) {
  const texte = valeurs.flat().filter(Boolean).join(" ").toLowerCase();
  const regles = [
    ["Sport", /sport|football|soccer|nba|nfl|mlb|nhl|tennis|world cup|league/],
    ["Politique", /politic|election|president|congress|government|minister|trump|senate|parliament/],
    ["Économie", /econom|inflation|fed|interest rate|gdp|recession|jobs|unemployment/],
    ["Finance", /bitcoin|crypto|ethereum|stock|market cap|price|dollar|euro|finance/],
    ["Intelligence artificielle", /\bai\b|artificial intelligence|openai|anthropic|model/],
    ["Climat et environnement", /climate|weather|temperature|warming|hurricane|environment/],
    ["Espace", /space|spacex|starship|mars|moon|nasa/],
    ["Cinéma", /movie|film|cinema|oscar|box office/],
    ["Technologie", /technology|tech|software|apple|google|microsoft/]
  ];
  return regles.find(([, motif]) => motif.test(texte))?.[0] || "Actualité";
}

function regionsDepuis(...valeurs) {
  const texte = valeurs.flat().filter(Boolean).join(" ").toLowerCase();
  if (/france|french|paris|macron/.test(texte)) return ["France"];
  if (/europe|eu\b|european|uk\b|britain|germany|italy|spain/.test(texte)) return ["Europe"];
  return ["Monde"];
}

function statut({ ferme, resolu, annule }) {
  if (annule) return "CANCELLED";
  if (resolu) return "RESOLVED";
  if (ferme) return "CLOSED";
  return "OPEN";
}

function issueBinaire(probabilite, variation24h, prefixe = "") {
  const p = Number.isFinite(probabilite) ? Math.min(1, Math.max(0, probabilite)) : null;
  const avant = p == null || !Number.isFinite(variation24h)
    ? null
    : Math.min(1, Math.max(0, p - variation24h));
  return [
    { id: `${prefixe}oui`, label: "OUI", prob: p, prev24h: avant, history: [] },
    { id: `${prefixe}non`, label: "NON", prob: p == null ? null : 1 - p, prev24h: avant == null ? null : 1 - avant, history: [] }
  ];
}

function normaliserMarchePolymarket(marche) {
  const libelles = tableau(marche.outcomes);
  const prix = tableau(marche.outcomePrices);
  const tokens = tableau(marche.clobTokenIds);
  return libelles.map((label, index) => ({
    id: String(label).toUpperCase() === "YES" ? "oui" : String(label).toUpperCase() === "NO" ? "non" : identifiant(label) || `issue-${index + 1}`,
    label: String(label).toUpperCase() === "YES" ? "OUI" : String(label).toUpperCase() === "NO" ? "NON" : String(label),
    prob: Number.isFinite(Number(prix[index])) ? Number(prix[index]) : null,
    prev24h: index === 0 && Number.isFinite(Number(marche.oneDayPriceChange))
      ? Number(prix[index]) - Number(marche.oneDayPriceChange)
      : null,
    history: [],
    tokenId: tokens[index] ? String(tokens[index]) : null
  }));
}

export function normaliserEvenementPolymarket(evenement, maintenant = Date.now()) {
  const marches = (evenement.markets || []).filter((m) => m && !m.archived);
  if (!marches.length) return null;
  const ouvert = marches.some((m) => m.active && !m.closed);
  const multi = marches.length > 1;
  let issues;
  if (multi) {
    issues = marches.map((m, index) => {
      const issuesMarche = normaliserMarchePolymarket(m);
      const oui = issuesMarche.find((i) => i.id === "oui") || issuesMarche[0];
      return {
        ...oui,
        id: `pm-${m.id || index + 1}`,
        label: m.groupItemTitle || m.question || `Issue ${index + 1}`,
        marketId: String(m.id || ""),
        conditionId: m.conditionId || null
      };
    }).filter((i) => i.prob != null);
  } else {
    issues = normaliserMarchePolymarket(marches[0]);
  }
  if (!issues.length) return null;
  const principal = marches[0];
  const ferme = !ouvert || Boolean(evenement.closed);
  const resolu = ferme && marches.every((m) => m.closed && tableau(m.outcomePrices).some((p) => Number(p) === 1));
  const tags = (evenement.tags || []).map((t) => t.label || t.name).filter(Boolean);
  const titre = evenement.title || principal.question;
  const description = evenement.description || principal.description || "";
  const etat = statut({ ferme, resolu, annule: false });
  const sourceDate = Date.parse(evenement.updatedAt || principal.updatedAt || evenement.creationDate || "");

  return {
    id: `pm-${evenement.id || principal.id}`,
    source: "POLYMARKET",
    externalId: String(evenement.id || principal.id),
    sourceUrl: `https://polymarket.com/event/${evenement.slug || principal.slug || evenement.id}`,
    titleOriginal: titre,
    marketType: multi ? "MULTIPLE" : "BINARY",
    status: etat,
    tradable: etat === "OPEN" && issues.every((i) => i.prob != null) && marches.some((m) => m.enableOrderBook !== false),
    nonTradableReason: etat === "OPEN" ? "Prix ou carnet public indisponible." : "Marché fermé sur Polymarket.",
    theme: themeDepuis(evenement.category, tags, titre),
    regions: regionsDepuis(tags, titre, description),
    imageUrl: evenement.image || evenement.icon || principal.image || principal.icon || null,
    closeAt: evenement.endDate || principal.endDate || null,
    expectedResolutionAt: evenement.endDate || principal.endDate || null,
    resolutionTimeConfidence: "EXPECTED",
    volume: nombre(evenement.volume, marches.reduce((s, m) => s + nombre(m.volume), 0)),
    volume24h: nombre(evenement.volume24hr, marches.reduce((s, m) => s + nombre(m.volume24hr), 0)),
    liquidity: nombre(evenement.liquidity, marches.reduce((s, m) => s + nombre(m.liquidity), 0)),
    bettorCount: null,
    resolutionSource: evenement.resolutionSource || principal.resolutionSource || "Règles publiées par Polymarket",
    descriptionOriginal: description,
    fraicheurS: Number.isFinite(sourceDate) ? Math.max(0, Math.round((maintenant - sourceDate) / 1000)) : 0,
    spread: nombre(principal.spread, 0.02),
    issues,
    polymarketMarkets: marches.map((m) => ({
      id: String(m.id || ""),
      conditionId: m.conditionId || null,
      tokenIds: tableau(m.clobTokenIds).map(String)
    }))
  };
}

export function normaliserCataloguePolymarket(evenements, maintenant = Date.now()) {
  return (Array.isArray(evenements) ? evenements : [])
    .map((e) => normaliserEvenementPolymarket(e, maintenant))
    .filter(Boolean);
}

export function normaliserMarcheManifold(marche, maintenant = Date.now()) {
  if (!marche?.id || !marche.question) return null;
  const ferme = Boolean(marche.isResolved) || (marche.closeTime && marche.closeTime <= maintenant);
  const annule = marche.isResolved && ["CANCEL", "MKT"].includes(marche.resolution);
  const etat = statut({ ferme, resolu: Boolean(marche.isResolved) && !annule, annule });
  const type = marche.outcomeType || "OTHER";
  let issues;
  if (type === "BINARY") {
    issues = issueBinaire(nombre(marche.probability, NaN), nombre(marche.probChangeDay, NaN));
  } else if (type === "MULTIPLE_CHOICE" && Array.isArray(marche.answers)) {
    issues = marche.answers.filter((a) => !a.isOther).map((a, index) => ({
      id: String(a.id || `reponse-${index + 1}`),
      label: a.text || a.answer || `Réponse ${index + 1}`,
      prob: Number.isFinite(Number(a.probability)) ? Number(a.probability) : null,
      prev24h: null,
      history: []
    }));
  } else {
    issues = issueBinaire(nombre(marche.probability, NaN), nombre(marche.probChangeDay, NaN));
  }
  const tradableType = type === "BINARY" || type === "MULTIPLE_CHOICE";
  const titre = marche.question;
  const description = marche.textDescription || marche.description || "";
  return {
    id: `mf-${marche.id}`,
    source: "MANIFOLD",
    externalId: String(marche.id),
    sourceUrl: marche.url || `https://manifold.markets/${marche.creatorUsername || "market"}/${marche.slug || marche.id}`,
    titleOriginal: titre,
    marketType: type === "BINARY" ? "BINARY" : type === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : "OTHER",
    sousType: tradableType ? null : type,
    status: etat,
    tradable: etat === "OPEN" && tradableType && issues.some((i) => i.prob != null),
    nonTradableReason: tradableType ? (etat === "OPEN" ? "Probabilité publique indisponible." : "Marché fermé sur Manifold.") : `Format ${type} consultable, non pris en charge pour le trading.`,
    sommeEgale1: Boolean(marche.shouldAnswersSumToOne),
    theme: themeDepuis(marche.tags, titre, description),
    regions: regionsDepuis(marche.tags, titre, description),
    imageUrl: marche.coverImageUrl || marche.creatorAvatarUrl || null,
    closeAt: marche.closeTime ? new Date(marche.closeTime).toISOString() : null,
    expectedResolutionAt: marche.closeTime ? new Date(marche.closeTime).toISOString() : null,
    resolutionTimeConfidence: "EXPECTED",
    volume: nombre(marche.volume),
    volume24h: nombre(marche.volume24Hours),
    liquidity: nombre(marche.totalLiquidity),
    bettorCount: nombre(marche.uniqueBettorCount, null),
    createur: marche.creatorUsername || marche.creatorName || null,
    resolutionSource: marche.resolutionSource || "Résolution publiée par le créateur Manifold",
    descriptionOriginal: description,
    fraicheurS: marche.lastUpdatedTime ? Math.max(0, Math.round((maintenant - marche.lastUpdatedTime) / 1000)) : 0,
    spread: 0.02,
    prixMiroir: true,
    issues
  };
}

export function normaliserCatalogueManifold(marches, maintenant = Date.now()) {
  return (Array.isArray(marches) ? marches : [])
    .map((m) => normaliserMarcheManifold(m, maintenant))
    .filter(Boolean);
}
