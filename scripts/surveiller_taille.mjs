// Surveillant de taille de base, portable d'un projet Supabase à l'autre.
//
// Pourquoi : le 12 août 2026, la base partagée a dépassé les 500 Mo du plan
// gratuit sans que personne ne le sache avant le mail de Supabase. Elle est
// alors passée en lecture seule, le disque de 2 Go s'est rempli, et
// PostgreSQL est resté 66 heures en boucle de démarrage. Le seul avertissement
// utile est celui qui arrive AVANT le mur.
//
// Ce script ne lit rien d'autre que la taille. Il échoue volontairement au-delà
// du seuil : GitHub envoie alors son mail d'échec de workflow, qui devient
// l'alerte. Aucune infrastructure de notification à installer.
//
// Variables attendues :
//   SUPABASE_URL          obligatoire
//   SUPABASE_SERVICE_KEY  obligatoire, jamais dans un fichier versionné
//   SEUIL_MO              facultatif, 350 par défaut
//   RPC_TAILLE            facultatif, nom de la fonction SQL qui renvoie la
//                         taille en octets. « mk_taille_base » côté Marchés,
//                         « taille_base » côté Quinytz.
//   JOURNAL               facultatif, fichier où consigner l'historique.
//
// Le journal a un second rôle : GitHub désactive les workflows programmés
// après 60 jours sans commit sur le dépôt, ce qui tuerait aussi la synchro du
// catalogue. Un point consigné chaque semaine suffit à garder le dépôt actif,
// et laisse au passage une courbe de croissance exploitable.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const SEUIL_MO = Number(process.env.SEUIL_MO || 350);
const RPC_TAILLE = process.env.RPC_TAILLE || "mk_taille_base";
const LIMITE_GRATUITE_MO = 500;

export async function mesurer(url, cle, rpc = RPC_TAILLE) {
  const reponse = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${rpc}`, {
    method: "POST",
    headers: {
      apikey: cle,
      // Les clés nouvelle génération passent par le seul en-tête apikey ; les
      // anciennes clés service_role JWT réclament encore Authorization.
      ...(cle.startsWith("sb_") ? {} : { Authorization: `Bearer ${cle}` }),
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  const texte = await reponse.text();
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status} ${texte.slice(0, 200)}`);
  const octets = Number(JSON.parse(texte));
  if (!Number.isFinite(octets)) throw new Error(`Réponse inattendue : ${texte.slice(0, 120)}`);
  return Math.round(octets / (1024 * 1024));
}

// Un point par semaine, plus les variations notables : assez pour suivre la
// croissance sans transformer l'historique du dépôt en journal quotidien.
export function doitConsigner(entrees, mo, maintenant, { ecartMo = 5, intervalleJours = 7 } = {}) {
  const derniere = entrees[entrees.length - 1];
  if (!derniere) return true;
  const jours = (maintenant - Date.parse(derniere.date)) / 86400000;
  if (!Number.isFinite(jours) || jours >= intervalleJours) return true;
  return Math.abs(mo - derniere.mo) >= ecartMo;
}

export function consigner(fichier, mo, maintenant = Date.now(), options = {}) {
  let entrees = [];
  try {
    const lu = JSON.parse(readFileSync(fichier, "utf8"));
    if (Array.isArray(lu?.mesures)) entrees = lu.mesures;
  } catch { /* premier passage, ou fichier illisible : on repart d'une liste vide */ }
  if (!doitConsigner(entrees, mo, maintenant, options)) return false;
  entrees.push({ date: new Date(maintenant).toISOString().slice(0, 10), mo });
  mkdirSync(dirname(fichier), { recursive: true });
  // Deux ans de points hebdomadaires suffisent ; au-delà on oublie le début.
  writeFileSync(fichier, `${JSON.stringify({ mesures: entrees.slice(-120) }, null, 2)}
`, "utf8");
  return true;
}

const estProgrammePrincipal = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (estProgrammePrincipal) {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) {
    console.error("SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis.");
    process.exit(1);
  }
  try {
    const mo = await mesurer(url, cle);
    const part = Math.round((mo / LIMITE_GRATUITE_MO) * 100);
    console.log(`Base : ${mo} Mo, soit ${part} % de la limite gratuite de ${LIMITE_GRATUITE_MO} Mo.`);
    if (process.env.JOURNAL) {
      const consigne = consigner(process.env.JOURNAL, mo);
      console.log(consigne ? `Point consigné dans ${process.env.JOURNAL}.` : "Point déjà récent, journal inchangé.");
    }
    if (mo >= SEUIL_MO) {
      console.error(`ALERTE : seuil de ${SEUIL_MO} Mo atteint. Vérifier les rétentions avant que Supabase ne passe le projet en lecture seule à ${LIMITE_GRATUITE_MO} Mo.`);
      process.exit(1);
    }
    console.log(`Sous le seuil de ${SEUIL_MO} Mo, rien à signaler.`);
  } catch (erreur) {
    // Une mesure impossible est elle-même une anomalie : base injoignable,
    // fonction absente, droits révoqués. On veut le mail dans tous ces cas.
    console.error(`Mesure impossible : ${erreur.message}`);
    process.exit(1);
  }
}
