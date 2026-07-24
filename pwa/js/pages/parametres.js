// Paramètres (9.10) : deux niveaux, recherche de réglage, impacts hausse/baisse,
// portée du changement, restauration. En Phase A les valeurs sont affichées mais
// non persistées (le registre serveur versionné arrive en Phase C).
import { etat } from "../etat.js";
import { echap, etatVide } from "../ui.js";

const CATEGORIES = ["Économie", "Exécution", "Découverte", "Fraîcheur", "Notifications", "Interface"];

const NOTIFS_MATRICE = [
  { nom: "Résolution reçue", defaut: "Activée", canaux: "Centre + Push" },
  { nom: "Gain ou remboursement disponible", defaut: "Activée, prioritaire", canaux: "Centre + Push, ignore les heures silencieuses si autorisé" },
  { nom: "Rappel de gain non récupéré", defaut: "24 h puis tous les 3 jours", canaux: "Centre + Push" },
  { nom: "Variation d'une position", defaut: "À partir de 5 points", canaux: "Centre" },
  { nom: "Clôture proche", defaut: "24 h et 1 h avant", canaux: "Centre + Push" },
  { nom: "Découverte (nouveaux marchés suivis)", defaut: "Résumé quotidien", canaux: "Centre" },
  { nom: "Incidents techniques", defaut: "Centre seulement, sauf impact sur un claim", canaux: "Centre" }
];

function htmlReglage(r) {
  const ctrl = r.type === "boolean"
    ? `<input type="checkbox" class="interrupteur" ${r.valeur ? "checked" : ""} aria-label="${echap(r.libelle)}">`
    : `<input class="champ num" value="${echap(String(r.valeur))}" aria-label="${echap(r.libelle)}">`;
  return `<div class="reglage">
    <div class="reglage-infos">
      <div class="reglage-libelle">${echap(r.libelle)}
        ${r.sensible ? `<span class="pastille pastille-warn" title="Modification sensible : confirmation avec résumé d'impact">sensible</span>` : ""}</div>
      <div class="reglage-desc">${echap(r.description)}</div>
      <div class="reglage-impacts">
        ↑ ${echap(r.hausse)}<br>↓ ${echap(r.baisse)}<br>
        Portée : ${echap(r.portee)}${r.min != null ? ` · bornes ${r.min} à ${r.max}` : ""}
      </div>
    </div>
    <div class="reglage-ctrl">
      ${ctrl}
      <span class="tres-muet">${r.unite || ""}</span>
      <button class="btn btn-discret" title="Restaurer la valeur par défaut">Défaut : ${echap(String(r.defaut))}</button>
    </div>
  </div>`;
}

export function pageParametres({ query }) {
  const niveau = query.n || "preferences";
  const filtre = (query.f || "").toLowerCase();
  const cat = query.cat || "";

  const reglagesVisibles = etat.reglages.filter((r) =>
    (!cat || r.categorie === cat) &&
    (!filtre || r.libelle.toLowerCase().includes(filtre) || r.cle.toLowerCase().includes(filtre) || r.description.toLowerCase().includes(filtre)));

  const preferences = `
    <div class="panneau"><h3>Sauvegarde et interopérabilité</h3>
      <p class="muet">Télécharge une copie complète des données locales de cette application.
        Le fichier contient aussi le journal d'Éclats au format commun, lisible par Éclats Central.</p>
      <button class="btn btn-primaire" data-action="exporter-donnees">Exporter mes données (JSON)</button>
      <p class="tres-muet">L'export est local et en lecture seule : il ne transfère aucun solde et ne contacte aucun serveur.</p>
    </div>
    <div class="panneau"><h3>Apparence</h3>
      <div class="reglage">
        <div class="reglage-infos"><div class="reglage-libelle">Densité</div>
          <div class="reglage-desc">Confortable par défaut. Le mode compact resserre les listes pour afficher plus de marchés d'un coup.</div></div>
        <div class="reglage-ctrl"><button class="btn btn-discret">Confortable</button></div>
      </div>
      <div class="reglage">
        <div class="reglage-infos"><div class="reglage-libelle">Mouvement réduit</div>
          <div class="reglage-desc">Suit automatiquement la préférence système (prefers-reduced-motion) : transitions immédiates, aucune animation décorative.</div></div>
        <div class="reglage-ctrl"><span class="pastille">${matchMedia("(prefers-reduced-motion: reduce)").matches ? "Actif (système)" : "Inactif (système)"}</span></div>
      </div>
      <div class="reglage">
        <div class="reglage-infos"><div class="reglage-libelle">Contenu des marchés en anglais original</div>
          <div class="reglage-desc">Les questions et règles restent dans leur langue source en v1.5 ; l'interface est française.</div></div>
        <div class="reglage-ctrl"><input type="checkbox" class="interrupteur" checked disabled></div>
      </div>
    </div>
    <div class="panneau"><h3>Notifications</h3>
      <p class="muet">Chaque famille se règle indépendamment : seuil, canaux, sources, thèmes, fréquence, heures silencieuses (23 h-8 h par défaut, fuseau Europe/Paris).</p>
      <div class="defilement-x"><table class="tableau">
        <thead><tr><th>Famille</th><th>Défaut</th><th>Canaux</th><th></th></tr></thead>
        <tbody>${NOTIFS_MATRICE.map((n) => `<tr>
          <td>${echap(n.nom)}</td><td>${echap(n.defaut)}</td><td class="tres-muet">${echap(n.canaux)}</td>
          <td><input type="checkbox" class="interrupteur" checked aria-label="Activer ${echap(n.nom)}"></td>
        </tr>`).join("")}</tbody>
      </table></div>
      <div class="chips" style="margin-top:10px">
        <button class="chip" data-action="notif-test">Envoyer une notification de test</button>
        <button class="chip">Restaurer les réglages par défaut</button>
      </div>
      <p class="tres-muet">Jamais de notification à chaque tick : une seule par franchissement de seuil, regroupement des découvertes, aucun son automatique. La permission Web Push n'est demandée qu'après explication.</p>
    </div>`;

  const systeme = `
    <input class="champ" style="margin-bottom:8px" placeholder="Rechercher un réglage…" value="${echap(query.f || "")}"
      data-action="filtre-reglages" aria-label="Rechercher un réglage">
    <div class="chips">
      <a class="chip ${!cat ? "actif" : ""}" href="#/parametres?n=systeme">Toutes</a>
      ${CATEGORIES.map((c) => `<a class="chip ${cat === c ? "actif" : ""}" href="#/parametres?n=systeme&cat=${encodeURIComponent(c)}">${c}</a>`).join("")}
    </div>
    <div class="panneau">
      ${reglagesVisibles.length ? reglagesVisibles.map(htmlReglage).join("") : etatVide("🔧", "Aucun réglage ne correspond")}
    </div>
    <p class="tres-muet">Registre versionné : chaque modification enregistrera date, auteur, ancienne valeur, avec prévisualisation
      d'impact avant sauvegarde et confirmation pour les réglages sensibles (par exemple : changer la valeur nominale n'affecte que les
      nouveaux lots ; les lots ouverts conservent leur valeur historique jusqu'à vente ou résolution). Les valeurs économiques actives
      sont toujours relues côté serveur. Phase A : valeurs de démonstration, non persistées.</p>`;

  return `
    <h1>Paramètres</h1>
    <div class="chips">
      <a class="chip ${niveau === "preferences" ? "actif" : ""}" href="#/parametres?n=preferences">Mes préférences</a>
      <a class="chip ${niveau === "systeme" ? "actif" : ""}" href="#/parametres?n=systeme">Réglages du système <span class="tres-muet">(owner)</span></a>
    </div>
    ${niveau === "systeme" ? systeme : preferences}`;
}
