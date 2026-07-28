// Fiche événement/marché (9.4) + ticket de transaction (9.5).
// Les transactions sont confirmées par les RPC atomiques Supabase.
//
// Structure du ticket revue pour la clarté (retour utilisateur 22/07) :
//  - on choisit d'abord un CAMP (OUI ou NON) via deux boutons de prix explicites ;
//  - le mode Vendre n'apparaît que si une position existe, via un encart « Votre position »
//    qui propose Renforcer et Vendre. Plus de double bascule OUI/NON + Acheter/Vendre.
import { etat, marche, executerOrdre } from "../etat.js";
import {
  echap, badgeSource, pastilleStatut, etoile, imgMarche, pct, fmt, fmtEclats, fmtSigne,
  htmlVariation, issuePrincipale, grapheDetaille, fraicheur, libelleEcheance,
  fmtCompact, etatVide, ligneCompacte, valeurPosition, plLatent, probIssue
} from "../ui.js";

let ticket = null; // { marcheId, issueId, mode, montant, parts, etape, prixServeur, recu }

export function ouvrirTicket(marcheId, issueId, mode = "achat") {
  const m = marche(marcheId);
  const pos = etat.positions.find((x) => x.marcheId === marcheId);
  // Pour une vente on force l'issue détenue et on part sur la totalité des parts.
  if (mode === "vente" && pos) {
    ticket = { marcheId, issueId: pos.issueId, mode: "vente", montant: 250, parts: pos.parts, etape: "saisie" };
  } else {
    ticket = { marcheId, issueId: issueId || (pos ? pos.issueId : issuePrincipale(m).id), mode: "achat", montant: 250, parts: null, etape: "saisie" };
  }
}

function prixIndicatif(m, issueId, mode = "achat") {
  const issue = m.issues.find((i) => i.id === issueId);
  if (!issue || issue.prob == null) return null;
  // Chaque camp est coté à partir de SA probabilité, plus le spread (moitié de part
  // et d'autre du prix). Le carnet public ne concerne que le
  // camp affiché, on ne s'en sert donc pas pour coter le camp opposé.
  const demiSpread = (m.source === "MANIFOLD" ? 0.01 : (m.spread ?? 0.02) / 2);
  const p = issue.prob;
  return mode === "achat"
    ? Math.min(0.99, p + demiSpread)
    : Math.max(0.01, p - demiSpread);
}

function encartPosition(m, pos, t) {
  const val = valeurPosition(pos);
  const pl = plLatent(pos);
  const p = probIssue(m, pos.issueId);
  return `<div class="ticket-position">
    <div class="tp-ligne"><span>Votre position</span>
      <span class="pos-issue ${pos.issueId === "non" ? "non" : "oui"}">${echap(pos.issueLabel)}</span></div>
    <div class="tp-chiffres">
      <span>${fmt(pos.parts)} parts</span><span>·</span>
      <span>valeur ${val != null ? fmt(val) : "?"}</span><span>·</span>
      <span class="${pl >= 0 ? "vert" : "rouge"}">Résultat ${pl != null ? fmtSigne(pl) : "?"}</span>
    </div>
    <div class="ticket-actions-pos">
      <button class="btn ${t.mode === "achat" ? "btn-principal" : "btn-discret"}" data-ticket="renforcer">Renforcer</button>
      <button class="btn ${t.mode === "vente" ? "btn-principal" : "btn-discret"}" data-ticket="vendre">Vendre</button>
    </div>
  </div>`;
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
  const pos = etat.positions.find((x) => x.marcheId === m.id);
  const vn = etat.valeurNominale;
  const binaire = m.marketType === "BINARY";
  const issue = m.issues.find((i) => i.id === t.issueId) || m.issues[0];

  // ---- Succès ----
  if (t.etape === "succes") {
    const r = t.recu;
    const estVente = t.mode === "vente";
    return `<div class="ticket eclat-anim joue">
      <h3>✅ ${estVente ? "Vente exécutée" : "Achat exécuté"}</h3>
      <div class="recu">
        <div><span>Marché</span><strong style="text-align:right; max-width:60%">${echap(m.titleOriginal.slice(0, 60))}${m.titleOriginal.length > 60 ? "…" : ""}</strong></div>
        <div><span>Camp</span><strong>${echap(issue.label)}</strong></div>
        <div><span>${estVente ? "Produit crédité" : "Montant débité"}</span><strong>${fmtEclats(r.montant)}</strong></div>
        <div><span>Frais</span><strong>0 Éclats</strong></div>
        <div><span>Parts</span><strong>${fmt(r.parts)}</strong></div>
        <div><span>Prix moyen</span><strong>${fmt(r.prix)}</strong></div>
        ${!estVente ? `<div><span>Paiement maximal</span><strong>${fmtEclats(r.parts * vn)}</strong></div>
        <div><span>Bénéfice maximal</span><strong class="vert">+${fmt(r.parts * vn - r.montant)}</strong></div>` : ""}
        <div><span>Transaction</span><span class="id-support">${r.id}</span></div>
      </div>
      <a class="btn btn-principal" href="#/enjeu">Voir ma position</a>
      <button class="btn btn-discret" data-ticket="reinit">Nouvelle transaction</button>
      <p class="ticket-note">Transaction confirmée dans le registre commun des Éclats.</p>
    </div>`;
  }

  // ---- Confirmation ----
  if (t.etape === "confirmation") {
    const pServeur = t.prixServeur;
    const estVente = t.mode === "vente";
    const pEstime = prixIndicatif(m, t.issueId, t.mode);
    const ecartPts = Math.abs(pServeur - pEstime) * 100;
    const horsTolerance = ecartPts > 2 || Math.abs(pServeur - pEstime) / pEstime > 0.05;
    const parts = estVente ? t.parts : t.montant / (pServeur * vn);
    const valeur = estVente ? parts * pServeur * vn : t.montant;
    return `<div class="ticket">
      <h3>Confirmer ${estVente ? "la vente" : "l'achat"}</h3>
      <div class="ticket-detail">
        <div><dt>Camp</dt><dd>${echap(issue.label)}</dd></div>
        <div><dt>Prix vérifié à l'instant</dt><dd class="num"><strong>${fmt(pServeur * vn)}</strong></dd></div>
        <div><dt>Votre estimation</dt><dd class="num">${fmt(pEstime * vn)}</dd></div>
        <div><dt>Parts</dt><dd class="num">${fmt(parts)}</dd></div>
        <div><dt>${estVente ? "Produit crédité" : "Paiement maximal"}</dt><dd class="num">${fmt(estVente ? valeur : parts * vn)}</dd></div>
      </div>
      ${horsTolerance ? `<div class="ticket-avert">⚠ Le prix a bougé de ${fmt(ecartPts)} points depuis votre saisie,
        au-delà de la tolérance (2 pts ou 5 %). Vérifiez le nouveau prix avant de confirmer à nouveau.</div>` : ""}
      <button class="btn btn-principal" data-ticket="executer">
        ${horsTolerance ? "Confirmer au nouveau prix" : `${estVente ? "Vendre" : "Acheter"} ${echap(issue.label)} · ${fmtEclats(estVente ? valeur : t.montant)}`}
      </button>
      <button class="btn btn-discret" data-ticket="retour">Retour</button>
    </div>`;
  }

  // ---- Saisie : VENTE ----
  if (t.mode === "vente" && pos) {
    const p = prixIndicatif(m, pos.issueId, "vente");
    const prixU = p != null ? p * vn : null;
    if (t.parts == null || t.parts > pos.parts) t.parts = pos.parts;
    const produit = prixU != null ? t.parts * prixU : 0;
    const partsOk = t.parts > 0 && t.parts <= pos.parts;
    return `<div class="ticket">
      ${encartPosition(m, pos, t)}
      <h3>Vendre ${echap(pos.issueLabel)}</h3>
      <label class="muet" for="ticket-parts">Parts à vendre (sur ${fmt(pos.parts)})</label>
      <input id="ticket-parts" class="champ num" type="number" min="0" max="${pos.parts}" step="0.01"
        value="${fmt(t.parts)}" data-ticket="parts">
      <div class="raccourcis">
        ${[["25 %", 0.25], ["50 %", 0.5], ["75 %", 0.75], ["Tout", 1]].map(([lib, f]) =>
          `<button data-ticket="parts-frac" data-val="${f}">${lib}</button>`).join("")}
      </div>
      <div class="ticket-detail">
        <div><dt>Prix de vente (${m.source === "POLYMARKET" ? "meilleur bid" : "miroir -1"})</dt><dd class="num">${prixU != null ? fmt(prixU) : "?"}</dd></div>
        <div><dt>Produit estimé</dt><dd class="num">${fmt(produit)}</dd></div>
        <div><dt>Spread</dt><dd class="num">${m.spread != null ? fmt(m.spread * 100) + " pts" : "?"}</dd></div>
        <div><dt>Frais</dt><dd class="num">0</dd></div>
      </div>
      ${!partsOk ? `<div class="ticket-erreur">Indiquez un nombre de parts entre 0 et ${fmt(pos.parts)}.</div>` : ""}
      <p class="ticket-note">Le produit est crédité immédiatement après vérification du prix côté serveur. La vente ne modifie jamais le prix externe.</p>
      <button class="btn btn-principal" data-ticket="previsualiser" ${partsOk && prixU != null ? "" : "disabled"}>
        Vendre ${fmt(t.parts)} parts · ≈ ${fmtEclats(produit)}
      </button>
    </div>`;
  }

  // ---- Saisie : ACHAT ----
  const p = prixIndicatif(m, t.issueId, "achat");
  const prixU = p != null ? p * vn : null;
  const soldeDispo = etat.solde ?? 0;
  const montantOk = t.montant >= 10 && t.montant <= 10000;
  const soldeOk = t.montant <= soldeDispo;
  const parts = prixU ? t.montant / prixU : 0;
  const profondeurInsuffisante = m.profondeurFaible && t.montant > 25;

  const choixCamp = binaire
    ? `<div class="ticket-cotes">
        ${["oui", "non"].map((id) => {
          const iss = m.issues.find((i) => i.id === id);
          const px = prixIndicatif(m, id, "achat");
          return `<button class="cote cote-${id} ${t.issueId === id ? "actif" : ""}" data-ticket="cote" data-val="${id}">
            <span class="cote-label">${id === "oui" ? "OUI" : "NON"}</span>
            <span class="cote-prix">${px != null ? fmt(px * vn) : "?"}</span>
            <span class="cote-note">${iss?.prob != null ? pct(iss.prob) + " de proba" : ""}</span>
          </button>`;
        }).join("")}
      </div>`
    : `<label class="muet" for="ticket-issue-select">Réponse</label>
       <select id="ticket-issue-select" class="champ" data-ticket="issue-select" aria-label="Réponse">
        ${m.issues.map((i) => `<option value="${i.id}" ${i.id === t.issueId ? "selected" : ""}>${echap(i.label)} · ${pct(i.prob)}</option>`).join("")}
       </select>`;

  return `<div class="ticket">
    ${pos ? encartPosition(m, pos, t) : ""}
    <h3>${pos ? "Renforcer votre position" : "Prendre position"}</h3>
    <p class="ticket-note" style="margin-top:-4px">Choisissez le camp sur lequel miser. Le prix est le coût d'une part ; une part gagnante paie ${vn} Éclats.</p>
    ${choixCamp}
    ${m.source === "MANIFOLD" ? `<p class="ticket-note">Prix miroir Manifold : probabilité publique + 1 point de spread local. Aucun ordre réel n'est placé chez Manifold.</p>` : ""}
    <label class="muet" for="ticket-montant">Combien miser ?</label>
    <input id="ticket-montant" class="champ num" type="number" min="10" max="10000" step="10"
      value="${t.montant}" data-ticket="montant">
    <div class="raccourcis">
      ${[50, 100, 250, 500].map((v) => `<button data-ticket="rapide" data-val="${v}">${v}</button>`).join("")}
      <button data-ticket="rapide" data-val="${Math.floor(soldeDispo)}">Max</button>
    </div>
    <div class="ticket-detail">
      <div><dt>Prix d'une part ${m.source === "POLYMARKET" ? "(meilleur ask)" : "(miroir +1)"}</dt><dd class="num">${prixU != null ? fmt(prixU) : "?"}</dd></div>
      <div><dt>Parts estimées</dt><dd class="num">${fmt(parts)}</dd></div>
      <div><dt>Spread</dt><dd class="num">${m.spread != null ? fmt(m.spread * 100) + " pts" : "?"}</dd></div>
      <div><dt>Frais</dt><dd class="num">0</dd></div>
      <div><dt>Paiement potentiel</dt><dd class="num">${fmt(parts * vn)}</dd></div>
      <div><dt>Bénéfice potentiel</dt><dd class="num vert">+${fmt(Math.max(0, parts * vn - t.montant))}</dd></div>
    </div>
    ${!etat.compteConnecte ? `<div class="ticket-erreur">Connectez votre portefeuille Éclats avant de miser.</div>` : ""}
    ${ticket.erreur ? `<div class="ticket-erreur">${echap(ticket.erreur)}</div>` : ""}
    ${!montantOk ? `<div class="ticket-erreur">Mise entre 10 et 10 000 Éclats (réglages Économie).</div>` : ""}
    ${!soldeOk ? `<div class="ticket-erreur">Solde insuffisant : ${fmtEclats(soldeDispo)} disponibles.
      <a href="#/portefeuille" style="text-decoration:underline">Voir le portefeuille</a></div>` : ""}
    ${profondeurInsuffisante ? `<div class="ticket-avert">⚠ Profondeur du carnet insuffisante pour ce montant :
      seuls ${fmtEclats(25)} sont exécutables. L'ordre serait partiellement exécuté (réglage : exécutions partielles autorisées).</div>` : ""}
    <p class="ticket-note">Le prix affiché est une estimation : la confirmation utilisera le prix revérifié côté serveur.</p>
    <button class="btn btn-principal" data-ticket="previsualiser" ${etat.compteConnecte && montantOk && soldeOk && prixU != null ? "" : "disabled"}>
      Acheter ${echap(issue.label)} · ${fmtEclats(t.montant)}
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
  if (m.detailEtat === "chargement") {
    return `<div class="panneau"><h3>Carnet d'ordres</h3><div class="skeleton" style="height:150px"></div></div>`;
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

  const panne = etat.sources[m.source.toLowerCase()]?.etat !== "ok";
  if (query.t) ouvrirTicket(m.id, query.issue, query.mode || "achat");

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
      ${m.detailEtat === "erreur" ? `<div class="bandeau bandeau-panne">Les données détaillées sont momentanément indisponibles. Le prix du catalogue reste affiché.</div>` : ""}

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
        <p class="tres-muet">${m.source === "POLYMARKET"
          ? "Carnet et prix suivis en lecture seule via le CLOB public pendant l'ouverture de cette fiche."
          : "Probabilité publique suivie en lecture seule via Manifold pendant l'ouverture de cette fiche."}</p></div>

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
    if (!ticket) return;
    const m = e.target.closest("[data-ticket=montant]");
    if (m) { ticket.montant = Math.max(0, Number(m.value) || 0); rafraichirSansFocus(rerendre); }
    const p = e.target.closest("[data-ticket=parts]");
    if (p) { ticket.parts = Math.max(0, Number(p.value) || 0); rafraichirSansFocus(rerendre); }
  });
  zone.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-ticket=issue-select]");
    if (sel && ticket) { ticket.issueId = sel.value; rerendre(); }
  });
  zone.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-ticket]");
    if (!b || !ticket) return;
    const type = b.dataset.ticket;
    const m = marche(ticket.marcheId);
    const pos = etat.positions.find((x) => x.marcheId === ticket.marcheId);
    if (type === "cote") { ticket.issueId = b.dataset.val; ticket.mode = "achat"; rerendre(); }
    if (type === "renforcer") { ticket.mode = "achat"; if (pos) ticket.issueId = pos.issueId; rerendre(); }
    if (type === "vendre") { if (pos) { ticket.mode = "vente"; ticket.issueId = pos.issueId; ticket.parts = pos.parts; } rerendre(); }
    if (type === "rapide") { ticket.montant = Number(b.dataset.val); rerendre(); }
    if (type === "parts-frac" && pos) { ticket.parts = Math.round(pos.parts * Number(b.dataset.val) * 100) / 100; rerendre(); }
    if (type === "retour") { ticket.etape = "saisie"; rerendre(); }
    if (type === "reinit") { ouvrirTicket(ticket.marcheId, ticket.issueId, "achat"); rerendre(); }
    if (type === "previsualiser") {
      const p = prixIndicatif(m, ticket.issueId, ticket.mode);
      ticket.prixServeur = Math.min(0.99, Math.max(0.01, p));
      ticket.etape = "confirmation";
      rerendre();
    }
    if (type === "executer") {
      try {
        const resultat = await executerOrdre({
          marche: m,
          issueId: ticket.issueId,
          mode: ticket.mode,
          montant: ticket.montant,
          parts: ticket.parts,
          idempotencyKey: `marches:${crypto.randomUUID()}`
        });
        ticket.recu = {
          id: resultat.id,
          montant: Number(resultat.montant),
          prix: Number(resultat.prix),
          parts: Number(resultat.parts)
        };
        ticket.etape = "succes";
      } catch (erreur) {
        ticket.erreur = erreur.message;
        ticket.etape = "saisie";
      }
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
  return htmlTicket(marche(marcheId));
}
export function htmlTicketCourant() {
  if (!ticket) return "";
  return htmlTicket(marche(ticket.marcheId));
}
