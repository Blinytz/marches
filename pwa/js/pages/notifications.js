// Centre de notifications interne (18) : historique, marquer lu, liens directs.
import { etat, toutesNotifications, marquerNotifLue } from "../etat.js";
import { echap, etatVide } from "../ui.js";

const ICONES = { claim: "✨", variation: "📈", cloture: "⏱", technique: "🛠️", decouverte: "🧭" };

export function pageNotifications() {
  const notifs = toutesNotifications();
  if (!notifs.length) return `<h1>Notifications</h1>` + etatVide("🔕", "Aucune notification");

  return `
    <h1>Notifications</h1>
    <div class="chips"><button class="chip" data-action="tout-lu">Tout marquer comme lu</button>
      <a class="chip" href="#/parametres?n=preferences">Réglages des notifications</a></div>
    <div class="carte liste-compacte">
      ${notifs.map((n) => {
        const lue = n.lu || etat.notifsLues.has(n.id);
        return `<a class="ligne-compacte" href="${echap(n.cible)}" data-action="lire-notif" data-notif="${n.id}"
            style="${lue ? "opacity:0.6" : ""}">
          <span style="font-size:1.1rem">${ICONES[n.type] || "🔔"}</span>
          <span style="flex:1">
            <strong>${echap(n.titre)}</strong>${lue ? "" : ' <span class="badge-point"></span>'}<br>
            <span class="muet">${echap(n.texte)}</span>
          </span>
          <span class="tres-muet">${new Date(n.t).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
        </a>`;
      }).join("")}
    </div>
    <p class="tres-muet">Historique conservé et paginé. Un badge distinct signale les gains à récupérer tant qu'ils sont ouverts.</p>`;
}
