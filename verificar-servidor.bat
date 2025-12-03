@echo off
title Verificar Servidor BankFlow
color 0B
cls

echo.
echo ================================================
echo    VERIFICACION DEL SERVIDOR
echo ================================================
echo.

cd /d "%~dp0"

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo    ERROR: Node.js no esta instalado
    pause
    exit /b 1
)
echo    OK - Node.js instalado
node --version

echo.
echo [2/4] Verificando dependencias...
if not exist "node_modules" (
    echo    ERROR: Las dependencias no estan instaladas
    echo    Ejecuta: npm install
    pause
    exit /b 1
)
echo    OK - Dependencias instaladas

echo.
echo [3/4] Verificando puerto 5000...
netstat -ano | findstr :5000 >nul 2>&1
if not errorlevel 1 (
    echo    ADVERTENCIA: El puerto 5000 esta en uso
    echo    Cierra otras aplicaciones o cambia el puerto
) else (
    echo    OK - Puerto 5000 disponible
)

echo.
echo [4/4] Probando servidor basico...
node test-simple.js

pause







