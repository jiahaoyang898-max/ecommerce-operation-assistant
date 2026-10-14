@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo  Rebuild ecommerce-operation-assistant images (api+worker+web)
echo  with auto-retry on TLS timeout. Run from project root.
echo ============================================================
powershell -ExecutionPolicy Bypass -File "%~dp0rebuild.ps1"
echo.
echo Done. Press any key to close this window...
pause >nul
