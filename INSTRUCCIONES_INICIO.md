# Instrucciones para Iniciar el Servidor

## Problema: PowerShell bloquea la ejecución de scripts

Si ves el error: "No se puede cargar el archivo... ejecución de scripts está deshabilitada"

## Solución 1: Habilitar ejecución de scripts (Recomendado)

Abre PowerShell como **Administrador** y ejecuta:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Luego intenta de nuevo:
```powershell
npm run dev
```

## Solución 2: Usar el script .bat (Más fácil)

Simplemente ejecuta:
```cmd
start-dev.bat
```

O haz doble clic en el archivo `start-dev.bat`

## Solución 3: Usar CMD en lugar de PowerShell

1. Abre **CMD** (Símbolo del sistema) en lugar de PowerShell
2. Navega a la carpeta del proyecto:
   ```cmd
   cd "C:\Users\dakyo\Documents\Proyectos de apps\BankDashboard\BankFlowDashboard"
   ```
3. Ejecuta:
   ```cmd
   npm run dev:win
   ```

## Solución 4: Instalar dependencias primero

Si aún no has instalado las dependencias:

```cmd
npm install
```

Esto instalará todas las dependencias incluyendo `dotenv` y `cross-env`.

## Verificar que el servidor está corriendo

Una vez iniciado, deberías ver un mensaje como:
```
serving on port 5000
```

Luego abre tu navegador en: http://localhost:5000

## Si sigue sin funcionar

1. Verifica que Node.js esté instalado:
   ```cmd
   node --version
   ```

2. Verifica que npm esté instalado:
   ```cmd
   npm --version
   ```

3. Instala las dependencias:
   ```cmd
   npm install
   ```

4. Intenta iniciar con el script .bat:
   ```cmd
   start-dev.bat
   ```







