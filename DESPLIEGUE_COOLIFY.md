# Guía de Despliegue en Coolify con PocketBase

## 📋 Requisitos Previos

1. **Cuenta en Coolify** con acceso a tu servidor
2. **PocketBase desplegado** y funcionando (ya lo tienes en `https://estadosdecuenta-db.david-cloud.online/_/`)
3. **Repositorio en GitHub** (ya está configurado)

## 🚀 Pasos para Desplegar en Coolify

### 1. Crear Nueva Aplicación en Coolify

1. En el panel de Coolify, haz clic en **"New Resource"** → **"Application"**
2. Selecciona **"GitHub"** como fuente
3. Conecta tu repositorio: `gabrieldave/BankFlowDashboard`
4. Selecciona la rama: `main`
5. Configura:
   - **Build Pack**: `Nixpacks` (se detecta automáticamente)
   - **Is it a static site?**: ❌ NO (desmarcado)

### 2. Configurar Variables de Entorno

En la sección **"Environment Variables"** de tu aplicación en Coolify, agrega:

```env
# Entorno
NODE_ENV=production
PORT=5000

# PocketBase Configuration
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online/_/
POCKETBASE_ADMIN_EMAIL=tu-email@ejemplo.com
POCKETBASE_ADMIN_PASSWORD=tu-contraseña

# DeepSeek API (opcional pero recomendado)
DEEPSEEK_API_KEY=sk-tu-api-key-aqui
```

**⚠️ IMPORTANTE:**
- Usa la URL **EXACTA** de PocketBase tal como funciona en el navegador
- No quites el `/_/` de la URL
- No agregues puertos si no los tiene la URL original

### 3. Configurar Build (Nixpacks)

En la sección **"Build"**:

**Con Nixpacks, los siguientes campos pueden quedarse VACÍOS** (Nixpacks los detecta automáticamente):
- **Install Command**: (vacío)
- **Build Command**: (vacío)
- **Start Command**: (vacío)
- **Base Directory**: `/`
- **Publish Directory**: `/` (o `/dist/public` si quieres ser específico)

**⚠️ IMPORTANTE - Configuración de Puertos:**

En la sección **"Network"**:
- **Ports Exposes**: `5000` (debe coincidir con la variable PORT)
- **Ports Mappings**: `5000:5000`
- **Variable de entorno PORT**: `5000` (ya configurada)

**🔴 Error común**: Si ves el warning "PORT mismatch detected", significa que:
- La variable `PORT` está en `5000` pero "Ports Exposes" está en otro valor (ej: `3000`)
- **Solución**: Cambia "Ports Exposes" a `5000` para que coincida con `PORT=5000`

### 4. Configurar Dominio

1. En **"Domains"**, agrega tu dominio personalizado
2. O usa el dominio generado por Coolify
3. Asegúrate de que el dominio apunte correctamente

### 5. Desplegar

1. Haz clic en **"Deploy"** o **"Redeploy"**
2. Espera a que se complete el build
3. Verifica los logs para asegurarte de que no hay errores

## 🔧 Configuración Post-Despliegue

### 1. Verificar Conexión a PocketBase

Una vez desplegado, verifica que la aplicación pueda conectarse a PocketBase:

1. Accede a los logs de la aplicación en Coolify
2. Busca mensajes de conexión a PocketBase
3. Si hay errores, verifica las variables de entorno

### 2. Inicializar Colecciones (si es necesario)

Si las colecciones no existen, puedes:

**Opción A: Desde la aplicación (recomendado)**
- La aplicación intentará crear las colecciones automáticamente al iniciar
- Revisa los logs para confirmar

**Opción B: Manualmente desde PocketBase**
- Ve a `https://estadosdecuenta-db.david-cloud.online/_/`
- Crea las colecciones `users` y `transactions` según `CREAR_COLECCIONES_MANUAL.md`

### 3. Verificar Funcionamiento

1. Accede a tu aplicación desplegada
2. Intenta subir un archivo CSV o PDF
3. Verifica que las transacciones se guarden en PocketBase

## 📝 Variables de Entorno Detalladas

### Obligatorias

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `production` |
| `PORT` | Puerto del servidor | `5000` |
| `POCKETBASE_URL` | URL completa de PocketBase | `https://estadosdecuenta-db.david-cloud.online/_/` |

### Opcionales pero Recomendadas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `POCKETBASE_ADMIN_EMAIL` | Email del admin de PocketBase | `admin@ejemplo.com` |
| `POCKETBASE_ADMIN_PASSWORD` | Contraseña del admin | `mi-contraseña` |
| `DEEPSEEK_API_KEY` | API Key de DeepSeek para IA | `sk-...` |

**Nota**: Si no configuras `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD`, la aplicación funcionará pero no podrá crear colecciones automáticamente. Deberás crearlas manualmente.

## 🔍 Solución de Problemas

### Error: "POCKETBASE_URL no está configurada"
- Verifica que la variable de entorno esté configurada en Coolify
- Asegúrate de que no tenga espacios extra
- Verifica que uses la URL exacta con `/_/` si la tiene

### Error: "fetch failed" o problemas de conexión
- Verifica que PocketBase esté accesible desde el servidor de Coolify
- Asegúrate de que no haya problemas de firewall
- Verifica que la URL sea correcta

### Error: "No se pudo autenticar como admin" o "Error de autenticación"

Si ves múltiples mensajes de "No se pudo autenticar como admin" en los logs, significa que las credenciales de admin no están configuradas correctamente o son incorrectas.

**Pasos para resolver:**

1. **Verifica las variables de entorno en Coolify:**
   - Ve a tu aplicación en Coolify
   - Ve a la sección **"Environment Variables"**
   - Verifica que `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD` estén configuradas
   - Asegúrate de que NO tengan espacios al inicio o al final
   - Verifica que el email sea el mismo que usas para acceder al panel de PocketBase

2. **Verifica las credenciales en PocketBase:**
   - Accede a `https://estadosdecuenta-db.david-cloud.online/_/`
   - Inicia sesión con las credenciales de admin
   - Si no puedes iniciar sesión, las credenciales son incorrectas

3. **Actualiza las variables en Coolify:**
   - Si las credenciales son incorrectas, actualízalas en Coolify
   - Después de actualizar, haz un **"Redeploy"** de la aplicación
   - Verifica los logs nuevamente, deberías ver "✓ Autenticación exitosa como admin de PocketBase"

4. **Si las credenciales son correctas pero aún falla:**
   - Verifica que la URL de PocketBase esté correcta: debe terminar en `/_/`
   - Revisa los logs para ver el error específico de autenticación
   - Asegúrate de que PocketBase esté accesible desde el servidor de Coolify

**⚠️ IMPORTANTE:** Sin autenticación de admin, las operaciones de lectura (GET) fallarán. La aplicación necesita autenticación de admin para:
- Obtener transacciones (`/api/transactions`)
- Obtener estadísticas (`/api/stats`)
- Actualizar o eliminar transacciones

Las operaciones de escritura (POST, como subir archivos) pueden funcionar si las colecciones tienen reglas de acceso públicas para crear.

### Error: "Collection not found"
- Las colecciones no están creadas
- Créalas manualmente desde el panel de PocketBase
- O configura las credenciales de admin para creación automática

### Error: "PocketBase error: Something went wrong while processing your request"

Este error generalmente indica que:
1. **No hay autenticación de admin**: Las colecciones requieren autenticación para leer/actualizar/eliminar
2. **Las reglas de acceso están restringidas**: Las colecciones solo permiten operaciones con autenticación

**Solución:**
- Configura correctamente `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD` en Coolify
- Haz un redeploy después de actualizar las variables
- Verifica en los logs que aparezca "✓ Autenticación exitosa como admin de PocketBase"

### La aplicación no inicia
- Revisa los logs en Coolify
- Verifica que el puerto esté correctamente configurado
- Asegúrate de que `NODE_ENV=production` esté configurado

## 🔄 Actualizar la Aplicación

Para actualizar la aplicación después de hacer cambios:

1. Haz push a GitHub (rama `main`)
2. En Coolify, haz clic en **"Redeploy"**
3. Espera a que se complete el build
4. Verifica que todo funcione correctamente

## 📊 Monitoreo

### Logs
- Accede a los logs en tiempo real desde Coolify
- Busca errores relacionados con PocketBase
- Verifica que las conexiones sean exitosas

### Health Check
- La aplicación tiene un endpoint de health en `/api/health`
- Puedes configurarlo en Coolify para monitoreo automático

## ✅ Checklist de Despliegue

- [ ] Repositorio conectado en Coolify
- [ ] Variables de entorno configuradas
- [ ] Build configurado correctamente
- [ ] Dominio configurado
- [ ] Aplicación desplegada exitosamente
- [ ] Conexión a PocketBase verificada
- [ ] Colecciones creadas (automática o manualmente)
- [ ] Aplicación funcionando correctamente
- [ ] Prueba de subida de archivo exitosa

## 🎯 Notas Importantes

1. **URL de PocketBase**: Siempre usa la URL exacta que funciona en el navegador
2. **Seguridad**: No expongas las credenciales de admin en los logs
3. **Backups**: Configura backups regulares de PocketBase
4. **Escalabilidad**: Si necesitas escalar, considera múltiples instancias con load balancer

## 📚 Recursos Adicionales

- [Documentación de Coolify](https://coolify.io/docs)
- [Guía de configuración de PocketBase](./GUIA_CONFIGURACION_POCKETBASE.md)
- [Crear colecciones manualmente](./CREAR_COLECCIONES_MANUAL.md)

