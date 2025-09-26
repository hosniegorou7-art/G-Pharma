# Configuration Réseau pour PharmaCare

## 🌐 Configuration pour accès réseau à la base de données

### 1. Configuration du serveur de base de données

**Sur la machine serveur (où se trouve MySQL et le serveur Node.js) :**

1. **Démarrer le serveur avec accès réseau :**
```bash
cd server
npm start
```

2. **Vérifier l'IP du serveur :**
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

3. **Configurer le pare-feu :**
- Autoriser le port 3001 dans le pare-feu
- Windows : Panneau de configuration > Système et sécurité > Pare-feu Windows
- Linux : `sudo ufw allow 3001`

### 2. Configuration de l'application Tauri

**Dans le fichier `src/utils/api.ts` :**

```typescript
const SERVER_IP = '192.168.1.100'; // 🔧 REMPLACEZ par l'IP de votre serveur
```

**Remplacez `192.168.1.100` par l'adresse IP réelle de votre serveur.**

### 3. Test de connectivité

1. **Depuis un navigateur sur une autre machine :**
```
http://IP_DU_SERVEUR:3001/api/health
```

2. **Exemple :**
```
http://192.168.1.100:3001/api/health
```

### 4. Configuration MySQL (si nécessaire)

**Si MySQL refuse les connexions réseau :**

1. **Modifier `my.cnf` ou `my.ini` :**
```ini
[mysqld]
bind-address = 0.0.0.0
```

2. **Créer un utilisateur pour l'accès réseau :**
```sql
CREATE USER 'pharmacare'@'%' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON pharmacare_db.* TO 'pharmacare'@'%';
FLUSH PRIVILEGES;
```

3. **Redémarrer MySQL**

### 5. Vérification de la configuration

**L'application affiche maintenant un indicateur de statut réseau dans l'en-tête :**
- 🟢 Vert : Connecté au serveur
- 🔴 Rouge : Déconnecté
- ⚪ Gris : Test en cours

### 6. Dépannage

**Problèmes courants :**

1. **Erreur de connexion :**
   - Vérifier que le serveur est démarré
   - Vérifier l'IP dans `api.ts`
   - Vérifier le pare-feu

2. **Timeout :**
   - Vérifier la connectivité réseau
   - Ping l'IP du serveur

3. **Erreur CORS :**
   - Le serveur est configuré pour accepter toutes les origines
   - Vérifier la configuration CORS dans `server/index.js`

### 7. Build de l'application

**Pour créer l'exécutable avec la configuration réseau :**

```bash
npm run tauri:build
```

L'exécutable généré se connectera automatiquement au serveur réseau configuré.

### 8. Déploiement

**Pour déployer sur plusieurs postes :**

1. Installer l'exécutable sur chaque poste client
2. S'assurer que tous les postes sont sur le même réseau
3. Le serveur doit rester allumé et accessible

**Architecture recommandée :**
```
Serveur (MySQL + Node.js)
    ↓ Réseau local
Poste 1 (PharmaCare.exe)
Poste 2 (PharmaCare.exe)
Poste 3 (PharmaCare.exe)
```