// Accueil « Pour moi » : mélange de formats (section 9.2), ordre section 8.8.
import { etat, totalARecuperer, claimsOuverts } from "../etat.js";
import {
  carteMarche, carteMultiIssues, ligneCompacte, skeletons, etatVide,
  fmtEclats, badgeSource, htmlVariation, issuePrincipale, pct, echap, imgMarche,
  libelleEcheance, fmtSigne, plLatent
} from "../ui.js";

const ouverts = () => etat.marches.filter((m) => m.status === "OPEN" &&
  !(etat.demo.panne_polymarket && m.source === "POLYMARKET") &&
  !(etat.demo.panne_manifold && m.source === "MANIFOLD"));

export function pageAccueil() {
  if (etat.demo.chargement) {
    return `<h1>Pour moi</h1><div class="rangee-cartes">${skeletons(4)}</div>
      <div class="rangee-titre"><h2 class="skeleton" style="width:220px">&nbsp;</h2></div>
      <div class="grille-cartes">${skeletons(6)}</div>`;
  }

  const tous = ouverts();
  if (!tous.length) {
    return `<h1>Pour moi</h1>` + etatVide("🛰️", "Aucune source disponible",
      "Les deux sources sont actuellement indisponibles. Les données déjà connues restent consultables dans Ma liste.");
  }

  const claims = claimsOuverts();
  const banniereClaim = claims.length ? `
    <div class="bandeau bandeau-claim">
      <span>✨ <strong>${fmtEclats(totalARecuperer())}</strong> vous attendent</span>
      <a class="btn btn-claim" href="#/resultats">Récupérer</a>
    </div>` : "";

  const sous24 = tous.filter((m) => m.closeAt && new Date(m.closeAt) - Date.now() < 24 * 3600e3)
    .sort((a, b) => new Date(a.closeAt) - new Date(b.closeAt));

  const nouveauxThemes = tous.filter((m) => etat.prefs.themesSuivis.includes(m.theme));
  const franceEurope = tous.filter((m) => m.regions.some((r) => ["France", "Europe"].includes(r)));
  const longTerme = tous.filter((m) => m.closeAt && new Date(m.closeAt) - Date.now() > 30 * 24 * 3600e3).slice(0, 3);

  const mouvements = etat.positions
    .map((pos) => ({ pos, pl: plLatent(pos), m: etat.marches.find((x) => x.id === pos.marcheId) }))
    .filter((x) => x.m && x.pl != null)
    .sort((a, b) => Math.abs(b.pl) - Math.abs(a.pl))
    .slice(0, 4);

  const carteEditoriale = (m) => {
    const ip = issuePrincipale(m);
    return `<div class="carte carte-editoriale">
      ${imgMarche(m, "carte-img")}
      <div style="flex:1; min-width:0">
        <div class="carte-meta">${badgeSource(m.source)}<span>${echap(m.theme)}</span><span>${libelleEcheance(m)}</span></div>
        <a class="carte-titre" style="font-size:1.05rem" href="#/marche/${m.id}">${echap(m.titleOriginal)}</a>
        <div class="carte-proba" style="margin-top:6px">
          <span class="proba-principale">${pct(ip.prob)}</span>${htmlVariation(ip)}
        </div>
      </div>
    </div>`;
  };

  const multi = tous.find((m) => m.id === "pm-presidentielle-2027");

  return `
    ${banniereClaim}
    <h1>Pour moi</h1>

    <div class="rangee-titre"><h2>⏱ Se résout dans les 24 h</h2>
      <a class="lien-tout" href="#/recherche?horizon=24">Tout voir</a></div>
    ${sous24.length
      ? `<div class="rangee-cartes">${sous24.map(carteMarche).join("")}</div>`
      : etatVide("⏱", "Rien ne se résout dans les 24 h", "Élargissez l'horizon dans la recherche.")}

    <div class="rangee-titre"><h2>✨ Nouveaux dans vos thèmes</h2>
      <span class="tres-muet">${etat.prefs.themesSuivis.join(" · ")}</span></div>
    ${nouveauxThemes.length
      ? carteEditoriale(nouveauxThemes[0]) +
        (nouveauxThemes.length > 1 ? `<div class="grille-cartes" style="margin-top:12px">${nouveauxThemes.slice(1, 4).map(carteMarche).join("")}</div>` : "")
      : etatVide("✨", "Aucune nouveauté dans vos thèmes")}

    <div class="deux-colonnes">
      <section>
        <div class="rangee-titre"><h2>🇫🇷 France &amp; Europe</h2>
          <a class="lien-tout" href="#/recherche?region=France">Tout voir</a></div>
        <div class="carte liste-compacte">
          ${franceEurope.slice(0, 5).map(ligneCompacte).join("") || etatVide("🗺️", "Rien pour cette région")}
        </div>
      </section>
      <section>
        <div class="rangee-titre"><h2>📌 Mouvements sur vos positions</h2>
          <a class="lien-tout" href="#/enjeu">En jeu</a></div>
        <div class="carte liste-compacte">
          ${mouvements.map(({ pos, pl, m }) => `
            <a class="ligne-compacte" href="#/enjeu">
              <span class="carte-titre">${echap(m.titleOriginal)}</span>
              <span class="pos-issue ${pos.issueId === "non" ? "non" : "oui"}">${pos.issueLabel}</span>
              <span class="montant ${pl >= 0 ? "vert" : "rouge"}">${fmtSigne(Math.round(pl))}</span>
            </a>`).join("") || etatVide("📌", "Aucune position ouverte")}
        </div>
      </section>
    </div>

    ${multi ? `<div class="rangee-titre"><h2>🗳️ À la une</h2></div>
      <div class="grille-cartes">${carteMultiIssues(multi, 4)}</div>` : ""}

    <div class="rangee-titre"><h2>🔭 Long terme à surveiller</h2></div>
    <div class="carte liste-compacte">
      ${longTerme.map(ligneCompacte).join("") || etatVide("🔭", "Rien à surveiller")}
    </div>`;
}
