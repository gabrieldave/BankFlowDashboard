# 🚀 INICIO RÁPIDO - BankFlow Dashboard

## Problema: PowerShell bloquea scripts

## ✅ SOLUCIÓN DEFINITIVA

### Paso 1: Abre CMD (NO PowerShell)
- Presiona `Win + R`
- Escribe: `cmd`
- Presiona Enter

### Paso 2: Ve a la carpeta del proyecto
```cmd
cd "C:\Users\dakyo\Documents\Proyectos de apps\BankDashboard\BankFlowDashboard"
```

### Paso 3: Instala dependencias (si no lo has hecho)
```cmd
npm install
```

### Paso 4: Inicia el servidor
```cmd
set NODE_ENV=development
node node_modules\tsx\dist\cli.mjs server/index.ts
```

### Paso 5: Abre tu navegador
Ve a: **http://localhost:5000**

---

## 🔧 Si aún no funciona:

### Verificar que Node.js funciona:
```cmd
node --version
```
Debe mostrar: v18 o superior

### Verificar que npm funciona:
```cmd
npm --version
```

### Verificar que las dependencias están instaladas:
```cmd
dir node_modules
```
Debe mostrar una lista de carpetas

### Verificar que el puerto 5000 está libre:
```cmd
netstat -ano | findstr :5000
```
Si muestra algo, cierra esa aplicación

---

## 📝 Alternativa: Usar el script de verificación

Ejecuta en CMD:
```cmd
verificar-servidor.bat
```

Este script te dirá exactamente qué está fallando.

---

## ⚠️ Si PowerShell sigue dando problemas:

**Habilita la ejecución de scripts (una vez):**

1. Abre PowerShell como **Administrador**
2. Ejecuta:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
3. Cierra y vuelve a abrir PowerShell
4. Ahora podrás usar `npm run dev`

---

## 🆘 ¿Qué error específico ves?

Comparte el mensaje de error exacto que aparece cuando intentas iniciar el servidor.







