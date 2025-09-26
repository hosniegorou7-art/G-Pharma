import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  ShoppingCart, 
  Trash2, 
  Calculator,
  Printer,
  User,
  CreditCard,
  RefreshCw,
  DollarSign,
  Lock
} from 'lucide-react';
import { apiCall } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { printInvoice } from '../utils/tauri';
import { useNotifications } from '../contexts/NotificationContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category_name?: string;
}

const Sales: React.FC = () => {
  const { user } = useAuth();
  const { checkForNewNotifications } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [printing, setPrinting] = useState(false);

  // Vérifier si l'utilisateur peut finaliser des ventes
  const canFinalizeSale = user?.role !== 'seller';
  const canPrintInvoice = user?.role !== 'seller';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/products');
      setProducts(data.filter(p => p.stock > 0)); // Afficher seulement les produits en stock
      console.log('✅ Produits chargés depuis la base de données');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des produits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        stock: product.stock
      }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const receivedAmount = parseFloat(amountReceived) || 0;
  const changeAmount = receivedAmount > total ? receivedAmount - total : 0;

  const processSale = async () => {
    if (cart.length === 0 || !canFinalizeSale) return;

    setProcessing(true);
    try {
      const saleData = {
        customer_name: customerName || null,
        items: cart,
        total,
        amount_received: receivedAmount ? parseFloat(amountReceived) : null,
        payment_method: paymentMethod
      };

      const response = await apiCall('/sales', {
        method: 'POST',
        body: JSON.stringify(saleData)
      });

      console.log('✅ Vente enregistrée avec succès');
      setLastSaleId(response.id);
      
      // Réinitialiser le formulaire
      setCart([]);
      setCustomerName('');
      setAmountReceived('');
      
      // Recharger les produits pour mettre à jour les stocks
      await fetchProducts();
      
      // Vérifier les nouvelles notifications après la vente
      await checkForNewNotifications();
      
      // Afficher le résumé de la vente
      let message = 'Vente effectuée avec succès !';
      if (response.change_amount && response.change_amount > 0) {
        message += `\n\nMonnaie à rendre : ${response.change_amount.toLocaleString()} F CFA`;
      }
      alert(message);
    } catch (error) {
      console.error('❌ Erreur lors de la vente:', error);
      alert('Erreur lors de l\'enregistrement de la vente');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintInvoice = async () => {
    if (!lastSaleId || !canPrintInvoice) {
      if (!canPrintInvoice) {
        alert('Vous n\'avez pas les permissions pour imprimer les factures');
        return;
      }
      alert('Aucune vente récente à imprimer');
      return;
    }

    setPrinting(true);
    try {
      console.log('🖨️ Début du processus d\'impression pour la vente:', lastSaleId);
      
  // Récupérer les données de la facture
  const invoiceData = await apiCall(`/sales/${lastSaleId}/invoice`);
  console.log('📄 Données de facture récupérées:', invoiceData);
  // Ajouter le nom de l'utilisateur connecté
  invoiceData.seller_name = user?.username || user?.name || '';
  // Utiliser la fonction d'impression Tauri
  const result = await printInvoice(invoiceData);
      
      if (result.success) {
        console.log('✅ Impression réussie');
        // Notification utilisateur discrète
        const notification = document.createElement('div');
        notification.innerHTML = '✅ Facture envoyée à l\'imprimante';
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 9999;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      } else {
        console.error('❌ Erreur d\'impression:', result.error);
        alert('Erreur lors de l\'impression: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'impression:', error);
      alert('Erreur lors de l\'impression de la facture: ' + error);
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
      {/* Product Search */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recherche de produits</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchProducts}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Actualiser</span>
              </button>
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un médicament..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun produit disponible</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <span className="text-lg font-bold text-blue-600">{product.price.toLocaleString()} F CFA</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">{product.category_name || 'Non catégorisé'}</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      product.stock > 20 ? 'bg-green-100 text-green-800' :
                      product.stock > 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Stock: {product.stock}
                    </span>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter au panier</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-fit">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Panier</h2>
          <ShoppingCart className="h-5 w-5 text-gray-400" />
        </div>

        {/* Customer Info */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <User className="h-4 w-4 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">Client</label>
          </div>
          <input
            type="text"
            placeholder="Nom du client (optionnel)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 space-y-3 mb-6 max-h-64 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Panier vide</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.price.toLocaleString()} F CFA</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 flex items-center justify-center"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">Mode de paiement</label>
          </div>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={!canFinalizeSale}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="cash">Espèces</option>
            <option value="card">Carte bancaire</option>
            <option value="mobile">Mobile Money</option>
          </select>
        </div>

        {/* Amount Received */}
        {paymentMethod === 'cash' && (
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">Montant encaissé</label>
            </div>
            <input
              type="number"
              placeholder="Montant donné par le client"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              disabled={!canFinalizeSale}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {receivedAmount > 0 && receivedAmount >= total && (
              <div className="mt-2 p-2 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  Monnaie à rendre: <span className="font-bold">{changeAmount.toLocaleString()} F CFA</span>
                </p>
              </div>
            )}
            {receivedAmount > 0 && receivedAmount < total && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">
                  Montant insuffisant: {(total - receivedAmount).toLocaleString()} F CFA manquants
                </p>
              </div>
            )}
          </div>
        )}

        {/* Total */}
        <div className="border-t border-gray-200 pt-4 mb-6">
          <div className="flex items-center justify-between text-lg font-semibold text-gray-900">
            <span>Total</span>
            <span>{total.toLocaleString()} F CFA</span>
          </div>
        </div>

        {/* Seller Restriction Notice */}
        {!canFinalizeSale && cart.length > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-orange-600" />
              <p className="text-sm text-orange-700">
                Seuls les administrateurs, pharmaciens et caissiers peuvent finaliser les ventes.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={processSale}
            disabled={cart.length === 0 || processing || !canFinalizeSale || (paymentMethod === 'cash' && receivedAmount > 0 && receivedAmount < total)}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Traitement...</span>
              </>
            ) : !canFinalizeSale ? (
              <>
                <Lock className="h-4 w-4" />
                <span>Accès restreint</span>
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4" />
                <span>Finaliser la vente</span>
              </>
            )}
          </button>
          
          <button
            onClick={handlePrintInvoice}
            disabled={!lastSaleId || !canPrintInvoice || printing}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {printing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Impression...</span>
              </>
            ) : !canPrintInvoice ? (
              <>
                <Lock className="h-4 w-4" />
                <span>Accès restreint</span>
              </>
            ) : (
              <>
                <Printer className="h-4 w-4" />
                <span>Imprimer facture</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sales;