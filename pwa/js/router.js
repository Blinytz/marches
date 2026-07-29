// Routeur par hash : #/page/param?query
const routes = new Map();

export function enregistrer(nom, rendu) { routes.set(nom, rendu); }

export function routeCourante() {
  const brut = location.hash.replace(/^#\/?/, "") || "accueil";
  const [chemin, query = ""] = brut.split("?");
  const segments = chemin.split("/").filter(Boolean);
  return {
    page: segments[0] || "accueil",
    params: segments.slice(1),
    query: Object.fromEntries(new URLSearchParams(query))
  };
}

export function demarrerRouteur(conteneur, apresRendu) {
  let derniereAdresse = null;
  async function rendre() {
    const adresse = location.hash;
    const memeAdresse = adresse === derniereAdresse;
    const positionAvant = window.scrollY;
    const r = routeCourante();
    const rendu = routes.get(r.page) || routes.get("accueil");
    conteneur.innerHTML = await rendu(r);
    conteneur.focus({ preventScroll: true });
    window.scrollTo({ top: memeAdresse ? positionAvant : 0, behavior: "instant" });
    derniereAdresse = adresse;
    apresRendu?.(r);
  }
  window.addEventListener("hashchange", rendre);
  return rendre;
}
