import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: 'admin' | 'pharmacist' | 'cashier' | 'seller';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configuration de l'API - détection automatique de l'environnement
const getApiUrl = () => {
  // En développement, utiliser localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // En réseau local, utiliser l'IP du serveur
  const serverIP = window.location.hostname;
  return `http://${serverIP}:3001/api`;
};

// Comptes test prédéfinis pour fonctionnement hors ligne
const TEST_USERS: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@pharmacare.com',
    name: 'Administrateur',
    role: 'admin'
  },
  {
    id: '2',
    username: 'pharmacien',
    email: 'pharmacien@pharmacare.com',
    name: 'Dr. Pharmacien',
    role: 'pharmacist'
  },
  {
    id: '3',
    username: 'caissier',
    email: 'caissier@pharmacare.com',
    name: 'Caissier',
    role: 'cashier'
  },
  {
    id: '4',
    username: 'vendeur',
    name: 'Vendeur',
    role: 'seller'
  }
];

const TEST_CREDENTIALS = [
  { username: 'admin', password: 'admin123' },
  { username: 'pharmacien', password: 'pharma123' },
  { username: 'caissier', password: 'caisse123' },
  { username: 'vendeur', password: 'vendeur123' }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const savedUser = localStorage.getItem('pharmacare_user');
    const savedToken = localStorage.getItem('pharmacare_token');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const apiUrl = getApiUrl();
      console.log(`🔗 Tentative de connexion à: ${apiUrl}/auth/login`);
      
      // Essayer d'abord avec l'API backend (base de données MySQL)
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernameOrEmail, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        localStorage.setItem('pharmacare_user', JSON.stringify(userData.user));
        localStorage.setItem('pharmacare_token', userData.token);
        console.log('✅ Connexion réussie via base de données MySQL');
        return true;
      }

      // Si l'API n'est pas disponible, utiliser les comptes test locaux
      console.log('⚠️ API non disponible, utilisation des comptes test locaux');
      const testCredential = TEST_CREDENTIALS.find(
        cred => cred.username === usernameOrEmail && cred.password === password
      );

      if (testCredential) {
        const testUser = TEST_USERS.find(u => u.username === usernameOrEmail);
        if (testUser) {
          setUser(testUser);
          localStorage.setItem('pharmacare_user', JSON.stringify(testUser));
          localStorage.setItem('pharmacare_token', 'test_token');
          console.log('✅ Connexion réussie via compte test local');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      
      // En cas d'erreur, essayer les comptes test
      const testCredential = TEST_CREDENTIALS.find(
        cred => cred.username === usernameOrEmail && cred.password === password
      );

      if (testCredential) {
        const testUser = TEST_USERS.find(u => u.username === usernameOrEmail);
        if (testUser) {
          setUser(testUser);
          localStorage.setItem('pharmacare_user', JSON.stringify(testUser));
          localStorage.setItem('pharmacare_token', 'test_token');
          console.log('✅ Connexion réussie via compte test (mode fallback)');
          return true;
        }
      }
      
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pharmacare_user');
    localStorage.removeItem('pharmacare_token');
    console.log('👋 Déconnexion réussie');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};