# BankFlow Dashboard

Dashboard inteligente para análisis de estados de cuenta bancarios con clasificación automática usando IA (DeepSeek).

## 🚀 Características

- **Carga de archivos**: Soporta CSV y PDF de estados de cuenta
- **Clasificación inteligente con IA**: Usa DeepSeek API para categorizar automáticamente transacciones
- **Categorías específicas**: Detecta automáticamente Amazon, MercadoLibre, supermercados, restaurantes, etc.
- **Dashboard completo**: Visualización de ingresos, gastos, tendencias y análisis detallados
- **Análisis avanzado**: 
  - Tendencias de gastos
  - Top comercios
  - Gastos más grandes
  - Análisis diario y mensual
  - Comparación de períodos

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

1. **Subir archivo**: Ve a la página principal y arrastra o selecciona un archivo CSV o PDF
2. **Ver dashboard**: Una vez procesado, verás el dashboard con todas tus transacciones clasificadas
3. **Análisis avanzado**: Ve a la pestaña "Analytics" para ver insights detallados

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

- **Alimentación**: Mercadona, Carrefour, Lidl, Día, etc.
- **Restaurantes**: Restaurantes, comida rápida, cafeterías
- **Transporte**: Uber, Cabify, gasolineras, transporte público
- **Amazon**: Todas las transacciones de Amazon
- **MercadoLibre**: Transacciones de MercadoLibre
- **Compras Online**: Zara, El Corte Inglés, Fnac, etc.
- **Salud**: Farmacias, hospitales, clínicas
- **Vivienda**: Alquiler, hipoteca, servicios (luz, agua, gas)
- **Salario**: Nóminas y pagos de salario
- **Entretenimiento**: Netflix, Spotify, cines, etc.
- **General**: Otras transacciones

## 🔧 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run dev:client` - Solo inicia el cliente (puerto 5000)
- `npm run build` - Construye para producción
- `npm run start` - Inicia el servidor en producción
- `npm run check` - Verifica tipos TypeScript

## 📝 Notas

- La aplicación usa almacenamiento en memoria por defecto. Para persistencia, configura `DATABASE_URL` en `.env`
- El procesamiento de PDF puede variar según el formato del banco
- La clasificación con IA puede tomar unos segundos dependiendo del número de transacciones

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT

