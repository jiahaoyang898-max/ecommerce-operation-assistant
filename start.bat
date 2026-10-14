@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo.
echo   Ecommerce Operation Assistant - one-click start
echo   ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
set EXITCODE=%ERRORLEVEL%

if not "%EXITCODE%"=="0" (
  echo.
  echo   [FAILED] startup aborted with exit code %EXITCODE%
)

echo.
pause
exit /b %EXITCODE%
