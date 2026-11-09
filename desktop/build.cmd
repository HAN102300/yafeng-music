@echo off
REM ============================================================
REM YaFeng Music desktop client - one-click build pipeline
REM Usage: desktop\build.cmd [debug|release|installer]
REM   debug     - fast debug exe (default, no installer bundle)
REM   release   - optimized exe (no installer bundle)
REM   installer - release + NSIS installer
REM ============================================================
setlocal enabledelayedexpansion
set RUSTUP_DIST_SERVER=https://rsproxy.cn
set RUSTUP_UPDATE_ROOT=https://rsproxy.cn/rustup
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
cd /d "%~dp0.."

echo [1/4] Building Next standalone (DESKTOP_BUILD=1)...
set DESKTOP_BUILD=1
set NEXT_TELEMETRY_DISABLED=1
call npm run build || goto :fail

echo [2/4] Merging static/public into standalone...
robocopy ".next\static" ".next\standalone\.next\static" /MIR /NFL /NDL /NJH /NJS /NP >nul
robocopy "public" ".next\standalone\public" /MIR /NFL /NDL /NJH /NJS /NP >nul

echo [3/4] Syncing standalone into src-tauri resources...
robocopy ".next\standalone" "src-tauri\resources\next-server" /MIR /NFL /NDL /NJH /NJS /NP >nul

echo [4/4] Compiling desktop shell...
if "%~1"=="installer" (
  npx tauri build || goto :fail
  echo.
  echo [OK] installer output: src-tauri\target\release\bundle\nsis\
) else if "%~1"=="release" (
  npx tauri build --no-bundle || goto :fail
  echo.
  echo [OK] binary: src-tauri\target\release\yafeng-music.exe
) else (
  npx tauri build --debug --no-bundle || goto :fail
  echo.
  echo [OK] binary: src-tauri\target\debug\yafeng-music.exe
)
goto :eof

:fail
echo [FAIL] build failed
exit /b 1
