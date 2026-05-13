# SPEC.md

## Objectif du projet

Faire ses courses à Carrefour de façon simplifiée et éclairée, pour pallier aux manques du site officiel.

## Fonctionnalités

- Une interface web locale avec une page d'accueil minimaliste affichant le nom de l'appli
- Une interface web locale avec quatre pages principales : `Products`, `Orders`, `Lists` et `Sync`
- Une page `Products` qui agrège les produits de toutes les commandes dans une table triable, avec fréquence d'achat
- La table de la page `Products` utilise une virtualisation des lignes (row virtualization) pour rester fluide sur de gros volumes, avec une structure de tableau sémantique, un en-tête sticky, des colonnes alignées, des classes de style utilitaires standard et des lignes correctement espacées et non superposées
- La page `Products` permet de sélectionner des lignes individuellement ou par plage de fréquence d'achat (bornes min/max via slider double), puis d'appliquer une action groupée pour ajouter la sélection à une liste existante ou nouvelle
- Sur la page `Products`, le survol de l'ID ou du nom d'un produit affiche une Hover Card avec la photo du produit quand elle est disponible
- Une page `Orders` qui affiche les commandes synchronisées dans une table triable et ouvre un détail `/orders/{id}`
- Une page détail de commande (`/orders/{id}`) avec table triable des lignes produits
- Une page `Lists` qui permet de créer, modifier et supprimer des listes de produits (CRUD)
- Les tables `Lists`, `Products` et `Orders` permettent d'ouvrir les éléments depuis leur ID ou leur nom quand l'information existe, et exposent un bouton `Open` dans la colonne `Actions`
- Une page de détail de liste qui permet d'éditer les produits, leurs quantités, leur état coché et, quand disponible, leur URL produit Carrefour
- Une page `Sync` qui lance une synchronisation complète locale des commandes (sans saisie de limite dans l'interface), affiche le workflow de login Carrefour et montre une progression en temps réel (étape, compteur et statut final)
- L'URL du serveur MCP utilisée par l'application est configurable via variable d'environnement et affichée telle qu'utilisée dans la page `Sync`
- L'authentification Carrefour côté application se fait en capturant une session Chrome ou Chromium déjà ouverte via CDP (`auth_capture_cdp`), pas en pilotant directement une CLI locale
- Les listes de produits sont sauvegardées dans des fichiers JSON locaux
- Un script `sync:orders` qui récupère les commandes et leurs détails depuis `carrefour-mcp` et les enregistre localement
- Un script `compute:standard-basket` qui calcule le panier standard de l'utilisateur à partir des produits achetés régulièrement afin d'en faire une liste locale
- Chaque ligne produit affichée dans les tables concernées propose une action `Add to list` : sélection d'une liste existante ou création d'une liste à la volée

## Expérience utilisateur

- L'application suit des patterns UX classiques d'outil de pilotage : navigation claire, états système visibles, actions primaires explicites, feedback immédiat après action, formulaires lisibles et CTA cohérents
- L'interface est prioritairement construite avec des composants `shadcn-svelte` fournis par la bibliothèque et composés entre eux, en limitant les éléments HTML bruts au strict nécessaire
- Le layout global est structuré en shell applicatif avec sidebar de navigation persistante et contenu principal hiérarchisé
- En mode sidebar `icon` (collapsed), les zones header/footer de la sidebar restent lisibles et ne débordent pas
- Le header et le footer de la sidebar suivent les primitives sidebar (`Sidebar.Menu`, `Sidebar.MenuItem`, `Sidebar.MenuButton`) pour garantir un comportement collapsed cohérent
- Les états vides, succès et erreurs sont présentés avec des composants dédiés (alertes, badges, cartes, tableaux/listes)
- Toutes les vues tabulaires de l'application utilisent des DataTables triables (cliquable sur les headers)
- Les listes d'éléments (commandes, produits, résumés) sont enveloppées dans des Cards avec l'arbre recommandé (`Card.Root`, `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer` selon besoin)
- Les formulaires utilisent des composants de formulaire (`field`, `label`, `input`, `textarea`, `checkbox`) avec libellés explicites et aides contextuelles
- L'interface est responsive mobile/desktop sans perte de fonctionnalité

## Données locales

- Une base SQLite locale stocke les commandes, leurs produits et les métadonnées de synchronisation
- Des fichiers JSON locaux stockent les listes de courses éditables

## Prérequis fonctionnels

- Le projet `carrefour-mcp` doit être disponible localement et son serveur HTTP doit être démarré sur `http://127.0.0.1:3000`
- Une instance Chrome ou Chromium avec CDP activé doit être disponible sur `http://127.0.0.1:9222` pour capturer la session Carrefour
- Variable d'environnement supportée pour l'URL MCP : `CARREFOUR_MCP_SERVER_URL` (prioritaire) ou `PUBLIC_CARREFOUR_MCP_SERVER_URL`, avec valeur par défaut `http://127.0.0.1:3000/mcp`

## Technologies

- carrefour-mcp
- sqlite
- SvelteKit
- shadcn-svelte
- Tailwind CSS
