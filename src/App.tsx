import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Users from './pages/Users';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import SalesHistory from './pages/SalesHistory';
import Settings from './pages/Settings';
import { useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const RoleProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h2>
            <p className="text-gray-600 mb-4">
              Vous n'avez pas les permissions nécessaires pour accéder à cette section.
            </p>
            <p className="text-sm text-gray-500">
              {allowedRoles.includes('admin') && allowedRoles.includes('pharmacist') 
                ? 'Seuls les administrateurs et pharmaciens peuvent accéder à cette page.'
                : 'Accès restreint selon votre rôle utilisateur.'
              }
            </p>
          </div>
        </div>
      </Layout>
    );
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/sales" element={
        <ProtectedRoute>
          <Layout>
            <Sales />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/inventory" element={
        <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']}>
          <Layout>
            <Inventory />
          </Layout>
        </RoleProtectedRoute>
      } />
      <Route path="/users" element={
        <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']}>
          <Layout>
            <Users />
          </Layout>
        </RoleProtectedRoute>
      } />
      <Route path="/suppliers" element={
        <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']}>
          <Layout>
            <Suppliers />
          </Layout>
        </RoleProtectedRoute>
      } />
      <Route path="/reports" element={
        <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']}>
          <Layout>
            <Reports />
          </Layout>
        </RoleProtectedRoute>
      } />
      <Route path="/sales-history" element={
        <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']}>
          <Layout>
            <SalesHistory />
          </Layout>
        </RoleProtectedRoute>
      } />
      <Route path="/settings" element={
        <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']}>
          <Layout>
            <Settings />
          </Layout>
        </RoleProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;