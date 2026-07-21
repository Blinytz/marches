// Fiche événement/marché (9.4) + ticket de transaction (9.5).
// Le ticket est une simulation locale : la version réelle passera par la prévisualisation
// et l'exécution serveur (TRADING_ENGINE.md). États : achat, confirmation, succès, erreur.
import { etat, marche } from "../etat.js";
import {
  echap, badgeSource, pastilleStatut, etoile, imgMarche, pct, fmt, fmtEclats,
  htmlVariation, issuePrincipale, grapheDetaille, fraicheur, libelleEcheance,
  fmtCompact, etatVide, ligneCompacte
} from "../ui.js";

let ticket = null; // { marcheId, issueId, mode, montant, etape, prixServeur, recu }

export function ouvrirTicket(marcheId, issueId) {
  ticket = { marcheId, issueId, mode: "achat", montant: 250, etape: "saisie" };
}

function prixIndicatif(m, issueId, mode = "achat") {
  const issue = m.issues.find((i) => i.id === issueId);
  if (!issue || issue.prob == null) return null;
  let p = issue.prob;
  if (m.source === "MANIFOLD") p = mode === "achat" ? Math.min(0.99, p + 0.01) : Math.max(0.01, p - 0.01);
  else if (m.carnet) {
    p = mode === "achat" ? (m.carnet.asks[0]?.[0] ?? p) : (m.carnet.bids[0]?.[0] ?? p);
  }
  return p;
}

function htmlTicket(m) {
  if (!m.tradable || m.status !== "OPEN") {
    return `<div class="ticket"><h3>Transaction indisponible</h3>
      <p class="muet">${echap(m.nonTradableReason || (m.status === "CLOSED"
        ? "Marché fermé : résolution en attente de l'oracle source."
        : "Ce marché est terminé."))}</p>
      ${m.status === "CLOSED" ? `<p class="tres-muet">Règles et source de résolution ci-contre. Aucun paiement avant la décision officielle de la source.</p>` : ""}
    </div>`;
  }
  if (!ticket || ticket.marcheId !== m.id) ouvrirTicket(m.id, issuePrincipale(m).id);
  const t = ticket;
  const issue = m.issues.find((i) => i.id === t.issueId) || m.issues[0];
  const p = prixIndicatif(m, t.issueId, t.mode);
  const vn = etat.valeurNominale;
  const prixU = p != null ? p * vn : null;
  const pos = etat.positions.find((x) => x.marcheId === m.id);
  const binaire = m.marketType === "BINARY";

  const onglets = binaire
    ? `<div class="ticket-onglets">
        <button class="on-oui ${t.issueId === "oui" ? "actif" : ""}" data-ticket="issue" data-val="oui">OUI ${Math.round((m.issues.find(i => i.id === "oui")?.prob ?? 0) * 100)}</button>
        <button class="on-non ${t.issueId === "non" ? "actif" : ""}" data-ticket="issue" data-val="non">NON ${Math.round((m.issues.find(i => i.id === "non")?.prob ?? 0) * 100)}</button>
      </div>`
    : `<select class="champ" data-ticket="issue-select" aria-label="Issue">
        ${m.issues.map((i) => `<option value="${i.id}" ${i.id === t.issueId ? "selected" : ""}>${echap(i.label)} · ${pct(i.prob)}</option>`).join("")}
      </select>`;

  const modeBoutons = `<div class="ticket-onglets" style="margin-top:2px">
    <button class="${t.mode === "achat" ? "actif on-oui" : ""}" data-ticket="mode" data-val="achat">Acheter</button>
    <button class="${t.mode === "vente" ? "actif on-non" : ""}" data-ticket="mode" data-val="vente" ${pos ? "" : "disabled title='Aucune position à vendre'"}>Vendre</button>
  </div>`;

  if (t.etape === "succes") {
    const r = t.recu;
    return `<div class="ticket eclat-anim joue">
      <h3>✅ ${t.mode === "achat" ? "Achat exécuté" : "Vente exécutée"}</h3>
      <div class="recu">
        <div><span>Marché</span><strong style="text-align:right; max-width:60%">${echap(m.titleOriginal.slice(0, 60))}${m.titleOriginal.length > 60 ? "…" : ""}</strong></div>
        <div><span>Issue</span><strong>${echap(issue.label)}</strong></div>
        <div><span>${t.mode === "achat" ? "Montant débité" : "Produit crédité"}</span><strong>${fmtEclats(r.montant)}</strong></div>
        <div><span>Frais</span><strong>0 Éclats</strong></div>
        <div><span>Parts</span><strong>${fmt(r.parts)}</strong></div>
        <div><span>Prix moyen</span><strong>${fmt(r.prix)}</strong></div>
        ${t.mode === "achat" ? `<div><span>Paiement maximal</span><strong>${fmtEclats(r.parts * vn)}</strong></div>
        <div><span>Bénéfice maximal</span><strong class="vert">+${fmt(r.parts * vn - r.montant)}</strong></div>` : ""}
        <div><span>Transaction</span><span class="id-support">${r.id}</span></div>
      </div>
      <a class="btn btn-principal" href="#/enjeu">Voir ma position</a>
      <button class="btn btn-discret" data-ticket="reinit">Nouvelle transaction</button>
      <p class="ticket-note">Simulation Phase A : aucun Éclat réel n'a bougé.</p>
    </div>`;
  }

  if (t.etape === "confirmation") {
    const pServeur = t.prixServeur;
    const ecartPts = Math.abs(pServeur - p) * 100;
    const horsTolerance = ecartPts > 2 || Math.abs(pServeur - p) / p > 0.05;
    const parts = t.montant / (pServeur * vn);
    return `<div class="ticket">
      <h3>Confirmer ${t.mode === "achat" ? "l'achat" : "la vente"}</h3>
      <div class="ticket-detail">
        <div><dt>Issue</dt><dd>${echap(issue.label)}</dd></div>
        <div><dt>Prix vérifié à l'instant</dt><dd class="num"><strong>${fmt(pServeur * vn)}</strong></dd></div>
        <div><dt>Votre estimation</dt><dd class="num">${fmt(prixU)}</dd></div>
        <div><dt>Parts</dt><dd class="num">${fmt(parts)}</dd></div>
        <div><dt>Paiement maximal</dt><dd class="num">${fmt(parts * vn)}</dd></div>
      </div>
      ${horsTolerance ? `<div class="ticket-avert">⚠ Le prix a bougé de ${fmt(ecartPts)} points depuis votre saisie,
        au-delà de la tolérance (2 pts ou 5 %). Vérifiez le nouveau prix avant de confirmer à nouveau.</div>` : ""}
      <button class="btn btn-principal" data-ticket="executer">
        ${horsTolerance ? "Confirmer au nouveau prix" : `${t.mode === "achat" ? "Acheter" : "Vendre"} ${echap(issue.label)} pour ${fmtEclats(t.montant)}`}
      </button>
      <button class="btn btn-discret" data-ticket="retour">Retour</button>
    </div>`;
  }

  const soldeDispo = etat.demo.solde_insuffisant ? 12 : etat.solde;
  const montantOk = t.montant >= 10 && t.montant <= 10000;
  const soldeOk = t.mode === "vente" || t.montant <= soldeDispo;
  const parts = prixU ? t.montant / prixU : 0;
  const profondeurInsuffisante = m.profondeurFaible && t.mode === "achat" && t.montant > 25;

  return `<div class="ticket">
    ${onglets}
    ${modeBoutons}
    ${m.source === "MANIFOLD" ? `<p class="ticket-note">Prix miroir Manifold : probabilité publique ± 1 point de spread local. Aucun ordre réel n'est placé chez Manifold.</p>` : ""}
    <label class="muet" for="ticket-montant">${t.mode === "achat" ? "Mise" : "Produit visé"} en Éclats</label>
    <input id="ticket-montant" class="champ num" type="number" min="10" max="10000" step="10"
      value="${t.montant}" data-ticket="montant">
    <div class="raccourcis">
      ${[50, 100, 250, 500].map((v) => `<button data-ticket="rapide" data-val="${v}">${v}</button>`).join("")}
      <button data-ticket="rapide" data-val="${Math.floor(soldeDispo)}">Max</button>
    </div>
    <div class="ticket-detail">
      <div><dt>Prix indicatif (${t.mode === "achat" ? m.source === "POLYMARKET" ? "meilleur ask" : "miroir +1" : m.source === "POLYMARKET" ? "meilleur bid" : "miroir -1"})</dt>
        <dd class="num">${prixU != null ? fmt(prixU) : "?"}</dd></div>
      <div><dt>Parts estimées</dt><dd class="num">${fmt(parts)}</dd></div>
      <div><dt>Spread</dt><dd class="num">${m.spread != null ? fmt(m.spread * 100) + " pts" : "?"}</dd></div>
      <div><dt>Frais</dt><dd class="num">0</dd></div>
      ${t.mode === "achat" ? `
      <div><dt>Paiement potentiel</dt><dd class="num">${fmt(parts * vn)}</dd></div>
      <div><dt>Bénéfice potentiel</dt><dd class="num vert">+${fmt(Math.max(0, parts * vn - t.montant))}</dd></div>` : ""}
    </div>
    ${!montantOk ? `<div class="ticket-erreur">Mise entre 10 et 10 000 Éclats (réglages Économie).</div>` : ""}
    ${!soldeOk ? `<div class="ticket-erreur">Solde insuffisant : ${fmtEclats(soldeDispo)} disponibles.
      <a href="#/portefeuille" style="text-decoration:underline">Voir le portefeuille</a></div>` : ""}
    ${profondeurInsuffisante ? `<div class="ticket-avert">⚠ Profondeur du carnet insuffisante pour ce montant :
      seuls ${fmtEclats(25)} sont exécutables. L'ordre serait partiellement exécuté (réglage : exécutions partielles autorisées).</div>` : ""}
    <p class="ticket-note">Le prix affiché est une estimation : la confirmation utilisera le prix revérifié côté serveur.</p>
    <button class="btn btn-principal" data-ticket="previsualiser" ${montantOk && soldeOk && prixU != null ? "" : "disabled"}>
      ${t.mode === "achat" ? "Acheter" : "Vendre"} ${echap(issue.label)} pour ${fmtEclats(t.montant)}
    </button>
  </div>`;
}

function htmlCarnet(m) {
  if (m.source === "MANIFOLD") {
    return `<div class="panneau"><h3>Prix miroir Manifold</h3>
      <p class="prose">Manifold ne publie pas de carnet d'ordres. Le prix appliqué localement est la probabilité publique du marché,
        avec un spread local symétrique de 1 point : achat OUI à ${pct(Math.min(0.99, (issuePrincipale(m).prob ?? 0) + 0.01))},
        vente OUI à ${pct(Math.max(0.01, (issuePrincipale(m).prob ?? 0) - 0.01))}.
        Ce prix n'est jamais un ordre réel placé chez Manifold.</p></div>`;
  }
  if (!m.carnet || (!m.carnet.bids.length && !m.carnet.asks.length)) {
    return `<div class="panneau"><h3>Carnet d'ordres</h3>${etatVide("📭", "Carnet vide", "Aucune liquidité affichable pour l'instant : les transactions sont suspendues.")}</div>`;
  }
  const maxTaille = Math.max(...m.carnet.bids.map((b) => b[1]), ...m.carnet.asks.map((a) => a[1]));
  const ligne = (l, cls) => `<div class="carnet-ligne ${cls}">
      <span class="barre" style="width:${(l[1] / maxTaille) * 100}%"></span>
      <span class="num">${fmt(l[0] * 100)}</span><span class="num tres-muet">${fmtCompact(l[1])}</span>
    </div>`;
  return `<div class="panneau"><h3>Carnet d'ordres</h3>
    <div class="carnet">
      <span class="col-titre">Achats (bids)</span><span class="col-titre">Ventes (asks)</span>
      <div>${m.carnet.bids.map((b) => ligne(b, "bid")).join("")}</div>
      <div>${m.carnet.asks.map((a) => ligne(a, "ask")).join("")}</div>
    </div>
    ${m.profondeurFaible ? `<p class="ticket-avert" style="margin-top:8px">⚠ Profondeur très faible : les gros montants seront refusés ou partiellement exécutés.</p>` : ""}
  </div>`;
}

export function pageFiche({ params, query }) {
  const m = marche(params[0]);
  if (!m) return etatVide("🕳️", "Marché introuvable", "", `<a class="btn" href="#/accueil">Retour à l'accueil</a>`);

  if (etat.demo.erreur_inconnue) {
    return etatVide("💥", "Une erreur inattendue est survenue",
      "Nos journaux ont enregistré le problème. Réessayez, et si l'erreur persiste, transmettez l'identifiant ci-dessous.",
      `<p class="id-support">support: EM-${m.id}-4F7A2C</p><a class="btn" href="#/accueil">Retour</a>`);
  }

  const panne = etat.demo["panne_" + m.source.toLowerCase()];
  if (query.issue && (!ticket || ticket.marcheId !== m.id || query.t)) ouvrirTicket(m.id, query.issue);

  const ip = issuePrincipale(m);
  const multi = m.issues.length > 2 || m.marketType === "MULTIPLE_CHOICE" || m.marketType === "MULTIPLE";
  const memesTheme = etat.marches.filter((x) => x.id !== m.id && x.theme === m.theme && x.status === "OPEN").slice(0, 4);

  return `<div class="fiche">
    <article>
      <nav class="fil-ariane">
        <a href="#/accueil">Accueil</a> › <a href="#/recherche?theme=${encodeURIComponent(m.theme)}">${echap(m.theme)}</a>
        › ${badgeSource(m.source)} ${pastilleStatut(m)}
      </nav>
      ${panne ? `<div class="bandeau bandeau-panne">📡 Source indisponible : données figées à la dernière synchronisation, transactions suspendues.</div>` : ""}
      <header class="fiche-entete">
        ${imgMarche(m, "fiche-img")}
        <div style="min-width:0">
          <h1 class="fiche-titre">${echap(m.titleOriginal)}</h1>
          <div class="carte-meta" style="margin-top:6px">
            ${m.createur ? `<span>par @${echap(m.createur)}</span> ·` : ""}
            <span>${fmtCompact(m.bettorCount)} parieurs</span> ·
            <a class="lien-source" href="${echap(m.sourceUrl)}" target="_blank" rel="noopener noreferrer">Voir sur ${m.source === "POLYMARKET" ? "Polymarket" : "Manifold"} ↗</a>
          </div>
        </div>
        <div class="fiche-actions">${etoile(m)}</div>
      </header>

      <div class="fiche-proba-bloc">
        ${!multi ? `<span class="fiche-proba">${pct(ip.prob)} <span class="muet" style="font-size:1rem">OUI</span></span>
        ${htmlVariation(ip)}` : `<span class="muet">${m.issues.length} issues</span>`}
        ${fraicheur(m)}
        <span class="pastille">${libelleEcheance(m)}</span>
      </div>

      <div class="graphique-conteneur panneau">
        ${grapheDetaille(ip.history, { plageH: Number(query.plage) || null })}
        <div class="graphique-plages">
          ${[["1", "1 h"], ["6", "6 h"], ["24", "1 j"], ["168", "1 sem."], ["720", "1 mois"], ["", "Tout"]].map(([v, l]) =>
            `<a href="#/marche/${m.id}?plage=${v}"><button class="${(query.plage || "") === v ? "actif" : ""}">${l}</button></a>`).join("")}
        </div>
      </div>

      ${multi ? `<div class="panneau"><h3>Issues</h3>
        ${m.marketType === "MULTIPLE_CHOICE" && m.sommeEgale1 === false
          ? `<p class="tres-muet">Réponses résolues indépendamment : les probabilités ne totalisent pas 100 %.</p>` : ""}
        ${m.sousType === "POLL" ? `<p class="tres-muet">Sondage : votes sans enjeu financier.</p>` : ""}
        <div class="liste-issues">
          ${m.issues.map((i) => `<div class="ligne-issue">
            <span class="lib" title="${echap(i.label)}">${echap(i.label)}</span>
            <span class="proba">${i.prob != null ? pct(i.prob) : (i.votes != null ? i.votes + " votes" : "?")}</span>
            ${m.tradable ? `<button class="btn-oui" data-action="ticket" data-marche="${m.id}" data-issue="${i.id}">Acheter ${i.prob != null ? Math.round(Math.min(0.99, i.prob + (m.source === "MANIFOLD" ? 0.01 : 0)) * 100) : ""}</button>` : ""}
          </div>`).join("")}
        </div></div>` : ""}

      <div class="panneau"><h3>Statistiques</h3>
        <div class="stats-grille">
          <div class="stat"><div class="val num">${fmtCompact(m.volume)}</div><div class="lib">Volume total</div></div>
          <div class="stat"><div class="val num">${fmtCompact(m.volume24h)}</div><div class="lib">Volume 24 h</div></div>
          <div class="stat"><div class="val num">${fmtCompact(m.liquidity)}</div><div class="lib">Liquidité</div></div>
          <div class="stat"><div class="val num">${fmtCompact(m.bettorCount)}</div><div class="lib">Parieurs</div></div>
          <div class="stat"><div class="val num">${m.spread != null ? fmt(m.spread * 100) + " pts" : "?"}</div><div class="lib">Spread</div></div>
        </div>
      </div>

      ${!m.tradable && m.nonTradableReason ? `<div class="panneau etat-erreur"><h3>Pourquoi ce marché n'est pas négociable</h3>
        <p class="prose">${echap(m.nonTradableReason)}</p></div>` : ""}

      <div class="panneau"><h3>Description <span class="tres-muet">(contenu original de la source, en anglais)</span></h3>
        <p class="prose">${echap(m.descriptionOriginal || "Aucune description fournie par la source.")}</p></div>

      <div class="panneau"><h3>Critères et source de résolution</h3>
        <p class="prose">${echap(m.resolutionSource || "Non renseigné par la source.")}</p>
        <p class="tres-muet">La plateforme source est le seul oracle : aucune résolution locale anticipée, même si le résultat réel semble connu.</p></div>

      ${htmlCarnet(m)}

      <div class="panneau"><h3>Activité externe récente</h3>
        <p class="tres-muet">Phase A : l'activité et les commentaires externes (lecture seule) seront branchés en Phase B.</p></div>

      ${memesTheme.length ? `<div class="rangee-titre"><h2>Dans le même thème</h2></div>
        <div class="carte liste-compacte">${memesTheme.map(ligneCompacte).join("")}</div>` : ""}
    </article>

    <aside id="zone-ticket">${panne ? `<div class="ticket"><h3>Transactions suspendues</h3>
      <p class="muet">La source est indisponible : aucun prix exécutable fiable. Le dernier prix connu reste affiché à titre indicatif.</p></div>` : htmlTicket(m)}</aside>
  </div>

  ${m.tradable && m.status === "OPEN" && m.marketType === "BINARY" ? `
  <div class="barre-oui-non-mobile">
    <button class="btn-oui" data-action="ticket-mobile" data-marche="${m.id}" data-issue="oui">Acheter OUI · ${Math.round((m.issues.find(i => i.id === "oui")?.prob ?? 0) * 100)}</button>
    <button class="btn-non" data-action="ticket-mobile" data-marche="${m.id}" data-issue="non">Acheter NON · ${Math.round((m.issues.find(i => i.id === "non")?.prob ?? 0) * 100)}</button>
  </div>` : ""}`;
}

// Interactions du ticket (délégation accrochée par app.js après chaque rendu de fiche)
export function accrocherTicket(rerendre) {
  const zone = document.getElementById("zone-ticket") || document.getElementById("feuille-basse");
  if (!zone) return;
  zone.addEventListener("input", (e) => {
    const cible = e.target.closest("[data-ticket=montant]");
    if (cible && ticket) { ticket.montant = Math.max(0, Number(cible.value) || 0); rafraichirSansFocus(rerendre); }
  });
  zone.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-ticket=issue-select]");
    if (sel && ticket) { ticket.issueId = sel.value; rerendre(); }
  });
  zone.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ticket]");
    if (!b || !ticket) return;
    const type = b.dataset.ticket;
    if (type === "issue") { ticket.issueId = b.dataset.val; rerendre(); }
    if (type === "mode") { ticket.mode = b.dataset.val; rerendre(); }
    if (type === "rapide") { ticket.montant = Number(b.dataset.val); rerendre(); }
    if (type === "retour") { ticket.etape = "saisie"; rerendre(); }
    if (type === "reinit") { ticket.etape = "saisie"; ticket.montant = 250; rerendre(); }
    if (type === "previsualiser") {
      const m = marche(ticket.marcheId);
      const p = prixIndicatif(m, ticket.issueId, ticket.mode);
      // Simulation de la relecture serveur : légère dérive, forte si la bascule démo est active
      const derive = etat.demo.prix_modifie ? 0.04 : (Math.random() - 0.5) * 0.006;
      ticket.prixServeur = Math.min(0.99, Math.max(0.01, p + derive));
      ticket.etape = "confirmation";
      rerendre();
    }
    if (type === "executer") {
      const m = marche(ticket.marcheId);
      const vn = etat.valeurNominale;
      ticket.recu = {
        id: "tx-demo-" + Math.random().toString(36).slice(2, 8),
        montant: ticket.montant,
        prix: ticket.prixServeur * vn,
        parts: ticket.montant / (ticket.prixServeur * vn)
      };
      ticket.etape = "succes";
      rerendre();
    }
  });
}

function rafraichirSansFocus(rerendre) {
  const actif = document.activeElement;
  const id = actif?.id;
  const posCurseur = actif?.selectionStart;
  rerendre();
  if (id) {
    const el = document.getElementById(id);
    if (el) { el.focus(); try { el.selectionStart = el.selectionEnd = posCurseur; } catch {} }
  }
}

export function ticketPourFeuille(marcheId, issueId) {
  ouvrirTicket(marcheId, issueId);
  const m = marche(marcheId);
  return htmlTicket(m);
}
export function htmlTicketCourant() {
  if (!ticket) return "";
  return htmlTicket(marche(ticket.marcheId));
}
