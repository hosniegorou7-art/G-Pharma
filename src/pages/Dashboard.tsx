import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  DollarSign,
  Users,
  Calendar,
  Activity,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { apiCall } from '../utils/api';
import { useNotifications } from '../contexts/NotificationContext';

interface DashboardStats {
  todaySales: {
    total: number;
    count: number;
  };
  productsCount: number;
  lowStockCount: number;
  expiringCount: number;
  topProducts: Array<{
    name: string;
    total_sold: number;
  }>;
  salesByDay: Array<{
    date: string;
    total: number;
  }>;
  recentSales: Array<{
    id: number;
    customer_name: string;
    total: number;
    user_name: string;
    created_at: string;
    payment_method: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: { total: 0, count: 0 },
    productsCount: 0,
    lowStockCount: 0,
    expiringCount: 0,
    topProducts: [],
    salesByDay: [],
    recentSales: []
  });
  const [loading, setLoading] = useState(true);
  const { checkForNewNotifications } = useNotifications();

  useEffect(() => {
    fetchDashboardStats();
    
    // Actualiser les données et vérifier les notifications toutes les 30 secondes
    const interval = setInterval(() => {
      fetchDashboardStats();
      checkForNewNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkForNewNotifications]);

  const fetchDashboardStats = async () => {
    try {
      const data = await apiCall('/stats/dashboard');
      setStats(data);
      
      // Vérifier les nouvelles notifications après avoir récupéré les stats
      await checkForNewNotifications();
      
      console.log('✅ Statistiques chargées depuis la base de données');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const dashboardStats = [
    {
      name: 'Ventes du jour',
      value: `${stats.todaySales.total.toLocaleString()} F CFA`,
      change: `${stats.todaySales.count} commandes`,
      changeType: 'positive' as const,
      icon: DollarSign,
    },
    {
      name: 'Commandes',
      value: stats.todaySales.count.toString(),
      change: 'Aujourd\'hui',
      changeType: 'positive' as const,
      icon: ShoppingCart,
    },
    {
      name: 'Produits en stock',
      value: stats.productsCount.toString(),
      change: 'Total disponible',
      changeType: 'positive' as const,
      icon: Package,
    },
    {
      name: 'Alertes',
      value: stats.lowStockCount.toString(),
      change: 'Stock faible',
      changeType: stats.lowStockCount > 0 ? 'negative' as const : 'positive' as const,
      icon: AlertTriangle,
    },
    {
      name: 'Expirations',
      value: stats.expiringCount.toString(),
      change: 'Bientôt expirés',
      changeType: stats.expiringCount > 0 ? 'negative' as const : 'positive' as const,
      icon: Calendar,
    },
  ];

  const salesData = stats.salesByDay.map(item => ({
    name: new Date(item.date).toLocaleDateString('fr-FR', { weekday: 'short' }),
    value: item.total
  }));

  const recentActivities = [
    ...stats.recentSales.slice(0, 4).map(sale => ({
      action: 'Vente',
      item: `${sale.total.toLocaleString()} F CFA`,
      user: sale.user_name,
      time: new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      customer: sale.customer_name
    }))
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <button
          onClick={async () => {
            await fetchDashboardStats();
            await checkForNewNotifications();
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {dashboardStats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Ventes de la semaine</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                  <YAxis domain={[0, 100000]} />
                <Tooltip formatter={(value) => [`${value.toLocaleString()} F CFA`, 'Ventes']} />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Aucune donnée de vente disponible</p>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Produits les plus vendus</h3>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {stats.topProducts.length > 0 ? (
              stats.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.total_sold} ventes</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune donnée de vente disponible</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Ventes récentes du jour</h3>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {stats.recentSales.length > 0 ? (
            stats.recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Vente: {sale.total.toLocaleString()} F CFA
                  </p>
                  <p className="text-xs text-gray-500">
                    {sale.customer_name ? `Client: ${sale.customer_name}` : 'Client anonyme'} • 
                    Par {sale.user_name} • 
                    {sale.payment_method === 'cash' ? 'Espèces' : 
                     sale.payment_method === 'card' ? 'Carte' : 'Mobile Money'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(sale.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Aucune vente aujourd'hui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;