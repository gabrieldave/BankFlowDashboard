import type { InsertTransaction } from "@shared/schema";
import { classifyTransaction, classifyTransactionsBatch } from "./ai-service";
import { detectCurrencyFromText } from "./currency-detector";

// Importar polyfills para APIs del DOM necesarias para pdf-parse
import "./pdf-polyfill";

let pdfParse: any;

async function getPdfParser() {
  if (!pdfParse) {
    try {
      // Usar createRequire para importar pdf-parse de forma más estable en ES modules
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      
      // Intentar cargar pdf-parse usando require (más estable que import dinámico)
      const pdfParseModule = require("pdf-parse");
      
      // pdf-parse puede exportarse de diferentes formas dependiendo de la versión
      // Intentar múltiples formas de acceso
      if (typeof pdfParseModule === 'function') {
        pdfParse = pdfParseModule;
      } else if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
        pdfParse = pdfParseModule.default;
      } else if (pdfParseModule.pdfParse && typeof pdfParseModule.pdfParse === 'function') {
        pdfParse = pdfParseModule.pdfParse;
      } else {
        // Último intento: buscar cualquier propiedad que sea una función
        const keys = Object.keys(pdfParseModule);
        const funcKey = keys.find(key => typeof pdfParseModule[key] === 'function');
        if (funcKey) {
          pdfParse = pdfParseModule[funcKey];
        } else {
          console.error('Estructura del módulo pdf-parse:', Object.keys(pdfParseModule));
          throw new Error('pdf-parse no se cargó correctamente: no se encontró la función de parseo');
        }
      }
      
      // Verificar que la función esté disponible
      if (typeof pdfParse !== 'function') {
        console.error('Estructura del módulo pdf-parse:', Object.keys(pdfParseModule));
        throw new Error('pdf-parse no se cargó correctamente: el módulo no exporta una función');
      }
      
      console.log('pdf-parse cargado correctamente');
    } catch (importError: any) {
      console.error('Error importando pdf-parse:', importError);
      console.error('Stack trace:', importError.stack);
      // Si falla, intentar con import dinámico como fallback
      try {
        console.log('Intentando import dinámico como fallback...');
        const pdfParseModule = await import("pdf-parse");
        pdfParse = (pdfParseModule as any).default || pdfParseModule;
        if (typeof pdfParse !== 'function') {
          throw new Error('Import dinámico tampoco funcionó');
        }
        console.log('pdf-parse cargado con import dinámico');
      } catch (fallbackError: any) {
        console.error('Error en fallback:', fallbackError);
        throw new Error(`Error cargando pdf-parse: ${importError.message}. Ejecuta: npm install pdf-parse`);
      }
    }
  }
  return pdfParse;
}

export async function parseCSV(content: string): Promise<InsertTransaction[]> {
  const lines = content.trim().split('\n');
  const rawTransactions: Array<{ date: string; description: string; amount: number }> = [];
  
  // Detectar moneda del contenido
  const detectedCurrency = detectCurrencyFromText(content);
  console.log(`Moneda detectada en CSV: ${detectedCurrency}`);
  
  // Primero extraer todas las transacciones
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = line.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
    
    if (cols.length >= 3) {
      const amount = parseFloat(cols[2]);
      if (isNaN(amount)) continue;
      
      rawTransactions.push({
        date: cols[0] || new Date().toISOString().split('T')[0],
        description: cols[1] || 'Sin descripción',
        amount: amount,
      });
    }
  }

  if (rawTransactions.length === 0) {
    return [];
  }

  // Clasificar todas las transacciones usando IA (en batch para eficiencia)
  const classifications = await classifyTransactionsBatch(rawTransactions);
  
  // Combinar datos con clasificaciones
  const transactions: InsertTransaction[] = rawTransactions.map((raw, idx) => {
    const classification = classifications[idx] || {
      category: 'General',
      merchant: raw.description.split(' ').slice(0, 3).join(' ') || 'Desconocido',
      confidence: 0.5,
    };

    return {
      date: raw.date,
      description: raw.description,
      amount: Math.abs(raw.amount).toString(),
      type: raw.amount >= 0 ? 'income' : 'expense',
      category: classification.category,
      merchant: classification.merchant,
      currency: detectedCurrency,
    };
  });
  
  return transactions;
}

export async function parsePDF(buffer: Buffer): Promise<InsertTransaction[]> {
  try {
    console.log('Iniciando procesamiento de PDF...');
    console.log('Tamaño del buffer:', buffer.length, 'bytes');
    
    const parser = await getPdfParser();
    
    // Opciones para pdf-parse que evitan problemas con DOMMatrix
    const options = {
      // Evitar usar APIs del navegador
      max: 0, // Procesar todas las páginas
    };
    
    console.log('Parseando PDF...');
    
    // Intentar parsear el PDF
    let data: any;
    try {
      // Primero intentar sin opciones
      data = await parser(buffer);
    } catch (parseError: any) {
      // Si falla, intentar con opciones
      console.warn('Primer intento falló, intentando con opciones:', parseError.message);
      try {
        data = await parser(buffer, options);
      } catch (secondError: any) {
        // Si aún falla, intentar sin opciones pero con manejo de errores
        console.error('Error parseando PDF:', secondError);
        throw new Error(`Error al parsear PDF: ${secondError.message}. El PDF puede estar corrupto o en un formato no soportado.`);
      }
    }
    
    const text = data?.text || data;
    
    console.log(`PDF extraído: ${text.length} caracteres`);
    
    if (!text || text.trim().length === 0) {
      throw new Error('El PDF no contiene texto legible. Puede ser un PDF escaneado o protegido.');
    }
    
    // Detectar moneda del contenido del PDF
    const detectedCurrency = detectCurrencyFromText(text);
    console.log(`Moneda detectada en PDF: ${detectedCurrency}`);
    
    const rawTransactions: Array<{ date: string; description: string; amount: number }> = [];
    
    // Dividir en líneas y procesar
    const lines = text.split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    
    console.log(`Procesando ${lines.length} líneas del PDF...`);
    
    // Extraer transacciones con múltiples estrategias
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Intentar extraer transacción de la línea actual
      let transaction = extractTransactionFromLine(line);
      
      // Si no se encontró, intentar con líneas combinadas (algunos PDFs dividen transacciones en múltiples líneas)
      if (!transaction && i < lines.length - 1) {
        const combinedLine = line + ' ' + lines[i + 1];
        transaction = extractTransactionFromLine(combinedLine);
      }
      
      if (transaction) {
        // Determinar si es ingreso o gasto basado en el monto y contexto
        const amount = parseFloat(transaction.amount);
        const isIncome = detectIncome(transaction.description, amount);
        
        console.log(`Transacción procesada: ${isIncome ? 'INGRESO' : 'GASTO'} - ${transaction.description.substring(0, 50)} - ${amount}`);
        
        rawTransactions.push({
          date: transaction.date,
          description: transaction.description,
          amount: isIncome ? Math.abs(amount) : -Math.abs(amount),
        });
      }
    }

    console.log(`Transacciones encontradas: ${rawTransactions.length}`);

    if (rawTransactions.length === 0) {
      // Intentar estrategia alternativa: buscar patrones más flexibles
      console.log('Intentando estrategia alternativa de extracción...');
      try {
        const altTransactions = extractTransactionsAlternative(text);
        if (altTransactions.length > 0) {
          console.log(`Encontradas ${altTransactions.length} transacciones con método alternativo`);
          rawTransactions.push(...altTransactions);
        }
      } catch (altError) {
        console.warn('Error en método alternativo:', altError);
      }
    }

    if (rawTransactions.length === 0) {
      throw new Error('No se encontraron transacciones en el PDF. El archivo puede no ser un estado de cuenta, o el formato no es reconocido. Intenta exportar como CSV desde tu banco.');
    }

    // Clasificar todas las transacciones usando IA
    console.log('Clasificando transacciones con IA...');
    let classifications;
    try {
      classifications = await classifyTransactionsBatch(rawTransactions);
    } catch (aiError) {
      console.warn('Error en clasificación IA, usando clasificación básica:', aiError);
      // Si falla la IA, usar clasificación básica
      classifications = rawTransactions.map(t => ({
        category: 'General',
        merchant: t.description.split(' ').slice(0, 3).join(' ') || 'Desconocido',
        confidence: 0.5,
      }));
    }
    
    // Combinar datos con clasificaciones
    const transactions: InsertTransaction[] = rawTransactions
      .map((raw, idx) => {
        const classification = (classifications && classifications[idx]) ? classifications[idx] : {
          category: 'General',
          merchant: raw.description.split(' ').slice(0, 3).join(' ') || 'Desconocido',
          confidence: 0.5,
        };

        // Validar que los datos sean correctos
        if (!raw.date || !raw.description || isNaN(parseFloat(raw.amount.toString()))) {
          console.warn('Transacción inválida encontrada:', raw);
          return null;
        }

        return {
          date: raw.date,
          description: raw.description.substring(0, 500), // Limitar longitud
          amount: Math.abs(raw.amount).toString(),
          type: raw.amount >= 0 ? 'income' : 'expense',
          category: classification.category || 'General',
          merchant: (classification.merchant || raw.description.split(' ').slice(0, 3).join(' ') || 'Desconocido').substring(0, 200),
          currency: detectedCurrency,
        };
      })
      .filter((t): t is InsertTransaction & { currency: string } => t !== null);
    
    console.log(`Procesamiento completado: ${transactions.length} transacciones`);
    return transactions;
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    const errorMessage = error.message || 'Error desconocido al procesar el PDF';
    throw new Error(`Error procesando PDF: ${errorMessage}. Asegúrate de que el PDF sea un estado de cuenta bancario legible.`);
  }
}

function extractTransactionFromLine(line: string): { date: string; description: string; amount: string } | null {
  // Patrones más flexibles para fechas
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,  // DD/MM/YYYY o DD-MM-YYYY
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,    // YYYY/MM/DD
    /(\d{1,2}\s+\w{3}\s+\d{2,4})/,           // DD MMM YYYY
  ];
  
  // Patrones más flexibles para montos (incluyendo signo + para abonos)
  const amountPatterns = [
    /([\+\-]?\$\s*\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/, // Con símbolo $ y posible signo +
    /([\+\-]?\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/,  // Formato estándar con signo +
    /([\+\-]?\d+[,\.]\d{2})/,                           // Formato simple con signo +
    /([\+\-]?\d+\.\d{2})/,                              // Formato decimal con signo +
  ];
  
  let dateMatch: RegExpMatchArray | null = null;
  for (const pattern of datePatterns) {
    const match = line.match(pattern);
    if (match) {
      dateMatch = match;
      break;
    }
  }
  
  if (!dateMatch) {
    return null;
  }
  
  // Buscar montos
  let amountMatch: string | null = null;
  for (const pattern of amountPatterns) {
    const matches = line.match(new RegExp(pattern, 'g'));
    if (matches && matches.length > 0) {
      // Tomar el último monto (generalmente es el total de la transacción)
      amountMatch = matches[matches.length - 1];
      break;
    }
  }
  
  if (!amountMatch) {
    return null;
  }
  
  const date = normalizeDate(dateMatch[1]);
  
  // Limpiar el monto (preservar signo + para detectar abonos)
  let amountStr = amountMatch
    .replace(/\$/g, '')
    .replace(/\s+/g, '')
    .replace(/\+/g, '')  // Remover + para parseFloat, pero ya lo detectamos antes
    .replace(/\./g, (match: string, offset: number, string: string) => {
      // Si hay múltiples puntos, mantener solo el último como decimal
      const after = string.substring(offset + 1);
      return after.includes('.') ? '' : match;
    })
    .replace(',', '.');
  
  const amount = parseFloat(amountStr);
  
  if (isNaN(amount) || amount === 0) {
    return null;
  }
  
  // Extraer descripción (todo excepto fecha y monto)
  // Mantener más información para detectar mejor los abonos
  let description = line
    .replace(dateMatch[0], '')
    .replace(amountMatch, '')
    .trim();
  
  // Limpiar pero mantener guiones y algunos caracteres importantes para detectar "Abono - Transferencia"
  description = description
    .replace(/\s+/g, ' ')  // Normalizar espacios
    .trim()
    .slice(0, 500);  // Permitir descripciones más largas
  
  if (!description || description.length < 3) {
    return null;
  }
  
  // Log para debugging
  console.log(`Transacción extraída: ${date} | ${description.substring(0, 60)} | ${amount}`);
  
  return {
    date,
    description,
    amount: Math.abs(amount).toString(),
  };
}

function extractTransactionsAlternative(text: string): Array<{ date: string; description: string; amount: number }> {
  const transactions: Array<{ date: string; description: string; amount: number }> = [];
  
  // Buscar líneas que contengan fechas y números que parezcan montos
  const lines = text.split(/\r?\n/);
  
  for (const line of lines) {
    // Buscar patrón: fecha seguida de texto y luego un monto
    const pattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\-]?\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/;
    const match = line.match(pattern);
    
    if (match) {
      const date = normalizeDate(match[1]);
      const description = match[2].trim().slice(0, 200);
      const amountStr = match[3].replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(amountStr);
      
      if (!isNaN(amount) && amount !== 0 && description.length >= 3) {
        transactions.push({
          date,
          description,
          amount: amount < 0 ? amount : -Math.abs(amount), // Asumir gasto por defecto
        });
      }
    }
  }
  
  return transactions;
}

function detectIncome(description: string, amount: number): boolean {
  const desc = description.toLowerCase();
  
  // Keywords más completas para detectar ingresos
  const incomeKeywords = [
    'deposito', 'depósito', 'depositos', 'depósitos',
    'transferencia recibida', 'transferencia recib', 'transfer recibida',
    'abono', 'abonos', 'abono -', 'abono transferencia',
    'nomina', 'nómina', 'nominas', 'nóminas',
    'salario', 'salarios', 'sueldo', 'sueldos',
    'pago recibido', 'pago recib', 'pagos recibidos',
    'ingreso', 'ingresos', 'ingreso por',
    'credito', 'crédito', 'creditos', 'créditos',
    'cargo a favor', 'a favor',
    'recarga', 'recargas',
    'devolucion', 'devolución', 'reembolso'
  ];
  
  // Buscar keywords de ingreso (más flexible)
  for (const keyword of incomeKeywords) {
    if (desc.includes(keyword)) {
      console.log(`Ingreso detectado por keyword "${keyword}" en: ${description.substring(0, 50)}`);
      return true;
    }
  }
  
  // Si el monto tiene signo + explícito, es ingreso
  if (description.includes('+') || description.includes('+$') || description.includes('+ $')) {
    console.log(`Ingreso detectado por signo + en: ${description.substring(0, 50)}`);
    return true;
  }
  
  // Si el monto es muy grande y positivo, probablemente es un ingreso
  if (amount > 1000) {
    console.log(`Posible ingreso por monto grande (${amount}) en: ${description.substring(0, 50)}`);
    // Pero no asumir automáticamente, solo si no hay keywords de gasto
    const expenseKeywords = ['cargo', 'cargos', 'retiro', 'retiros', 'pago', 'pagos', 'compra', 'compras', 'gasto', 'gastos'];
    const hasExpenseKeyword = expenseKeywords.some(kw => desc.includes(kw));
    if (!hasExpenseKeyword) {
      return true;
    }
  }
  
  return false;
}

function normalizeDate(dateStr: string): string {
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return new Date().toISOString().split('T')[0];
  
  let [day, month, year] = parts;
  
  if (year.length === 2) {
    year = '20' + year;
  }
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Funciones de categorización básica movidas a ai-service.ts
// Se mantienen aquí solo como fallback si la IA no está disponible
