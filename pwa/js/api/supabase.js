const SUPABASE_URL = "https://psutbulpezfdftmaqkoo.supabase.co";
const SUPABASE_KEY = "sb_publishable_KTE_3tQq6eGEo4z2f4QrUA_v7F4K4fT";
const CLE_SESSION = "eclats_session";

let session = null;
const stockage = typeof localStorage === "undefined" ? null : localStorage;
try { session = JSON.parse(stockage?.getItem(CLE_SESSION) || "null"); } catch { /* session invalide */ }

function sauverSession(valeur) {
  session = valeur;
  if (valeur) stockage?.setItem(CLE_SESSION, JSON.stringify(valeur));
  else stockage?.removeItem(CLE_SESSION);
}

export function utilisateur() { return session?.user || null; }
export function estConnecte() { return Boolean(session?.access_token || session?.refresh_token); }

export async function connexion(email, password) {
  const reponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw new Error(donnees.error_description || donnees.msg || "Connexion refusée.");
  sauverSession(donnees);
  return donnees.user;
}

export function deconnexion() { sauverSession(null); }

async function rafraichir() {
  if (!session?.refresh_token) return false;
  const reponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  if (!reponse.ok) { sauverSession(null); return false; }
  sauverSession(await reponse.json());
  return true;
}

export async function appel(path, options = {}, dejaRetente = false) {
  const headers = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const reponse = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  if (reponse.status === 401 && !dejaRetente && await rafraichir()) {
    return appel(path, options, true);
  }
  const texte = await reponse.text();
  if (!reponse.ok) {
    let message = `Erreur ${reponse.status}`;
    try {
      const erreur = JSON.parse(texte);
      message = erreur.message || erreur.error_description || erreur.hint || message;
    } catch { /* réponse non JSON */ }
    throw new Error(message);
  }
  return texte ? JSON.parse(texte) : null;
}

export function rpc(nom, args = {}) {
  return appel(`/rest/v1/rpc/${nom}`, { method: "POST", body: JSON.stringify(args) });
}

export function rest(table, params = {}) {
  const query = new URLSearchParams(params).toString();
  return appel(`/rest/v1/${table}${query ? `?${query}` : ""}`);
}
