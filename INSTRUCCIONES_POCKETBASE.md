# Instrucciones para Configurar PocketBase

## Estado Actual

✅ La aplicación está configurada para usar PocketBase  
✅ La URL está correctamente configurada: `https://estadosdecuenta-db.david-cloud.online`  
⚠️  Las colecciones necesitan ser creadas manualmente desde el panel web

## Pasos para Completar la Configuración

### 1. Acceder al Panel de Administración

Abre tu navegador y ve a:
```
https://estadosdecuenta-db.david-cloud.online/_/
```

Inicia sesión con tus credenciales de administrador.

### 2. Crear Colección "users"

1. En el panel, haz clic en **Collections** (Colecciones) en el menú lateral
2. Haz clic en el botón **New Collection** (Nueva Colección) o el ícono **+**
3. Configura:
   - **Name**: `users` (en minúsculas, exactamente así)
   - **Type**: Selecciona **Auth** (Autenticación)
4. Haz clic en **Create** (Crear)
5. En la pestaña **Fields** (Campos), agrega estos campos:

   | Nombre | Tipo | Requerido | Único | Opciones |
   |--------|------|-----------|-------|----------|
   | `username` | Text | ✓ Sí | ✓ Sí | - |
   | `password` | Text | ✓ Sí | - | - |

6. Guarda los cambios

### 3. Crear Colección "transactions"

1. Haz clic en **New Collection** nuevamente
2. Configura:
   - **Name**: `transactions` (en minúsculas, exactamente así)
   - **Type**: Selecciona **Base** (Base)
3. Haz clic en **Create**
4. En la pestaña **Fields**, agrega estos campos uno por uno:

   | Nombre | Tipo | Requerido | Default | Opciones |
   |--------|------|-----------|---------|----------|
   | `id_number` | Number | No | - | - |
   | `date` | Text | ✓ Sí | - | - |
   | `description` | Text | ✓ Sí | - | - |
   | `amount` | Number | ✓ Sí | - | - |
   | `type` | Text | ✓ Sí | - | - |
   | `category` | Text | ✓ Sí | - | - |
   | `merchant` | Text | ✓ Sí | - | - |
   | `currency` | Text | ✓ Sí | `MXN` | - |

5. Guarda los cambios

### 4. Configurar Reglas de Acceso (Opcional pero Recomendado)

Para cada colección, ve a la pestaña **API Rules** y configura:

**Para "users":**
- **List Rule**: `@request.auth.id != ""` (solo usuarios autenticados)
- **View Rule**: `@request.auth.id != ""`
- **Create Rule**: `@request.auth.id != ""`
- **Update Rule**: `@request.auth.id != ""`
- **Delete Rule**: `@request.auth.id != ""`

**Para "transactions":**
- **List Rule**: Dejar vacío o `@request.auth.id != ""`
- **View Rule**: Dejar vacío o `@request.auth.id != ""`
- **Create Rule**: Dejar vacío (público para permitir subir transacciones)
- **Update Rule**: Dejar vacío o `@request.auth.id != ""`
- **Delete Rule**: Dejar vacío o `@request.auth.id != ""`

**Nota**: Si dejas las reglas vacías, las colecciones serán completamente públicas. Para desarrollo está bien, pero para producción configura reglas apropiadas.

### 5. Verificar que Todo Funciona

1. Inicia la aplicación:
   ```bash
   npm run dev
   ```

2. Abre la aplicación en el navegador: `http://localhost:5000`

3. Intenta subir un archivo CSV o PDF con transacciones

4. Verifica que las transacciones se guarden correctamente en PocketBase

## Solución de Problemas

### Error: "Collection not found"
- Verifica que los nombres de las colecciones sean exactamente `users` y `transactions` (en minúsculas)
- Asegúrate de que las colecciones estén guardadas

### Error: "Field not found"
- Verifica que todos los campos estén creados con los nombres exactos
- Asegúrate de que los campos requeridos estén marcados como "Required"

### Error de conexión
- Verifica que la URL en `.env` sea: `POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online/_/`
- Asegúrate de que el servidor PocketBase esté accesible
- Verifica que no haya problemas de firewall

### Las transacciones no se guardan
- Verifica que la colección "transactions" tenga la regla "Create Rule" vacía o permita creación pública
- Revisa la consola del servidor para ver errores específicos

## Notas Importantes

- Los nombres de las colecciones deben ser exactamente `users` y `transactions` (en minúsculas)
- El campo `id_number` en transactions es opcional pero recomendado para compatibilidad
- El campo `currency` tiene un valor por defecto de `MXN`
- PocketBase genera automáticamente campos `id` y `created` para cada registro

## Próximos Pasos

Una vez que las colecciones estén creadas, la aplicación debería funcionar automáticamente. No necesitas ejecutar ningún script adicional - solo crea las colecciones desde el panel web y la aplicación comenzará a usarlas.


