@echo off
echo ========================================
echo   Iniciando BankFlow Dashboard
echo ========================================
echo.

set NODE_ENV=development

if not exist node_modules\tsx (
    echo Instalando dependencias faltantes...
    call npm install nanoid
    echo.
)

echo Iniciando servidor en puerto 5000...
echo Abre http://localhost:5000 en tu navegador
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

node node_modules\tsx\dist\cli.mjs server/index.ts

