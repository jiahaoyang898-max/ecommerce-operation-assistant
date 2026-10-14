@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo.
echo   Ecommerce Operation Assistant - stop all services
echo   ===============================================
echo.

docker compose version >nul 2>&1
if %ERRORLEVEL%==0 (
  docker compose down
) else (
  docker-compose down
)

echo.
echo   All services stopped. Data volumes are kept.
echo.
pause
