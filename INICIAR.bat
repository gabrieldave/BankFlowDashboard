@echo off
title BankFlow Dashboard
color 0A
cls

cd /d "%~dp0"

echo.
echo ========================================
echo   BANKFLOW DASHBOARD
echo ========================================
echo.
echo Iniciando servidor...
echo.

set NODE_ENV=development

REM Usar node directamente con tsx
node node_modules\tsx\dist\cli.mjs server/index.ts

if errorlevel 1 (
    echo.
    echo ERROR: El servidor no pudo iniciar
    echo.
    echo Verifica:
    echo 1. Que Node.js este instalado: node --version
    echo 2. Que las dependencias esten instaladas: npm install
    echo.
    pause
)







