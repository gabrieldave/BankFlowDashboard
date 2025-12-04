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

// Función para obtener la API key en tiempo de ejecución
function getDeepSeekApiKey(): string {
  return (typeof process !== 'undefined' && process.env?.DEEPSEEK_API_KEY) || '';
}

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  merchant?: string;
}

/**
 * Extrae texto directamente del PDF (más eficiente que convertir a imágenes)
 */
async function extractTextFromPDF(buffer: Buffer): Promise<Array<{ pageNumber: number; text: string }>> {
  try {
    // Importar pdfjs-dist legacy build (recomendado para Node.js)
    let pdfjsLib: any;
    try {
      // Intentar primero con legacy build (recomendado para Node.js)
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } catch (e) {
      try {
        pdfjsLib = await import('pdfjs-dist');
      } catch (e2) {
        // Fallback: usar require si está disponible
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      }
    }
    
    // Convertir Buffer a Uint8Array (pdfjs-dist requiere Uint8Array, no Buffer)
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ 
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      verbosity: 0 // Reducir logs
    });
    const pdf = await loadingTask.promise;
    
    console.log(`Extrayendo texto de ${pdf.numPages} páginas del PDF en paralelo...`);
    
    // OPTIMIZACIÓN: Extraer todas las páginas en paralelo
    const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
      const pageNum = i + 1;
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        console.log(`Página ${pageNum}/${pdf.numPages} - ${pageText.length} caracteres extraídos`);
        
        return {
          pageNumber: pageNum,
          text: pageText
        };
      } catch (error: any) {
        console.warn(`Error extrayendo página ${pageNum}:`, error.message);
        return {
          pageNumber: pageNum,
          text: ''
        };
      }
    });
    
    const pages = await Promise.all(pagePromises);
    return pages.filter(p => p.text.length > 0);
  } catch (error: any) {
    console.error('Error extrayendo texto del PDF:', error);
    throw new Error(`Error extrayendo texto del PDF: ${error.message}`);
  }
}

/**
 * Extrae y clasifica transacciones del texto de una página usando DeepSeek API (OPTIMIZADO: extrae y clasifica en una sola llamada)
 */
async function extractAndClassifyTransactionsFromText(
  pageText: string,
  pageNumber: number,
  totalPages: number
): Promise<ExtractedTransaction[]> {
  const DEEPSEEK_API_KEY = getDeepSeekApiKey();
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY no configurada. No se puede usar visión.');
  }

  // Prompt optimizado: extraer Y clasificar en una sola llamada
  const prompt = `Eres un experto en análisis de estados de cuenta bancarios. Analiza este texto y extrae TODAS las transacciones con su categoría y comercio.

TEXTO DE LA PÁGINA (${pageNumber}/${totalPages}):
${pageText}

INSTRUCCIONES:
1. Extrae TODAS las transacciones visibles
2. Para cada transacción, identifica:
   - Fecha: Convierte a "YYYY-MM-DD"
   - Descripción: Completa pero concisa
   - Monto: Número exacto (sin comas, sin signos en el número)
   - Tipo: "income" o "expense"
   - Categoría: Una de: Alimentación, Restaurantes, Transporte, Amazon, MercadoLibre, Compras Online, Salud, Vivienda, Salario, Entretenimiento, Servicios, Transferencias, Tarjetas, Comisiones, General
   - Comercio: Nombre del comercio o "Desconocido"

3. REGLAS DE EXTRACCIÓN:
   - Monto: Número exacto del PDF (sin comas, sin signos en el número)
   - Si dice "+$" o "Abono" → type: "income", amount positivo
   - Si dice "-$" o "Cargo" → type: "expense", amount positivo (el signo se maneja con type)

4. Formato de respuesta (SOLO JSON, sin texto adicional):
[
  {
    "date": "2025-09-01",
    "description": "Cargo - Transferencia enviada",
    "amount": 200.00,
    "type": "expense",
    "category": "Transferencias",
    "merchant": "Banco Destino"
  }
]

5. Si no hay transacciones: []`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en extracción y clasificación de transacciones bancarias. Responde SOLO con JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 6000, // Aumentado para incluir categorías y comercios
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

    console.log(`Extraídas ${transactions.length} transacciones de la página ${pageNumber} (con clasificación)`);
    
    return transactions.map((t: any) => {
      let amount: number;
      if (typeof t.amount === 'number') {
        amount = Math.abs(t.amount); // Siempre positivo, el tipo indica si es ingreso o gasto
      } else if (typeof t.amount === 'string') {
        const cleanAmount = t.amount.replace(/[^\d.,+-]/g, '').replace(',', '.');
        amount = Math.abs(parseFloat(cleanAmount));
        if (isNaN(amount)) {
          return null;
        }
      } else {
        return null;
      }
      
      if (amount === 0 || amount < 0.01) {
        return null;
      }
      
      return {
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description || '',
        amount: amount,
        type: t.type === 'income' ? 'income' : 'expense',
        category: t.category || 'General',
        merchant: t.merchant || 'Desconocido',
      };
    }).filter((t: any): t is ExtractedTransaction => 
      t !== null && t.date && t.description && !isNaN(t.amount) && t.amount !== 0
    );
  } catch (error: any) {
    console.error(`Error extrayendo transacciones de la página ${pageNumber}:`, error);
    return [];
  }
}

/**
 * Procesa un PDF usando DeepSeek API
 * Extrae texto directamente del PDF y lo envía a la IA (más eficiente que imágenes)
 */
export async function parsePDFWithVision(buffer: Buffer, bank?: string): Promise<InsertTransaction[]> {
  const DEEPSEEK_API_KEY = getDeepSeekApiKey();
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY no configurada. No se puede usar IA.');
  }
  
  console.log(`[PDF Vision Service] API Key detectada: ${DEEPSEEK_API_KEY.substring(0, 10)}...`);

  console.log('Iniciando procesamiento de PDF con DeepSeek API (extracción de texto)...');
  console.log('Tamaño del buffer:', buffer.length, 'bytes');

  try {
    // Extraer texto directamente del PDF (más rápido y eficiente)
    const pages = await extractTextFromPDF(buffer);
    console.log(`Texto extraído de ${pages.length} páginas`);

    if (pages.length === 0) {
      throw new Error('No se pudo extraer texto del PDF');
    }

    // OPTIMIZACIÓN: Procesar todas las páginas en paralelo (sin batches, sin pausas)
    console.log(`Procesando ${pages.length} páginas en paralelo con DeepSeek API...`);
    const startTime = Date.now();
    
    const allPromises = pages.map(page => 
      extractAndClassifyTransactionsFromText(
        page.text,
        page.pageNumber,
        pages.length
      )
    );
    
    // Procesar todas las páginas simultáneamente
    const allResults = await Promise.all(allPromises);
    
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ Procesamiento completado en ${processingTime}s (paralelo)`);
    
    // Combinar todas las transacciones
    const allTransactions = allResults.flat();

    console.log(`Total de transacciones extraídas con IA: ${allTransactions.length}`);

    if (allTransactions.length === 0) {
      throw new Error('No se encontraron transacciones en el PDF usando DeepSeek API');
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

    // Convertir a formato InsertTransaction (ya incluye categoría y merchant de la IA)
    const transactions: InsertTransaction[] = allTransactions.map((t: any) => {
      const amount = Math.abs(t.amount);
      if (isNaN(amount) || amount === 0) {
        return null;
      }
      
      const date = String(t.date || new Date().toISOString().split('T')[0]).trim();
      const description = String(t.description || 'Sin descripción').trim();
      const type = String(t.type || 'expense').trim();
      
      console.log(`Transacción: ${date} | ${type} | ${description.substring(0, 50)} | $${amount} | ${t.category || 'General'}`);
      
      return {
        date: date,
        description: description.substring(0, 500),
        amount: amount.toString(),
        type: type === 'income' ? 'income' : 'expense',
        category: t.category || 'General', // Ya viene clasificada de la IA
        merchant: t.merchant || description.split(' ').slice(0, 3).join(' ') || 'Desconocido',
        currency: detectedCurrency,
        bank: bank || undefined,
      };
    }).filter((t): t is InsertTransaction => t !== null);

    console.log(`Procesamiento completado: ${transactions.length} transacciones (sin clasificación adicional necesaria)`);
    return transactions;
  } catch (error: any) {
    console.error('Error procesando PDF con IA:', error);
    throw new Error(`Error procesando PDF con DeepSeek API: ${error.message}`);
  }
}

