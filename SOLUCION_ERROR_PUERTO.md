# Solución: Error de Puerto en Coolify

## 🔴 Error Detectado

```
PORT mismatch detected
Your PORT environment variable is set to 5000, but it's not in your Ports Exposes configuration.
```

## ✅ Solución

### Opción 1: Configurar el puerto en Coolify (Recomendado)

1. **Ve a la configuración de tu aplicación en Coolify**
2. **Busca la sección "Ports" o "Ports Exposes"**
3. **Agrega el puerto 5000:**
   - Puerto: `5000`
   - Protocolo: `HTTP` o `TCP`
   - Tipo: `Expose` o `Publish`

4. **Guarda los cambios**
5. **Redeploy la aplicación**

### Opción 2: Cambiar el puerto a uno que Coolify use por defecto

Si Coolify tiene un puerto por defecto (como `3000` o `8080`):

1. **En Variables de Entorno, cambia:**
   ```env
   PORT=3000  # o el puerto que Coolify use por defecto
   ```

2. **O elimina la variable PORT** y deja que Coolify use su puerto por defecto

3. **Actualiza el código** para usar el puerto de la variable de entorno (ya está configurado así)

### Opción 3: Usar el puerto que Coolify asigna automáticamente

1. **Elimina la variable PORT** de las variables de entorno
2. **En la configuración de Ports**, deja que Coolify asigne automáticamente
3. **El código ya está preparado** para usar `process.env.PORT || "5000"`

## 📋 Verificación

Después de aplicar la solución:

1. **Redeploy la aplicación**
2. **Verifica que el error desaparezca**
3. **Confirma que la aplicación esté accesible**

## 🔍 Dónde encontrar la configuración en Coolify

1. Ve a tu aplicación en Coolify
2. Haz clic en **"Settings"** o **"Configuration"**
3. Busca **"Ports"**, **"Expose Ports"**, o **"Port Configuration"**
4. Agrega el puerto `5000` si usas la Opción 1

## 💡 Recomendación

**Usa la Opción 1** (configurar puerto 5000 en Coolify) porque:
- ✅ Mantiene consistencia con tu código
- ✅ Es más predecible
- ✅ Fácil de recordar


