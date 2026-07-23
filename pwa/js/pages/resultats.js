// Page Résultats (9.8) : gains à récupérer, gagnés, perdus, annulés, stats.
// La récupération est le moment central : bouton unique, crédit après confirmation
// « serveur » (simulée en Phase A), animation de transfert vers le solde.
import { etat, etatClaim, claimsOuverts, totalARecuperer } from "../etat.js";
import { echap, badgeSource, fmt, fmtEclats, fmtSigne, etatVide } from "../ui.js";

function carteClaim(c) {
  const e = etatClaim(c);
  const estRemboursement = c.type === "REMBOURSEMENT";
  const benefice = c.montant - c.mise;
  if (e === "CLAIMED") {
    return `<div class="carte" style="margin-bottom:10px">
      <div class="pos-entetes">${badgeSource(c.source)}
        <span class="carte-titre" style="flex:1">${echap(c.titre)}</span>
        <span class="muet num">mise ${fmt(c.mise)} → ${estRemboursement ? "remboursé" : "payé"} ${fmt(c.montant)}</span>
      </div>
      <button class="btn btn-claim-fait" disabled>✓ ${estRemboursement ? "Remboursement récupéré" : "Gain récupéré"} · +${fmt(c.montant)} Éclats</button>
    </div>`;
  }
  if (e === "CLAIMING") {
    return `<div class="carte carte-claim" style="margin-bottom:10px">
      <div class="pos-entetes">${badgeSource(c.source)}
        <span class="carte-titre" style="flex:1">${echap(c.titre)}</span>
        <span class="claim-montant num">${fmt(c.montant)}</span>
      </div>
      <button class="btn btn-claim" disabled>Récupération…</button>
      <p class="tres-muet">Une erreur réseau pendant la récupération ne provoque jamais de double crédit : l'état est relu côté serveur avant toute nouvelle tentative.</p>
    </div>`;
  }
  return `<div class="carte carte-claim eclat-anim" style="margin-bottom:10px" data-claim-carte="${c.id}">
    <div class="pos-entetes">${badgeSource(c.source)}
      <span class="carte-titre" style="flex:1">${echap(c.titre)}</span>
      <span class="claim-montant num">${fmt(c.montant)}</span>
    </div>
    <p class="pos-message">
      ${estRemboursement
        ? `${echap(c.raison || "Marché annulé par la source.")} Remboursement du coût d'acquisition restant : ${fmtEclats(c.montant)}.`
        : `Issue gagnante : ${echap(c.issueLabel)} · mise ${fmt(c.mise)} → paiement ${fmt(c.montant)} · bénéfice net ${fmtSigne(benefice)}`}
    </p>
    <button class="btn btn-claim" data-action="recuperer" data-claim="${c.id}">
      ${estRemboursement ? "Récupérer le remboursement" : `Récupérer ${fmt(c.montant)} Éclats`}
    </button>
  </div>`;
}

export function pageResultats() {
  if (etat.demo.chargement) {
    return `<h1>Résultats</h1>${Array(4).fill('<div class="carte skeleton" style="height:110px; margin-bottom:10px"></div>').join("")}`;
  }
  const ouverts = claimsOuverts();
  const total = totalARecuperer();
  const gagnes = etat.claims.filter((c) => c.type === "GAIN");
  const rembourses = etat.claims.filter((c) => c.type === "REMBOURSEMENT");
  const enAttente = etat.positions.filter((p) => etat.marches.find((m) => m.id === p.marcheId)?.status === "CLOSED");

  const meilleurGain = Math.max(...gagnes.map((c) => c.montant - c.mise), 0);
  const pirePerte = Math.min(...etat.defaites.map((d) => d.perte), 0);
  const nbGagnes = gagnes.length, nbPerdus = etat.defaites.length;
  const totalGagne = gagnes.reduce((s, c) => s + c.montant - c.mise, 0);
  const totalPerdu = etat.defaites.reduce((s, d) => s + d.perte, 0);

  return `
    <h1>Résultats</h1>
    ${total > 0 ? `<div class="bandeau bandeau-claim">✨ <strong>${fmtEclats(total)}</strong> à récupérer
      <a class="btn btn-discret" href="#/resultats">↓ Voir</a></div>` : ""}

    <div class="rangee-titre"><h2>🏆 Gagnés et à récupérer</h2></div>
    ${gagnes.length ? gagnes.map(carteClaim).join("") : etatVide("🏆", "Aucun gain pour l'instant")}

    <div class="rangee-titre"><h2>↩ Annulés</h2></div>
    ${rembourses.length ? rembourses.map(carteClaim).join("")
      : etatVide("↩", "Aucune annulation")}

    <div class="rangee-titre"><h2>✘ Perdus récemment</h2></div>
    ${etat.defaites.length ? `<div class="carte liste-compacte">
      ${etat.defaites.map((d) => `<div class="ligne-compacte">
        ${badgeSource(d.source)}
        <span class="carte-titre" style="flex:1">${echap(d.titre)}</span>
        <span class="tres-muet">issue ${echap(d.issueLabel)}</span>
        <span class="num rouge">${fmtSigne(d.perte)}</span>
      </div>`).join("")}</div>` : etatVide("✘", "Aucune perte, pour l'instant")}

    <div class="rangee-titre"><h2>⏳ En attente de résolution</h2></div>
    ${enAttente.length ? `<div class="carte liste-compacte">
      ${enAttente.map((p) => {
        const m = etat.marches.find((x) => x.id === p.marcheId);
        return `<a class="ligne-compacte" href="#/marche/${m.id}">
          ${badgeSource(m.source)}
          <span class="carte-titre" style="flex:1">${echap(m.titleOriginal)}</span>
          <span class="pastille pastille-warn">Fermé · résolution en attente</span>
        </a>`;
      }).join("")}</div>` : etatVide("⏳", "Rien en attente")}

    <div class="rangee-titre"><h2>📊 Performance</h2></div>
    <div class="stats-grille">
      <div class="stat"><div class="val num vert">+${fmt(meilleurGain)}</div><div class="lib">Meilleur gain net</div></div>
      <div class="stat"><div class="val num rouge">${fmt(pirePerte)}</div><div class="lib">Pire perte</div></div>
      <div class="stat"><div class="val num ${totalGagne + totalPerdu >= 0 ? "vert" : "rouge"}">${fmtSigne(totalGagne + totalPerdu)}</div><div class="lib">Résultat réalisé total</div></div>
      <div class="stat"><div class="val num">${nbGagnes} / ${nbGagnes + nbPerdus}</div><div class="lib">Taux de réussite (à lire avec la rentabilité)</div></div>
    </div>
    <div class="panneau"><h3>Rentabilité par thème et source</h3>
      <div class="defilement-x"><table class="tableau">
        <thead><tr><th>Axe</th><th>Misé</th><th>Résultat réalisé</th><th>Rendement</th></tr></thead>
        <tbody>
          <tr><td>Politique</td><td class="num">500</td><td class="num vert">+740</td><td class="num vert">+148 %</td></tr>
          <tr><td>Espace</td><td class="num">250</td><td class="num vert">+427</td><td class="num vert">+171 %</td></tr>
          <tr><td>Finance</td><td class="num">300</td><td class="num rouge">-300</td><td class="num rouge">-100 %</td></tr>
          <tr><td>Polymarket</td><td class="num">800</td><td class="num vert">+440</td><td class="num vert">+55 %</td></tr>
          <tr><td>Manifold</td><td class="num">250</td><td class="num vert">+427</td><td class="num vert">+171 %</td></tr>
        </tbody>
      </table></div>
      <p class="tres-muet">Démonstration Phase A : ces agrégats seront calculés sur les règlements réels.</p>
    </div>`;
}
