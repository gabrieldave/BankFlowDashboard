@echo off
title BankFlow Dashboard - Servidor
color 0A
cls

echo.
echo ================================================
echo    BANKFLOW DASHBOARD - SERVIDOR
echo ================================================
echo.
echo Iniciando servidor...
echo.

cd /d "%~dp0"
set NODE_ENV=development

REM Verificar si node_modules existe
if not exist "node_modules" (
    echo [ERROR] Las dependencias no estan instaladas.
    echo.
    echo Ejecuta primero: npm install
    echo.
    pause
    exit /b 1
)

REM Usar node directamente con tsx
if exist "node_modules\tsx\dist\cli.mjs" (
    node node_modules\tsx\dist\cli.mjs server/index.ts
) else (
    echo [ERROR] tsx no encontrado. Instalando...
    call npm install tsx --save-dev
    node node_modules\tsx\dist\cli.mjs server/index.ts
)

pause







