# SPEC.md

## Objectif du projet

Faire ses courses à Carrefour de façon simplifiée et éclairée, pour pallier aux manques du site officiel.

## Fonctionnalités

- Une interface web locale avec une page d'accueil minimaliste affichant le nom de l'appli
- Une interface web locale avec quatre pages principales : `Products`, `Orders`, `Lists` et `Sync`
- Une page `Products` qui agrège les produits de toutes les commandes dans une table triable, avec fréquence d'achat
- La table de la page `Products` permet de naviguer par pagination (choix de la taille de page, boutons précédent/suivant), avec la sélection maintenue entre les pages
- La page `Products` permet de sélectionner des lignes individuellement ou par plage de fréquence d'achat (bornes min/max via slider double), puis d'appliquer une action groupée pour ajouter la sélection à une liste existante ou nouvelle
- Sur la page `Products`, le survol de l'ID ou du nom d'un produit affiche une Hover Card avec la photo du produit quand elle est disponible
- Les tables de produits des pages `Products` et détail de liste (`/lists/[id]`) sont rendues avec le même style visuel et les mêmes Hover Card avec preview image
- Une page `Orders` qui affiche les commandes synchronisées dans une table triable et ouvre un détail `/orders/{id}`
- Une page détail de commande (`/orders/{id}`) avec table triable des lignes produits
- Une page `Lists` qui permet de créer, modifier et supprimer des listes de produits (CRUD)
- Les tables `Lists`, `Products` et `Orders` permettent d'ouvrir les éléments depuis leur ID ou leur nom quand l'information existe, et exposent un bouton `Open` dans la colonne `Actions`
- Une page de détail de liste qui permet d'éditer les produits, leurs quantités, et leur URL produit Carrefour, et d'ajouter l'ensemble des produits de la liste au panier Carrefour via un bouton dédié
- Une page `Sync` qui lance une synchronisation complète locale des commandes (sans saisie de limite dans l'interface), affiche le workflow de login Carrefour et montre une progression en temps réel (étape, compteur et statut final)
- L'URL du serveur MCP utilisée par l'application est configurable via variable d'environnement et affichée telle qu'utilisée dans la page `Sync`
- L'authentification Carrefour côté application se fait en capturant une session Chrome ou Chromium déjà ouverte via CDP (`auth_capture_cdp`), pas en pilotant directement une CLI locale
- Les listes de produits sont sauvegardées dans la base de données locale
- Un script `sync:orders` qui récupère les commandes et leurs détails depuis `carrefour-mcp` et les enregistre localement
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

- Une base SQLite locale stocke les commandes, leurs produits, les listes de courses et les métadonnées de synchronisation

## Navigation

- 4 items de navigation principaux dans la sidebar :
  - Products
  - Orders
  - Lists
  - Sync
- l'item de navigation est "actif" lorsqu'on est sur la page correspondante
- lorsqu'on est sur une page de type détails (e.g. `/lists/[id]` pour `/lists` ou `/orders/[id]` pour `/orders`) :
  - l'item de navigation parent reste actif
  - un bouton `Back` dans le header de la page permet de revenir à la liste parente, présenté tout en haut à gauche de la page, avec une icône de flèche pointant vers la gauche

## Tables

Les tables présentant des entités métier ont des propriétés communes :

- au-dessus de la table, afficher le nombre de lignes total et si la table est paginée, afficher les informations de pagination (page en cours, nombre de pages total)

## Page Products

- un produit a un nom et un ID fournis par Carrefour
- la page `/products` affiche tous les produits achetés dans les commandes synchronisées, avec leur fréquence d'achat
- la table est paginée pour éviter d'être trop lourde au rendu
- la table a pour colonnes :
  - "Product" (triable) : titre du produit, avec une Hover Card affichant la photo du produit quand elle est disponible, lien externe vers la page du produit sur le site de Carrefour
  - "Occurrences" (triable) : nombre de commandes dans lesquelles le produit apparaît
  - "Frequency" (triable) : fréquence d'achat du produit
  - "Quantity" : quantité en vigueur lorsque ce produit est ajouté au panier
- la table a une toute première colonne présentant des checkboxes permettant de sélectionner des produits afin d'y appliquer une action groupée d'ajout à une liste de courses
- au-dessus de la table, une card permet de filtrer les produits :
  - par titre : champ input text (fuzzy search)
  - par fréquence : slider double avec bornes min/max
  - les lignes de la table se mettent à jour après modification des filtres en temps réel (search as you type)
- lorsqu'au moins une ligne produit est sélectionnée, une autre card apparaît au-dessus de la table et propose une action groupée d'ajout à une liste de courses :
  - un select permet de choisir une liste existante ou de créer une nouvelle liste à la volée
  - un bouton "Add to list" applique l'action et affiche un feedback de succès ou d'erreur

## Pages Orders

- une commande (order) a un ID fourni par Carrefour, une date, un créneau de livraison (delivery slot), un montant total en Euros, et une liste de produits associée
- dans le contexte d'une commande, chaque produit a une quantité commandée, un prix et un statut de disponibilité
- la page `/orders` affiche les commandes synchronisées dans une table triable, avec pour colonnes :
  - "ID" (triable) : ID de la commande, avec lien vers le détail de la commande, lien vers la page détails de commande
  - "Date" (triable) : date de la commande
  - "Delivery Slot" (triable) : créneau de livraison
  - "Products" (triable) : nombre de produits différents dans la commande
  - "Total Amount" (triable) : montant total de la commande en Euros
- la page de détail d'une commande `/orders/[id]` affiche l'ID de la commande, sa date, créneau de livraison, son montant total, et les produits liés à cette commande sous forme de table similaire à celle de la page `Products` mais avec des colonnes adaptées au contexte de la commande :
  - "Product" (triable) : titre du produit, avec une Hover Card affichant la photo du produit quand elle est disponible, lien externe vers la page du produit sur le site de Carrefour
  - "Quantity" (triable) : quantité commandée
  - "Status" (triable) : statut de la ligne produit dans la commande (e.g. "Available", "Unavailable") rendu avec un badge
  - "Price" (triable) : prix unitaire du produit en Euros (dans le cadre de cette commande)
- la table a une toute première colonne présentant des checkboxes permettant de sélectionner des produits afin d'y appliquer une action groupée d'ajout à une liste de courses
- lorsqu'au moins une ligne produit est sélectionnée, une autre card apparaît au-dessus de la table et propose une action groupée d'ajout à une liste de courses :
  - un select permet de choisir une liste existante ou de créer une nouvelle liste à la volée
  - un bouton "Add to list" applique l'action et affiche un feedback de succès ou d'erreur

## Pages Lists

- une liste a un titre en texte libre, un ID et une collection de produits avec quantité pré-sélectionnée
- l'ID d'une liste est le slug de son titre
- la page `/lists` affiche les listes disponibles dans une table et permet d'ouvrir une liste en cliquant sur son titre
- la page de détail d'une liste `/lists/[id]` affiche le titre de la liste, les produits de la liste dans une table triable avec possibilité d'éditer les quantités et les URL produits Carrefour, et un bouton pour ajouter tous les produits au panier Carrefour

## Icônes

- utiliser les icônes fournies par `@lucide/svelte` de préférence

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

## Déploiement

- Le projet fournit un sous-répertoire `deploy/` versionné dans Git.
- Le script d'installation du dépôt crée l'utilisateur Unix dédié, installe les paquets Debian nécessaires, clone ou met à jour le dépôt Git sur le serveur, déploie les unités systemd et configure nginx comme reverse proxy.
- Le script d'installation peut être exécuté depuis une simple copie du fichier (par exemple via `scp`) sans checkout local préalable.
- Si `REPO_URL` n'est pas fourni et qu'aucune métadonnée Git locale n'est disponible, le script utilise `https://github.com/cbenz/coursicota`.
- Si `REPO_BRANCH` n'est pas fourni et ne peut pas être détecté, le script utilise `main`.
- Le déploiement web de production impose HTTPS avec certificat Let's Encrypt, obtenu automatiquement pendant l'installation via `certbot`.
- L'accès applicatif via nginx est protégé par Basic Auth.
- Le chemin `/mcp` du domaine public est aussi protégé par le même Basic Auth et reverse-proxyé vers le serveur MCP local.
- Le reverse proxy nginx du chemin `/mcp` transmet un en-tête `Host` loopback au backend MCP local, afin de rester compatible avec la validation d'hôte du transport HTTP MCP.
- Le script lit les variables de déploiement suivantes:
  - `DOMAIN` (requis): nom de domaine public pointant vers le serveur
  - `LETSENCRYPT_EMAIL` (requis): e-mail de contact Let's Encrypt
  - `BASIC_AUTH_USER` (requis): identifiant Basic Auth
  - `BASIC_AUTH_PASSWORD` (requis): mot de passe Basic Auth
- L'application web de production appelle le serveur MCP via l'URL publique `https://<DOMAIN>/mcp` et réutilise les mêmes identifiants Basic Auth via `CARREFOUR_MCP_BASIC_AUTH_USER` et `CARREFOUR_MCP_BASIC_AUTH_PASSWORD`.
- L'application Node.js de production démarre depuis le répertoire `build` du checkout serveur.
