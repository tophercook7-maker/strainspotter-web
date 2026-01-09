use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  println!("🚀 StrainSpotter AI starting");

  tauri::Builder::default()
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      println!("🧭 WebView URL: {:?}", window.url());
      
      // Ensure window stays open
      window.show().ok();
      window.set_focus().ok();
      
      // DevTools are enabled via "devtools": true in tauri.conf.json
      // Keyboard shortcuts:
      //   macOS: Cmd + Option + I  or  Cmd + Shift + I
      //   Windows/Linux: Ctrl + Shift + I  or  F12
      // 
      // If keyboard shortcuts don't work, DevTools may need to be opened
      // via right-click context menu (if available) or programmatically
      // from within the web app using JavaScript.
      
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      Ok(())
    })
    .on_page_load(|_window, payload| {
      println!("📄 Page load event: {:?}", payload);
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
