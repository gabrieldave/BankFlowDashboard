# Configuración de PocketBase

Este proyecto ahora usa PocketBase como base de datos. Sigue estos pasos para configurarlo:

## 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online:8080
POCKETBASE_ADMIN_EMAIL=tu-email@ejemplo.com
POCKETBASE_ADMIN_PASSWORD=tu-contraseña
```

**Nota:** Necesitas las credenciales de administrador de PocketBase para crear las colecciones iniciales.

## 2. Inicializar Colecciones

Ejecuta el script de inicialización para crear las colecciones necesarias:

```bash
npm run init-pocketbase
```

Este script creará:
- **Colección `users`**: Para almacenar usuarios del sistema
- **Colección `transactions`**: Para almacenar transacciones bancarias

## 3. Verificar Configuración

Una vez configurado, el sistema usará automáticamente PocketBase cuando detecte la variable `POCKETBASE_URL`. Si no está configurada, usará almacenamiento en memoria (los datos se pierden al reiniciar).

## Estructura de Datos

### Colección `users`
- `id` (text, único, generado automáticamente)
- `username` (text, requerido, único)
- `password` (text, requerido)

### Colección `transactions`
- `id` (text, único, generado automáticamente por PocketBase)
- `id_number` (number, para compatibilidad con el código existente)
- `date` (text, requerido)
- `description` (text, requerido)
- `amount` (number, requerido)
- `type` (text, requerido: "income" o "expense")
- `category` (text, requerido)
- `merchant` (text, requerido)
- `currency` (text, requerido, default: "MXN")
- `created` (timestamp, generado automáticamente)

## Solución de Problemas

### Error: "POCKETBASE_URL no está configurada"
- Verifica que el archivo `.env` existe y contiene `POCKETBASE_URL`

### Error: "Error de autenticación"
- Verifica que `POCKETBASE_ADMIN_EMAIL` y `POCKETBASE_ADMIN_PASSWORD` son correctos
- Asegúrate de que las credenciales tienen permisos de administrador

### Error: "Colección ya existe"
- Esto es normal si ya ejecutaste el script de inicialización anteriormente
- Las colecciones existentes no se sobrescriben

## Notas Importantes

- Los datos ahora se guardan de forma persistente en PocketBase
- El sistema genera automáticamente un `id_number` numérico para mantener compatibilidad con el código existente
- Si necesitas resetear las colecciones, puedes eliminarlas desde el panel de administración de PocketBase



