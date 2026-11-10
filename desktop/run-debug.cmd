@echo off
REM Launch YaFeng Music desktop client (debug build)
REM NOTE: after changing web frontend code, run desktop\build.cmd first to refresh embedded bundle
cd /d "%~dp0..\src-tauri\target\debug"
start "" /WAIT cmd /c "yafeng-music.exe >> run-debug-output.log 2>&1"
