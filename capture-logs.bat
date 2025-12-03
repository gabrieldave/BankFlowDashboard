@echo off
echo ========================================
echo Capturador de Logs del Servidor
echo ========================================
echo.

REM Detener procesos anteriores
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Iniciando servidor y capturando logs...
echo Los logs se guardaran en: server-logs.txt
echo Presiona Ctrl+C para detener
echo.

REM Iniciar servidor y capturar logs
npm run dev > server-logs.txt 2>&1

echo.
echo Servidor detenido. Logs guardados en server-logs.txt
pause

