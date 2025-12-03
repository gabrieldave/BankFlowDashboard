/**
 * Servicio para extraer transacciones de PDFs usando DeepSeek Vision API
 * Convierte cada página del PDF a imagen y usa IA para extraer transacciones
 */

import type { InsertTransaction } from "@shared/schema";
import { detectCurrencyFromText } from "./currency-detector";

declare const process: {
  env: {
    DEEPSEEK_API_KEY?: string;
  };
};

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = (typeof process !== 'undefined' && process.env?.DEEPSEEK_API_KEY) || '';

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

/**
 * Convierte un PDF buffer a imágenes (una por página)
 */
async function pdfToImages(buffer: Buffer): Promise<string[]> {
  try {
    // Importar pdfjs-dist dinámicamente
    // Intentar diferentes formas de importar según la versión
    let pdfjsLib: any;
    try {
      pdfjsLib = await import('pdfjs-dist');
    } catch (e) {
      try {
        pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      } catch (e2) {
        // Fallback: usar require si está disponible
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        pdfjsLib = require('pdfjs-dist');
      }
    }
    
    const { createCanvas } = await import('canvas');
    
    // Configurar worker si es necesario
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    const images: string[] = [];
    
    console.log(`Convirtiendo ${pdf.numPages} páginas del PDF a imágenes...`);
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // Escala 2x para mejor calidad
      
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
      };
      
      await page.render(renderContext).promise;
      
      // Convertir canvas a base64
      const imageBuffer = canvas.toBuffer('image/png');
      const base64Image = imageBuffer.toString('base64');
      images.push(base64Image);
      
      console.log(`Página ${pageNum}/${pdf.numPages} convertida a imagen (${Math.round(imageBuffer.length / 1024)} KB)`);
    }
    
    return images;
  } catch (error: any) {
    console.error('Error convirtiendo PDF a imágenes:', error);
    throw new Error(`Error convirtiendo PDF a imágenes: ${error.message}`);
  }
}

/**
 * Extrae transacciones de una imagen usando DeepSeek Vision API
 */
async function extractTransactionsFromImage(
  imageBase64: string,
  pageNumber: number,
  totalPages: number
): Promise<ExtractedTransaction[]> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY no configurada. No se puede usar visión.');
  }

  const prompt = `Eres un experto en análisis de estados de cuenta bancarios. Analiza esta imagen de una página de estado de cuenta bancario (página ${pageNumber} de ${totalPages}) y extrae TODAS las transacciones que encuentres.

INSTRUCCIONES CRÍTICAS:
1. Busca TODAS las transacciones en la página, incluyendo las que están en tablas, listas o cualquier formato
2. Para cada transacción, identifica:
   - Fecha (formato: YYYY-MM-DD)
   - Descripción completa (todo el texto de la transacción)
   - Monto (número con signo: + para ingresos/abonos, - para gastos/cargos)
   - Tipo: "income" si tiene signo + o es un abono/ingreso, "expense" si tiene signo - o es un cargo/gasto

3. IMPORTANTE sobre signos:
   - Si el monto tiene signo + o dice "Abono", "Transferencia recibida", "Depósito" → type: "income"
   - Si el monto tiene signo - o dice "Cargo", "Pago", "Compra", "Retiro" → type: "expense"
   - Si no hay signo explícito, usa el contexto de la descripción

4. Formato de respuesta: Responde SOLO con un JSON array válido, sin texto adicional:
[
  {
    "date": "2025-09-01",
    "description": "Cargo - Transferencia enviada",
    "amount": -200.00,
    "type": "expense"
  },
  {
    "date": "2025-09-02",
    "description": "Abono - Transferencia recibida MERCADO PAGO",
    "amount": 1000.00,
    "type": "income"
  }
]

5. Si no encuentras transacciones, devuelve un array vacío: []

IMPORTANTE: Extrae TODAS las transacciones visibles en la página, no solo algunas.`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // DeepSeek soporta visión con este modelo
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en extracción de datos de estados de cuenta bancarios. Extrae transacciones con precisión absoluta.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1, // Baja temperatura para mayor precisión
        max_tokens: 4000, // Más tokens para transacciones largas
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error en DeepSeek Vision API (página ${pageNumber}):`, errorText);
      throw new Error(`Error en API: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn(`No se recibió contenido de DeepSeek Vision para página ${pageNumber}`);
      return [];
    }

    // Extraer JSON del contenido
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`No se encontró JSON válido en la respuesta de la página ${pageNumber}:`, content.substring(0, 200));
      return [];
    }

    const transactions = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(transactions)) {
      console.warn(`La respuesta no es un array para la página ${pageNumber}`);
      return [];
    }

    console.log(`Extraídas ${transactions.length} transacciones de la página ${pageNumber} usando DeepSeek Vision`);
    
    // Log detallado de las transacciones extraídas
    transactions.forEach((t: any, idx: number) => {
      console.log(`  Transacción ${idx + 1}: fecha=${t.date}, desc=${t.description?.substring(0, 50)}, amount=${t.amount}, type=${t.type}`);
    });
    
    return transactions.map((t: any) => {
      // Validar y convertir el monto
      let amount: number;
      if (typeof t.amount === 'number') {
        amount = t.amount;
      } else if (typeof t.amount === 'string') {
        // Limpiar el string de monto
        const cleanAmount = t.amount.replace(/[^\d.,-+]/g, '').replace(',', '.');
        amount = parseFloat(cleanAmount);
        if (isNaN(amount)) {
          console.warn(`Monto inválido en transacción: "${t.amount}" -> parseado como NaN`);
          return null;
        }
      } else {
        console.warn(`Tipo de monto inválido: ${typeof t.amount}, valor: ${t.amount}`);
        return null;
      }
      
      // Validar que el monto no sea 0 o muy pequeño (probablemente error)
      if (amount === 0 || Math.abs(amount) < 0.01) {
        console.warn(`Monto muy pequeño o cero en transacción: ${amount}`);
        return null;
      }
      
      return {
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description || '',
        amount: amount,
        type: t.type === 'income' ? 'income' : 'expense',
      };
    }).filter((t: ExtractedTransaction | null): t is ExtractedTransaction => 
      t !== null && t.date && t.description && !isNaN(t.amount) && t.amount !== 0
    );
  } catch (error: any) {
    console.error(`Error extrayendo transacciones de la página ${pageNumber}:`, error);
    return [];
  }
}

/**
 * Procesa un PDF usando DeepSeek Vision API
 * Convierte cada página a imagen y extrae transacciones con IA
 */
export async function parsePDFWithVision(buffer: Buffer): Promise<InsertTransaction[]> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY no configurada. No se puede usar visión. Usa el método tradicional.');
  }

  console.log('Iniciando procesamiento de PDF con DeepSeek Vision API...');
  console.log('Tamaño del buffer:', buffer.length, 'bytes');

  try {
    // Convertir PDF a imágenes
    const images = await pdfToImages(buffer);
    console.log(`PDF convertido a ${images.length} imágenes`);

    if (images.length === 0) {
      throw new Error('No se pudieron convertir las páginas del PDF a imágenes');
    }

    // Extraer transacciones de cada página
    const allTransactions: ExtractedTransaction[] = [];

    for (let i = 0; i < images.length; i++) {
      console.log(`Procesando página ${i + 1}/${images.length} con DeepSeek Vision...`);
      
      const pageTransactions = await extractTransactionsFromImage(
        images[i],
        i + 1,
        images.length
      );
      
      allTransactions.push(...pageTransactions);
      
      // Pequeña pausa para evitar rate limiting
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Total de transacciones extraídas con Vision: ${allTransactions.length}`);

    if (allTransactions.length === 0) {
      throw new Error('No se encontraron transacciones en el PDF usando DeepSeek Vision');
    }

    // Detectar moneda (usar el texto de la primera página si es posible)
    // Por ahora, usar MXN por defecto o detectar de las descripciones
    let detectedCurrency = 'MXN';
    try {
      const allDescriptions = allTransactions.map(t => t.description).join(' ');
      detectedCurrency = detectCurrencyFromText(allDescriptions);
    } catch (e) {
      console.warn('Error detectando moneda, usando MXN por defecto');
    }

    // Convertir a formato InsertTransaction
    const transactions: InsertTransaction[] = allTransactions.map((t) => {
      // Validar el monto antes de guardar
      const amount = Math.abs(t.amount);
      if (isNaN(amount) || amount === 0) {
        console.error(`Transacción con monto inválido: ${JSON.stringify(t)}`);
        return null;
      }
      
      // Log para debugging
      console.log(`Transacción procesada: ${t.date} | ${t.type} | ${t.description.substring(0, 50)} | $${amount}`);
      
      return {
        date: t.date,
        description: t.description.substring(0, 500),
        amount: amount.toString(),
        type: t.type,
        category: 'General', // Se clasificará después con IA
        merchant: t.description.split(' ').slice(0, 3).join(' ') || 'Desconocido',
        currency: detectedCurrency,
      };
    }).filter((t): t is InsertTransaction => t !== null);

    // Clasificar transacciones con IA (usar el servicio existente)
    console.log('Clasificando transacciones extraídas con IA...');
    const { classifyTransactionsBatch } = await import('./ai-service');
    
    try {
      const classifications = await classifyTransactionsBatch(
        transactions.map(t => ({
          description: t.description,
          amount: parseFloat(t.amount) * (t.type === 'income' ? 1 : -1),
          date: t.date,
        }))
      );

      // Aplicar clasificaciones
      transactions.forEach((t, idx) => {
        if (classifications[idx]) {
          t.category = classifications[idx].category || 'General';
          t.merchant = classifications[idx].merchant || t.merchant;
        }
      });
    } catch (aiError) {
      console.warn('Error en clasificación IA, usando valores por defecto:', aiError);
    }

    console.log(`Procesamiento completado: ${transactions.length} transacciones`);
    return transactions;
  } catch (error: any) {
    console.error('Error procesando PDF con Vision:', error);
    throw new Error(`Error procesando PDF con DeepSeek Vision: ${error.message}`);
  }
}

