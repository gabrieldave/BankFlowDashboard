# Verificar Por Qué No Se Ven Transacciones en PocketBase

## Problema
La colección `transactions` en PocketBase está vacía aunque la aplicación funciona.

## Causa Más Común
La aplicación está usando **almacenamiento en memoria** (`MemStorage`) en lugar de **PocketBase** porque falta la variable de entorno `POCKETBASE_URL` en producción.

## Cómo Verificar

### 1. Verificar Variables de Entorno en Coolify

En Coolify, ve a tu aplicación → **Configuration** → **Environment Variables** y verifica que tengas:

```
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online/_/
POCKETBASE_ADMIN_EMAIL=david.del.rio.colin@gmail.com
POCKETBASE_ADMIN_PASSWORD=Coder1308@@
```

**⚠️ IMPORTANTE:**
- La URL debe terminar en `/_/` si ese es el formato correcto
- Las variables deben estar marcadas como **"Available at Runtime"** (no solo build-time)

### 2. Verificar en los Logs

En Coolify, ve a **Logs** y busca mensajes como:
- `"POCKETBASE_URL no está configurada"` → Falta la variable
- `"No se pudo conectar a PocketBase"` → Problema de conexión
- Si no ves ningún mensaje sobre PocketBase, está usando memoria

### 3. Verificar Código

El código en `server/storage.ts` línea 449-451 muestra:

```typescript
export const storage = process.env.POCKETBASE_URL 
  ? new PocketBaseStorage() 
  : new MemStorage();
```

Si `POCKETBASE_URL` no está configurada, usa `MemStorage` (los datos se pierden al reiniciar).

## Solución

### Paso 1: Agregar Variables en Coolify

1. Ve a tu aplicación en Coolify
2. **Configuration** → **Environment Variables**
3. Agrega estas variables:

| Variable | Valor |
|----------|-------|
| `POCKETBASE_URL` | `https://estadosdecuenta-db.david-cloud.online/_/` |
| `POCKETBASE_ADMIN_EMAIL` | `david.del.rio.colin@gmail.com` |
| `POCKETBASE_ADMIN_PASSWORD` | `Coder1308@@` |

4. Asegúrate de que estén marcadas como **"Available at Runtime"**
5. Guarda y **Redeploy** la aplicación

### Paso 2: Verificar Conexión

Después del redeploy, verifica en los logs que:
- No aparezca el error "POCKETBASE_URL no está configurada"
- La aplicación se conecte correctamente a PocketBase

### Paso 3: Subir un Archivo de Prueba

1. Ve a la aplicación desplegada
2. Sube un archivo CSV o PDF
3. Verifica en PocketBase que las transacciones aparezcan

## Verificación Rápida

Para verificar qué storage está usando, puedes agregar un log temporal en `server/storage.ts`:

```typescript
export const storage = process.env.POCKETBASE_URL 
  ? new PocketBaseStorage() 
  : new MemStorage();

console.log('Storage type:', process.env.POCKETBASE_URL ? 'PocketBase' : 'Memory');
console.log('POCKETBASE_URL:', process.env.POCKETBASE_URL || 'NOT SET');
```

Luego revisa los logs en Coolify para ver qué está usando.

## Nota Importante

Si la aplicación está usando `MemStorage`:
- Los datos se pierden cada vez que se reinicia el contenedor
- No se guardan en PocketBase
- Por eso la colección está vacía

Una vez configuradas las variables de entorno correctamente, las transacciones se guardarán en PocketBase y persistirán entre reinicios.



