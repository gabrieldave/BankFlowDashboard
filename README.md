# BankFlow Dashboard

Dashboard inteligente para análisis de estados de cuenta bancarios con clasificación automática usando IA (DeepSeek). Gestiona múltiples bancos, detecta duplicados automáticamente y proporciona análisis financieros detallados.

## 🚀 Características Principales

### 📤 Carga y Procesamiento de Archivos
- **Soporte multi-formato**: CSV y PDF de estados de cuenta
- **Procesamiento con IA**: Extracción automática de transacciones usando DeepSeek Vision API
- **Detección inteligente de duplicados**: Verifica automáticamente si un archivo ya fue procesado (mes/año/banco) **antes** de procesar con IA, ahorrando tiempo y costos
- **Clasificación por bancos**: Soporta 20+ bancos de México, EEUU y Latinoamérica con detección automática
- **Selector de banco**: Permite seleccionar manualmente el banco o usar detección automática

### 📊 Dashboard y Visualizaciones
- **Métricas clave**: Balance total, ingresos, gastos y tasa de ahorro
- **Gráficos interactivos**: 
  - Evolución del balance mensual
  - Vista de acumulación mes a mes
  - Gastos por categoría (gráfico de dona)
- **Filtros avanzados**:
  - Por tipo (ingresos/gastos)
  - Por categoría
  - Por mes
  - Por semana
  - Por banco
  - Búsqueda por texto
- **Tabla de transacciones**: Lista completa con información detallada incluyendo banco de origen

### 🤖 Clasificación Inteligente con IA
- **Categorización automática**: Usa DeepSeek API para clasificar transacciones en categorías específicas
- **Detección de comercios**: Identifica automáticamente Amazon, MercadoLibre, supermercados, restaurantes, etc.
- **Procesamiento en batch**: Optimizado para procesar múltiples transacciones eficientemente

### 🏦 Soporte Multi-Banco
- **Bancos soportados**: Banamex, BBVA, Santander, HSBC, Banorte, Mercado Libre, Open Bank, A Banco, Nu, Chase, Bank of America, Wells Fargo, y más
- **Detección automática**: Identifica el banco del nombre del archivo o contenido del PDF
- **Gestión separada**: Permite cargar estados de cuenta del mismo mes pero de diferentes bancos sin conflictos

### 📈 Análisis Avanzado
- **Tendencias de gastos**: Comparación mes a mes y análisis de patrones
- **Top comercios**: Los comercios donde más gastas
- **Gastos más grandes**: Identificación de transacciones de mayor monto
- **Análisis diario y mensual**: Desglose temporal de tus finanzas
- **Comparación de períodos**: Análisis de cambios entre meses

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn
- API Key de DeepSeek (opcional pero recomendado para mejor clasificación)

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/gabrieldave/BankFlowDashboard
cd BankFlowDashboard
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env y agrega tu API key de DeepSeek
DEEPSEEK_API_KEY=sk-tu-api-key-aqui
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

El servidor se iniciará en `http://localhost:5000`

## 🔑 Obtener API Key de DeepSeek

1. Visita [DeepSeek Platform](https://platform.deepseek.com/)
2. Crea una cuenta o inicia sesión
3. Ve a la sección de API Keys
4. Genera una nueva API key
5. Cópiala en tu archivo `.env`

**Nota**: La aplicación funciona sin la API key usando clasificación básica, pero la clasificación con IA es mucho más precisa.

## 📊 Uso

### Cargar Estados de Cuenta

1. **Subir archivo**: 
   - Ve a la página de "Upload"
   - Arrastra o selecciona un archivo CSV o PDF
   - (Opcional) Selecciona el banco manualmente o deja que se detecte automáticamente
   - Haz clic en "Procesar archivo"

2. **Procesamiento automático**:
   - El sistema detecta si el archivo ya fue procesado (mismo mes/año/banco)
   - Si es duplicado, se rechaza inmediatamente sin procesar con IA
   - Si es nuevo, se procesa con IA para extraer y clasificar transacciones

3. **Ver dashboard**: 
   - Una vez procesado, verás el dashboard con todas tus transacciones clasificadas
   - Usa los filtros para analizar por mes, semana, banco o categoría
   - Cambia entre vista mensual y acumulada en el gráfico

4. **Análisis avanzado**: 
   - Ve a la pestaña "Analytics" para ver insights detallados
   - Explora tendencias, top comercios y gastos más grandes

## 📁 Formato de archivos

### CSV
El archivo CSV debe tener al menos estas columnas:
- Fecha (formato: YYYY-MM-DD o DD/MM/YYYY)
- Descripción
- Monto (positivo para ingresos, negativo para gastos)

Ejemplo:
```csv
Fecha,Descripción,Monto
2024-01-15,AMAZON MARKETPLACE,-45.99
2024-01-16,SALARIO MENSUAL,2500.00
2024-01-17,MERCADONA SUPERMERCADO,-89.50
```

### PDF
El PDF debe contener estados de cuenta bancarios con formato estándar. La aplicación intentará extraer automáticamente las transacciones.

## 🏗️ Estructura del Proyecto

```
BankFlowDashboard/
├── client/              # Frontend React
│   ├── src/
│   │   ├── pages/      # Páginas principales
│   │   ├── components/ # Componentes UI
│   │   └── lib/        # Utilidades y API
├── server/              # Backend Express
│   ├── ai-service.ts   # Servicio de DeepSeek API
│   ├── file-processors.ts # Procesadores CSV/PDF
│   └── routes.ts       # Rutas API
└── shared/             # Código compartido
    └── schema.ts       # Esquemas de base de datos
```

## 🎨 Categorías Detectadas

La IA puede clasificar transacciones en las siguientes categorías:

- **Alimentación**: Supermercados (Mercadona, Carrefour, Lidl, Día, Walmart, etc.)
- **Restaurantes**: Restaurantes, comida rápida, cafeterías, delivery
- **Transporte**: Uber, Cabify, gasolineras, transporte público, estacionamientos
- **Amazon**: Todas las transacciones de Amazon
- **MercadoLibre**: Transacciones de MercadoLibre y Mercado Pago
- **Compras Online**: Zara, El Corte Inglés, Fnac, tiendas online
- **Salud**: Farmacias, hospitales, clínicas, seguros médicos
- **Vivienda**: Alquiler, hipoteca, servicios (luz, agua, gas, internet)
- **Salario**: Nóminas y pagos de salario
- **Entretenimiento**: Netflix, Spotify, cines, videojuegos, streaming
- **Servicios**: Suscripciones, membresías, servicios profesionales
- **Transferencias**: Transferencias entre cuentas, envíos de dinero
- **Tarjetas**: Pagos con tarjeta, comisiones
- **Comisiones**: Comisiones bancarias, cargos por servicios
- **General**: Otras transacciones no categorizadas

## 🏦 Bancos Soportados

### México
- Banamex, BBVA México, Santander México, HSBC México
- Banorte, Scotiabank México, Banco Inbursa
- Mercado Pago / Mercado Libre, Open Bank, A Banco
- Nu México, Stori, Ualá

### Estados Unidos
- Chase Bank, Bank of America, Wells Fargo
- Citibank, U.S. Bank

### Otros Países
- Bancolombia (Colombia), Banco de Chile (Chile)
- Itaú, Bradesco (Brasil)

*La lista se expande continuamente. Si tu banco no está en la lista, puedes seleccionarlo manualmente o contactarnos para agregarlo.*

## 🔧 Scripts Disponibles

### Desarrollo
- `npm run dev` - Inicia el servidor de desarrollo completo
- `npm run dev:client` - Solo inicia el cliente (puerto 5000)
- `npm run build` - Construye para producción
- `npm run start` - Inicia el servidor en producción
- `npm run check` - Verifica tipos TypeScript

### PocketBase
- `npm run init-pocketbase` - Inicializa las colecciones en PocketBase
- `npm run agregar-campo-bank` - Agrega el campo 'bank' a colecciones existentes
- `npm run auditoria-pocketbase` - Ejecuta auditoría completa del sistema PocketBase
- `npm run verificar-coleccion` - Verifica la configuración de las colecciones

## ⚡ Optimizaciones y Características Técnicas

### Detección Inteligente de Duplicados
- **Verificación previa**: Antes de procesar con IA, el sistema verifica si el archivo ya fue procesado
- **Criterios de duplicado**: Mes + Año + Banco
- **Ahorro de recursos**: Evita procesar archivos duplicados con IA, ahorrando tiempo y costos de API
- **Extracción de metadata**: Extrae mes/año del nombre del archivo o primera página del PDF

### Gestión Multi-Banco
- **Detección automática**: Identifica el banco del nombre del archivo o contenido
- **Selector manual**: Permite al usuario seleccionar el banco si la detección no es precisa
- **Sin conflictos**: Puedes cargar estados de cuenta del mismo mes pero de diferentes bancos

### Procesamiento Eficiente
- **Procesamiento en batch**: Clasifica múltiples transacciones en lotes para mayor eficiencia
- **Procesamiento en segundo plano**: El procesamiento continúa aunque cambies de pestaña
- **Manejo de errores**: Sistema robusto de manejo de errores y reintentos

## 📝 Notas Importantes

- **Base de datos**: La aplicación usa **PocketBase** como base de datos por defecto. Configura `POCKETBASE_URL` en `.env`
- **Persistencia**: Los datos se guardan de forma persistente en PocketBase
- **Procesamiento de PDF**: Puede variar según el formato del banco. La aplicación usa DeepSeek Vision API para máxima precisión
- **Clasificación con IA**: Puede tomar unos segundos dependiendo del número de transacciones
- **Duplicados**: El sistema detecta y rechaza automáticamente archivos duplicados (mismo mes/año/banco)
- **Múltiples bancos**: Puedes gestionar estados de cuenta de diferentes bancos sin conflictos

## 🚀 Despliegue

### Desplegar en Coolify

Consulta la guía completa en [DESPLIEGUE_COOLIFY.md](./DESPLIEGUE_COOLIFY.md)

**Configuración rápida:**
1. Conecta tu repositorio en Coolify
2. Configura las variables de entorno (ver `.env.example`)
3. Despliega

**Variables de entorno necesarias:**
- `POCKETBASE_URL`: URL completa de tu instancia PocketBase (ej: `https://tu-servidor.com/_/`)
- `POCKETBASE_ADMIN_EMAIL`: Email del administrador de PocketBase
- `POCKETBASE_ADMIN_PASSWORD`: Contraseña del administrador de PocketBase
- `DEEPSEEK_API_KEY`: API Key de DeepSeek (requerida para procesamiento de PDFs)
- `PORT`: Puerto del servidor (default: 5000)
- `NODE_ENV`: Entorno de ejecución (`development` o `production`)

## ✨ Características Destacadas

### 🚀 Optimización de Procesamiento
- **Detección de duplicados antes de IA**: Ahorra tiempo y costos verificando si un archivo ya fue procesado
- **Procesamiento en segundo plano**: Continúa procesando aunque cambies de pestaña
- **Extracción inteligente**: Extrae metadata (mes/año) del nombre del archivo o primera página del PDF

### 🎯 Gestión Multi-Banco
- **20+ bancos soportados**: México, EEUU y Latinoamérica
- **Detección automática**: Identifica el banco automáticamente
- **Sin conflictos**: Gestiona múltiples bancos sin problemas de duplicados

### 📊 Análisis Avanzado
- **Filtros múltiples**: Por tipo, categoría, mes, semana y banco
- **Vista acumulada**: Ve cómo se acumulan tus finanzas mes a mes
- **Comparaciones**: Analiza cambios entre períodos
- **Búsqueda inteligente**: Busca por descripción, comercio o categoría

### 🔒 Seguridad y Confiabilidad
- **Validación de datos**: Verifica la integridad de las transacciones
- **Manejo de errores**: Sistema robusto con reintentos automáticos
- **Persistencia**: Datos guardados de forma segura en PocketBase

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Ideas para Contribuir
- Agregar más bancos a la lista de soportados
- Mejorar la detección de categorías
- Agregar nuevas visualizaciones
- Optimizar el procesamiento de PDFs
- Mejorar la UI/UX

## 📄 Licencia

MIT


















