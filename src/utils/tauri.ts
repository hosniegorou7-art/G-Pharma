import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

// Vérifier si on est dans Tauri
export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Fonction pour imprimer une facture via Tauri
export const printInvoice = async (invoiceData: any): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🖨️ Début de l\'impression...', invoiceData);
    
    if (isTauri()) {
      console.log('📱 Mode Tauri détecté');
      const result = await invoke('print_invoice', { invoiceData });
      console.log('✅ Résultat impression Tauri:', result);
      return { success: true };
    } else {
      console.log('🌐 Mode navigateur détecté');
      // Fallback pour le navigateur
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        const htmlContent = generateInvoiceHtml(invoiceData);
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Attendre que le contenu soit chargé avant d'imprimer
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
        
        return { success: true };
      } else {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'impression');
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'impression:', error);
    return { success: false, error: String(error) };
  }
};

// Fonction pour ouvrir un dossier
export const openFolder = async (path: string) => {
  try {
    if (isTauri()) {
      await invoke('open_folder', { path });
    } else {
      // Fallback pour le navigateur
      window.open(path, '_blank');
    }
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du dossier:', error);
  }
};

// Fonction pour sauvegarder un fichier
export const saveFile = async (content: string, defaultName: string) => {
  try {
    if (isTauri()) {
      const filePath = await save({
        defaultPath: defaultName,
        filters: [{
          name: 'JSON',
          extensions: ['json']
        }]
      });
      
      if (filePath) {
        await writeTextFile(filePath, content);
        return true;
      }
    } else {
      // Fallback pour le navigateur
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(content);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', defaultName);
      linkElement.click();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    return false;
  }
};

// Générer le HTML de la facture (version simplifiée pour le navigateur)
// Fonction qui génère le HTML du reçu (adapté depuis ton code Rust)
function generateInvoiceHtml(invoiceData: any): string {
  const sale = invoiceData.sale || {};
  const items = invoiceData.items || [];
  const pharmacy = invoiceData.pharmacy || {};
  // Récupère le nom d'utilisateur connecté
  // Le nom de l'utilisateur connecté doit être fourni dans invoiceData.seller_name
  const sellerName = invoiceData.seller_name;

  const pharmacyName = pharmacy.pharmacy_name || "PharmaCare";
  const pharmacyAddress = pharmacy.pharmacy_address || "";
  const pharmacyPhone = pharmacy.pharmacy_phone || "";

  const saleId = sale.id || 0;
  const customerName = sale.customer_name || "Client anonyme";
  const createdAt = sale.created_at || "";

  // ✅ Conversion sûre du total
  let total = 0;
  if (typeof sale.total === "number") {
    total = sale.total;
  } else if (typeof sale.total === "string") {
    total = parseFloat(sale.total) || 0;
  }

  // ✅ Conversion sûre du montant reçu
  let amountReceived = total;
  if (typeof sale.amount_received === "number") {
    amountReceived = sale.amount_received;
  } else if (typeof sale.amount_received === "string") {
    amountReceived = parseFloat(sale.amount_received) || total;
  }

  const changeAmount = Math.max(amountReceived - total, 0);

  // ✅ Construction des lignes produits
  const itemsHtml = Array.isArray(items)
    ? items
        .map((item: any) => {
          const productName = item.product_name || "Produit";
          const quantity = parseInt(item.quantity) || 0;

          let price = 0;
          if (typeof item.price === "number") {
            price = item.price;
          } else if (typeof item.price === "string") {
            price = parseFloat(item.price) || 0;
          }

          const lineTotal = quantity * price;

          return `
            <tr>
              <td>${productName}</td>
              <td>${quantity}</td>
              <td>${price.toFixed(0)} F</td>
              <td>${lineTotal.toFixed(0)} F</td>
            </tr>
          `;
        })
        .join("")
    : "<tr><td colspan='4'>Aucun article</td></tr>";

  // ✅ HTML final adapté au format 55x91mm, texte lisible, sans la section date
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <style>
          @page { size: 55mm 91mm; margin: 0; }
          body {
            width: 55mm;
            height: 91mm;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            padding: 6px;
            margin: 0;
            color: #111;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          td { padding: 2px 0; font-size: 13px; }
          th { font-size: 13px; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
      </style>
  </head>
  <body>
      <div class="center bold" style="font-size:15px;">${pharmacyName}</div>
      <div class="center" style="font-size:13px;">${pharmacyAddress}</div>
      <div class="center" style="font-size:13px;">Tél: ${pharmacyPhone}</div>
      <div class="line"></div>
  <div>Facture N°: ${saleId}</div>
  <div>Date: ${sale.created_at ? sale.created_at.replace('T', ' ').substring(0, 16) : ''}</div>
  <div>Client: ${customerName}</div>
  <div>Vendeur: ${sellerName}</div>
      <div class="line"></div>
      <table>
          <thead>
            <tr><th>Produit</th><th>Qté</th><th>Prix</th><th>Total</th></tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
      </table>
      <div class="line"></div>
      <div class="bold">TOTAL: ${total.toFixed(0)} F CFA</div>
      <div>Montant reçu: ${amountReceived.toFixed(0)} F</div>
      <div>Monnaie: ${changeAmount.toFixed(0)} F</div>
      <div class="line"></div>
      <div class="center" style="font-size:13px;">Meilleure Santé !</div>
  </body>
  </html>
  `;
}


