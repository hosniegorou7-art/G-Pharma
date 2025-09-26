import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationPanel from './NotificationPanel';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const routes: { [key: string]: string } = {
      '/': 'Tableau de bord',
      '/sales': 'Ventes',
      '/inventory': 'Gestion des stocks',
      '/users': 'Gestion des utilisateurs',
      '/suppliers': 'Gestion des fournisseurs',
      '/reports': 'Rapports et statistiques',
      '/settings': 'Paramètres'
    };
    return routes[location.pathname] || 'PharmaCare';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:pl-72">
        <Header
          title={getPageTitle()}
          onMenuClick={() => setSidebarOpen(true)}
          onNotificationClick={() => setNotificationOpen(true)}
        />
        
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      <NotificationPanel
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </div>
  );
};

export default Layout;