const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacare_secret_key_2024';

// Configuration CORS étendue pour le réseau local
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'tauri://localhost'], // Origines locales uniquement
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmacare_db'
};

let db;

// Fonction pour obtenir l'adresse IP locale
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

// Initialisation de la base de données
async function initializeDatabase() {
  try {
    // Connexion sans spécifier la base de données
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Créer la base de données si elle n'existe pas
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.end();

    // Connexion à la base de données
    db = await mysql.createConnection(dbConfig);

    // Créer les tables
    await createTables();
    
    console.log('✅ Base de données initialisée avec succès');
    console.log('📊 Toutes les tables créées');
    console.log('👤 Compte administrateur créé: admin / admin123');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    // Continuer sans base de données (mode test)
    console.log('⚠️  Fonctionnement en mode test sans base de données');
  }
}

// Création des tables
async function createTables() {
  const tables = [
    // Table des utilisateurs (modifiée pour inclure username)
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(191) UNIQUE NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      role ENUM('admin', 'pharmacist', 'cashier', 'seller') DEFAULT 'cashier',
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL
    )`,

    // Table des fournisseurs
    `CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact VARCHAR(255),
      email VARCHAR(191),
      phone VARCHAR(50),
      address TEXT,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Table des catégories
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Table des produits
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category_id INT,
      purchase_price DECIMAL(10,2) DEFAULT 0,
      price DECIMAL(10,2) DEFAULT 0,
      stock INT DEFAULT 0,
      min_stock INT DEFAULT 0,
      supplier_id INT,
      expiry_date DATE,
      batch_number VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    )`,

    // Table des ventes (modifiée pour inclure amount_received)
    `CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255),
      user_id INT NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      amount_received DECIMAL(10,2) DEFAULT NULL,
      change_amount DECIMAL(10,2) DEFAULT NULL,
      payment_method ENUM('cash', 'card', 'mobile') DEFAULT 'cash',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Table des détails de vente
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`,

    // Table des notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('success', 'error', 'warning', 'info') DEFAULT 'info',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      user_id INT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,

    // Table des logs d'activité
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      action VARCHAR(255) NOT NULL,
      table_name VARCHAR(100),
      record_id INT,
      old_values JSON,
      new_values JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Table des paramètres système
    `CREATE TABLE IF NOT EXISTS settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(191) UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  ];

  for (const table of tables) {
    await db.execute(table);
  }

  // Ajouter les colonnes username si elles n'existent pas déjà
  try {
    await db.execute(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE AFTER name,
      MODIFY COLUMN email VARCHAR(191) UNIQUE NULL
    `);
  } catch (error) {
    // Ignorer l'erreur si les colonnes existent déjà
    console.log('Colonnes username déjà présentes ou email déjà modifié');
  }

  // Insérer des données par défaut
  await insertDefaultData();
}

// Insertion des données par défaut
async function insertDefaultData() {
  try {
    // Vérifier si des utilisateurs existent déjà
    const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
    
    if (users[0].count === 0) {
      // Créer l'utilisateur admin par défaut
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.execute(
        'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['Administrateur', 'admin', 'admin@pharmacare.com', hashedPassword, 'admin']
      );

      // Créer des utilisateurs de test supplémentaires
      const pharmacistPassword = await bcrypt.hash('pharma123', 10);
      await db.execute(
        'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['Dr. Pharmacien', 'pharmacien', 'pharmacien@pharmacare.com', pharmacistPassword, 'pharmacist']
      );

      const cashierPassword = await bcrypt.hash('caisse123', 10);
      await db.execute(
        'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['Caissier', 'caissier', 'caissier@pharmacare.com', cashierPassword, 'cashier']
      );

      // Nouveau rôle vendeur
      const sellerPassword = await bcrypt.hash('vendeur123', 10);
      await db.execute(
        'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
        ['Vendeur', 'vendeur', sellerPassword, 'seller']
      );

      // Insérer des catégories par défaut
      const categories = [
        ['Analgésique', 'Médicaments contre la douleur'],
        ['Antibiotique', 'Médicaments contre les infections'],
        ['Anti-inflammatoire', 'Médicaments anti-inflammatoires'],
        ['Vitamines', 'Compléments vitaminiques'],
        ['Cardiovasculaire', 'Médicaments pour le cœur'],
        ['Digestif', 'Médicaments pour la digestion']
      ];

      for (const [name, description] of categories) {
        await db.execute(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          [name, description]
        );
      }

      // Insérer des fournisseurs par défaut
      const suppliers = [
        ['Pharma Distributors', 'Jean Kouassi', 'contact@pharmadist.ci', '+225 27 20 30 40', 'Zone 4, Marcory, Abidjan'],
        ['MedSupply Co', 'Marie Traoré', 'info@medsupply.ci', '+225 27 20 30 41', 'Treichville, Abidjan'],
        ['Global Pharma', 'Paul Diarra', 'sales@globalpharma.ci', '+225 27 20 30 42', 'Cocody, Abidjan']
      ];

      for (const [name, contact, email, phone, address] of suppliers) {
        await db.execute(
          'INSERT INTO suppliers (name, contact, email, phone, address) VALUES (?, ?, ?, ?, ?)',
          [name, contact, email, phone, address]
        );
      }

      // Insérer des produits par défaut
      const products = [
        ['Paracétamol 500mg', 1, 300, 500, 45, 20, 1, '2025-12-31', 'BAT001'],
        ['Amoxicilline 250mg', 2, 2500, 3000, 23, 15, 2, '2024-06-15', 'BAT002'],
        ['Ibuprofène 400mg', 3, 1500, 2000, 67, 25, 3, '2025-08-20', 'BAT003'],
        ['Aspirine 500mg', 1, 350, 500, 89, 30, 1, '2025-10-15', 'BAT004'],
        ['Doliprane 1000mg', 1, 1200, 1500, 34, 20, 2, '2025-05-30', 'BAT005']
      ];

      for (const [name, category_id, purchase_price, price, stock, min_stock, supplier_id, expiry_date, batch_number] of products) {
        await db.execute(
          'INSERT INTO products (name, category_id, purchase_price, price, stock, min_stock, supplier_id, expiry_date, batch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [name, category_id, purchase_price, price, stock, min_stock, supplier_id, expiry_date, batch_number]
        );
      }

      // Insérer des paramètres par défaut
      const defaultSettings = [
        ['pharmacy_name', 'PharmaCare', 'string', 'Nom de la pharmacie'],
        ['pharmacy_address', 'Cocody, Abidjan', 'string', 'Adresse de la pharmacie'],
        ['pharmacy_phone', '+225 27 20 30 40', 'string', 'Téléphone de la pharmacie'],
        ['pharmacy_email', 'contact@pharmacare.ci', 'string', 'Email de la pharmacie'],
        ['currency', 'F CFA', 'string', 'Devise utilisée'],
        ['low_stock_threshold', '20', 'number', 'Seuil de stock faible'],
        ['expiry_warning_days', '30', 'number', 'Alerte d\'expiration en jours'],
        ['auto_backup', 'true', 'boolean', 'Sauvegarde automatique'],
        ['backup_time', '00:00', 'string', 'Heure de sauvegarde'],
        ['notifications', '{"lowStock":true,"expiry":true,"sales":false,"system":true}', 'json', 'Paramètres de notifications']
      ];

      for (const [key, value, type, description] of defaultSettings) {
        await db.execute(
          'INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)',
          [key, value, type, description]
        );
      }

      console.log('✅ Données par défaut insérées');
      console.log('👤 Comptes créés:');
      console.log('   - admin / admin123 (Administrateur)');
      console.log('   - pharmacien / pharma123 (Pharmacien)');
      console.log('   - caissier / caisse123 (Caissier)');
      console.log('   - vendeur / vendeur123 (Vendeur)');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données par défaut:', error);
  }
}

// Fonction de logging des activités
async function logActivity(userId, action, tableName = null, recordId = null, oldValues = null, newValues = null, req = null) {
  if (!db) return;
  
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
    const userAgent = req ? req.headers['user-agent'] : null;
    
    await db.execute(
      'INSERT INTO activity_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, action, tableName, recordId, JSON.stringify(oldValues), JSON.stringify(newValues), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Erreur lors du logging:', error);
  }
}

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Route de test de connectivité
app.get('/api/health', (req, res) => {
  const localIP = getLocalIPAddress();
  res.json({ 
    status: 'OK', 
    database: db ? 'Connectée' : 'Non disponible',
    timestamp: new Date().toISOString(),
    server_ip: localIP,
    port: PORT,
    message: `Serveur accessible sur http://${localIP}:${PORT}/api`
  });
});

// Routes d'authentification (modifiées pour supporter username)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    // Rechercher par username ou email
    const [users] = await db.execute(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND status = "active"',
      [usernameOrEmail, usernameOrEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Mettre à jour la dernière connexion
    await db.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Logger la connexion
    await logActivity(user.id, 'LOGIN', 'users', user.id, null, { username: user.username }, req);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des utilisateurs (modifiées pour supporter username)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const [users] = await db.execute(`
      SELECT id, name, username, email, phone, role, status, created_at, last_login
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { name, username, email, password, phone, role, status } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);

    const [result] = await db.execute(
      'INSERT INTO users (name, username, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, username, email || null, hashedPassword, phone || null, role || 'cashier', status || 'active']
    );

    // Logger l'action
    await logActivity(req.user.id, 'CREATE_USER', 'users', result.insertId, null, { name, username, role }, req);

    res.json({ id: result.insertId, message: 'Utilisateur créé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { id } = req.params;
    const { name, username, email, phone, role, status } = req.body;

    // Récupérer les anciennes valeurs
    const [oldUser] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);

    await db.execute(
      'UPDATE users SET name = ?, username = ?, email = ?, phone = ?, role = ?, status = ? WHERE id = ?',
      [name, username, email || null, phone || null, role, status, id]
    );

    // Logger l'action
    await logActivity(req.user.id, 'UPDATE_USER', 'users', id, oldUser[0], { name, username, email, phone, role, status }, req);

    res.json({ message: 'Utilisateur modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { id } = req.params;

    // Récupérer les données avant suppression
    const [oldUser] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);

    await db.execute('DELETE FROM users WHERE id = ?', [id]);

    // Logger l'action
    await logActivity(req.user.id, 'DELETE_USER', 'users', id, oldUser[0], null, req);

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des catégories
app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const [categories] = await db.execute('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des fournisseurs
app.get('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const [suppliers] = await db.execute('SELECT * FROM suppliers ORDER BY name');
    res.json(suppliers);
  } catch (error) {
    console.error('Erreur lors de la récupération des fournisseurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { name, contact, email, phone, address, status } = req.body;

    const [result] = await db.execute(
      'INSERT INTO suppliers (name, contact, email, phone, address, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, contact || null, email || null, phone || null, address || null, status || 'active']
    );

    // Logger l'action
    await logActivity(req.user.id, 'CREATE_SUPPLIER', 'suppliers', result.insertId, null, { name, contact, email }, req);

    res.json({ id: result.insertId, message: 'Fournisseur créé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création du fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { id } = req.params;
    const { name, contact, email, phone, address, status } = req.body;

    // Récupérer les anciennes valeurs
    const [oldSupplier] = await db.execute('SELECT * FROM suppliers WHERE id = ?', [id]);

    await db.execute(
      'UPDATE suppliers SET name = ?, contact = ?, email = ?, phone = ?, address = ?, status = ? WHERE id = ?',
      [name, contact || null, email || null, phone || null, address || null, status, id]
    );

    // Logger l'action
    await logActivity(req.user.id, 'UPDATE_SUPPLIER', 'suppliers', id, oldSupplier[0], { name, contact, email, phone, address, status }, req);

    res.json({ message: 'Fournisseur modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification du fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { id } = req.params;

    // Récupérer les données avant suppression
    const [oldSupplier] = await db.execute('SELECT * FROM suppliers WHERE id = ?', [id]);

    await db.execute('DELETE FROM suppliers WHERE id = ?', [id]);

    // Logger l'action
    await logActivity(req.user.id, 'DELETE_SUPPLIER', 'suppliers', id, oldSupplier[0], null, req);

    res.json({ message: 'Fournisseur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des produits
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const [products] = await db.execute(`
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.name
    `);

    res.json(products);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { name, category_id, purchase_price, price, stock, min_stock, supplier_id, expiry_date, batch_number } = req.body;

    const [result] = await db.execute(
      'INSERT INTO products (name, category_id, purchase_price, price, stock, min_stock, supplier_id, expiry_date, batch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category_id || null, purchase_price || 0, price || 0, stock || 0, min_stock || 0, supplier_id || null, expiry_date || null, batch_number || null]
    );

    // Logger l'action
    await logActivity(req.user.id, 'CREATE_PRODUCT', 'products', result.insertId, null, { name, purchase_price, price, stock }, req);

    res.json({ id: result.insertId, message: 'Produit ajouté avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du produit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { id } = req.params;
    const { name, category_id, purchase_price, price, stock, min_stock, supplier_id, expiry_date, batch_number } = req.body;

    // Récupérer les anciennes valeurs
    const [oldProduct] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);

    await db.execute(
      'UPDATE products SET name = ?, category_id = ?, purchase_price = ?, price = ?, stock = ?, min_stock = ?, supplier_id = ?, expiry_date = ?, batch_number = ? WHERE id = ?',
      [name, category_id || null, purchase_price || 0, price || 0, stock || 0, min_stock || 0, supplier_id || null, expiry_date || null, batch_number || null, id]
    );

    // Logger l'action
    await logActivity(req.user.id, 'UPDATE_PRODUCT', 'products', id, oldProduct[0], { name, category_id, purchase_price, price, stock, min_stock, supplier_id, expiry_date, batch_number }, req);

    res.json({ message: 'Produit modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification du produit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { id } = req.params;

    // Récupérer les données avant suppression
    const [oldProduct] = await db.execute('SELECT * FROM products WHERE id = ?', [id]);

    await db.execute('DELETE FROM products WHERE id = ?', [id]);

    // Logger l'action
    await logActivity(req.user.id, 'DELETE_PRODUCT', 'products', id, oldProduct[0], null, req);

    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des ventes (modifiées pour inclure amount_received)
app.get('/api/sales', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const [sales] = await db.execute(`
      SELECT s.*, u.name as user_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    res.json(sales);
  } catch (error) {
    console.error('Erreur lors de la récupération des ventes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/sales/:id/items', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { id } = req.params;

    const [items] = await db.execute(`
      SELECT si.*, p.name as product_name
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [id]);

    res.json(items);
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de vente:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour récupérer une vente complète avec ses détails (pour l'impression)
app.get('/api/sales/:id/invoice', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { id } = req.params;

    // Récupérer les informations de la vente
    const [sales] = await db.execute(`
      SELECT s.*, u.name as user_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [id]);

    if (sales.length === 0) {
      return res.status(404).json({ error: 'Vente non trouvée' });
    }

    // Récupérer les articles de la vente
    const [items] = await db.execute(`
      SELECT si.*, p.name as product_name
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [id]);

    // Récupérer les paramètres de la pharmacie
    const [settings] = await db.execute('SELECT * FROM settings');
    const pharmacySettings = {};
    settings.forEach(setting => {
      pharmacySettings[setting.setting_key] = setting.setting_value;
    });

    res.json({
      sale: sales[0],
      items,
      pharmacy: pharmacySettings
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la facture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/sales', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { customer_name, items, total, amount_received, payment_method } = req.body;

    // Calculer la monnaie à rendre
    const changeAmount = amount_received ? (amount_received - total) : null;

    // Commencer une transaction
    await db.beginTransaction();

    try {
      // Insérer la vente avec le montant encaissé
      const [saleResult] = await db.execute(
        'INSERT INTO sales (customer_name, user_id, total, amount_received, change_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
        [customer_name || null, req.user.id, total, amount_received || null, changeAmount, payment_method || 'cash']
      );

      const saleId = saleResult.insertId;

      // Insérer les articles de la vente et mettre à jour le stock
      for (const item of items) {
        await db.execute(
          'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [saleId, item.id, item.quantity, item.price]
        );

        // Mettre à jour le stock
        await db.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.id]
        );
      }

      await db.commit();

      // Logger l'action
      await logActivity(req.user.id, 'CREATE_SALE', 'sales', saleId, null, { 
        customer_name, 
        total, 
        amount_received, 
        change_amount: changeAmount,
        items_count: items.length 
      }, req);

      res.json({ 
        id: saleId, 
        change_amount: changeAmount,
        message: 'Vente enregistrée avec succès' 
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la vente:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des statistiques
app.get('/api/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    // Vérifier les produits qui expirent bientôt
    const [expiringProducts] = await db.execute(`
      SELECT p.*, DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
      FROM products p 
      WHERE p.expiry_date IS NOT NULL 
      AND DATEDIFF(p.expiry_date, CURDATE()) <= 30
      AND DATEDIFF(p.expiry_date, CURDATE()) >= 0
      ORDER BY days_until_expiry ASC
    `);

    // Créer des notifications pour les produits qui expirent
    for (const product of expiringProducts) {
      const existingNotification = await db.execute(
        'SELECT id FROM notifications WHERE title LIKE ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)',
        [`%${product.name}%expir%`]
      );
      
      if (existingNotification[0].length === 0) {
        await db.execute(
          'INSERT INTO notifications (type, title, message, user_id) VALUES (?, ?, ?, ?)',
          [
            'warning',
            'Produit bientôt expiré',
            `${product.name} expire dans ${product.days_until_expiry} jour(s)`,
            null
          ]
        );
      }
    }

    // Ventes du jour
    const [todaySales] = await db.execute(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM sales 
      WHERE DATE(created_at) = CURDATE()
    `);

    // Produits en stock
    const [productsCount] = await db.execute('SELECT COUNT(*) as count FROM products');

    // Alertes de stock faible
    const [lowStockCount] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE stock <= min_stock
    `);

    // Top produits vendus
    const [topProducts] = await db.execute(`
      SELECT p.name, SUM(si.quantity) as total_sold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    // Ventes par jour (7 derniers jours)
    const [salesByDay] = await db.execute(`
      SELECT DATE(created_at) as date, SUM(total) as total
      FROM sales
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Ventes récentes du jour
    const [recentSales] = await db.execute(`
      SELECT s.*, u.name as user_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.created_at) = CURDATE()
      ORDER BY s.created_at DESC
      LIMIT 10
    `);

    res.json({
      todaySales: todaySales[0],
      productsCount: productsCount[0].count,
      lowStockCount: lowStockCount[0].count,
      expiringCount: expiringProducts.length,
      topProducts,
      salesByDay,
      recentSales
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour l'historique des ventes par date
app.get('/api/sales/history/:date', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { date } = req.params;

    // Récupérer les ventes du jour
    const [sales] = await db.execute(`
      SELECT s.*, u.name as user_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.created_at) = ?
      ORDER BY s.created_at DESC
    `, [date]);

    // Récupérer les détails de chaque vente
    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        const [items] = await db.execute(`
          SELECT si.*, p.name as product_name
          FROM sale_items si
          LEFT JOIN products p ON si.product_id = p.id
          WHERE si.sale_id = ?
        `, [sale.id]);
        
        return { ...sale, items };
      })
    );

    // Calculer les totaux
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalOrders = sales.length;

    res.json({
      date,
      total_sales: totalSales,
      total_orders: totalOrders,
      sales: salesWithItems
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour générer un PDF de l'historique
app.post('/api/sales/history/:date/pdf', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { date } = req.params;

    // Récupérer les données de l'historique
    const historyData = await fetch(`${req.protocol}://${req.get('host')}/api/sales/history/${date}`, {
      headers: { 'Authorization': req.headers.authorization }
    }).then(res => res.json());

    // Logger l'action
    await logActivity(req.user.id, 'EXPORT_SALES_HISTORY', 'sales', null, null, { date }, req);

    res.json({
      message: 'Export généré avec succès',
      data: historyData,
      export_date: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des rapports avancés
app.get('/api/reports/monthly', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const { year, month } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    // Chiffre d'affaires mensuel
    const [monthlyRevenue] = await db.execute(`
      SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders,
        AVG(total) as average_order_value
      FROM sales 
      WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
    `, [currentYear, currentMonth]);

    // Top produits du mois
    const [topProductsMonth] = await db.execute(`
      SELECT 
        p.name,
        SUM(si.quantity) as quantity_sold,
        SUM(si.quantity * si.price) as revenue,
        COUNT(DISTINCT s.id) as orders_count
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE YEAR(s.created_at) = ? AND MONTH(s.created_at) = ?
      GROUP BY p.id, p.name
      ORDER BY quantity_sold DESC
      LIMIT 10
    `, [currentYear, currentMonth]);

    // Clients fréquents (basé sur customer_name)
    const [frequentCustomers] = await db.execute(`
      SELECT 
        customer_name,
        COUNT(*) as order_count,
        SUM(total) as total_spent
      FROM sales 
      WHERE customer_name IS NOT NULL 
        AND customer_name != ''
        AND YEAR(created_at) = ? 
        AND MONTH(created_at) = ?
      GROUP BY customer_name
      ORDER BY order_count DESC
      LIMIT 10
    `, [currentYear, currentMonth]);

    // Ventes par jour du mois
    const [dailySales] = await db.execute(`
      SELECT 
        DAY(created_at) as day,
        SUM(total) as daily_total,
        COUNT(*) as daily_orders
      FROM sales
      WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
      GROUP BY DAY(created_at)
      ORDER BY day
    `, [currentYear, currentMonth]);

    res.json({
      monthlyRevenue: monthlyRevenue[0],
      topProducts: topProductsMonth,
      frequentCustomers,
      dailySales
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du rapport mensuel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des paramètres
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const [settings] = await db.execute('SELECT * FROM settings ORDER BY setting_key');
    
    // Convertir en objet pour faciliter l'utilisation
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Convertir selon le type
      switch (setting.setting_type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = {};
          }
          break;
      }
      
      settingsObj[setting.setting_key] = value;
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      let stringValue = value;
      let type = 'string';

      // Déterminer le type et convertir en string
      if (typeof value === 'number') {
        type = 'number';
        stringValue = value.toString();
      } else if (typeof value === 'boolean') {
        type = 'boolean';
        stringValue = value.toString();
      } else if (typeof value === 'object') {
        type = 'json';
        stringValue = JSON.stringify(value);
      }

      // Mettre à jour ou insérer le paramètre
      await db.execute(`
        INSERT INTO settings (setting_key, setting_value, setting_type) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value),
        setting_type = VALUES(setting_type),
        updated_at = CURRENT_TIMESTAMP
      `, [key, stringValue, type]);
    }

    // Logger l'action
    await logActivity(req.user.id, 'UPDATE_SETTINGS', 'settings', null, null, settings, req);

    res.json({ message: 'Paramètres mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const [notifications] = await db.execute(`
      SELECT * FROM notifications 
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    await db.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes des logs d'activité
app.get('/api/activity-logs', authenticateToken, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non disponible' });
    }

    const [logs] = await db.execute(`
      SELECT al.*, u.name as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);

    res.json(logs);
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Sauvegarde automatique
cron.schedule('0 0 * * *', async () => {
  try {
    await createBackup();
    console.log('✅ Sauvegarde automatique effectuée');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde automatique:', error);
  }
});

// Fonction de sauvegarde
async function createBackup() {
  if (!db) return;

  try {
    const backupDir = path.join(__dirname, 'backups');
    
    // Créer le dossier de sauvegarde s'il n'existe pas
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${timestamp}.json`);

    // Récupérer toutes les données
    const tables = ['users', 'suppliers', 'categories', 'products', 'sales', 'sale_items', 'notifications', 'activity_logs', 'settings'];
    const backup = {};

    for (const table of tables) {
      const [rows] = await db.execute(`SELECT * FROM ${table}`);
      backup[table] = rows;
    }

    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ Sauvegarde créée: ${backupFile}`);
  } catch (error) {
    console.error('❌ Erreur lors de la création de la sauvegarde:', error);
  }
}

// Route de sauvegarde manuelle
app.post('/api/backup', authenticateToken, async (req, res) => {
  try {
    await createBackup();
    
    // Logger l'action
    await logActivity(req.user.id, 'MANUAL_BACKUP', null, null, null, null, req);
    
    res.json({ message: 'Sauvegarde créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde manuelle:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

// Initialiser la base de données et démarrer le serveur
initializeDatabase().then(() => {
  const localIP = getLocalIPAddress();
  
  // Écouter sur toutes les interfaces réseau (0.0.0.0)
  app.listen(PORT, 'localhost', () => {
    console.log(`🚀 Serveur PharmaCare démarré sur le port ${PORT}`);
    console.log(`📡 API locale disponible sur http://localhost:${PORT}/api`);
    console.log(`🖥️  Mode local - Base de données et application sur la même machine`);
    console.log(`🔑 Comptes disponibles:`);
    console.log(`   - admin / admin123 (Administrateur)`);
    console.log(`   - pharmacien / pharma123 (Pharmacien)`);
    console.log(`   - caissier / caisse123 (Caissier)`);
    console.log(`   - vendeur / vendeur123 (Vendeur)`);
    console.log(`🔧 Test de connectivité: http://localhost:${PORT}/api/health`);
  });
});

module.exports = app;