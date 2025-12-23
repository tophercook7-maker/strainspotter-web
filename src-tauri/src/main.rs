// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowEvent, Listener};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        // Auto-updater plugin (disabled by default, enable when update server is ready)
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Get the main window
            if let Some(window) = app.get_webview_window("main") {
                // Check desktop access on window load
                window.listen("tauri://loaded", |_event| {
                    // Access check happens via API route in the web app
                    // If access is denied, the web app will show the access denied page
                });

                // Handle window close to save state
                // Window state plugin handles saving automatically
                window.on_window_event(|event| {
                    if let WindowEvent::CloseRequested { .. } = event {
                        // State is saved automatically by window-state plugin
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
