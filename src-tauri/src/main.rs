#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Menu, MenuItem, Submenu, Manager};
use serde_json::Value;

// Commande pour imprimer une facture
#[tauri::command]
async fn print_invoice(window: tauri::Window, invoice_data: Value) -> Result<String, String> {
    println!("🖨️ Début de l'impression de la facture");
    
    // Générer le HTML de la facture
    let html_content = generate_invoice_html(&invoice_data);
    
// Fermer la fenêtre print_window si elle existe déjà
    if let Some(existing) = window.app_handle().get_window("print_window") {
        let _ = existing.close();
        // Petit délai pour s'assurer que la fenêtre est bien fermée avant d'en recréer une
        std::thread::sleep(std::time::Duration::from_millis(300));
    }


    // Créer une nouvelle fenêtre pour l'impression
    let print_window = tauri::WindowBuilder::new(
        &window.app_handle(),
        "print_window",
        tauri::WindowUrl::App("about:blank".into())
    )
    .title("Impression Facture")
    .inner_size(800.0, 600.0)
    .visible(true) // Rendre visible pour debug
    .resizable(false)
    .build()
    .map_err(|e| {
        println!("❌ Erreur création fenêtre: {}", e);
        e.to_string()
    })?;

    // Attendre que la fenêtre soit prête
    std::thread::sleep(std::time::Duration::from_millis(500));

    // Injecter le HTML et déclencher l'impression
    // ⚠️ Nouveau échappement propre du HTML
let safe_html = html_content
    .replace("\\", "\\\\")
    .replace('`', "\\`")
    .replace('$', "\\$")
    .replace('\n', "")
    .replace('\r', "");

// ✅ Nouveau script avec safe_html
let script = format!(
    r#"
    document.open();
    document.write(`{}`);
    document.close();

    setTimeout(() => {{
        window.print();
        setTimeout(() => {{
            if (window.__TAURI__) {{
                window.__TAURI__.invoke('close_print_window');
            }}
        }}, 2000);
    }}, 1000);
    "#,
    safe_html
);



    print_window.eval(&script).map_err(|e| {
        println!("❌ Erreur injection script: {}", e);
        e.to_string()
    })?;

    println!("✅ Impression déclenchée avec succès");
    Ok("Impression déclenchée".to_string())
}

// Fonction pour générer le HTML de la facture
fn generate_invoice_html(invoice_data: &Value) -> String {
   
    let sale = &invoice_data["sale"];
    let items = &invoice_data["items"];
    let pharmacy = &invoice_data["pharmacy"];

    let pharmacy_name = pharmacy["pharmacy_name"].as_str().unwrap_or("PharmaCare");
    let pharmacy_address = pharmacy["pharmacy_address"].as_str().unwrap_or("");
    let pharmacy_phone = pharmacy["pharmacy_phone"].as_str().unwrap_or("");

    let sale_id = sale["id"].as_i64().unwrap_or(0);
    let customer_name = sale["customer_name"].as_str().unwrap_or("Client anonyme");
    let created_at = sale["created_at"].as_str().unwrap_or("");

    // ✅ Conversion sûre de total (chaîne ou nombre)
    let total = match sale.get("total") {
        Some(v) => {
            if let Some(f) = v.as_f64() {
                f
            } else if let Some(s) = v.as_str() {
                s.parse::<f64>().unwrap_or(0.0)
            } else {
                0.0
            }
        },
        None => 0.0,
    };

    // ✅ Conversion sûre de amount_received (nullable ou chaîne)
    let amount_received = match sale.get("amount_received") {
        Some(v) => {
            if let Some(f) = v.as_f64() {
                f
            } else if let Some(s) = v.as_str() {
                s.parse::<f64>().unwrap_or(total)
            } else {
                total
            }
        },
        None => total,
    };

    let change_amount = (amount_received - total).max(0.0);

    // ✅ Construction des lignes produits
    let items_html = if let Some(items_array) = items.as_array() {
        items_array.iter().map(|item| {
            let product_name = item["product_name"].as_str().unwrap_or("Produit");
            let quantity = item["quantity"].as_i64().unwrap_or(0);
            let price = match item["price"].as_str() {
                Some(s) => s.parse::<f64>().unwrap_or(0.0),
                None => item["price"].as_f64().unwrap_or(0.0),
            };
            let line_total = quantity as f64 * price;
            format!(
                "<tr><td>{}</td><td>{}</td><td>{:.0} F</td><td>{:.0} F</td></tr>",
                product_name, quantity, price, line_total
            )
        }).collect::<Vec<String>>().join("")
    } else {
        "<tr><td colspan='4'>Aucun article</td></tr>".to_string()
    };

    // ✅ HTML du reçu
    format!(r#"
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: monospace; font-size: 12px; padding: 10px; }}
            .center {{ text-align: center; }}
            .bold {{ font-weight: bold; }}
            table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
            td {{ padding: 2px 0; }}
            .line {{ border-top: 1px dashed #000; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <div class="center bold">{}</div>
        <div class="center">{}</div>
        <div class="center">Tél: {}</div>
        <div class="line"></div>
        <div>Facture N°: {}</div>
        <div>Date: {}</div>
        <div>Client: {}</div>
        <div class="line"></div>
        <table>
            <thead><tr><td>Produit</td><td>Qté</td><td>Prix</td><td>Total</td></tr></thead>
            <tbody>{}</tbody>
        </table>
        <div class="line"></div>
        <div class="bold">TOTAL: {:.0} F CFA</div>
        <div>Montant reçu: {:.0} F</div>
        <div>Monnaie: {:.0} F</div>
        <div class="line"></div>
        <div class="center">Meilleur Santé !</div>
    </body>
    </html>
    "#,
    pharmacy_name,
    pharmacy_address,
    pharmacy_phone,
    sale_id,
    created_at,
    customer_name,
    items_html,
    total,
    amount_received,
    change_amount
    )
}




// Commande pour ouvrir un dossier
use tauri::Window; // Assure-toi d’avoir cet import

#[tauri::command]
async fn open_folder(window: Window, path: String) -> Result<(), String> {
    tauri::api::shell::open(&window.shell_scope(), path, None)
        .map_err(|e| e.to_string())
}



#[tauri::command]
fn close_print_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(print_window) = app.get_window("print_window") {
        print_window.close().map_err(|e| e.to_string())
    } else {
        Err("Impossible de trouver la fenêtre d'impression.".into())
    }
}





fn main() {
    // Créer le menu de l'application
    let quit = CustomMenuItem::new("quit".to_string(), "Quitter");
    let about = CustomMenuItem::new("about".to_string(), "À propos");
    let settings = CustomMenuItem::new("settings".to_string(), "Paramètres");
    
    let submenu = Submenu::new("PharmaCare", Menu::new()
        .add_item(about)
        .add_native_item(MenuItem::Separator)
        .add_item(settings)
        .add_native_item(MenuItem::Separator)
        .add_item(quit));
    
    let menu = Menu::new()
        .add_submenu(submenu);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "quit" => {
                    std::process::exit(0);
                }
                "about" => {
                    let window = event.window();
                    let _ = tauri::api::dialog::message(
                        Some(window),
                        "À propos",
                        "PharmaCare v1.0.0\nSystème de gestion de pharmacie moderne"
                    );
                }
                "settings" => {
                    // Naviguer vers la page des paramètres
                    let window = event.window();
                    let _ = window.eval("window.location.hash = '#/settings'");
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![print_invoice, open_folder, close_print_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}