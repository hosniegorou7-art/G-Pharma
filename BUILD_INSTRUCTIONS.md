# Instructions pour générer l'exécutable Windows (.exe)

## Prérequis

### 1. Installer Rust
```bash
# Télécharger et installer Rust depuis https://rustup.rs/
# Ou utiliser la commande suivante sur Windows :
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Installer les dépendances Windows
```bash
# Installer Microsoft C++ Build Tools
# Télécharger depuis : https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Installer WebView2 (généralement déjà présent sur Windows 10/11)
# Télécharger depuis : https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

### 3. Installer les dépendances Node.js
```bash
npm install
```

## Étapes de build

### 1. Préparer l'environnement
```bash
# Vérifier que Rust est installé
rustc --version
cargo --version

# Vérifier que Tauri CLI est disponible
npx tauri --version
```

### 2. Build de production
```bash
# Build complet (frontend + backend Rust)
npm run tauri:build
```

### 3. Localisation des fichiers générés

Après le build, vous trouverez les fichiers dans :

```
src-tauri/target/release/
├── pharmacare.exe              # Exécutable principal
└── bundle/
    ├── msi/
    │   └── PharmaCare_1.0.0_x64_en-US.msi    # Installateur MSI
    └── nsis/
        └── PharmaCare_1.0.0_x64-setup.exe    # Installateur NSIS
```

## Types de fichiers générés

### 1. Exécutable portable
- **Fichier** : `pharmacare.exe`
- **Utilisation** : Peut être exécuté directement sans installation
- **Taille** : ~15-20 MB

### 2. Installateur MSI
- **Fichier** : `PharmaCare_1.0.0_x64_en-US.msi`
- **Utilisation** : Installateur Windows standard
- **Fonctionnalités** : Installation/désinstallation via Panneau de configuration

### 3. Installateur NSIS
- **Fichier** : `PharmaCare_1.0.0_x64-setup.exe`
- **Utilisation** : Installateur avec interface graphique
- **Fonctionnalités** : Installation personnalisée, raccourcis bureau/menu

## Configuration de build (optionnelle)

Pour personnaliser le build, modifiez `src-tauri/tauri.conf.json` :

```json
{
  "package": {
    "productName": "PharmaCare",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.pharmacare.app",
      "targets": ["msi", "nsis"],
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    }
  }
}
```

## Signature de code (optionnelle)

Pour signer l'exécutable (recommandé pour la distribution) :

1. Obtenir un certificat de signature de code
2. Configurer dans `tauri.conf.json` :

```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": "VOTRE_THUMBPRINT",
        "digestAlgorithm": "sha256",
        "timestampUrl": "http://timestamp.sectigo.com"
      }
    }
  }
}
```

## Dépannage

### Erreur de compilation Rust
```bash
# Mettre à jour Rust
rustup update

# Nettoyer le cache
cargo clean
```

### Erreur WebView2
```bash
# Télécharger et installer WebView2 Runtime
# https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

### Erreur de permissions
```bash
# Exécuter en tant qu'administrateur
# Ou désactiver temporairement l'antivirus
```

## Distribution

### Pour un usage interne
- Utiliser l'exécutable portable (`pharmacare.exe`)
- Copier sur une clé USB ou partage réseau

### Pour une distribution professionnelle
- Utiliser l'installateur MSI ou NSIS
- Signer le code avec un certificat valide
- Tester sur différentes versions de Windows

## Fonctionnalités de l'application

L'exécutable généré inclut :
- ✅ Interface utilisateur complète
- ✅ Base de données MySQL intégrée
- ✅ Impression native des factures
- ✅ Sauvegarde de fichiers
- ✅ Gestion hors ligne
- ✅ Toutes les fonctionnalités web

## Support

L'application fonctionne sur :
- Windows 10 (version 1903+)
- Windows 11
- Architecture x64

Taille approximative : 15-25 MB