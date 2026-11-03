//! Native shell for Global Basketball Manager on Windows.
//! All game logic runs in the shared TypeScript engine inside the webview;
//! this crate only provides the window and file-system access for saves.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running Global Basketball Manager");
}
