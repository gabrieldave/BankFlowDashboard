# Requisitos para Conectar con PocketBase

## Estado Actual

✅ SDK de PocketBase instalado  
✅ Código configurado para usar PocketBase  
⚠️  Problema de conexión/autenticación detectado

## Lo que Necesitamos

Basado en la investigación y pruebas, para que la aplicación se conecte correctamente a PocketBase necesitamos:

### 1. **URL Correcta con Puerto**

La URL debe incluir el puerto **8080**:
```
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online:8080
```

**Nota**: Actualmente en tu `.env` tienes:
```
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online/_/
```

Debería ser (sin `/_/` y con puerto):
```
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online:8080
```

### 2. **Credenciales de Administrador**

En el archivo `.env` necesitas:
```
POCKETBASE_ADMIN_EMAIL=tu-email@ejemplo.com
POCKETBASE_ADMIN_PASSWORD=tu-contraseña
```

**Importante**: Estas deben ser las credenciales del **primer administrador** creado en PocketBase, no las de un usuario normal.

### 3. **Habilitar API de Administración**

El endpoint `/api/admins/auth-with-password` debe estar habilitado en tu instancia de PocketBase. 

**Para verificar/habilitar:**
1. Accede al panel de administración: `https://estadosdecuenta-db.david-cloud.online:8080/_/`
2. Ve a **Settings** (Configuración)
3. Busca opciones relacionadas con "Admin API" o "API Access"
4. Asegúrate de que la API de administración esté habilitada

### 4. **Configuración de CORS (si es necesario)**

Si hay problemas de CORS, en el panel de administración de PocketBase:
1. Ve a **Settings** → **API**
2. Configura los orígenes permitidos o deshabilita CORS temporalmente para desarrollo

### 5. **Certificado SSL**

Si el certificado SSL es auto-firmado o tiene problemas:
- El código ya está configurado para ignorar certificados SSL no válidos
- Pero si prefieres, puedes configurar un certificado válido en Coolify

## Solución Alternativa: Creación Manual

Si la API de administración no está disponible o no funciona, puedes crear las colecciones manualmente:

### Pasos:

1. **Accede al panel**: `https://estadosdecuenta-db.david-cloud.online:8080/_/`

2. **Crea colección "users"**:
   - Name: `users`
   - Type: `Auth`
   - Campos:
     - `username` (Text, Required, Unique)
     - `password` (Text, Required)

3. **Crea colección "transactions"**:
   - Name: `transactions`
   - Type: `Base`
   - Campos:
     - `id_number` (Number, Optional)
     - `date` (Text, Required)
     - `description` (Text, Required)
     - `amount` (Number, Required)
     - `type` (Text, Required)
     - `category` (Text, Required)
     - `merchant` (Text, Required)
     - `currency` (Text, Required, Default: `MXN`)

4. **Configura reglas de acceso**:
   - Para `transactions`: Deja "Create Rule" vacía para permitir crear registros sin autenticación
   - O configura reglas apropiadas según tus necesidades

## Verificación

Una vez configurado, verifica:

1. **Health Check**:
   ```bash
   curl https://estadosdecuenta-db.david-cloud.online:8080/api/health
   ```
   Debería responder: `{"message":"API is healthy.","code":200,"data":{}}`

2. **Iniciar aplicación**:
   ```bash
   npm run dev
   ```

3. **Probar subir un archivo** desde la interfaz web

## Problemas Comunes

### Error: "fetch failed"
- Verifica que el servidor PocketBase esté en línea
- Verifica que el puerto 8080 esté abierto
- Prueba acceder desde el navegador: `https://estadosdecuenta-db.david-cloud.online:8080/_/`

### Error: "The requested resource wasn't found"
- El endpoint de admin no está disponible
- Usa la solución alternativa (creación manual)

### Error: "Unauthorized"
- Las credenciales son incorrectas
- Verifica que uses las credenciales del primer administrador

### Error: "Collection not found"
- Las colecciones no están creadas
- Créalas manualmente desde el panel

## Próximos Pasos

1. **Actualiza el `.env`** con la URL correcta (con puerto 8080)
2. **Verifica las credenciales** de administrador
3. **Intenta crear las colecciones** usando el script o manualmente
4. **Prueba la aplicación** subiendo un archivo

Si después de estos pasos sigue sin funcionar, la mejor opción es crear las colecciones manualmente desde el panel web, ya que la aplicación funcionará igual una vez que las colecciones existan.



