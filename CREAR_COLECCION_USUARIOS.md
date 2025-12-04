# Crear Colección de Usuarios en PocketBase

## Pasos Rápidos

1. Ve a PocketBase: `https://estadosdecuenta-db.david-cloud.online/_/`
2. Inicia sesión como administrador
3. Ve a **Collections** → **New Collection**
4. Configura:
   - **Name**: `users` (exactamente así, en minúsculas)
   - **Type**: Selecciona **"Auth"** ⚠️ (MUY IMPORTANTE - no "Base")
5. Haz clic en **"Create"**

## Configurar Campos (Opcional)

1. Ve a la pestaña **"Fields"**
2. Agrega campos opcionales:
   - **name** (Text, no requerido)
   - **avatar** (File, no requerido, max 5MB, tipos: jpeg, png, gif, webp)

## Configurar Settings

1. Ve a la pestaña **"Settings"**
2. Configura:
   - ✅ **Allow email auth**: Activado
   - ❌ **Allow OAuth2 auth**: Desactivado
   - ❌ **Allow username auth**: Desactivado
   - ✅ **Require email**: Activado
   - **Min password length**: `8`

## Configurar API Rules

1. Ve a la pestaña **"API Rules"**
2. Configura las reglas:

| Regla | Valor |
|-------|-------|
| **List Rule** | (vacío) |
| **View Rule** | `id = @request.auth.id` |
| **Create Rule** | (vacío) |
| **Update Rule** | `id = @request.auth.id` |
| **Delete Rule** | `id = @request.auth.id` |

3. Guarda los cambios

## Verificar

Después de crear la colección:
1. Deberías ver la colección `users` en la lista
2. El tipo debe ser "Auth" (no "Base")
3. Los usuarios podrán registrarse desde la aplicación

## Nota

Si ya existe una colección `users` de tipo "Base", necesitas:
1. Eliminarla primero
2. Crear una nueva de tipo "Auth"

O renombrar la existente y crear una nueva `users` de tipo "Auth".


