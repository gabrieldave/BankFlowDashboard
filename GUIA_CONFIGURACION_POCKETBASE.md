# Guía de Configuración de PocketBase

## 📋 Información Necesaria

Para configurar PocketBase en este proyecto, necesitas:

### 1. URL del Servidor PocketBase

**IMPORTANTE**: Usa la URL **EXACTA** tal como funciona en el navegador, sin modificar nada.

**Ejemplo correcto:**
```
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online/_/
```

**❌ NO hagas esto:**
- ❌ NO quites el `/_/` al final
- ❌ NO agregues puertos como `:8080` si no los tiene
- ❌ NO cambies la estructura de la URL
- ❌ NO uses la URL sin el `/_/` aunque parezca que es solo el panel

**✅ SÍ haz esto:**
- ✅ Usa la URL exacta que funciona en el navegador
- ✅ Si termina en `/_/`, déjala así
- ✅ Si tiene un puerto específico, inclúyelo
- ✅ Copia la URL directamente del navegador

### 2. Credenciales de Administrador

Necesitas el email y contraseña del **primer administrador** de PocketBase (el que creaste al inicializar PocketBase).

```env
POCKETBASE_ADMIN_EMAIL=tu-email@ejemplo.com
POCKETBASE_ADMIN_PASSWORD=tu-contraseña
```

**Nota**: Estas deben ser credenciales de **administrador**, no de un usuario normal.

## 🔧 Configuración del Archivo .env

Crea o actualiza tu archivo `.env` en la raíz del proyecto:

```env
# PocketBase Configuration
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online/_/
POCKETBASE_ADMIN_EMAIL=tu-email@ejemplo.com
POCKETBASE_ADMIN_PASSWORD=tu-contraseña
```

## 🚀 Inicialización

Una vez configurado el `.env`, ejecuta:

```bash
npm run diagnostico-pocketbase
```

Este comando:
- ✅ Verifica la conexión al servidor
- ✅ Prueba la autenticación
- ✅ Verifica si las colecciones existen
- ✅ Crea automáticamente las colecciones faltantes (`users` y `transactions`)

## 📦 Colecciones Necesarias

El proyecto requiere dos colecciones:

### Colección "users" (tipo Auth)
- `username` (Text, Required, Unique)
- `password` (Text, Required)

### Colección "transactions" (tipo Base)
- `id_number` (Number, Optional)
- `date` (Text, Required)
- `description` (Text, Required)
- `amount` (Number, Required)
- `type` (Text, Required)
- `category` (Text, Required)
- `merchant` (Text, Required)
- `currency` (Text, Required, Default: `MXN`)

**Nota**: Estas colecciones se crean automáticamente con el script de diagnóstico, pero también puedes crearlas manualmente desde el panel web.

## ✅ Verificación

Para verificar que todo funciona:

1. **Verifica la conexión:**
   ```bash
   npm run diagnostico-pocketbase
   ```

2. **Inicia la aplicación:**
   ```bash
   npm run dev
   ```

3. **Prueba subiendo un archivo** desde la interfaz web

## 🔍 Solución de Problemas

### Error: "fetch failed"
- Verifica que la URL sea exactamente la que funciona en el navegador
- Asegúrate de que el servidor PocketBase esté en línea
- Verifica que no haya problemas de firewall

### Error: "The requested resource wasn't found"
- Verifica que la URL no tenga errores de tipeo
- Asegúrate de usar la URL completa tal como aparece en el navegador

### Error: "Something went wrong" en autenticación
- Verifica que las credenciales sean correctas
- Asegúrate de que sean credenciales de administrador
- Verifica que el usuario tenga permisos de administrador

### Error: "Collection not found"
- Ejecuta `npm run diagnostico-pocketbase` para crear las colecciones automáticamente
- O créalas manualmente desde el panel web

## 📝 Resumen Rápido

**Para configurar PocketBase, di:**

> "Necesito configurar PocketBase. La URL exacta que funciona en el navegador es: [URL completa con /_/ si la tiene]. Las credenciales de administrador son: [email] y [contraseña]."

**Ejemplo:**
> "Necesito configurar PocketBase. La URL exacta que funciona en el navegador es: `https://estadosdecuenta-db.david-cloud.online/_/`. Las credenciales de administrador son: `admin@ejemplo.com` y `mi-contraseña`."

## 🎯 Puntos Clave a Recordar

1. **URL exacta**: Usa la URL tal como funciona en el navegador, sin modificar
2. **Credenciales de admin**: Deben ser del primer administrador, no de usuarios normales
3. **Script de diagnóstico**: Siempre ejecuta `npm run diagnostico-pocketbase` después de configurar
4. **Colecciones**: Se crean automáticamente, no necesitas hacerlo manualmente

## 📚 Comandos Útiles

```bash
# Diagnóstico completo
npm run diagnostico-pocketbase

# Inicialización con SDK
npm run init-pocketbase-sdk

# Iniciar aplicación
npm run dev
```



