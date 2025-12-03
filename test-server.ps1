# Script para iniciar el servidor y ver errores
$env:NODE_ENV = "development"
Write-Host "Iniciando servidor..." -ForegroundColor Cyan
Write-Host "Si ves errores, cópialos y compártelos" -ForegroundColor Yellow
Write-Host ""

try {
    npx tsx server/index.ts
} catch {
    Write-Host "Error al iniciar servidor:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Presiona cualquier tecla para salir..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}







