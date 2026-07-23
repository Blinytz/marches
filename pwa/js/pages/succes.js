import { etat, marche } from "../etat.js";
import { echap } from "../ui.js";

function progression(valeur, cible) {
  const atteint = valeur >= cible;
  const pct = Math.min(100, Math.round((valeur / Math.max(1, cible)) * 100));
  return { valeur, cible, atteint, pct };
}

function carteSucces(icone, nom, description, p) {
  return `<div class="badge-jalon ${p.atteint ? "obtenu" : "verrouille"}">
    <span class="bj-ico">${icone}</span>
    <span class="bj-nom">${echap(nom)}</span>
    <span class="bj-etat">${p.atteint ? "Obtenu" : `${p.valeur} / ${p.cible}`}</span>
    <div class="succes-progression" aria-label="${p.pct} %"><span style="width:${p.pct}%"></span></div>
    <small class="tres-muet">${echap(description)}</small>
  </div>`;
}

function groupe(titre, aide, succes) {
  const obtenus = succes.filter((s) => s[3].atteint).length;
  return `<details class="panneau succes-groupe" open>
    <summary><strong>${titre}</strong><span class="pastille">${obtenus} / ${succes.length}</span></summary>
    <p class="tres-muet">${echap(aide)}</p>
    <div class="badges">${succes.map((s) => carteSucces(...s)).join("")}</div>
  </details>`;
}

export function pageSucces() {
  const gagnes = etat.claims.filter((c) => c.type === "GAIN");
  const resolus = gagnes.length + etat.defaites.length;
  const themes = new Set([
    ...etat.positions.map((p) => marche(p.marcheId)?.theme),
    ...etat.claims.map((c) => marche(c.marcheId)?.theme),
    ...etat.defaites.map((d) => marche(d.marcheId)?.theme)
  ].filter(Boolean));
  const recuperes = etat.claims.filter((c) => etat.claimsRecuperes.has(c.id)).length;
  const mouvements = etat.ledger.filter((l) => l.source.startsWith("marches_")).length;

  const groupes = [
    ["Premiers pas", "Découvrir le fonctionnement des marchés et du portefeuille.", [
      ["🎯", "Premier pari", "Ouvrir une première position.", progression(etat.positions.length + resolus, 1)],
      ["🏆", "Premier gain", "Résoudre un premier pari gagnant.", progression(gagnes.length, 1)],
      ["✨", "Premier gain récupéré", "Transférer un gain vers le portefeuille.", progression(recuperes, 1)]
    ]],
    ["Exploration", "Élargir progressivement les sujets suivis.", [
      ["⭐", "Curieux", "Suivre 3 marchés.", progression(etat.favoris.size, 3)],
      ["🧭", "Explorateur", "Parier sur 3 thèmes différents.", progression(themes.size, 3)],
      ["🌍", "Grand angle", "Parier sur 5 thèmes différents.", progression(themes.size, 5)]
    ]],
    ["Expérience", "Accumuler un historique suffisamment riche pour apprendre.", [
      ["📘", "Apprenti", "Atteindre 5 paris résolus.", progression(resolus, 5)],
      ["📚", "Habitué", "Atteindre 10 paris résolus.", progression(resolus, 10)],
      ["🎓", "Vétéran", "Atteindre 25 paris résolus.", progression(resolus, 25)]
    ]],
    ["Résultats", "Transformer les bonnes prévisions en résultats récupérés.", [
      ["🥉", "Un bon départ", "Obtenir 1 gain.", progression(gagnes.length, 1)],
      ["🥈", "Série positive", "Obtenir 3 gains.", progression(gagnes.length, 3)],
      ["🥇", "Confirmé", "Obtenir 10 gains.", progression(gagnes.length, 10)]
    ]],
    ["Discipline", "Construire un registre lisible et éviter les décisions sans contexte.", [
      ["💎", "Jusqu'au verdict", "Conserver une position jusqu'à sa résolution.", progression(resolus, 1)],
      ["🧾", "Historique fiable", "Créer 10 mouvements contextualisés.", progression(mouvements, 10)],
      ["🛡️", "Diversifié", "Maintenir au moins 3 thèmes actifs.", progression(themes.size, 3)]
    ]]
  ];

  const total = groupes.reduce((n, [, , succes]) => n + succes.length, 0);
  const obtenus = groupes.reduce((n, [, , succes]) => n + succes.filter((s) => s[3].atteint).length, 0);
  return `<h1>Succès</h1>
    <div class="panneau">
      <div class="rangee-titre"><h2>Progression globale</h2><strong>${obtenus} / ${total}</strong></div>
      <div class="succes-progression grand"><span style="width:${Math.round(obtenus / total * 100)}%"></span></div>
      <p class="muet">Les succès sont rangés par parcours. Les prochains objectifs restent visibles sans transformer chaque action en récompense immédiate.</p>
    </div>
    ${groupes.map((g) => groupe(...g)).join("")}`;
}
