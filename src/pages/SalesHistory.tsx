import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Download, 
  Eye,
  FileText,
  DollarSign,
  ShoppingCart,
  User,
  RefreshCw
} from 'lucide-react';
import { apiCall } from '../utils/api';
import { exportSectionToPDF } from '../utils/pdfExport';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SaleHistoryItem {
  id: number;
  customer_name: string;
  user_name: string;
  total: number;
  payment_method: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}
interface DailySales {
  date: string;
  total_sales: number;
  total_orders: number;
  sales: SaleHistoryItem[];
}

const SalesHistory: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySales, setDailySales] = useState<DailySales | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleHistoryItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDailySales();
  }, [selectedDate]);

  const fetchDailySales = async () => {
    try {
      setLoading(true);
      const data = await apiCall(`/sales/history/${selectedDate}`);
      setDailySales(data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      setDailySales(null);
    } finally {
      setLoading(false);
    }
  };

  const viewSaleDetail = (sale: SaleHistoryItem) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  const generatePDF = async () => {
    if (!dailySales) return;

    try {
      const response = await apiCall(`/sales/history/${selectedDate}/pdf`, {
        method: 'POST'
      });
      
      // Créer un lien de téléchargement
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historique_ventes_${selectedDate}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      alert('Historique exporté avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export de l\'historique');
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'card': return 'Carte';
      case 'mobile': return 'Mobile Money';
      default: return method;
    }
  };

  return (
  <div className="space-y-6" id="saleshistory-section">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900">Historique des ventes</h2>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={fetchDailySales}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Actualiser</span>
            </button>
            <button
              onClick={() => exportSectionToPDF('saleshistory-section', 'historique_ventes.pdf')}
              disabled={!dailySales || dailySales.sales.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Sales List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Ventes du {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}
              </h3>
            </div>

            {dailySales && dailySales.sales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Caissier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paiement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailySales.sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(sale.created_at), 'HH:mm')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.customer_name || 'Client anonyme'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.total.toLocaleString()} F CFA
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                            {getPaymentMethodLabel(sale.payment_method)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => viewSaleDetail(sale)}
                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Détail</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune vente pour cette date</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Détail de la vente #{selectedSale.id}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Date et heure</p>
                  <p className="font-medium">
                    {format(new Date(selectedSale.created_at), 'dd/MM/yyyy à HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-medium">{selectedSale.customer_name || 'Client anonyme'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Caissier</p>
                  <p className="font-medium">{selectedSale.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mode de paiement</p>
                  <p className="font-medium">{getPaymentMethodLabel(selectedSale.payment_method)}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Produits vendus</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Produit
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Quantité
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Prix unitaire
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSale.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.price.toLocaleString()} F CFA
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {(item.quantity * item.price).toLocaleString()} F CFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-blue-600">
                    {selectedSale.total.toLocaleString()} F CFA
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;