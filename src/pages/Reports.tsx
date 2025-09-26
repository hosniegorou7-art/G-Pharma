import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { apiCall } from '../utils/api';
import { exportSectionToPDF } from '../utils/pdfExport';

interface MonthlyReport {
  monthlyRevenue: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
  };
  topProducts: Array<{
    name: string;
    quantity_sold: number;
    revenue: number;
    orders_count: number;
  }>;
  frequentCustomers: Array<{
    customer_name: string;
    total_spent: number;
  }>;
  dailySales: Array<{
    day: number;
    daily_total: number;
    daily_orders: number;
  }>;
}

const Reports: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport>({
    monthlyRevenue: { total_revenue: 0, total_orders: 0, average_order_value: 0 },
    topProducts: [],
    frequentCustomers: [],
    dailySales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthlyReport();
  }, [selectedYear, selectedMonth]);

  const fetchMonthlyReport = async () => {
    try {
      setLoading(true);
      const data = await apiCall(`/reports/monthly?year=${selectedYear}&month=${selectedMonth}`);
      setMonthlyReport(data);
      console.log('✅ Rapport mensuel chargé depuis la base de données réseau');
    } catch (error) {
      console.error('❌ Erreur lors du chargement du rapport:', error);
      // Garder les données vides en cas d'erreur
      setMonthlyReport({
        monthlyRevenue: { total_revenue: 0, total_orders: 0, average_order_value: 0 },
        topProducts: [],
        frequentCustomers: [],
        dailySales: []
      });
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      name: 'Chiffre d\'affaires',
      value: `${monthlyReport.monthlyRevenue.total_revenue.toLocaleString()} F CFA`,
      change: `${monthlyReport.monthlyRevenue.total_orders} commandes`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      name: 'Commandes totales',
      value: monthlyReport.monthlyRevenue.total_orders.toString(),
      change: `Moyenne: ${Math.round(monthlyReport.monthlyRevenue.average_order_value).toLocaleString()} F CFA`,
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      name: 'Produits vendus',
      value: monthlyReport.topProducts.reduce((sum, p) => sum + p.quantity_sold, 0).toString(),
      change: `${monthlyReport.topProducts.length} produits différents`,
      icon: Package,
      color: 'text-purple-600'
    },
    {
      name: 'Clients uniques',
      value: monthlyReport.frequentCustomers.length.toString(),
      change: 'Clients identifiés',
      icon: Users,
      color: 'text-orange-600'
    }
  ];

  const topProductsChart = monthlyReport.topProducts.slice(0, 5).map((product, index) => ({
    name: product.name,
    value: product.quantity_sold,
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index]
  }));

  const dailySalesChart = monthlyReport.dailySales.map(item => ({
    name: `${item.day}`,
    sales: item.daily_total,
    orders: item.daily_orders
  }));

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      // Récupérer les données complètes pour l'export
      const reportData = {
        period: `${selectedMonth}/${selectedYear}`,
        revenue: monthlyReport.monthlyRevenue,
        topProducts: monthlyReport.topProducts,
        customers: monthlyReport.frequentCustomers,
        dailySales: monthlyReport.dailySales,
        exportDate: new Date().toISOString()
      };
      
      // Créer un fichier JSON pour l'export
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `rapport_${selectedMonth}_${selectedYear}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      console.log('✅ Rapport exporté avec les données réseau');
      alert(`Rapport ${format.toUpperCase()} exporté avec succès !`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export du rapport');
    }
  };

  const months = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
  <div className="space-y-6" id="report-section">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900">Rapports et statistiques</h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={fetchMonthlyReport}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
            <div className="flex items-center space-x-2">
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 bg-gray-50 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-gray-500">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Ventes quotidiennes</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          {dailySalesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySalesChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'sales' ? `${value.toLocaleString()} F CFA` : value,
                  name === 'sales' ? 'Ventes' : 'Commandes'
                ]} />
                <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Aucune donnée de vente pour cette période</p>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Produits les plus vendus</h3>
            <Package className="h-5 w-5 text-gray-400" />
          </div>
          {topProductsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProductsChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {topProductsChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Aucune donnée de produit pour cette période</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Détail des produits</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CA</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyReport.topProducts.slice(0, 5).map((product, index) => (
                  <tr key={index}>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{product.quantity_sold}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{product.revenue.toLocaleString()} F CFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Frequent Customers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clients fréquents</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commandes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyReport.frequentCustomers.slice(0, 5).map((customer, index) => (
                  <tr key={index}>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{customer.customer_name}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{customer.order_count}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{customer.total_spent.toLocaleString()} F CFA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;