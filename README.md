# Nabta — نبتة

Nabta est un guide botanique régional consacré aux plantes et graines de Béni Mellal-Khénifra. L'application permet de rechercher une plante, filtrer la collection et consulter une documentation détaillée. Un assistant IA répond aux questions à partir des données locales.

## Stack technique

- React + Vite en JavaScript
- CSS personnalisé avec variables CSS
- Framer Motion pour les animations
- Lucide React pour les icônes
- React Leaflet et Leaflet pour la carte régionale
- Google Fonts : Playfair Display, DM Sans et Amiri

## Interface

La page propose un mode clair/sombre mémorisé dans le navigateur, une recherche plein écran, des filtres sous forme de chips, une carte interactive des cinq provinces, des fiches avec onglets et navigation entre plantes, ainsi qu'un assistant IA en panneau latéral. Les cartes et les messages utilisent un effet glassmorphism léger et des animations progressives.

## Installation

```bash
npm install
npm run dev
```

Le site est ensuite disponible à l'adresse affichée par Vite.

## Assistant IA

Copiez `.env.example` vers `.env`, puis renseignez votre clé :

```env
ANTHROPIC_API_KEY=votre_cle
```

La clé est uniquement utilisée par la fonction serverless `api/chat.js` et n'est jamais incluse dans le code React.

## Déploiement sur Vercel

Importez le projet dans Vercel, ajoutez `ANTHROPIC_API_KEY` dans les variables d'environnement, puis déployez. Vercel détecte automatiquement Vite et le dossier `api/`.

## Ajouter une plante

Les données sont dans [`src/data/plantes.json`](src/data/plantes.json). Pour contribuer, ajoutez une plante en respectant les champs existants (`id`, `nom_ar`, `nom_latin`, `type`, `provinces`, `usages`, `source`, `verifie`), puis ouvrez une Pull Request. Les contributions sont particulièrement bienvenues pendant Hacktoberfest.

## Organisation

- `src/main.jsx` : interface, recherche, filtres, fiche et chat.
- `src/styles.css` : design responsive vert et terre.
- `src/data/plantes.json` : collection locale.
- `api/chat.js` : fonction serverless qui appelle Anthropic.
