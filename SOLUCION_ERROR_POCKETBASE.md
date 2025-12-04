# Solución: Error "Only superusers can perform this action" en PocketBase

## Problema

Los logs muestran:
```
No se pudo autenticar como admin, continuando sin autenticación
Error: PocketBase error: Only superusers can perform this action.
```

## Causa

Las reglas de acceso de la colección `transactions` en PocketBase están bloqueando las operaciones de lectura sin autenticación de superusuario.

## Solución

### Opción 1: Configurar Reglas de Acceso Públicas (Recomendado)

1. Ve a PocketBase: `https://estadosdecuenta-db.david-cloud.online/_/`
2. Inicia sesión como administrador
3. Ve a **Collections** → **transactions**
4. Haz clic en la pestaña **"API Rules"**
5. Configura las reglas así:

   | Regla | Valor |
   |-------|-------|
   | **List Rule** | (vacío) |
   | **View Rule** | (vacío) |
   | **Create Rule** | (vacío) |
   | **Update Rule** | (vacío) |
   | **Delete Rule** | (vacío) |

6. Haz clic en **"Save"**

**Nota:** Dejar las reglas vacías permite acceso público (sin autenticación). Esto es seguro si tu PocketBase no está expuesto públicamente o está protegido por firewall.

### Opción 2: Asegurar que la Autenticación Funcione

Si prefieres usar autenticación, verifica en Coolify que tengas configuradas:

1. **Configuration** → **Environment Variables**:
   - `POCKETBASE_URL` = `https://estadosdecuenta-db.david-cloud.online/_/`
   - `POCKETBASE_ADMIN_EMAIL` = `david.del.rio.colin@gmail.com`
   - `POCKETBASE_ADMIN_PASSWORD` = `Coder1308@@`

2. Asegúrate de que estén marcadas como **"Available at Runtime"**

3. Haz **Redeploy** de la aplicación

4. Verifica en los logs que aparezca:
   ```
   ✓ Autenticación exitosa como admin
   ```

## Verificación

Después de configurar las reglas:

1. Ve a la aplicación desplegada
2. Intenta ver las transacciones
3. Deberías ver los datos sin errores
4. Verifica en PocketBase que las transacciones estén guardadas

## Nota de Seguridad

Si tu PocketBase está expuesto públicamente, considera:
- Usar reglas más restrictivas con autenticación
- Proteger PocketBase con firewall o VPN
- Usar autenticación de usuario en lugar de admin para operaciones normales


