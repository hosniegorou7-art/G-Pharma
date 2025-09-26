import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Bell, 
  Shield, 
  Download,
  Upload,
  Save,
  RefreshCw
} from 'lucide-react';
import { apiCall } from '../utils/api';
import { saveFile } from '../utils/tauri';

interface SettingsData {
  pharmacy_name: string;
  pharmacy_address: string;
  pharmacy_phone: string;
  pharmacy_email: string;
  currency: string;
  low_stock_threshold: number;
  expiry_warning_days: number;
  auto_backup: boolean;
  backup_time: string;
  notifications: {
    lowStock: boolean;
    expiry: boolean;
    sales: boolean;
    system: boolean;
  };
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SettingsData>({
    pharmacy_name: 'PharmaCare',
    pharmacy_address: 'Cocody, Abidjan',
    pharmacy_phone: '+225 27 20 30 40',
    pharmacy_email: 'contact@pharmacare.ci',
    currency: 'F CFA',
    low_stock_threshold: 20,
    expiry_warning_days: 30,
    auto_backup: true,
    backup_time: '00:00',
    notifications: {
      lowStock: true,
      expiry: true,
      sales: false,
      system: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tabs = [
    { id: 'general', name: 'Général', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'backup', name: 'Sauvegarde', icon: Database },
    { id: 'security', name: 'Sécurité', icon: Shield }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/settings');
      setSettings(data);
      console.log('✅ Paramètres chargés depuis la base de données réseau');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des paramètres:', error);
      // Garder les paramètres par défaut en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await apiCall('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      console.log('✅ Paramètres sauvegardés via réseau');
      alert('Paramètres sauvegardés avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const exportSettings = async () => {
    try {
      const dataStr = JSON.stringify(settings, null, 2);
      const success = await saveFile(dataStr, 'pharmacare_settings.json');
      
      if (success) {
        console.log('✅ Paramètres exportés');
        alert('Paramètres exportés avec succès !');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export des paramètres');
    }
  };

  const triggerBackup = async () => {
    try {
      await apiCall('/backup', {
        method: 'POST'
      });
      console.log('✅ Sauvegarde manuelle effectuée via réseau');
      alert('Sauvegarde manuelle effectuée avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Paramètres</h2>
            <p className="text-gray-600 mt-1">Configurez votre système de gestion de pharmacie</p>
          </div>
          <button
            onClick={fetchSettings}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Paramètres généraux</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de la pharmacie
                    </label>
                    <input
                      type="text"
                      value={settings.pharmacy_name}
                      onChange={(e) => handleSettingChange('pharmacy_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Devise
                    </label>
                    <select
                      value={settings.currency}
                      onChange={(e) => handleSettingChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="F CFA">F CFA</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={settings.pharmacy_phone}
                      onChange={(e) => handleSettingChange('pharmacy_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.pharmacy_email}
                      onChange={(e) => handleSettingChange('pharmacy_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse
                  </label>
                  <textarea
                    value={settings.pharmacy_address}
                    onChange={(e) => handleSettingChange('pharmacy_address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seuil de stock faible
                    </label>
                    <input
                      type="number"
                      value={settings.low_stock_threshold}
                      onChange={(e) => handleSettingChange('low_stock_threshold', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alerte d'expiration (jours)
                    </label>
                    <input
                      type="number"
                      value={settings.expiry_warning_days}
                      onChange={(e) => handleSettingChange('expiry_warning_days', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Paramètres de notification</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Stock faible</h4>
                      <p className="text-sm text-gray-600">Recevoir des alertes quand le stock est faible</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.lowStock}
                        onChange={(e) => handleNotificationChange('lowStock', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Expiration</h4>
                      <p className="text-sm text-gray-600">Alertes pour les médicaments qui expirent bientôt</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.expiry}
                        onChange={(e) => handleNotificationChange('expiry', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Ventes</h4>
                      <p className="text-sm text-gray-600">Notifications pour les ventes importantes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.sales}
                        onChange={(e) => handleNotificationChange('sales', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Système</h4>
                      <p className="text-sm text-gray-600">Notifications système et mises à jour</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.system}
                        onChange={(e) => handleNotificationChange('system', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Sauvegarde automatique</h3>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Sauvegarde automatique</h4>
                    <p className="text-sm text-gray-600">Sauvegarde quotidienne automatique</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.auto_backup}
                      onChange={(e) => handleSettingChange('auto_backup', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heure de sauvegarde
                  </label>
                  <input
                    type="time"
                    value={settings.backup_time}
                    onChange={(e) => handleSettingChange('backup_time', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="space-y-4">
                  <button
                    onClick={triggerBackup}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Download className="h-4 w-4" />
                    <span>Sauvegarde manuelle</span>
                  </button>
                  
                  <button
                    onClick={exportSettings}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Exporter les paramètres</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Sécurité</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-800">Paramètres de sécurité</h4>
                  </div>
                  <p className="text-sm text-yellow-700 mt-2">
                    Les paramètres de sécurité avancés seront disponibles dans une prochaine version.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Connexions récentes</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Aujourd'hui 10:30</span>
                          <span className="text-green-600">Connexion réussie</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Hier 16:45</span>
                          <span className="text-green-600">Connexion réussie</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>15/01/2024 09:15</span>
                          <span className="text-green-600">Connexion réussie</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Sauvegarder les paramètres</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;