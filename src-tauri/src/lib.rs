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

/// 崩溃日志：写入 target 旁（debug）或 userData（release），任何启动路径都有据可查
fn setup_panic_log(app: &tauri::AppHandle) {
    let log_path = app.path().app_log_dir().map(|d| d.join("startup.log")).ok();
    if let Some(p) = log_path {
        if let Some(parent) = p.parent() { let _ = std::fs::create_dir_all(parent); }
        let p_for_launch = p.clone();
        std::panic::set_hook(Box::new(move |info| {
            let ts = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
            let _ = std::fs::OpenOptions::new().create(true).append(true).open(&p)
                .and_then(|mut f| std::io::Write::write_all(&mut f, format!("[{}] PANIC: {}\n", ts, info).as_bytes()));
        }));
        let _ = std::fs::OpenOptions::new().create(true).append(true).open(&p_for_launch)
            .and_then(|mut f| {
                let ts = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                std::io::Write::write_all(&mut f, format!("[{}] launch\n", ts).as_bytes())
            });
    }
}

/// 读用户关闭行为设置（yafeng-data.json 的 app:closing-behavior，默认 tray）
fn read_closing_behavior(data_dir: &Option<std::path::PathBuf>) -> String {
    if let Some(dir) = data_dir {
        let f = dir.join("yafeng-data.json");
        if let Ok(content) = std::fs::read_to_string(&f) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                if v.get("app:closing-behavior").and_then(|x| x.as_str()) == Some("exit") {
                    return "exit".to_string();
                }
            }
        }
    }
    "tray".to_string()
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
            setup_panic_log(app.handle());

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
            let data_dir = app.path().app_data_dir().ok();
            main_win.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    // 关闭行为读用户设置（Store 文件 app:closing-behavior，默认 tray）
                    // Store 文件在 userData 目录；ServerDe?? 此处直接读文件
                    let behavior = read_closing_behavior(&data_dir);
                    if behavior == "exit" {
                        flush_log("close: exit requested by setting");
                        // 放行默认关闭
                    } else {
                        let _ = win_for_close.hide(); // 最小化到托盘
                        api.prevent_close();
                    }
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
                // 页面加载完成后再显示窗口：消除 sidecar 启动期的黑屏空窗
                // （窗口默认 visible=false，见 tauri.conf.json）
                let win_for_show = win.clone();
                win.on_window_event(|_event| {}); // 保持句柄活性
                let _ = win.navigate(url);
                tauri::async_runtime::spawn(async move {
                    // 就绪信号兜底：最长 6s 后无论是否收到 loaded 都显示（防卡死不可见）
                    for _ in 0..60 {
                        if win_for_show.is_visible().unwrap_or(true) { break; }
                        std::thread::sleep(Duration::from_millis(100));
                    }
                    let _ = win_for_show.show();
                    let _ = win_for_show.set_focus();
                    flush_log("setup: window shown");
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
