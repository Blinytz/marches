export const VALEUR_NOMINALE = 100;
export const THEMES = [
  "Politique", "Géopolitique", "Société", "Justice", "Économie", "Entreprises", "Finance",
  "Technologie", "Intelligence artificielle", "Internet", "Sciences", "Espace", "Santé",
  "Climat et environnement", "Cinéma", "Télévision", "Musique", "Jeux vidéo", "Culture",
  "Sport", "Insolite"
];
export const REGIONS = ["France", "Europe", "Monde"];
export const ETAT_SOURCES_DEFAUT = {
  polymarket: { etat: "chargement", libelle: "Polymarket : connexion…" },
  manifold: { etat: "chargement", libelle: "Manifold : connexion…" },
  websocket: { etat: "catalogue", depuisS: 0 }
};
