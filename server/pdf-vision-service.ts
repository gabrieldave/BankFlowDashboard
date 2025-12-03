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
    const pages: Array<{ pageNumber: number; text: string }> = [];
    
    console.log(`Extrayendo texto de ${pdf.numPages} páginas del PDF...`);
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Extraer texto de la página
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      pages.push({
        pageNumber: pageNum,
        text: pageText
      });
      
      console.log(`Página ${pageNum}/${pdf.numPages} - ${pageText.length} caracteres extraídos`);
    }
    
    return pages;
  } catch (error: any) {
    console.error('Error extrayendo texto del PDF:', error);
    throw new Error(`Error extrayendo texto del PDF: ${error.message}`);
  }
}

/**
 * Extrae transacciones del texto de una página usando DeepSeek API
 */
async function extractTransactionsFromText(
  pageText: string,
  pageNumber: number,
  totalPages: number
): Promise<ExtractedTransaction[]> {
  const DEEPSEEK_API_KEY = getDeepSeekApiKey();
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY no configurada. No se puede usar visión.');
  }

  const prompt = `Eres un experto en análisis de estados de cuenta bancarios. Analiza este texto extraído de una página de estado de cuenta bancario (página ${pageNumber} de ${totalPages}) y extrae TODAS las transacciones que encuentres.

TEXTO DE LA PÁGINA:
${pageText}

INSTRUCCIONES CRÍTICAS:

INSTRUCCIONES CRÍTICAS:
1. Busca TODAS las transacciones en la página, incluyendo las que están en tablas, listas o cualquier formato
2. Para cada transacción, identifica EXACTAMENTE:
   - Fecha: Convierte formatos como "01/sep/2025" o "01/09/2025" a "2025-09-01" (YYYY-MM-DD)
   - Descripción: Toma la descripción completa pero sin repetir "Fecha y hora:" múltiples veces. Si dice "Abono - Transferencia recibida", usa eso. Si tiene detalles adicionales, inclúyelos pero de forma concisa.
   - Monto: EXTRAE EL MONTO EXACTO que aparece en la columna "Monto de transacción". Si dice "- $ 200.00" → amount: -200.00. Si dice "+$ 1,000.00" → amount: 1000.00. NO uses valores por defecto ni valores incorrectos.
   - Tipo: "income" si tiene signo + o dice "Abono", "expense" si tiene signo - o dice "Cargo"

3. REGLAS CRÍTICAS DE EXTRACCIÓN:
   - El monto DEBE ser el número exacto que aparece en el PDF, NO un valor por defecto
   - Si el monto tiene formato "1,000.00" con comas, conviértelo a 1000.00 (sin comas)
   - Si el monto tiene signo "+$" o "+ $" → es INGRESO (amount positivo, type: "income")
   - Si el monto tiene signo "-$" o "- $" → es GASTO (amount negativo, type: "expense")
   - NO uses el mismo monto para todas las transacciones. Cada una tiene su monto único.

4. Formato de respuesta: Responde SOLO con un JSON array válido, sin texto adicional:
[
  {
    "date": "2025-09-01",
    "description": "Cargo - Transferencia enviada Transferencia Interbancaria SPEI",
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

IMPORTANTE: 
- Extrae TODAS las transacciones visibles en la página
- Cada monto DEBE ser único y correcto según lo que aparece en el PDF
- NO uses valores por defecto como 9.00 o valores repetidos`;

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
            content: prompt
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

    console.log(`Extraídas ${transactions.length} transacciones de la página ${pageNumber} usando DeepSeek API (texto)`);
    
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
        // Limpiar el string de monto (el guion debe estar al final o escapado en la clase de caracteres)
        const cleanAmount = t.amount.replace(/[^\d.,+-]/g, '').replace(',', '.');
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
 * Procesa un PDF usando DeepSeek API
 * Extrae texto directamente del PDF y lo envía a la IA (más eficiente que imágenes)
 */
export async function parsePDFWithVision(buffer: Buffer): Promise<InsertTransaction[]> {
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

    // Extraer transacciones de cada página usando IA
    // Procesar en batches más grandes para ser más eficiente
    const allTransactions: ExtractedTransaction[] = [];
    const batchSize = 5; // Procesar 5 páginas a la vez (optimizado)

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      console.log(`Procesando páginas ${i + 1}-${Math.min(i + batchSize, pages.length)}/${pages.length} con DeepSeek API...`);
      
      // Procesar batch en paralelo
      const batchPromises = batch.map(page => 
        extractTransactionsFromText(
          page.text,
          page.pageNumber,
          pages.length
        )
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Agregar todas las transacciones del batch
      batchResults.forEach(pageTransactions => {
        allTransactions.push(...pageTransactions);
      });
      
      // Pausa mínima entre batches para evitar rate limiting (reducida)
      if (i + batchSize < pages.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

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
    console.error('Error procesando PDF con IA:', error);
    throw new Error(`Error procesando PDF con DeepSeek API: ${error.message}`);
  }
}

