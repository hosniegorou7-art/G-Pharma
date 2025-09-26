import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiCall } from '../utils/api';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'expiry';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  checkForNewNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const checkForNewNotifications = async () => {
    try {
      // Vérifier les produits avec stock faible
      const products = await apiCall('/products');
      const lowStockProducts = products.filter(product => product.stock <= product.min_stock);
      
      // Vérifier les produits qui expirent bientôt
      const expiringProducts = products.filter(product => {
        if (!product.expiry_date) return false;
        const expiryDate = new Date(product.expiry_date);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays >= 0;
      });

      // Ajouter les notifications de stock faible
      lowStockProducts.forEach(product => {
        const existingNotification = notifications.find(n => 
          n.message.includes(product.name) && n.type === 'warning'
        );
        
        if (!existingNotification) {
          addNotification({
            type: 'warning',
            title: 'Stock faible',
            message: `${product.name} - Stock: ${product.stock} unités (seuil: ${product.min_stock})`
          });
        }
      });

      // Ajouter les notifications d'expiration
      expiringProducts.forEach(product => {
        const expiryDate = new Date(product.expiry_date);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const existingNotification = notifications.find(n => 
          n.message.includes(product.name) && n.type === 'expiry'
        );
        
        if (!existingNotification) {
          addNotification({
            type: 'expiry',
            title: 'Produit bientôt expiré',
            message: `${product.name} expire dans ${diffDays} jour(s)`
          });
        }
      });
    } catch (error) {
      console.error('Erreur lors de la vérification des notifications:', error);
    }
  };
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      checkForNewNotifications,
      markAsRead,
      removeNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};