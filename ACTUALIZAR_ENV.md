# Actualizar archivo .env

## Importante: URL sin puerto 8080

Según la configuración, el servidor PocketBase funciona correctamente **SIN** el puerto 8080 en la URL.

## Configuración correcta del .env

Actualiza tu archivo `.env` para que tenga:

```env
POCKETBASE_URL=https://estadosdecuenta-db.david-cloud.online
POCKETBASE_ADMIN_EMAIL=tu-email@ejemplo.com
POCKETBASE_ADMIN_PASSWORD=tu-contraseña
```

**NOTA**: 
- ❌ NO uses: `https://estadosdecuenta-db.david-cloud.online:8080` (muestra advertencia de seguridad)
- ✅ USA: `https://estadosdecuenta-db.david-cloud.online` (funciona correctamente)

## Verificación

Después de actualizar el `.env`:

1. Verifica que la URL no tenga `:8080`
2. Verifica que no tenga `/_/` al final
3. Ejecuta el diagnóstico:
   ```bash
   npm run diagnostico-pocketbase
   ```

## Próximos pasos

Una vez actualizado el `.env`:

1. Crea las colecciones manualmente desde el panel web (ver `CREAR_COLECCIONES_MANUAL.md`)
2. O intenta crear las colecciones automáticamente:
   ```bash
   npm run init-pocketbase-sdk
   ```



