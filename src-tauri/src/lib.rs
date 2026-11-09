use std::net::TcpListener;
use std::time::Duration;
use tauri::{
    Manager, WindowEvent,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    path::BaseDirectory,
};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

fn find_free_port() -> Option<u16> {
    TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|l| l.local_addr().ok().map(|a| a.port()))
}

fn flush_log(msg: &str) {
    use std::io::Write;
    let mut err = std::io::stderr();
    let _ = writeln!(err, "[yafeng] {}", msg);
    let _ = err.flush();
}

fn send_cmd(app: &tauri::AppHandle, cmd: &str) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.eval(&format!("window.__YAFENG_DESKTOP_CMD__ && window.__YAFENG_DESKTOP_CMD__('{}')", cmd));
    }
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 第二次启动：唤起已有窗口
            show_main(app);
        }))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            flush_log("setup: started");

            // ---- 系统托盘 ----
            let toggle = MenuItem::with_id(app, "toggle", "播放 / 暂停", true, None::<&str>)?;
            let prev = MenuItem::with_id(app, "prev", "上一首", true, None::<&str>)?;
            let next = MenuItem::with_id(app, "next", "下一首", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &prev, &next, &show, &quit])?;

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("雅枫音乐")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "toggle" => send_cmd(app, "toggle-play"),
                        "prev" => send_cmd(app, "prev"),
                        "next" => send_cmd(app, "next"),
                        "show" => show_main(app),
                        "quit" => {
                            flush_log("tray: quit requested");
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, button_state: tauri::tray::MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;
            flush_log("setup: tray built");

            // ---- 关闭按钮 → 最小化到托盘 ----
            let main_win = app.get_webview_window("main").expect("main window missing");
            let win_for_close = main_win.clone();
            main_win.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    let _ = win_for_close.hide(); // 阻止默认关闭，仅隐藏
                    api.prevent_close();
                }
            });

            // ---- 内嵌 Next 服务器（方案 B sidecar）----
            let port = find_free_port().ok_or("no free port")?;
            let server_dir = app.path().resolve("resources/next-server", BaseDirectory::Resource)?;
            let (mut rx, _child) = app
                .shell()
                .sidecar("node")?
                .args(["server.js"])
                .env("PORT", port.to_string())
                .env("HOSTNAME", "127.0.0.1")
                .env("NODE_ENV", "production")
                .env("NEXT_TELEMETRY_DISABLED", "1")
                .current_dir(&server_dir)
                .spawn()?;
            flush_log(&format!("setup: sidecar on port {}", port));

            let port = port;
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => flush_log(&format!("[next] {}", String::from_utf8_lossy(&line))),
                        CommandEvent::Stderr(line) => flush_log(&format!("[next:err] {}", String::from_utf8_lossy(&line))),
                        CommandEvent::Terminated(_) => flush_log("[next] terminated"),
                        _ => {}
                    }
                }
            });

            let mut ready = false;
            for _ in 0..75 {
                if std::net::TcpStream::connect(format!("127.0.0.1:{port}")).is_ok() {
                    ready = true;
                    break;
                }
                std::thread::sleep(Duration::from_millis(200));
            }
            flush_log(&format!("setup: server ready = {}", ready));

            let url: tauri::Url = format!("http://127.0.0.1:{port}").parse().unwrap();
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.navigate(url);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
