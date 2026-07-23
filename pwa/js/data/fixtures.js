// Fixtures Phase A · Éclats Marchés
// Données 100 % fictives couvrant les scénarios exigés par la section 26 (Phase A) du hand-off.
// Cartographie scénario -> fixture : voir tests/fixtures/README.md
// Les dates sont calculées relativement au chargement pour que comptes à rebours et
// fraîcheurs restent vivants pendant la démo.

const H = 3600e3;
const maintenant = Date.now();
const dans = (heures) => new Date(maintenant + heures * H).toISOString();
const ilYA = (heures) => new Date(maintenant - heures * H).toISOString();

// Petite série de probabilités pseudo-aléatoire mais déterministe (seed simple)
function serie(depart, arrivee, n, seed, volMax = 0.035) {
  let x = seed;
  const pts = [];
  let p = depart;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const bruit = ((x / 233280) - 0.5) * volMax;
    const t = i / (n - 1);
    p = Math.min(0.985, Math.max(0.015, depart + (arrivee - depart) * t + bruit));
    pts.push({ t: maintenant - (n - 1 - i) * (H / 2), p: Math.round(p * 1000) / 1000 });
  }
  pts[n - 1].p = arrivee;
  return pts;
}

export const MARCHES = [
  // 1+9. Polymarket binaire, doublon apparent avec mf-fed-juillet, position ouverte favorable
  {
    id: "pm-fed-juillet", source: "POLYMARKET", externalId: "0xFED0721",
    sourceUrl: "https://polymarket.com/event/fed-decision-july",
    titleOriginal: "Will the Fed cut interest rates at the July 2026 meeting?",
    marketType: "BINARY", status: "OPEN", tradable: true,
    theme: "Économie", regions: ["Monde"],
    imageUrl: "img/fed.svg",
    closeAt: dans(129), expectedResolutionAt: dans(130), resolutionTimeConfidence: "EXACT",
    volume: 2140000, volume24h: 312000, liquidity: 341000, bettorCount: 12400,
    resolutionSource: "Federal Reserve press release (federalreserve.gov)",
    descriptionOriginal: "This market resolves YES if the FOMC announces a decrease in the target federal funds rate at its July 2026 meeting.",
    fraicheurS: 8, spread: 0.012,
    issues: [
      { id: "oui", label: "OUI", prob: 0.454, prev24h: 0.433, history: serie(0.31, 0.454, 96, 7) },
      { id: "non", label: "NON", prob: 0.546, prev24h: 0.567, history: serie(0.69, 0.546, 96, 8) }
    ],
    carnet: {
      bids: [[0.45, 5200], [0.44, 8100], [0.43, 12500]],
      asks: [[0.46, 4100], [0.47, 9300], [0.48, 15000]]
    }
  },
  // 9. Doublon Manifold de la même question : jamais fusionné
  {
    id: "mf-fed-juillet", source: "MANIFOLD", externalId: "mfFED26",
    sourceUrl: "https://manifold.markets/example/fed-cut-july-2026",
    titleOriginal: "Will the Fed cut rates in July 2026?",
    marketType: "BINARY", status: "OPEN", tradable: true,
    theme: "Économie", regions: ["Monde"],
    imageUrl: "img/fed.svg",
    closeAt: dans(128), expectedResolutionAt: dans(132), resolutionTimeConfidence: "EXPECTED",
    volume: 48200, volume24h: 3900, liquidity: 12000, bettorCount: 341,
    createur: "econ_watcher", resolutionSource: "Résolu par le créateur selon l'annonce du FOMC",
    descriptionOriginal: "Resolves YES if the FOMC lowers the federal funds target range at the July 2026 meeting.",
    fraicheurS: 21, spread: 0.02, prixMiroir: true,
    issues: [
      { id: "oui", label: "OUI", prob: 0.47, prev24h: 0.44, history: serie(0.35, 0.47, 96, 11) },
      { id: "non", label: "NON", prob: 0.53, prev24h: 0.56, history: serie(0.65, 0.53, 96, 12) }
    ]
  },
  // 7. Marché court : moins de 24 h, très mis en avant
  {
    id: "pm-shutdown-31", source: "POLYMARKET", externalId: "0xSHUT31",
    sourceUrl: "https://polymarket.com/event/us-government-shutdown",
    titleOriginal: "US government shutdown before August 1?",
    marketType: "BINARY", status: "OPEN", tradable: true,
    theme: "Politique", regions: ["Monde"],
    imageUrl: "img/capitole.svg",
    closeAt: dans(14), expectedResolutionAt: dans(15), resolutionTimeConfidence: "EXACT",
    volume: 5300000, volume24h: 1900000, liquidity: 620000, bettorCount: 31000,
    resolutionSource: "Official OMB / Congressional record",
    descriptionOriginal: "Resolves YES if federal appropriations lapse causing a shutdown before Aug 1, 2026, 00:00 ET.",
    fraicheurS: 3, spread: 0.008,
    issues: [
      { id: "oui", label: "OUI", prob: 0.12, prev24h: 0.104, history: serie(0.2, 0.12, 96, 21) },
      { id: "non", label: "NON", prob: 0.88, prev24h: 0.896, history: serie(0.8, 0.88, 96, 22) }
    ],
    carnet: { bids: [[0.118, 22000], [0.11, 40000]], asks: [[0.122, 18000], [0.13, 52000]] }
  },
  // 7bis. Manifold court, France, moins de 6 h
  {
    id: "mf-greve-sncf", source: "MANIFOLD", externalId: "mfSNCF",
    sourceUrl: "https://manifold.markets/example/sncf-strike-lifted",
    titleOriginal: "Will the SNCF strike be suspended before Wednesday?",
    marketType: "BINARY", status: "OPEN", tradable: true,
    theme: "Société", regions: ["France"],
    imageUrl: "img/train.svg",
    closeAt: dans(5.2), expectedResolutionAt: dans(9), resolutionTimeConfidence: "EXPECTED",
    volume: 8100, volume24h: 2600, liquidity: 2400, bettorCount: 84,
    createur: "paris_pronos", resolutionSource: "Communiqué officiel des syndicats ou de la SNCF",
    descriptionOriginal: "Resolves YES if the strike notice is officially suspended before Wednesday 6:00 CET.",
    fraicheurS: 14, spread: 0.02, prixMiroir: true,
    issues: [
      { id: "oui", label: "OUI", prob: 0.64, prev24h: 0.51, history: serie(0.4, 0.64, 48, 31) },
      { id: "non", label: "NON", prob: 0.36, prev24h: 0.49, history: serie(0.6, 0.36, 48, 32) }
    ]
  },
  // 2. Événement Polymarket avec plusieurs sous-marchés
  {
    id: "pm-presidentielle-2027", source: "POLYMARKET", externalId: "0xPRES27",
    sourceUrl: "https://polymarket.com/event/french-presidential-2027",
    titleOriginal: "Who will win the 2027 French presidential election?",
    marketType: "MULTIPLE", status: "OPEN", tradable: true,
    theme: "Politique", regions: ["France"],
    imageUrl: "img/elysee.svg",
    closeAt: dans(6200), expectedResolutionAt: dans(6300), resolutionTimeConfidence: "EXPECTED",
    volume: 41000000, volume24h: 830000, liquidity: 3900000, bettorCount: 88000,
    resolutionSource: "Official results proclaimed by the Conseil constitutionnel",
    descriptionOriginal: "Each sub-market resolves YES for the candidate officially elected President in 2027.",
    fraicheurS: 12, spread: 0.01,
    issues: [
      { id: "c1", label: "Candidate A", prob: 0.31, prev24h: 0.29, history: serie(0.22, 0.31, 96, 41) },
      { id: "c2", label: "Candidate B", prob: 0.24, prev24h: 0.25, history: serie(0.3, 0.24, 96, 42) },
      { id: "c3", label: "Candidate C", prob: 0.12, prev24h: 0.12, history: serie(0.1, 0.12, 96, 43) },
      { id: "c4", label: "Candidate D", prob: 0.09, prev24h: 0.1, history: serie(0.12, 0.09, 96, 44) },
      { id: "autres", label: "Another candidate", prob: 0.24, prev24h: 0.24, history: serie(0.26, 0.24, 96, 45) }
    ],
    carnet: { bids: [[0.305, 9000], [0.3, 15000]], asks: [[0.315, 7000], [0.32, 12000]] }
  },
  // 3. Manifold binaire, position défavorable dessus
  {
    id: "mf-psg-ligue1", source: "MANIFOLD", externalId: "mfPSG27",
    sourceUrl: "https://manifold.markets/example/psg-ligue1-2027",
    titleOriginal: "Will PSG win Ligue 1 in the 2026-2027 season?",
    marketType: "BINARY", status: "OPEN", tradable: true,
    theme: "Sport", regions: ["France"],
    imageUrl: "img/foot.svg",
    closeAt: dans(7300), expectedResolutionAt: dans(7350), resolutionTimeConfidence: "EXPECTED",
    volume: 15600, volume24h: 900, liquidity: 5200, bettorCount: 208,
    createur: "foot_stats", resolutionSource: "Classement final officiel de la LFP",
    descriptionOriginal: "Resolves YES if PSG finishes first in Ligue 1 at the end of the 2026-2027 season.",
    fraicheurS: 45, spread: 0.02, prixMiroir: true,
    issues: [
      { id: "oui", label: "OUI", prob: 0.82, prev24h: 0.79, history: serie(0.7, 0.82, 96, 51) },
      { id: "non", label: "NON", prob: 0.18, prev24h: 0.21, history: serie(0.3, 0.18, 96, 52) }
    ]
  },
  // 4. Manifold à choix multiples, somme = 100 %
  {
    id: "mf-studio-film-2026", source: "MANIFOLD", externalId: "mfFILM26",
    sourceUrl: "https://manifold.markets/example/best-reviewed-film-2026",
    titleOriginal: "Which studio releases the best reviewed film of 2026?",
    marketType: "MULTIPLE_CHOICE", status: "OPEN", tradable: true, sommeEgale1: true,
    theme: "Cinéma", regions: ["Monde"],
    imageUrl: "img/cinema.svg",
    closeAt: dans(3900), expectedResolutionAt: dans(3980), resolutionTimeConfidence: "EXPECTED",
    volume: 22100, volume24h: 1450, liquidity: 8100, bettorCount: 412,
    createur: "cine_fan", resolutionSource: "Metacritic top score, résolu par le créateur",
    descriptionOriginal: "Resolves to the studio of the 2026 wide-release film with the highest Metacritic score on Jan 15, 2027.",
    fraicheurS: 30, spread: 0.02, prixMiroir: true,
    issues: [
      { id: "ghibli", label: "Studio Ghibli", prob: 0.41, prev24h: 0.38, history: serie(0.3, 0.41, 96, 61) },
      { id: "a24", label: "A24", prob: 0.22, prev24h: 0.24, history: serie(0.25, 0.22, 96, 62) },
      { id: "pixar", label: "Pixar", prob: 0.15, prev24h: 0.15, history: serie(0.18, 0.15, 96, 63) },
      { id: "wb", label: "Warner Bros", prob: 0.12, prev24h: 0.13, history: serie(0.15, 0.12, 96, 64) },
      { id: "autre", label: "Another studio", prob: 0.1, prev24h: 0.1, history: serie(0.12, 0.1, 96, 65) }
    ]
  },
  // 5. Manifold à réponses indépendantes (la somme ne fait pas 100 %)
  {
    id: "mf-ia-jalons-2026", source: "MANIFOLD", externalId: "mfIA26",
    sourceUrl: "https://manifold.markets/example/ai-milestones-2026",
    titleOriginal: "AI milestones before end of 2026 (each answer resolves independently)",
    marketType: "MULTIPLE_CHOICE", status: "OPEN", tradable: true, sommeEgale1: false,
    theme: "Intelligence artificielle", regions: ["Monde"],
    imageUrl: "img/ia.svg",
    closeAt: dans(3800), expectedResolutionAt: dans(3900), resolutionTimeConfidence: "EXPECTED",
    volume: 31000, volume24h: 5200, liquidity: 9800, bettorCount: 720,
    createur: "ml_curious", resolutionSource: "Annonces publiques vérifiables, résolu réponse par réponse",
    descriptionOriginal: "Each answer resolves YES or NO independently. Probabilities do not sum to 100%.",
    fraicheurS: 9, spread: 0.02, prixMiroir: true,
    issues: [
      { id: "j1", label: "A model scores above 95% on ARC-AGI-3", prob: 0.34, prev24h: 0.31, history: serie(0.2, 0.34, 96, 71) },
      { id: "j2", label: "An AI system files a granted patent", prob: 0.18, prev24h: 0.18, history: serie(0.15, 0.18, 96, 72) },
      { id: "j3", label: "A top-10 single is fully AI-generated", prob: 0.55, prev24h: 0.49, history: serie(0.4, 0.55, 96, 73) },
      { id: "j4", label: "An AI lab announces a 1 GW training run", prob: 0.72, prev24h: 0.7, history: serie(0.6, 0.72, 96, 74) }
    ]
  },
  // 6. Format Manifold atypique : consultable, non négociable
  {
    id: "mf-poll-vacances", source: "MANIFOLD", externalId: "mfPOLL1",
    sourceUrl: "https://manifold.markets/example/best-vacation-poll",
    titleOriginal: "POLL: What is the best summer vacation destination?",
    marketType: "OTHER", sousType: "POLL", status: "OPEN", tradable: false,
    nonTradableReason: "Format POLL : sondage sans résolution financière. Consultable, trading non pris en charge.",
    theme: "Insolite", regions: ["Monde"],
    imageUrl: "img/plage.svg",
    closeAt: dans(500), expectedResolutionAt: null, resolutionTimeConfidence: "UNKNOWN",
    volume: 0, volume24h: 0, liquidity: 0, bettorCount: 156,
    createur: "travel_polls", resolutionSource: "Sondage : aucune résolution",
    descriptionOriginal: "Just a poll, votes only. No payout.",
    fraicheurS: 120,
    issues: [
      { id: "p1", label: "Mediterranean coast", prob: null, votes: 61 },
      { id: "p2", label: "Japanese Alps", prob: null, votes: 48 },
      { id: "p3", label: "Norwegian fjords", prob: null, votes: 47 }
    ]
  },
  // 8. Long terme
  {
    id: "pm-mars-2030", source: "POLYMARKET", externalId: "0xMARS30",
    sourceUrl: "https://polymarket.com/event/humans-on-mars-2030",
    titleOriginal: "Will humans land on Mars before 2031?",
    marketType: "BINARY", status: "OPEN", tradable: true,
    theme: "Espace", regions: ["Monde"],
    imageUrl: "img/mars.svg",
    closeAt: dans(38000), expectedResolutionAt: dans(38100), resolutionTimeConfidence: "EXPECTED",
    volume: 8900000, volume24h: 41000, liquidity: 1200000, bettorCount: 45000,
    resolutionSource: "Credible confirmation of a crewed landing by a space agency or company",
    descriptionOriginal: "Resolves YES if a crewed spacecraft lands on the Martian surface before Jan 1, 2031.",
    fraicheurS: 55, spread: 0.01,
    issues: [
      { id: "oui", label: "OUI", prob: 0.07, prev24h: 0.07, history: serie(0.09, 0.07, 96, 81) },
      { id: "non", label: "NON", prob: 0.93, prev24h: 0.93, history: serie(0.91, 0.93, 96, 82) }
    ],
    carnet: { bids: [[0.068, 30000], [0.06, 80000]], asks: [[0.072, 25000], [0.08, 60000]] }
  },
  // 10+11. Sans image + titre et règles très longs en anglais
  {
    id: "mf-titre-long", source: "MANIFOLD", externalId: "mfLONG1",
    sourceUrl: "https://manifold.markets/example/very-long-title",
    titleOriginal: "Conditional on at least three G20 central banks announcing a jointly coordinated digital currency interoperability framework before the end of Q3 2026, will the euro area consumer price index (HICP, all items, seasonally adjusted) print below 2.0% year over year at any monthly release before December 2026?",
    marketType: "BINARY", status: "OPEN", tradable: true,
    theme: "Finance", regions: ["Europe"],
    imageUrl: null,
    closeAt: dans(2600), expectedResolutionAt: dans(2700), resolutionTimeConfidence: "EXPECTED",
    volume: 3400, volume24h: 120, liquidity: 900, bettorCount: 37,
    createur: "macro_details", resolutionSource: "Eurostat official releases; long conditional rules below",
    descriptionOriginal: "Resolution details: this market resolves N/A if fewer than three G20 central banks announce the framework described above before Sep 30, 2026, 23:59 UTC. Otherwise it resolves YES if any Eurostat HICP flash or final monthly release published before Dec 31, 2026 shows a year-over-year figure strictly below 2.0% for the euro area aggregate, all items index, using the seasonally adjusted series as primary reference. In case Eurostat revises a previously published figure, only the first publication counts. If Eurostat changes its methodology in a way that makes the series discontinuous, the market resolves N/A. The creator will wait up to 72 hours after each release to confirm resolution, and reserves the right to consult the comment section before resolving edge cases.",
    fraicheurS: 200, spread: 0.02, prixMiroir: true,
    issues: [
      { id: "oui", label: "OUI", prob: 0.29, prev24h: 0.3, history: serie(0.33, 0.29, 96, 91) },
      { id: "non", label: "NON", prob: 0.71, prev24h: 0.7, history: serie(0.67, 0.71, 96, 92) }
    ]
  },
  // 12a. Sans prix exploitable : consultable seulement
  {
    id: "mf-prix-absent", source: "MANIFOLD", externalId: "mfNOPRICE",
    sourceUrl: "https://manifold.markets/example/broken-price",
    titleOriginal: "Will the new metro line open on schedule?",
    marketType: "BINARY", status: "OPEN", tradable: false,
    nonTradableReason: "Prix absent ou incohérent renvoyé par la source : trading suspendu, affichage conservé.",
    theme: "Société", regions: ["France"],
    imageUrl: "img/metro.svg",
    closeAt: dans(800), expectedResolutionAt: dans(850), resolutionTimeConfidence: "EXPECTED",
    volume: 1200, volume24h: 0, liquidity: 300, bettorCount: 19,
    createur: "urba_idf", resolutionSource: "Communiqué officiel IDFM",
    descriptionOriginal: "Resolves YES if the line opens to the public before the announced date.",
    fraicheurS: 5400,
    issues: [
      { id: "oui", label: "OUI", prob: null, prev24h: null, history: [] },
      { id: "non", label: "NON", prob: null, prev24h: null, history: [] }
    ]
  },
  // 12b. Carnet vide / profondeur insuffisante
  {
    id: "pm-carnet-vide", source: "POLYMARKET", externalId: "0xEMPTY1",
    sourceUrl: "https://polymarket.com/event/obscure-local-event",
    titleOriginal: "Will the obscure local referendum pass?",
    marketType: "BINARY", status: "OPEN", tradable: true, profondeurFaible: true,
    theme: "Politique", regions: ["Monde"],
    imageUrl: "img/urne.svg",
    closeAt: dans(300), expectedResolutionAt: dans(310), resolutionTimeConfidence: "EXPECTED",
    volume: 4100, volume24h: 60, liquidity: 180, bettorCount: 12,
    resolutionSource: "Official county results page",
    descriptionOriginal: "Resolves YES if the referendum passes.",
    fraicheurS: 95, spread: 0.14,
    issues: [
      { id: "oui", label: "OUI", prob: 0.51, prev24h: 0.5, history: serie(0.5, 0.51, 48, 101) },
      { id: "non", label: "NON", prob: 0.49, prev24h: 0.5, history: serie(0.5, 0.49, 48, 102) }
    ],
    carnet: { bids: [[0.44, 60]], asks: [[0.58, 45]] }
  },
  // 12c. Données retardées (position ouverte dessus, voir POSITIONS)
  {
    id: "pm-petrole-90", source: "POLYMARKET", externalId: "0xOIL90",
    sourceUrl: "https://polymarket.com/event/oil-above-90",
    titleOriginal: "Will Brent crude close above $90 this month?",
    marketType: "BINARY", status: "OPEN", tradable: true, donneesRetardees: true,
    theme: "Économie", regions: ["Monde"],
    imageUrl: "img/baril.svg",
    closeAt: dans(230), expectedResolutionAt: dans(235), resolutionTimeConfidence: "EXACT",
    volume: 890000, volume24h: 12000, liquidity: 95000, bettorCount: 5600,
    resolutionSource: "ICE Brent front-month settlement price",
    descriptionOriginal: "Resolves YES if the front-month Brent future settles above $90.00 on any trading day this month.",
    fraicheurS: 480, spread: 0.02,
    issues: [
      { id: "oui", label: "OUI", prob: 0.23, prev24h: 0.27, history: serie(0.35, 0.23, 96, 111) },
      { id: "non", label: "NON", prob: 0.77, prev24h: 0.73, history: serie(0.65, 0.77, 96, 112) }
    ],
    carnet: { bids: [[0.225, 4000], [0.21, 9000]], asks: [[0.235, 3800], [0.25, 7000]] }
  },
  // 15. Fermé, résolution en attente (position dessus)
  {
    id: "mf-canicule-juillet", source: "MANIFOLD", externalId: "mfHEAT7",
    sourceUrl: "https://manifold.markets/example/heatwave-july",
    titleOriginal: "Will France record a temperature above 42C in July 2026?",
    marketType: "BINARY", status: "CLOSED", tradable: false,
    nonTradableReason: "Marché fermé : résolution en attente de l'oracle source.",
    theme: "Climat et environnement", regions: ["France"],
    imageUrl: "img/soleil.svg",
    closeAt: ilYA(20), expectedResolutionAt: dans(28), resolutionTimeConfidence: "EXPECTED",
    volume: 9400, volume24h: 0, liquidity: 2100, bettorCount: 130,
    createur: "meteo_fr", resolutionSource: "Relevés officiels Météo-France",
    descriptionOriginal: "Resolves YES if any official Météo-France station records strictly more than 42.0C during July 2026.",
    fraicheurS: 72000, dernierPrixConserve: true, spread: 0.02, prixMiroir: true,
    issues: [
      { id: "oui", label: "OUI", prob: 0.58, prev24h: 0.58, history: serie(0.3, 0.58, 96, 121) },
      { id: "non", label: "NON", prob: 0.42, prev24h: 0.42, history: serie(0.7, 0.42, 96, 122) }
    ]
  },
  // Marchés résolus alimentant les Résultats (16 à 20)
  {
    id: "pm-shutdown-evite", source: "POLYMARKET", externalId: "0xSHUTQ2",
    sourceUrl: "https://polymarket.com/event/q2-shutdown-avoided",
    titleOriginal: "Government shutdown avoided in Q2 2026?",
    marketType: "BINARY", status: "RESOLVED", tradable: false, issueGagnante: "oui",
    theme: "Politique", regions: ["Monde"], imageUrl: "img/capitole.svg",
    closeAt: ilYA(240), resolvedAt: ilYA(30), resolutionTimeConfidence: "EXACT",
    volume: 3100000, bettorCount: 21000,
    resolutionSource: "Congressional record",
    descriptionOriginal: "Resolved YES: appropriations were signed in time.",
    issues: [
      { id: "oui", label: "OUI", prob: 1, history: serie(0.6, 1, 60, 131) },
      { id: "non", label: "NON", prob: 0, history: serie(0.4, 0, 60, 132) }
    ]
  },
  {
    id: "mf-spacex-lancement", source: "MANIFOLD", externalId: "mfSPX12",
    sourceUrl: "https://manifold.markets/example/starship-flight-12",
    titleOriginal: "Starship flight 12 reaches orbit?",
    marketType: "BINARY", status: "RESOLVED", tradable: false, issueGagnante: "oui",
    theme: "Espace", regions: ["Monde"], imageUrl: "img/fusee.svg",
    closeAt: ilYA(400), resolvedAt: ilYA(180), resolutionTimeConfidence: "EXACT",
    volume: 26000, bettorCount: 510, createur: "space_bets",
    resolutionSource: "Webdiffusion officielle SpaceX",
    descriptionOriginal: "Resolved YES.",
    issues: [
      { id: "oui", label: "OUI", prob: 1, history: serie(0.55, 1, 60, 141) },
      { id: "non", label: "NON", prob: 0, history: serie(0.45, 0, 60, 142) }
    ]
  },
  {
    id: "pm-euro-dollar", source: "POLYMARKET", externalId: "0xEURUSD",
    sourceUrl: "https://polymarket.com/event/eur-usd-parity",
    titleOriginal: "EUR/USD below parity before July?",
    marketType: "BINARY", status: "RESOLVED", tradable: false, issueGagnante: "non",
    theme: "Finance", regions: ["Europe"], imageUrl: "img/euro.svg",
    closeAt: ilYA(500), resolvedAt: ilYA(490), resolutionTimeConfidence: "EXACT",
    volume: 720000, bettorCount: 8800,
    resolutionSource: "ECB reference rate",
    descriptionOriginal: "Resolved NO.",
    issues: [
      { id: "oui", label: "OUI", prob: 0, history: serie(0.3, 0, 60, 151) },
      { id: "non", label: "NON", prob: 1, history: serie(0.7, 1, 60, 152) }
    ]
  },
  {
    id: "mf-jo-annules", source: "MANIFOLD", externalId: "mfJOX",
    sourceUrl: "https://manifold.markets/example/cancelled-market",
    titleOriginal: "Will the exhibition match take place as announced?",
    marketType: "BINARY", status: "CANCELLED", tradable: false,
    theme: "Sport", regions: ["Europe"], imageUrl: "img/stade.svg",
    closeAt: ilYA(100), resolvedAt: ilYA(50), resolutionTimeConfidence: "EXACT",
    volume: 4300, bettorCount: 61, createur: "sports_misc",
    resolutionSource: "Annulé par le créateur : question devenue sans objet (résolution N/A)",
    descriptionOriginal: "Resolved N/A: the event was cancelled by the organizers, question is void.",
    issues: [
      { id: "oui", label: "OUI", prob: null, history: serie(0.5, 0.45, 40, 161) },
      { id: "non", label: "NON", prob: null, history: serie(0.5, 0.55, 40, 162) }
    ]
  }
];

// Valeur nominale par défaut d'une part gagnante (réglage WINNING_SHARE_PAYOUT)
export const VALEUR_NOMINALE = 100;

// 13, 14 : positions ouvertes (favorable, défavorable, vente partielle, fermée en attente, retardée)
export const POSITIONS = [
  {
    id: "pos-fed", marcheId: "pm-fed-juillet", issueId: "oui", issueLabel: "OUI",
    parts: 6.76, valeurNominale: 100, prixMoyen: 37.0, probEntree: 0.37,
    montantEngage: 250, montantExpose: 250, achatAt: ilYA(46),
    lots: [{ id: "lot-fed-1", parts: 6.76, prixUnitaire: 37.0, valeurNominale: 100, date: ilYA(46) }],
    chronologie: [
      { t: ilYA(46), type: "achat", texte: "Achat initial : 6,76 parts OUI à 37,0" },
      { t: ilYA(18), type: "variation", texte: "+5,2 points en 6 h après des chiffres d'inflation" },
      { t: ilYA(2), type: "variation", texte: "+2,1 points sur 24 h" }
    ]
  },
  {
    id: "pos-psg", marcheId: "mf-psg-ligue1", issueId: "non", issueLabel: "NON",
    parts: 8.33, valeurNominale: 100, prixMoyen: 24.0, probEntree: 0.24,
    montantEngage: 200, montantExpose: 200, achatAt: ilYA(120),
    lots: [{ id: "lot-psg-1", parts: 8.33, prixUnitaire: 24.0, valeurNominale: 100, date: ilYA(120) }],
    chronologie: [
      { t: ilYA(120), type: "achat", texte: "Achat initial : 8,33 parts NON à 24,0" },
      { t: ilYA(30), type: "variation", texte: "-3,0 points après deux victoires du PSG" }
    ]
  },
  {
    id: "pos-shutdown", marcheId: "pm-shutdown-31", issueId: "non", issueLabel: "NON",
    parts: 5.68, valeurNominale: 100, prixMoyen: 88.0, probEntree: 0.86,
    montantEngage: 750, montantExpose: 500, achatAt: ilYA(70),
    venteParielle: true,
    lots: [
      { id: "lot-shut-1", parts: 3.41, prixUnitaire: 88.0, valeurNominale: 100, date: ilYA(70) },
      { id: "lot-shut-2", parts: 2.27, prixUnitaire: 88.2, valeurNominale: 100, date: ilYA(40) }
    ],
    ventes: [{ t: ilYA(10), parts: 2.84, prixUnitaire: 88.5, produit: 251.34 }],
    chronologie: [
      { t: ilYA(70), type: "achat", texte: "Achat initial : 5,68 parts NON à 86,0" },
      { t: ilYA(40), type: "achat", texte: "Renforcement : 2,27 parts à 88,2" },
      { t: ilYA(10), type: "vente", texte: "Vente partielle : 2,84 parts à 88,5 (+251,34 Éclats)" }
    ]
  },
  {
    id: "pos-canicule", marcheId: "mf-canicule-juillet", issueId: "oui", issueLabel: "OUI",
    parts: 4.0, valeurNominale: 100, prixMoyen: 30.0, probEntree: 0.30,
    montantEngage: 120, montantExpose: 120, achatAt: ilYA(300),
    fermee: true,
    lots: [{ id: "lot-can-1", parts: 4.0, prixUnitaire: 30.0, valeurNominale: 100, date: ilYA(300) }],
    chronologie: [
      { t: ilYA(300), type: "achat", texte: "Achat initial : 4 parts OUI à 30,0" },
      { t: ilYA(20), type: "fermeture", texte: "Marché fermé : résolution attendue de Météo-France" }
    ]
  },
  {
    id: "pos-petrole", marcheId: "pm-petrole-90", issueId: "oui", issueLabel: "OUI",
    parts: 2.86, valeurNominale: 100, prixMoyen: 35.0, probEntree: 0.35,
    montantEngage: 100, montantExpose: 100, achatAt: ilYA(200),
    lots: [{ id: "lot-oil-1", parts: 2.86, prixUnitaire: 35.0, valeurNominale: 100, date: ilYA(200) }],
    chronologie: [
      { t: ilYA(200), type: "achat", texte: "Achat initial : 2,86 parts OUI à 35,0" },
      { t: ilYA(1), type: "alerte", texte: "Données retardées depuis 8 min sur cette position" }
    ]
  }
];

// 16 à 20 : règlements et claims
export const CLAIMS = [
  {
    id: "claim-shutdown", settlementId: "stl-shutdown-q2", marcheId: "pm-shutdown-evite",
    titre: "Government shutdown avoided in Q2 2026?", source: "POLYMARKET",
    etat: "CLAIMABLE", type: "GAIN", montant: 1240, mise: 500, parts: 12.4,
    resoluAt: ilYA(30), issueLabel: "OUI"
  },
  {
    id: "claim-metro", settlementId: "stl-metro-x", marcheId: "mf-jo-annules",
    titre: "Will the exhibition match take place as announced?", source: "MANIFOLD",
    etat: "REFUND_CLAIMABLE", type: "REMBOURSEMENT", montant: 180, mise: 180, parts: 4.1,
    resoluAt: ilYA(50), issueLabel: "OUI", raison: "Résolution N/A par le créateur : question sans objet."
  },
  {
    id: "claim-encours", settlementId: "stl-encours", marcheId: "mf-spacex-lancement",
    titre: "Starship flight 12 reaches orbit?", source: "MANIFOLD",
    etat: "CLAIMABLE", type: "GAIN", montant: 265, mise: 100, parts: 2.65,
    resoluAt: ilYA(180), issueLabel: "OUI"
  },
  {
    id: "claim-fait", settlementId: "stl-fait", marcheId: "mf-spacex-lancement",
    titre: "Starship flight 11 static fire success?", source: "MANIFOLD",
    etat: "CLAIMED", type: "GAIN", montant: 412, mise: 150, parts: 4.12,
    resoluAt: ilYA(700), recupereAt: ilYA(690), issueLabel: "OUI"
  }
];

export const DEFAITES = [
  {
    id: "def-eurusd", marcheId: "pm-euro-dollar",
    titre: "EUR/USD below parity before July?", source: "POLYMARKET",
    mise: 300, issueLabel: "OUI", perte: -300, resoluAt: ilYA(490)
  }
];

// Registre de démonstration du portefeuille (les plus récents d'abord)
export const LEDGER = [
  { t: ilYA(10), montant: 251.34, source: "marches_vente", marcheId: "pm-shutdown-31", libelle: "Vente partielle · Shutdown NON" },
  { t: ilYA(46), montant: -250, source: "marches_mise", marcheId: "pm-fed-juillet", libelle: "Achat OUI · Fed July" },
  { t: ilYA(70), montant: -500, source: "marches_mise", marcheId: "pm-shutdown-31", libelle: "Achat NON · Shutdown" },
  { t: ilYA(120), montant: -200, source: "marches_mise", marcheId: "mf-psg-ligue1", libelle: "Achat NON · PSG Ligue 1" },
  { t: ilYA(200), montant: -100, source: "marches_mise", marcheId: "pm-petrole-90", libelle: "Achat OUI · Brent above 90" },
  { t: ilYA(300), montant: -120, source: "marches_mise", marcheId: "mf-canicule-juillet", libelle: "Achat OUI · Canicule 42C" },
  { t: ilYA(690), montant: 412, source: "marches_gain", marcheId: "mf-spacex-lancement", libelle: "Gain récupéré · Starship flight 11" },
  { t: ilYA(750), montant: -150, source: "marches_mise", marcheId: "mf-spacex-lancement", libelle: "Achat OUI · Starship flight 11" },
  { t: ilYA(2000), montant: 5000, source: "paris_sportifs_gain", application: "Paris Sportifs", libelle: "Gain récupéré dans Paris Sportifs" }
];

export const SOLDE_DEMO = 12450;

export const NOTIFICATIONS = [
  { id: "n1", t: ilYA(0.2), type: "claim", lu: false, titre: "Gain disponible",
    texte: "1 240 Éclats vous attendent sur « Government shutdown avoided in Q2 2026? »", cible: "#/resultats" },
  { id: "n2", t: ilYA(2), type: "variation", lu: false, titre: "Position favorable",
    texte: "Fed July : +8,4 points depuis votre achat", cible: "#/enjeu" },
  { id: "n3", t: ilYA(4), type: "cloture", lu: false, titre: "Clôture dans moins de 6 h",
    texte: "SNCF strike suspended? ferme bientôt", cible: "#/marche/mf-greve-sncf" },
  { id: "n4", t: ilYA(8), type: "technique", lu: true, titre: "Données retardées",
    texte: "Brent above 90 : prix non actualisé depuis 8 min", cible: "#/enjeu" },
  { id: "n5", t: ilYA(26), type: "decouverte", lu: true, titre: "Résumé quotidien",
    texte: "6 nouveaux marchés dans vos thèmes (IA, Espace, France)", cible: "#/recherche" }
];

export const THEMES = [
  "Politique", "Géopolitique", "Société", "Justice", "Économie", "Entreprises", "Finance",
  "Technologie", "Intelligence artificielle", "Internet", "Sciences", "Espace", "Santé",
  "Climat et environnement", "Cinéma", "Télévision", "Musique", "Jeux vidéo", "Culture",
  "Sport", "Insolite"
];
export const REGIONS = ["France", "Europe", "Monde"];

// Préférences de démonstration
export const PREFS_DEMO = {
  themesSuivis: ["Intelligence artificielle", "Espace", "Économie"],
  regionsSuivies: ["France", "Europe"],
  horizonPrefereH: 24,
  masques: ["Justice"],
  filtresEnregistres: [
    { id: "f1", nom: "France < 24 h tradable", criteres: "Région France · horizon 24 h · tradable" },
    { id: "f2", nom: "IA les plus actifs", criteres: "Thème IA · tri activité récente" }
  ]
};

// Catalogue initial des réglages (section 9.10 du hand-off)
export const REGLAGES = [
  { cle: "WINNING_SHARE_PAYOUT", libelle: "Valeur nominale d'une part gagnante", categorie: "Économie", valeur: 100, defaut: 100, unite: "Éclats", type: "decimal", min: 10, max: 1000, portee: "Nouveaux lots seulement", sensible: true,
    description: "Ce qu'une part de l'issue gagnante paie à la résolution.",
    hausse: "Moins de parts pour une même mise, chiffres unitaires plus grands, rendement total inchangé.",
    baisse: "Plus de parts pour une même mise, chiffres unitaires plus petits, rendement total inchangé." },
  { cle: "MIN_ORDER_AMOUNT", libelle: "Mise minimale", categorie: "Économie", valeur: 10, defaut: 10, unite: "Éclats", type: "decimal", min: 1, max: 1000, portee: "Immédiate pour les nouveaux ordres",
    description: "Plus petite transaction autorisée.",
    hausse: "Réduit les micro-transactions.", baisse: "Autorise des essais moins risqués mais multiplie les écritures." },
  { cle: "MAX_ORDER_AMOUNT", libelle: "Mise maximale par ordre", categorie: "Économie", valeur: 10000, defaut: 10000, unite: "Éclats", type: "decimal", min: 100, max: 100000, portee: "Immédiate pour les nouveaux ordres",
    description: "Risque maximal d'une seule action.",
    hausse: "Autorise des positions plus concentrées.", baisse: "Limite les erreurs et les pertes brutales." },
  { cle: "MAX_MARKET_EXPOSURE_PERCENT", libelle: "Exposition maximale par marché", categorie: "Économie", valeur: 25, defaut: 25, unite: "%", type: "pourcentage", min: 1, max: 100, portee: "Immédiate pour les nouveaux ordres",
    description: "Concentration autorisée sur une même question.",
    hausse: "Permet des convictions fortes.", baisse: "Force la diversification." },
  { cle: "MANIFOLD_LOCAL_SPREAD", libelle: "Spread miroir Manifold", categorie: "Économie", valeur: 0.01, defaut: 0.01, unite: "point", type: "decimal", min: 0, max: 0.1, portee: "Nouveaux ordres Manifold", sensible: true,
    description: "Écart local entre prix d'achat et de vente sur les marchés Manifold.",
    hausse: "Rend l'aller-retour plus coûteux et brûle plus d'Éclats.", baisse: "Rend le trading plus généreux et plus exploitable." },
  { cle: "PRICE_TOLERANCE_POINTS", libelle: "Tolérance de variation du prix (points)", categorie: "Exécution", valeur: 0.02, defaut: 0.02, unite: "point", type: "decimal", min: 0, max: 0.2, portee: "Nouvelles confirmations",
    description: "Écart maximal entre estimation et prix serveur avant reconfirmation.",
    hausse: "Moins de reconfirmations, risque d'un prix moins favorable.", baisse: "Plus de contrôle, davantage de friction." },
  { cle: "PRICE_TOLERANCE_RELATIVE", libelle: "Tolérance de variation du prix (relative)", categorie: "Exécution", valeur: 5, defaut: 5, unite: "%", type: "pourcentage", min: 0, max: 50, portee: "Nouvelles confirmations",
    description: "Seuil relatif, combiné au seuil en points : le plus strict s'applique.",
    hausse: "Moins de reconfirmations.", baisse: "Plus de contrôle." },
  { cle: "ALLOW_PARTIAL_FILLS", libelle: "Autoriser les exécutions partielles", categorie: "Exécution", valeur: true, defaut: true, unite: "", type: "boolean", portee: "Nouveaux ordres Polymarket",
    description: "Si la profondeur du carnet est insuffisante, exécuter ce qui est disponible.",
    hausse: "Si activé, une partie de l'ordre peut être achetée.", baisse: "Si désactivé, tout l'ordre échoue lorsque la profondeur manque." },
  { cle: "QUICK_STAKE_AMOUNTS", libelle: "Valeurs de mises rapides", categorie: "Exécution", valeur: "50, 100, 250, 500", defaut: "50, 100, 250, 500", unite: "Éclats", type: "liste", portee: "Interface immédiate",
    description: "Raccourcis de montant du ticket.",
    hausse: "Boutons adaptés aux grosses mises.", baisse: "Boutons adaptés aux petites mises." },
  { cle: "PREFERRED_RESOLUTION_HOURS", libelle: "Horizon préféré", categorie: "Découverte", valeur: 24, defaut: 24, unite: "h", type: "duree", min: 1, max: 720, portee: "Fil personnalisé immédiat",
    description: "Les marchés se résolvant sous cet horizon sont favorisés dans Pour moi.",
    hausse: "Fil plus patient, plus de long terme.", baisse: "Fil concentré sur l'imminent." },
  { cle: "DEFAULT_SOURCE_FILTER", libelle: "Sources visibles par défaut", categorie: "Découverte", valeur: "les deux", defaut: "les deux", unite: "", type: "liste", portee: "Navigation immédiate",
    description: "Polymarket, Manifold ou les deux.",
    hausse: "Catalogue plus large.", baisse: "Catalogue restreint à une source." },
  { cle: "SHOW_READ_ONLY_MARKETS", libelle: "Afficher les marchés non négociables", categorie: "Découverte", valeur: "non dans Pour moi, oui dans Tout", defaut: "non dans Pour moi, oui dans Tout", unite: "", type: "liste", portee: "Navigation immédiate",
    description: "Formats consultables mais sans trading (POLL, NUMERIC, données douteuses).",
    hausse: "Plus de contenus visibles.", baisse: "Fil limité au négociable." },
  { cle: "MIN_DEFAULT_VOLUME", libelle: "Volume minimal par défaut", categorie: "Découverte", valeur: 0, defaut: 0, unite: "Éclats", type: "decimal", min: 0, max: 1000000, portee: "Navigation immédiate",
    description: "Filtre de volume appliqué aux listes par défaut. Conserver 0 pour le maximum de données.",
    hausse: "Moins de petits marchés affichés.", baisse: "Catalogue maximal." },
  { cle: "METADATA_SYNC_SECONDS", libelle: "Synchronisation des métadonnées", categorie: "Fraîcheur", valeur: 300, defaut: 300, unite: "s", type: "duree", min: 60, max: 3600, portee: "Prochaine tâche planifiée",
    description: "Fréquence d'import des événements et marchés.",
    hausse: "Économise les requêtes, retarde les nouveautés.", baisse: "Améliore la fraîcheur, consomme plus." },
  { cle: "OPEN_POSITION_SYNC_SECONDS", libelle: "Vérification des positions ouvertes", categorie: "Fraîcheur", valeur: 60, defaut: 60, unite: "s", type: "duree", min: 30, max: 900, portee: "Prochaine tâche planifiée",
    description: "Fréquence de contrôle des marchés où une position est ouverte.",
    hausse: "Moins de requêtes, règlements plus tardifs.", baisse: "Suivi plus réactif." },
  { cle: "STALE_PRICE_SECONDS", libelle: "Seuil de données retardées", categorie: "Fraîcheur", valeur: 120, defaut: 120, unite: "s", type: "duree", min: 30, max: 3600, portee: "Interface immédiate",
    description: "Âge au-delà duquel un prix de position ouverte est marqué retardé.",
    hausse: "Moins d'alertes, tolère des prix plus vieux.", baisse: "Alerte plus tôt." },
  { cle: "PRICE_SNAPSHOT_SECONDS", libelle: "Snapshots de prix", categorie: "Fraîcheur", valeur: 300, defaut: 300, unite: "s", type: "duree", min: 60, max: 3600, portee: "Prochaine collecte",
    description: "Granularité des historiques internes.",
    hausse: "Graphiques moins fins, moins de stockage.", baisse: "Graphiques plus fins." },
  { cle: "FULL_RECONCILIATION_HOURS", libelle: "Réconciliation générale", categorie: "Fraîcheur", valeur: 24, defaut: 24, unite: "h", type: "duree", min: 6, max: 168, portee: "Prochaine tâche planifiée",
    description: "Vérification complète de toutes les positions non réglées.",
    hausse: "Rattrapage plus rare.", baisse: "Rattrapage plus fréquent." },
  { cle: "NOTIFY_PRICE_MOVE_POINTS", libelle: "Seuil de variation notifiée", categorie: "Notifications", valeur: 5, defaut: 5, unite: "points", type: "decimal", min: 1, max: 50, portee: "Notifications futures",
    description: "Variation absolue d'une position déclenchant une notification.",
    hausse: "Moins de notifications.", baisse: "Plus de notifications." },
  { cle: "CLOSING_ALERT_MINUTES", libelle: "Alerte de clôture", categorie: "Notifications", valeur: 60, defaut: 60, unite: "min", type: "duree", min: 5, max: 1440, portee: "Notifications futures",
    description: "Délai avant clôture déclenchant une alerte.",
    hausse: "Alerte plus tôt.", baisse: "Alerte plus tardive." },
  { cle: "UNCLAIMED_FIRST_REMINDER_HOURS", libelle: "Premier rappel de gain non récupéré", categorie: "Notifications", valeur: 24, defaut: 24, unite: "h", type: "duree", min: 1, max: 168, portee: "Prochain rappel",
    description: "Délai avant le premier rappel d'un claim ouvert.",
    hausse: "Rappel plus tardif.", baisse: "Rappel plus rapide." },
  { cle: "UNCLAIMED_REPEAT_REMINDER_HOURS", libelle: "Rappels suivants", categorie: "Notifications", valeur: 72, defaut: 72, unite: "h", type: "duree", min: 24, max: 336, portee: "Rappels suivants, désactivables",
    description: "Fréquence des rappels tant que le gain n'est pas récupéré.",
    hausse: "Moins de rappels.", baisse: "Rappels plus fréquents." },
  { cle: "HOME_SECTION_ITEM_LIMIT", libelle: "Éléments par section d'accueil", categorie: "Interface", valeur: 12, defaut: 12, unite: "", type: "entier", min: 3, max: 50, portee: "Interface immédiate",
    description: "Nombre maximal de cartes par rangée de l'accueil.",
    hausse: "Accueil plus dense.", baisse: "Accueil plus court." }
];

// 21. États de démonstration des sources (pilotables depuis la barre démo du prototype)
export const ETAT_SOURCES_DEFAUT = {
  polymarket: { etat: "ok", libelle: "Polymarket : opérationnel" },
  manifold: { etat: "ok", libelle: "Manifold : opérationnel" },
  websocket: { etat: "connecte", depuisS: 8 }
};
