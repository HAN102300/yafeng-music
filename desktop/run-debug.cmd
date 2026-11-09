@echo off
REM Launch YaFeng Music desktop client (debug build)
REM NOTE: after changing web frontend code, run desktop\build.cmd first to refresh embedded bundle
cd /d "%~dp0..\src-tauri\target\debug"
start "" yafeng-music.exe
