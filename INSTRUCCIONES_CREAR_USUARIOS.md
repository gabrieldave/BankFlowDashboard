# 🚀 Instrucciones para Crear la Colección de Usuarios

## Pasos Rápidos (5 minutos)

### 1. Acceder a PocketBase
1. Abre tu navegador
2. Ve a: **https://estadosdecuenta-db.david-cloud.online/_/**
3. Inicia sesión con tus credenciales de administrador

### 2. Crear Nueva Colección
1. En el menú lateral, haz clic en **"Collections"**
2. Haz clic en el botón **"New Collection"** (arriba a la derecha)

### 3. Configurar la Colección
1. **Name**: Escribe exactamente `users` (en minúsculas, sin espacios)
2. **Type**: Selecciona **"Auth"** ⚠️ (MUY IMPORTANTE - no selecciones "Base")
3. Haz clic en **"Create"**

### 4. Configurar Campos (Opcional)
1. Ve a la pestaña **"Fields"**
2. Haz clic en **"New Field"**
3. Agrega:
   - **name** (Text, no requerido)
   - **avatar** (File, no requerido, max 5MB)

### 5. Configurar Settings
1. Ve a la pestaña **"Settings"**
2. Configura:
   - ✅ **Allow email auth**: Activado (marca la casilla)
   - ❌ **Allow OAuth2 auth**: Desactivado
   - ❌ **Allow username auth**: Desactivado
   - ✅ **Require email**: Activado
   - **Min password length**: `8`

### 6. Configurar API Rules (IMPORTANTE)
1. Ve a la pestaña **"API Rules"**
2. Para cada regla, haz clic en el candado verde para desbloquearla
3. Deja los campos **VACÍOS** (excepto View Rule):
   - **List Rule**: (vacío) - haz clic en el candado y deja vacío
   - **View Rule**: `id = @request.auth.id` - haz clic en el candado y escribe: `id = @request.auth.id`
   - **Create Rule**: (vacío) - haz clic en el candado y deja vacío
   - **Update Rule**: `id = @request.auth.id` - haz clic en el candado y escribe: `id = @request.auth.id`
   - **Delete Rule**: `id = @request.auth.id` - haz clic en el candado y escribe: `id = @request.auth.id`

### 7. Guardar
1. Haz clic en **"Save"** (botón en la parte superior)
2. Confirma los cambios si aparece un diálogo

## ✅ Verificación

Después de crear la colección:
- Deberías ver la colección `users` en la lista de Collections
- El tipo debe mostrar "Auth" (no "Base")
- Los usuarios podrán registrarse desde la aplicación

## 🎯 Listo!

Una vez creada la colección, los usuarios podrán:
- Registrarse desde `/register`
- Iniciar sesión desde `/login`
- Recuperar su contraseña desde `/forgot-password`

## ⚠️ Nota Importante

Si ya existe una colección `users` de tipo "Base":
1. Elimínala primero (o renómbrala)
2. Crea una nueva de tipo "Auth"

---

**Tiempo estimado**: 3-5 minutos
**Dificultad**: Fácil



