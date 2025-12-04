# Configuración de Autenticación con PocketBase

## 📋 Resumen

Se ha implementado un sistema completo de autenticación usando PocketBase que incluye:
- ✅ Login (Inicio de sesión)
- ✅ Registro de usuarios
- ✅ Recuperación de contraseña
- ✅ Protección de rutas
- ✅ Gestión de sesiones

## 🚀 Pasos para Configurar

### 1. Crear Colección de Usuarios en PocketBase

**Opción A: Usando el script (Recomendado)**

```bash
npm run init-users-collection
```

**Opción B: Manualmente desde PocketBase**

1. Ve a: `https://estadosdecuenta-db.david-cloud.online/_/`
2. Inicia sesión como administrador
3. Ve a **Collections** → **New Collection**
4. Configura:
   - **Name**: `users` (exactamente así, en minúsculas)
   - **Type**: Selecciona **"Auth"** (muy importante)
5. Haz clic en **"Create"**
6. Ve a la pestaña **"Fields"** y agrega (opcional):
   - `name` (Text, no requerido)
   - `avatar` (File, no requerido, max 5MB, tipos: jpeg, png, gif, webp)
7. Ve a la pestaña **"Settings"** y configura:
   - **Allow email auth**: ✅ Activado
   - **Require email**: ✅ Activado
   - **Min password length**: `8`
8. Ve a la pestaña **"API Rules"** y configura:
   - **List Rule**: (vacío)
   - **View Rule**: `id = @request.auth.id`
   - **Create Rule**: (vacío)
   - **Update Rule**: `id = @request.auth.id`
   - **Delete Rule**: `id = @request.auth.id`
9. Guarda los cambios

### 2. Configurar Variables de Entorno

En **Coolify** (producción):
- `POCKETBASE_URL` = `https://estadosdecuenta-db.david-cloud.online/_/`
- `POCKETBASE_ADMIN_EMAIL` = `david.del.rio.colin@gmail.com`
- `POCKETBASE_ADMIN_PASSWORD` = `Coder1308@@`

**Opcional para desarrollo local:**
Crea un archivo `.env` en la raíz del proyecto:
```env
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online/_/
POCKETBASE_ADMIN_EMAIL=david.del.rio.colin@gmail.com
POCKETBASE_ADMIN_PASSWORD=Coder1308@@
VITE_POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online/_/
```

### 3. Verificar que Funciona

1. Inicia la aplicación
2. Deberías ser redirigido a `/login`
3. Crea una cuenta nueva o inicia sesión
4. Una vez autenticado, podrás acceder a todas las rutas protegidas

## 📁 Archivos Creados

### Frontend
- `client/src/lib/pocketbase.ts` - Cliente PocketBase
- `client/src/context/AuthContext.tsx` - Contexto de autenticación
- `client/src/pages/login.tsx` - Página de login
- `client/src/pages/register.tsx` - Página de registro
- `client/src/pages/forgot-password.tsx` - Recuperar contraseña
- `client/src/pages/reset-password.tsx` - Restablecer contraseña

### Backend
- `server/init-users-collection.ts` - Script para crear colección de usuarios

## 🔒 Rutas Protegidas

Las siguientes rutas requieren autenticación:
- `/` (Subir Archivos)
- `/dashboard`
- `/analytics`
- `/settings`

Las siguientes rutas son públicas:
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

## 🎨 Características

### Login
- Validación de email y contraseña
- Mensajes de error claros
- Enlace a registro y recuperación de contraseña

### Registro
- Validación de contraseña (mínimo 8 caracteres)
- Indicador de fuerza de contraseña
- Confirmación de contraseña
- Campo de nombre opcional

### Recuperación de Contraseña
- Solicitud de restablecimiento por email
- Confirmación de envío
- Restablecimiento con token

### Layout
- Muestra información del usuario autenticado
- Menú desplegable con opción de cerrar sesión
- Iniciales del usuario en avatar

## 🔧 Solución de Problemas

### Error: "Collection not found"
- Ejecuta `npm run init-users-collection`
- O crea la colección manualmente en PocketBase

### Error: "Invalid credentials"
- Verifica que el email y contraseña sean correctos
- Asegúrate de que el usuario esté verificado (si se requiere verificación)

### No se puede registrar
- Verifica que la colección `users` sea de tipo "Auth"
- Verifica que "Allow email auth" esté activado
- Verifica que "Create Rule" esté vacía

### No se puede iniciar sesión después del registro
- Si se requiere verificación de email, revisa tu correo
- O desactiva la verificación de email en PocketBase (Settings → Email templates)

## 📝 Notas Importantes

1. **Tipo de Colección**: La colección `users` DEBE ser de tipo "Auth", no "Base"
2. **Reglas de Acceso**: Las reglas de API deben estar configuradas correctamente
3. **Variables de Entorno**: Asegúrate de que `POCKETBASE_URL` esté configurada en producción
4. **Favicon**: Ya está configurado en `client/public/favicon.png` y referenciado en `index.html`

## ✅ Checklist

- [ ] Colección `users` creada (tipo Auth)
- [ ] Variables de entorno configuradas en Coolify
- [ ] Reglas de API configuradas correctamente
- [ ] Probar registro de usuario
- [ ] Probar inicio de sesión
- [ ] Probar recuperación de contraseña
- [ ] Verificar que las rutas estén protegidas
- [ ] Verificar que el favicon se muestre correctamente



