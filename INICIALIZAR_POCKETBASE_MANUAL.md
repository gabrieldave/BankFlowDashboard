# Inicialización Manual de PocketBase

Si el script automático no funciona debido a problemas de conexión, puedes crear las colecciones manualmente desde el panel de administración de PocketBase.

## Pasos para Inicialización Manual

### 1. Acceder al Panel de Administración

1. Abre tu navegador y ve a: `https://estadosdecuenta-db.david-cloud.online:8080/_/`
2. Inicia sesión con tus credenciales de administrador

### 2. Crear Colección "users"

1. En el panel, ve a **Collections** (Colecciones)
2. Haz clic en **New Collection** (Nueva Colección)
3. Configura:
   - **Name**: `users`
   - **Type**: `Auth` (Autenticación)
4. En la pestaña **Fields** (Campos), agrega:
   - **username** (Text, Required, Unique)
   - **password** (Text, Required)
5. Guarda la colección

### 3. Crear Colección "transactions"

1. Haz clic en **New Collection** (Nueva Colección)
2. Configura:
   - **Name**: `transactions`
   - **Type**: `Base` (Base)
3. En la pestaña **Fields** (Campos), agrega los siguientes campos:

   | Nombre | Tipo | Requerido | Opciones |
   |--------|------|-----------|----------|
   | `id_number` | Number | No | - |
   | `date` | Text | Sí | - |
   | `description` | Text | Sí | - |
   | `amount` | Number | Sí | - |
   | `type` | Text | Sí | - |
   | `category` | Text | Sí | - |
   | `merchant` | Text | Sí | - |
   | `currency` | Text | Sí | Default: `MXN` |

4. Guarda la colección

### 4. Configurar Reglas de Acceso (Opcional)

Para cada colección, puedes configurar las reglas de acceso en la pestaña **API Rules**:

- **List Rule**: Dejar vacío o `@request.auth.id != ""` (solo usuarios autenticados)
- **View Rule**: Dejar vacío o `@request.auth.id != ""`
- **Create Rule**: Dejar vacío o `@request.auth.id != ""`
- **Update Rule**: Dejar vacío o `@request.auth.id != ""`
- **Delete Rule**: Dejar vacío o `@request.auth.id != ""`

**Nota**: Si dejas las reglas vacías, las colecciones serán públicas. Para producción, es recomendable configurar reglas de acceso apropiadas.

## Verificación

Una vez creadas las colecciones, la aplicación debería poder conectarse automáticamente. Puedes verificar:

1. Inicia la aplicación: `npm run dev`
2. Intenta subir un archivo CSV o PDF
3. Verifica que las transacciones se guarden correctamente

## Solución de Problemas

### Error: "Collection not found"
- Verifica que los nombres de las colecciones sean exactamente `users` y `transactions` (en minúsculas)
- Asegúrate de que las colecciones estén creadas y guardadas

### Error: "Field not found"
- Verifica que todos los campos estén creados con los nombres exactos especificados
- Asegúrate de que los campos requeridos estén marcados como "Required"

### Error de conexión
- Verifica que la URL en `.env` sea correcta
- Asegúrate de que el servidor PocketBase esté accesible
- Verifica que no haya problemas de firewall


