use std::net::TcpListener;
use std::time::Duration;
use tauri::{
    Emitter, Listener, Manager, WindowEvent,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    path::BaseDirectory,
};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[cfg(windows)]
use windows::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    SetInformationJobObject,
};
#[cfg(windows)]
use windows::Win32::Foundation::HANDLE;

/// 把 sidecar 挂进 Windows Job Object（KILL_ON_JOB_CLOSE）：
/// 宿主进程无论正常退出、崩溃还是被任务管理器强杀，OS 都会自动回收 node sidecar，
/// 从根上杜绝「退出软件后 node.exe 驻留后台」的孤儿进程。
#[cfg(windows)]
fn bind_job_object(child_pid: u32) {
    unsafe {
        let job = match CreateJobObjectW(
            None::<*const windows::Win32::Security::SECURITY_ATTRIBUTES>,
            windows::core::PCWSTR::null(),
        ) {
            Ok(h) => h,
            Err(e) => {
                flush_log(&format!("job object create failed: {}", e));
                return;
            }
        };
        let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if let Err(e) = SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const core::ffi::c_void,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        ) {
            flush_log(&format!("job object set failed: {}", e));
            return;
        }
        // 打开子进程句柄（TAURI_SIDECAR 权限足够 PROCESS_SET_QUOTA | PROCESS_TERMINATE）
        let ok = OpenProcessForJob(child_pid).and_then(|h| {
            let r = AssignProcessToJobObject(job, h);
            let _ = windows::Win32::Foundation::CloseHandle(h);
            r
        });
        if let Err(e) = ok {
            flush_log(&format!("job object assign failed: {}", e));
        } else {
            flush_log("sidecar bound to job object (kill-on-close)");
            // 故意不 CloseHandle(job)：job 句柄随宿主进程退出关闭时触发 KILL_ON_JOB_CLOSE
        }
    }
}

#[cfg(windows)]
fn OpenProcessForJob(pid: u32) -> windows::core::Result<HANDLE> {
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA, PROCESS_TERMINATE,
    };
    unsafe {
        OpenProcess(
            PROCESS_SET_QUOTA | PROCESS_TERMINATE | PROCESS_QUERY_INFORMATION,
            false,
            pid,
        )
    }
}

#[cfg(not(windows))]
fn bind_job_object(_child_pid: u32) {}

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
                            app.emit("yafeng:exit-cleanup", "").ok();
                            std::thread::sleep(Duration::from_millis(150));
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
            let app_for_close = app.handle().clone();
            let data_dir = app.path().app_data_dir().ok();
            main_win.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    // 关闭行为读用户设置（Store 文件 app:closing-behavior，默认 tray）
                    let behavior = read_closing_behavior(&data_dir);
                    if behavior == "exit" {
                        flush_log("close: exit requested by setting");
                        app_for_close.emit("yafeng:exit-cleanup", "").ok();
                        std::thread::sleep(Duration::from_millis(150));
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
            // userData 目录传给 sidecar：匿名设备身份持久化（跨重启复用同一设备指纹降风控）
            let data_dir_str = app
                .path()
                .app_data_dir()
                .map(|d| d.to_string_lossy().into_owned())
                .unwrap_or_default();
            let (mut rx, child) = app
                .shell()
                .sidecar("node")?
                .args(["server.js"])
                .env("PORT", port.to_string())
                .env("HOSTNAME", "127.0.0.1")
                .env("NODE_ENV", "production")
                .env("NEXT_TELEMETRY_DISABLED", "1")
                .env("TAURI_DATA_DIR", data_dir_str.clone())
                .current_dir(&server_dir)
                .spawn()?;
            flush_log(&format!("setup: sidecar on port {}", port));

            // Job Object 兜底：宿主任何形式的退出（含崩溃/强杀）都让 OS 回收 sidecar
            bind_job_object(child.pid());

            // 保存 sidecar 句柄供退出路径显式 kill（双保险）
            let sidecar_kill = std::sync::Arc::new(std::sync::Mutex::new(Some(child)));
            let kill_for_exit = sidecar_kill.clone();
            app.listen_any("yafeng:exit-cleanup", move |_event| {
                if let Ok(mut guard) = kill_for_exit.lock() {
                    if let Some(c) = guard.take() {
                        flush_log("exit-cleanup: killing sidecar");
                        let _ = c.kill();
                    }
                }
            });

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
