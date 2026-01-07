#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .on_webview_ready(|window| {
      // Log navigation start and load errors for diagnostics.
      window
        .with_webview(|webview| {
          webview.set_navigation_handler(|uri| {
            println!("[webview] navigating to {}", uri);
            true
          });
          webview.set_load_started(|_, uri| {
            println!("[webview] load started: {}", uri);
          });
          webview.set_load_finished(|_, success| {
            println!("[webview] load finished success={}", success);
          });
          webview.set_load_failed(|_, uri, error| {
            eprintln!("[webview] load failed: {} error={}", uri, error);
          });
        })
        .ok();
    })
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
