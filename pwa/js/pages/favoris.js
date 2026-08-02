// Ma liste (9.9) : favoris, thèmes et régions suivis, filtres enregistrés, masqués.
import { etat } from "../etat.js";
import { carteMarche, etatVide, echap } from "../ui.js";
import { THEMES, REGIONS } from "../config.js";

const ONGLETS_FAVORIS = [
  { cle: "evenements", lib: "Événements favoris" },
  { cle: "themes", lib: "Thèmes suivis" },
  { cle: "regions", lib: "Régions suivies" },
  { cle: "filtres", lib: "Filtres enregistrés" },
  { cle: "masques", lib: "Masqués" }
];

export function pageFavoris({ query }) {
  const onglet = query.o || "evenements";
  const favoris = etat.marches.filter((m) => etat.favoris.has(m.id));

  const contenus = {
    evenements: favoris.length
      ? `<div class="grille-cartes">${favoris.map(carteMarche).join("")}</div>`
      : etatVide("☆", "Aucun favori",
          "Touchez l'étoile d'un marché pour le suivre ici et recevoir ses alertes.",
          `<a class="btn btn-principal" href="#/accueil">Explorer les marchés</a>`),
    themes: `<div class="chips">${THEMES.map((t) => {
        const suivi = etat.prefs.themesSuivis.includes(t);
        return `<button class="chip ${suivi ? "actif" : ""}" data-action="suivre-theme" data-theme="${echap(t)}">${suivi ? "★ " : ""}${echap(t)}</button>`;
      }).join("")}</div>
      <p class="muet">Les thèmes suivis reçoivent un fort bonus dans votre fil Pour moi.</p>`,
    regions: `<div class="chips">${REGIONS.map((r) => {
        const suivi = etat.prefs.regionsSuivies.includes(r);
        return `<button class="chip ${suivi ? "actif" : ""}" data-action="suivre-region" data-region="${echap(r)}">${suivi ? "★ " : ""}${echap(r)}</button>`;
      }).join("")}</div>
      <p class="muet">Suivre France et Europe réduit l'américanisation du fil : la politique locale américaine non suivie reçoit un malus.</p>`,
    filtres: etat.prefs.filtresEnregistres.length
      ? `<div class="carte liste-compacte">${etat.prefs.filtresEnregistres.map((f) =>
          `<div class="ligne-compacte">
            <a class="carte-titre" style="flex:1; min-width:0" href="#/recherche${f.requete ? "?" + f.requete : ""}">
              ${echap(f.nom)}
              <span class="tres-muet" style="display:block">${echap(f.criteres || "")}</span>
            </a>
            <button class="carte-etoile" data-action="supprimer-filtre" data-id="${echap(f.id)}" title="Supprimer ce filtre">✕</button>
          </div>`).join("")}</div>`
      : etatVide("🔖", "Aucun filtre enregistré", "Dans la recherche, composez vos critères puis « Enregistrer ce filtre »."),
    masques: etat.prefs.masques.length
      ? `<div class="chips">${etat.prefs.masques.map((t) =>
          `<span class="chip">${echap(t)} <button class="carte-etoile" data-action="demasquer" data-theme="${echap(t)}" title="Ne plus masquer">✕</button></span>`).join("")}</div>
        <p class="muet">Les thèmes masqués sont exclus du fil Pour moi mais restent trouvables via la recherche.</p>`
      : etatVide("🙈", "Rien de masqué")
  };

  return `
    <h1>Ma liste</h1>
    <div class="chips">${ONGLETS_FAVORIS.map((o) => `<a class="chip ${onglet === o.cle ? "actif" : ""}" href="#/favoris?o=${o.cle}">${o.lib}</a>`).join("")}</div>
    ${contenus[onglet] || contenus.evenements}`;
}
