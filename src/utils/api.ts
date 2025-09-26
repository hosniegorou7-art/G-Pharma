// Configuration centralisée de l'API avec support réseau
export const getApiUrl = () => {
  // Configuration pour l'accès réseau à un serveur distant
  const SERVER_IP = '127.0.0.1'; // 🔧 REMPLACEZ par l'IP de votre serveur de base de données
  const SERVER_PORT = '3001';
  
  // Vérifier si on est dans Tauri (application de bureau)
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    console.log('📱 Mode Tauri détecté - Connexion au serveur réseau');
    return `http://${SERVER_IP}:${SERVER_PORT}/api`;
  }
  
  // En développement web, utiliser localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // En réseau local web, utiliser l'IP du serveur
  const serverIP = window.location.hostname;
  return `http://${serverIP}:3001/api`;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('pharmacare_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Fonction utilitaire pour les appels API avec gestion d'erreur réseau
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}${endpoint}`;
  
  console.log(`🌐 Appel API vers: ${url}`);
  
  const defaultOptions: RequestInit = {
    headers: getAuthHeaders(),
    timeout: 10000, // Timeout de 10 secondes pour les connexions réseau
    ...options
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Réponse API reçue de ${endpoint}`);
    return data;
  } catch (error) {
    console.error(`❌ Erreur API (${endpoint}):`, error);
    
    // Gestion spécifique des erreurs réseau
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Impossible de se connecter au serveur ${apiUrl}. Vérifiez que le serveur est démarré et accessible.`);
    }
    
    throw error;
  }
};

// Fonction pour tester la connectivité réseau
export const testNetworkConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl.replace('/api', '')}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: `Connexion réussie au serveur ${data.server_ip || 'distant'}`
      };
    } else {
      return {
        success: false,
        message: `Serveur accessible mais erreur HTTP ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Impossible de se connecter au serveur: ${error}`
    };
  }
};