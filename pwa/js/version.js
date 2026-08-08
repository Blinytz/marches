// Suivi de la version déployée.
//
// Une PWA installée peut rester ouverte des jours : elle continue de faire
// tourner le code chargé au premier lancement, même après un déploiement. On
// note la version au démarrage puis on la recompare à chaque retour dans
// l'app. Le fichier version.json est estampillé par le workflow de
// déploiement avec le SHA du commit.

let auChargement = null;

export function versionCourante() {
  return auChargement;
}

export function versionCourteAffichable() {
  if (!auChargement) return "inconnue";
  return auChargement === "dev" ? "développement" : auChargement.slice(0, 7);
}

export async function lireVersionDeployee() {
  try {
    const reponse = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!reponse.ok) return null;
    const contenu = await reponse.json();
    return contenu?.version || null;
  } catch {
    return null; // hors ligne : rien à conclure
  }
}

export function noterVersionAuChargement(valeur) {
  if (auChargement === null) auChargement = valeur;
}

// Vide tout ce qui pourrait resservir du vieux code, puis recharge. L'option
// « radical » retire aussi le service worker : c'est le dernier recours quand
// un appareil reste bloqué sur une ancienne version.
export async function rechargerApp({ radical = false } = {}) {
  try {
    const noms = await caches.keys();
    await Promise.all(noms.map((nom) => caches.delete(nom)));
  } catch { /* pas de cache accessible */ }
  if (radical && "serviceWorker" in navigator) {
    try {
      const inscriptions = await navigator.serviceWorker.getRegistrations();
      await Promise.all(inscriptions.map((r) => r.unregister()));
    } catch { /* rien à retirer */ }
  }
  // Le paramètre force le contournement de tout cache HTTP restant.
  const base = location.href.split("#")[0].split("?")[0];
  location.replace(`${base}?maj=${Date.now()}${location.hash}`);
}
