import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  BarChart3, 
  History,
  Settings,
  X,
  Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user } = useAuth();

  // Définir la navigation en fonction du rôle
  const getNavigationItems = () => {
    const baseNavigation = [
      { name: 'Tableau de bord', href: '/', icon: Home },
      { name: 'Ventes', href: '/sales', icon: ShoppingCart },
    ];

    // Ajouter Gestion des stocks seulement pour admin et pharmacist
    if (user?.role === 'admin' || user?.role === 'pharmacist') {
      baseNavigation.push(
        { name: 'Gestion des stocks', href: '/inventory', icon: Package }
      );
    }

    // Ajouter Utilisateurs et Fournisseurs seulement pour admin et pharmacist
    if (user?.role === 'admin' || user?.role === 'pharmacist') {
      baseNavigation.push(
        { name: 'Utilisateurs', href: '/users', icon: Users },
        { name: 'Fournisseurs', href: '/suppliers', icon: Truck }
      );
    }

    // Ajouter Rapports et Paramètres seulement pour admin et pharmacist
    if (user?.role === 'admin' || user?.role === 'pharmacist') {
      baseNavigation.push(
        { name: 'Historique des ventes', href: '/sales-history', icon: History },
        { name: 'Rapports', href: '/reports', icon: BarChart3 },
        { name: 'Paramètres', href: '/settings', icon: Settings }
      );
    }

    return baseNavigation;
  };

  const navigation = getNavigationItems();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'pharmacist':
        return 'Pharmacien';
      case 'cashier':
        return 'Caissier';
      case 'seller':
        return 'Vendeur';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500';
      case 'pharmacist':
        return 'bg-blue-500';
      case 'cashier':
        return 'bg-green-500';
      case 'seller':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-gray-900/80 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">PharmaCare</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Role Badge */}
        <div className="absolute bottom-16 left-4 right-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getRoleColor(user?.role || '')}`} />
              <span className="text-sm font-medium text-gray-700">
                {getRoleLabel(user?.role || '')}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{user?.name}</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <h3 className="text-sm font-medium">PharmaCare Pro</h3>
            <p className="text-xs text-blue-100 mt-1">
              Système de gestion complet pour pharmacies
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;