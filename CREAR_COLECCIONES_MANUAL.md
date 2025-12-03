# Crear Colecciones en PocketBase - Guía Rápida

## Paso 1: Acceder al Panel

Ve a: **https://estadosdecuenta-db.david-cloud.online/_/**

Inicia sesión con tus credenciales de administrador.

## Paso 2: Crear Colección "users"

1. En el menú lateral izquierdo, haz clic en **"Collections"** (Colecciones)
2. Haz clic en el botón **"New Collection"** (o el ícono **+**)
3. Configura:
   - **Name**: `users` (en minúsculas, exactamente así)
   - **Type**: Selecciona **"Auth"** (Autenticación)
4. Haz clic en **"Create"** (Crear)
5. Ve a la pestaña **"Fields"** (Campos)
6. Agrega estos campos (haz clic en "Add new field" para cada uno):

   **Campo 1:**
   - Name: `username`
   - Type: `Text`
   - Required: ✓ (marcado)
   - Unique: ✓ (marcado)
   - Guarda

   **Campo 2:**
   - Name: `password`
   - Type: `Text`
   - Required: ✓ (marcado)
   - Guarda

7. Guarda la colección

## Paso 3: Crear Colección "transactions"

1. Haz clic en **"New Collection"** nuevamente
2. Configura:
   - **Name**: `transactions` (en minúsculas, exactamente así)
   - **Type**: Selecciona **"Base"** (Base)
3. Haz clic en **"Create"** (Crear)
4. Ve a la pestaña **"Fields"** (Campos)
5. Agrega estos campos uno por uno:

   | Name | Type | Required | Default Value |
   |------|------|----------|---------------|
   | `id_number` | Number | No | - |
   | `date` | Text | ✓ Sí | - |
   | `description` | Text | ✓ Sí | - |
   | `amount` | Number | ✓ Sí | - |
   | `type` | Text | ✓ Sí | - |
   | `category` | Text | ✓ Sí | - |
   | `merchant` | Text | ✓ Sí | - |
   | `currency` | Text | ✓ Sí | `MXN` |

   **Para cada campo:**
   - Haz clic en "Add new field"
   - Completa el nombre y tipo
   - Marca "Required" si es necesario
   - Para `currency`, en "Options" → "Default value" escribe: `MXN`
   - Guarda el campo

6. Guarda la colección

## Paso 4: Configurar Reglas de Acceso (Importante)

Para que la aplicación pueda crear transacciones sin autenticación:

1. Abre la colección **"transactions"**
2. Ve a la pestaña **"API Rules"**
3. En **"Create Rule"**, déjala **VACÍA** (esto permite crear registros sin autenticación)
4. Opcionalmente, puedes configurar otras reglas:
   - **List Rule**: Vacía (para listar sin auth) o `@request.auth.id != ""` (solo autenticados)
   - **View Rule**: Vacía o `@request.auth.id != ""`
   - **Update Rule**: Vacía o `@request.auth.id != ""`
   - **Delete Rule**: Vacía o `@request.auth.id != ""`
5. Guarda los cambios

## Paso 5: Verificar

1. Deberías ver ambas colecciones en la lista:
   - `users` (Auth)
   - `transactions` (Base)

2. Inicia tu aplicación:
   ```bash
   npm run dev
   ```

3. Intenta subir un archivo CSV o PDF desde la interfaz web

4. Verifica en PocketBase que las transacciones se hayan guardado en la colección `transactions`

## ✅ Listo!

Una vez creadas las colecciones, la aplicación funcionará automáticamente. No necesitas ejecutar ningún script adicional.

## Notas Importantes

- Los nombres deben ser exactamente `users` y `transactions` (en minúsculas)
- El campo `id_number` es opcional pero recomendado
- El campo `currency` debe tener valor por defecto `MXN`
- La regla "Create Rule" de `transactions` debe estar vacía para permitir crear sin autenticación

