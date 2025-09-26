# PharmaCare - Système de Gestion de Pharmacie

Un système complet de gestion de pharmacie développé avec React/Vite pour le frontend et Node.js/Express avec MySQL pour le backend. Disponible en version web et application de bureau.

## 🚀 Fonctionnalités

### ✅ Authentification & Sécurité
- Système d'authentification sécurisé avec JWT
- Connexion par nom d'utilisateur ou email
- Gestion des rôles et permissions (Admin, Pharmacien, Caissier, Vendeur)
- Stockage local pour fonctionnement hors ligne

### 💊 Gestion des Ventes
- Interface de caisse intuitive
- Recherche rapide de médicaments
- Calcul automatique des totaux
- Support de différents modes de paiement (Espèces, Carte, Mobile Money)
- Génération et impression de factures
- Restrictions par rôle (vendeurs ne peuvent pas finaliser les ventes)

### 📦 Gestion des Stocks
- CRUD complet pour les produits
- Catégorisation des médicaments
- Alertes de stock faible
- Suivi des dates d'expiration
- Gestion des lots et fournisseurs

### 👥 Gestion des Utilisateurs
- Création et modification d'utilisateurs
- Attribution de rôles (Admin, Pharmacien, Caissier, Vendeur)
- Connexion par nom d'utilisateur
- Email optionnel
- Historique des connexions
- Statuts actif/inactif

### 🚚 Gestion des Fournisseurs
- Base de données des fournisseurs
- Historique des livraisons
- Informations de contact complètes
- Accès restreint (Admin/Pharmacien uniquement)

### 📊 Rapports & Statistiques
- Tableau de bord avec métriques en temps réel
- Graphiques de ventes et tendances
- Top des produits vendus
- Export PDF/Excel des rapports
- Accès restreint (Admin/Pharmacien uniquement)

### 🔔 Notifications & Alertes
- Alertes de stock faible
- Notifications d'expiration
- Système de notifications en temps réel

### 💾 Sauvegarde Automatique
- Sauvegarde quotidienne automatique à minuit
- Sauvegarde manuelle disponible
- Export des données au format JSON

## 🛠️ Technologies Utilisées

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le build et le développement
- **TailwindCSS** pour le design
- **React Router** pour la navigation
- **Recharts** pour les graphiques
- **Lucide React** pour les icônes
- **date-fns** pour la gestion des dates

### Backend
- **Node.js** avec Express
- **MySQL** pour la base de données
- **JWT** pour l'authentification
- **bcryptjs** pour le hachage des mots de passe
- **node-cron** pour les tâches programmées
- **CORS** pour les requêtes cross-origin

### Application de Bureau
- **Tauri** pour l'application native
- **Rust** pour le backend natif
- **Impression native** intégrée
- **Gestion de fichiers** native

## 🚀 Installation et Configuration

### Prérequis
- Node.js (version 16 ou supérieure)
- MySQL Server
- Rust (pour l'application de bureau)
- WAMP/XAMPP (pour l'environnement local)

### Installation

1. **Cloner le projet**
```bash
git clone [url-du-repo]
cd pharmacy-management-system
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de la base de données**
- Démarrer MySQL via WAMP/XAMPP
- La base de données sera créée automatiquement au premier lancement

## 🌐 Utilisation

### Version Web

**Frontend (développement):**
```bash
npm run dev
```

**Backend:**
```bash
npm run server
```

### Application de Bureau

**Développement:**
```bash
npm run tauri:dev
```

**Build pour production:**
```bash
npm run tauri:build
```

## 🔐 Comptes de Test

L'application inclut des comptes de test prédéfinis :

| Rôle | Nom d'utilisateur | Mot de passe | Accès |
|------|-------------------|--------------|-------|
| Administrateur | admin | admin123 | Complet |
| Pharmacien | pharmacien | pharma123 | Complet |
| Caissier | caissier | caisse123 | Ventes + Base |
| Vendeur | vendeur | vendeur123 | Consultation uniquement |

## 🔒 Système de Rôles

### Administrateur
- Accès complet à toutes les fonctionnalités
- Gestion des utilisateurs et fournisseurs
- Rapports et paramètres

### Pharmacien
- Accès complet sauf création d'administrateurs
- Gestion des utilisateurs et fournisseurs
- Rapports et paramètres

### Caissier
- Ventes complètes avec finalisation
- Gestion des stocks
- Tableau de bord

### Vendeur
- Consultation des produits
- Ajout au panier
- **Ne peut pas** finaliser les ventes
- **Ne peut pas** imprimer les factures
- Accès limité au tableau de bord et stocks

## 📱 Interface Utilisateur

### Design
- Interface moderne et professionnelle
- Palette de couleurs pharmaceutique
- Design responsive (mobile, tablette, desktop)
- Animations fluides et micro-interactions
- Navigation intuitive avec sidebar collapsible

### Accessibilité
- Contrastes de couleurs optimisés
- Navigation au clavier
- Textes lisibles sur tous les arrière-plans
- Système d'espacement cohérent (8px)

## 🖨️ Impression

### Application de Bureau
- Impression native via Tauri
- Formatage professionnel des factures
- Gestion automatique des imprimantes

### Version Web
- Impression via navigateur
- Fenêtre d'impression dédiée
- Compatible avec tous les navigateurs modernes

## 🗄️ Structure de la Base de Données

### Tables Principales
- `users` - Utilisateurs du système (avec username)
- `products` - Catalogue des médicaments
- `categories` - Catégories de produits
- `suppliers` - Fournisseurs
- `sales` - Ventes effectuées
- `sale_items` - Détails des ventes
- `notifications` - Système de notifications

### Fonctionnalités Automatiques
- Création automatique de la base de données
- Insertion des données par défaut
- Contraintes d'intégrité référentielle
- Timestamps automatiques

## 🔧 Configuration

### Variables d'Environnement
```env
PORT=3001
JWT_SECRET=pharmacare_secret_key_2024
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=pharmacare_db
```

### Paramètres Configurables
- Seuil de stock faible
- Délai d'alerte d'expiration
- Heure de sauvegarde automatique
- Préférences de notifications

## 📈 Fonctionnalités Avancées

### Sauvegarde
- Sauvegarde automatique quotidienne
- Export manuel des données
- Format JSON pour portabilité
- Stockage local sécurisé

### Notifications
- Système de notifications en temps réel
- Alertes personnalisables
- Marquage lu/non lu
- Historique des notifications

### Rapports
- Génération automatique de statistiques
- Graphiques interactifs
- Export PDF/Excel
- Filtrage par période

## 🔒 Sécurité

- Authentification JWT sécurisée
- Hachage des mots de passe avec bcrypt
- Validation des données côté serveur
- Protection contre les injections SQL
- Gestion des sessions utilisateur
- Contrôle d'accès basé sur les rôles

## 🚀 Déploiement

### Application de Bureau
1. Construire l'application : `npm run tauri:build`
2. L'exécutable sera généré dans `src-tauri/target/release/`
3. Distribuer l'installateur selon la plateforme

### Version Web
1. Build du frontend : `npm run build`
2. Déployer le dossier `dist` sur un serveur web
3. Configurer le backend sur un serveur Node.js

## 📞 Support

Pour toute question ou problème :
- Consulter la documentation
- Vérifier les logs d'erreur
- Contacter l'équipe de développement

## 📄 Licence

Ce projet est développé pour un usage professionnel en pharmacie.

---

**PharmaCare** - Système de gestion moderne pour pharmacies professionnelles disponible en version web et application de bureau native.