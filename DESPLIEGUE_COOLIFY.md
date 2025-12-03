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
   - **Build Pack**: `Node.js` o `Dockerfile` (si tienes uno)
   - **Port**: `5000` (o el que configures en variables de entorno)

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

### 3. Configurar Build

En la sección **"Build"**:

**Opción A: Usando Node.js Build Pack**
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Node Version**: `18` o superior

**Opción B: Usando Dockerfile (si lo prefieres)**
- Coolify detectará automáticamente el Dockerfile si existe

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

### Error: "Collection not found"
- Las colecciones no están creadas
- Créalas manualmente desde el panel de PocketBase
- O configura las credenciales de admin para creación automática

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

