# coursicota

`coursicota` est une interface locale pour préparer plus vite ses courses Carrefour à partir de son historique réel.

## Ce que fait l'application

- affiche une navigation simple avec 4 sections : `Products`, `Orders`, `Lists`, `Sync`
- conserve une sidebar propre en mode réduit (icon), avec un header/footer composés via les composants Sidebar
- synchronise l'historique des commandes et leurs détails depuis Carrefour dans une base locale
- centralise tous les produits achetés dans une table triable avec fréquence d'achat
- virtualise les lignes de la table `Products` pour garder un rendu fluide même avec de très gros volumes, avec un vrai tableau, un en-tête sticky, des colonnes alignées, des classes utilitaires standard et sans superposer les lignes
- permet de sélectionner des lignes produits individuellement ou par plage de fréquence (slider double), puis d'ajouter la sélection en masse à une liste
- affiche une Hover Card avec la photo d'un produit au survol de son ID ou de son nom (quand la photo est disponible)
- permet d'ouvrir le détail de chaque commande (`/orders/{id}`)
- permet d'ouvrir les éléments depuis leur ID ou leur nom (quand disponible) dans les tables `Lists`, `Products` et `Orders`
- affiche un bouton `Open` dans la colonne `Actions` de ces tables pour un accès direct
- permet de créer, éditer et suivre des listes de courses locales
- permet d'ajouter un produit à une liste depuis les tables produits, avec choix d'une liste existante ou création immédiate d'une nouvelle liste
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

Pour un déploiement Debian, le dépôt fournit aussi `deploy/scripts/install.sh`, qui crée l'utilisateur Unix dédié, installe les paquets système requis, clone ou met à jour le dépôt sur le serveur, configure nginx et enregistre les services systemd.

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
pnpm cli -- auth_login
```

1. Se connecter manuellement à Carrefour dans ce navigateur.
2. Importer l'état de session :

```bash
pnpm cli auth_upload --server-url <mcp-server-url>
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
