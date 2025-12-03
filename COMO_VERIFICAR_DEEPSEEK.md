# Cómo Verificar si se está usando DeepSeek Vision

## 🔍 Mensajes de Log para Identificar el Método

### ✅ Si está usando **DeepSeek Vision**:
Verás estos mensajes en la consola del servidor:
```
Intentando procesar PDF con DeepSeek Vision API...
Iniciando procesamiento de PDF con DeepSeek Vision API...
Convirtiendo X páginas del PDF a imágenes...
Página 1/X convertida a imagen (XXX KB)
Procesando página 1/X con DeepSeek Vision...
Extraídas X transacciones de la página 1 usando DeepSeek Vision
```

### ❌ Si está usando **Método Tradicional** (actual):
Verás estos mensajes:
```
Usando método tradicional de extracción (Vision deshabilitado temporalmente)
Iniciando procesamiento de PDF (método tradicional)...
Parseando PDF (todas las páginas)...
PDF parseado exitosamente. Páginas procesadas: X
PDF extraído: X caracteres de X página(s)
Procesando X líneas del PDF...
Transacción extraída: ...
```

## 📋 Cómo Revisar los Logs

### Opción 1: Consola del Terminal
1. Abre la terminal donde está corriendo el servidor
2. Busca los mensajes cuando subes un PDF
3. Identifica cuál método se está usando según los mensajes arriba

### Opción 2: Verificar el Código
El método está controlado por esta variable en `server/file-processors.ts`:
```typescript
const USE_VISION = false; // Deshabilitado temporalmente para debugging
```

- Si `USE_VISION = true` → Usa DeepSeek Vision
- Si `USE_VISION = false` → Usa método tradicional

## 🔧 Para Activar DeepSeek Vision

1. Edita `server/file-processors.ts`
2. Cambia la línea 128:
   ```typescript
   const USE_VISION = true; // Cambiar a true
   ```
3. Reinicia el servidor
4. Asegúrate de tener `DEEPSEEK_API_KEY` configurada en tu `.env`

## ⚠️ Estado Actual

**ACTUALMENTE: DeepSeek Vision está DESHABILITADO** porque:
- Estamos depurando problemas con la extracción de montos
- El método tradicional tiene mejor logging para identificar problemas
- Una vez que identifiquemos el problema, reactivaremos Vision



