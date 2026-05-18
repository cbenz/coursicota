# coursicota

`coursicota` est une interface locale pour préparer plus vite ses courses Carrefour à partir de son historique réel.

## Ce que fait l'application

- affiche une navigation simple avec 4 sections : `Products`, `Orders`, `Lists`, `Sync`
- conserve une sidebar propre en mode réduit (icon), avec un header/footer composés via les composants Sidebar
- ferme automatiquement la sidebar en mode mobile après sélection d'un item de navigation
- synchronise l'historique des commandes et leurs détails depuis Carrefour dans une base locale
- centralise tous les produits achetés dans une table triable avec fréquence d'achat
- la table `Products` expose les colonnes `Product`, `Occurrences`, `Frequency`, `Last ordered`, `Amount`, `Quantity` (sans colonne `Actions`), avec sélection par checkbox pour les actions groupées
- permet de filtrer les produits en temps réel (fenêtre temporelle + titre + plage de fréquence), de paginer le tableau (taille de page configurable) et de conserver la sélection entre les pages
- recalcule les produits, occurrences, fréquence, date de dernière commande et montant en fonction de la période sélectionnée (exemples: 1 an, 2 dernières années)
- normalise la recherche produit pour ignorer accents, ligatures (`oe`/`œ`) et apostrophes (`pims`/`pim's`)
- démarre la page `Products` avec des filtres par défaut en état clear (période toutes les commandes, titre vide, fréquence 0% à 100%)
- propose un bouton `Clear filters` pour réinitialiser les filtres de la page `Products`
- en desktop, les cards de contrôle (`Filters` sur `Products`, action groupée sur le détail commande) peuvent occuper environ 50% de la largeur
- permet de sélectionner des lignes produits individuellement ou par plage de fréquence (slider double), puis d'ajouter la sélection en masse à une liste
- sur la card d'ajout groupé de `Products`, si une seule liste existe elle est pré-sélectionnée automatiquement
- sur `Products`, en desktop la card d'ajout groupé s'affiche à droite de la card de filtres (50/50), et en mobile les cards restent empilées
- dans la card d'ajout groupé, le champ de création de liste est sur sa propre ligne et sa saisie désélectionne automatiquement la liste choisie dans le select
- affiche une Hover Card avec la photo d'un produit au survol de son ID ou de son nom (quand la photo est disponible), avec le titre complet du produit
- permet d'ouvrir le détail de chaque commande (`/orders/{id}`)
- sur les pages de détail (`/orders/[id]`, `/lists/[id]`), affiche un bouton `Back` en haut à gauche avec une flèche vers la gauche
- dans le détail d'une commande, les lignes produits se sélectionnent par checkbox pour une action groupée `Add to list` (sans colonne `Actions`)
- permet d'ouvrir les éléments depuis leur ID ou leur nom (quand disponible) dans les tables `Lists` et `Orders`, et depuis la colonne `Product` dans `Products`
- affiche un bouton `Open` dans la colonne `Actions` des tables `Lists` et `Orders`
- permet de créer, éditer et suivre des listes de courses locales
- garantit qu'un produit n'existe qu'une seule fois par liste (un nouvel ajout du même produit est ignoré sans erreur)
- permet d'ajouter un produit à une liste depuis les tables produits, avec choix d'une liste existante ou création immédiate d'une nouvelle liste
- affiche une colonne `Actions` dans le détail d'une liste pour supprimer un produit de la liste
- affiche une colonne `Amount` dans le détail d'une liste avec le prix issu de la dernière commande connue du produit, et n'affiche pas la colonne `Pack`
- demande une confirmation avant `Add to Carrefour cart`, en précisant que les produits seront ajoutés au panier sur `carrefour.fr`
- après `Add to Carrefour cart`, affiche un rapport détaillant les produits en échec (pas seulement le compteur)
- propose des états visuels explicites (erreur, succès, état vide) pour chaque action importante
- affiche la progression de synchronisation en temps réel dans `Sync` (étape en cours, commandes traitées, statut final)

## Prérequis

- Node.js 20+
- `pnpm` 10+
- le projet voisin `carrefour-mcp` installé dans le même workspace
- le serveur HTTP `carrefour-mcp` démarré sur l'URL configurée (par défaut `http://127.0.0.1:3000/mcp`)
- une instance Chrome ou Chromium avec CDP activé sur `http://127.0.0.1:9222`

Variables d'environnement supportées pour l'URL MCP :

- `CARREFOUR_MCP_SERVER_URL` (prioritaire)
- `PUBLIC_CARREFOUR_MCP_SERVER_URL`
- valeur par défaut si aucune variable n'est définie : `http://127.0.0.1:3000/mcp`

## Installation

Dans `carrefour-mcp` :

```bash
pnpm install
pnpm install:browsers
pnpm dev:http
```

Dans `coursicota` :

```bash
pnpm install
```

Pour un déploiement Debian, le dépôt fournit aussi `deploy/scripts/install.sh`, qui crée l'utilisateur Unix dédié, installe les paquets système requis, clone ou met à jour le dépôt sur le serveur, configure nginx et enregistre les services systemd, puis redémarre explicitement le service applicatif après build. Si `deploy/scripts/install.sh` change pendant la mise à jour du dépôt, l'installateur se relance automatiquement une fois pour appliquer immédiatement la logique mise à jour. Les units systemd déployées appliquent un profil de redémarrage agressif avec délai de relance court et timeout d'arrêt réduit.
Le script peut être copié et exécuté hors d'un checkout local ; si `REPO_URL` n'est pas fourni et qu'aucune métadonnée Git locale n'est disponible, il utilise `https://github.com/cbenz/coursicota` (branche `main` si non détectée).
Le script force le stockage des données SQLite dans un répertoire persistant hors artefacts de build (par défaut `/home/coursicota/data/coursicota`).
Le déploiement web est configuré en HTTPS avec certificat Let's Encrypt et protégé par Basic Auth.
Le chemin public `/mcp` réutilise le même Basic Auth pour les appels applicatifs.

Variables nécessaires avant lancement du script d'installation :

- `DOMAIN` (exemple : `app.example.com`)
- `LETSENCRYPT_EMAIL` (exemple : `admin@example.com`)
- `BASIC_AUTH_USER`
- `BASIC_AUTH_PASSWORD`

L'application de production lit aussi `CARREFOUR_MCP_SERVER_URL`, `CARREFOUR_MCP_BASIC_AUTH_USER` et `CARREFOUR_MCP_BASIC_AUTH_PASSWORD` depuis son environnement système.

## Démarrer l'interface web

```bash
pnpm dev
```

L'application est ensuite disponible sur l'URL affichée par Vite.

## Parcours recommandé

1. Aller sur `Sync` pour vérifier l'état de session et lancer une synchronisation.
2. Aller sur `Products` pour parcourir les produits récurrents et les ajouter à des listes.
3. Aller sur `Orders` pour explorer les commandes puis ouvrir un détail.
4. Aller sur `Lists` pour maintenir les listes finales de courses.

## Connecter Carrefour

Depuis `Sync` :

1. Ouvrir au préalable un navigateur Chrome ou Chromium avec le débogage distant activé sur le port `9222`.
2. Lancer dans un terminal :

```bash
pnpm cli auth_login
```

1. Se connecter manuellement à Carrefour dans ce navigateur.
2. Capturer l'état de session :

```bash
pnpm cli auth_capture_state --cdp-url http://127.0.0.1:9222
```

## Synchroniser les commandes

Depuis l'interface :

- aller dans `Sync`
- lancer la synchronisation

Depuis le terminal :

```bash
pnpm sync:orders
pnpm sync:orders 40
```

## Utiliser les listes

- créer une liste manuelle
- ajouter ou retirer des produits
- cocher les produits déjà pris
- ouvrir directement les fiches produits Carrefour quand une URL produit est connue

Les listes sont enregistrées localement dans la base de données SQLite.

## Générer le panier standard

Depuis le terminal :

```bash
pnpm compute:standard-basket
```

Le panier standard est calculé à partir des produits commandés plusieurs fois dans l'historique local.

## Vérification

```bash
pnpm check
pnpm test
```
