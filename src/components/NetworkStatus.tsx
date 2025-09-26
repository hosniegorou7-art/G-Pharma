import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { testNetworkConnection } from '../utils/api';

interface NetworkStatusProps {
  onStatusChange?: (connected: boolean) => void;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ onStatusChange }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [serverInfo, setServerInfo] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const checkConnection = async () => {
    setTesting(true);
    try {
      const result = await testNetworkConnection();
      setIsConnected(result.success);
      setServerInfo(result.message);
      onStatusChange?.(result.success);
    } catch (error) {
      setIsConnected(false);
      setServerInfo('Erreur de connexion');
      onStatusChange?.(false);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Vérifier la connexion toutes les 30 secondes
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isConnected === null) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span className="text-sm">Test de connexion...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
        isConnected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isConnected ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span>{isConnected ? 'Connecté' : 'Déconnecté'}</span>
      </div>
      
      <button
        onClick={checkConnection}
        disabled={testing}
        className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
        title="Tester la connexion"
      >
        <RefreshCw className={`h-4 w-4 text-gray-600 ${testing ? 'animate-spin' : ''}`} />
      </button>
      
      {serverInfo && (
        <span className="text-xs text-gray-500 max-w-xs truncate" title={serverInfo}>
          {serverInfo}
        </span>
      )}
    </div>
  );
};

export default NetworkStatus;