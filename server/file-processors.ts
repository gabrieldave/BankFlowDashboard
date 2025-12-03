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
  // Intentar primero con DeepSeek Vision si está disponible
  const DEEPSEEK_API_KEY = (typeof process !== 'undefined' && process.env?.DEEPSEEK_API_KEY) || '';
  const USE_VISION = true; // Activado para usar IA en extracción
  
  if (USE_VISION && DEEPSEEK_API_KEY) {
    try {
      console.log('Intentando procesar PDF con DeepSeek Vision API...');
      const { parsePDFWithVision } = await import('./pdf-vision-service');
      return await parsePDFWithVision(buffer);
    } catch (visionError: any) {
      console.warn('Error con DeepSeek Vision, usando método tradicional:', visionError.message);
      // Continuar con el método tradicional como fallback
    }
  } else {
    console.log('Usando método tradicional de extracción (Vision deshabilitado temporalmente)');
  }

  // Método tradicional (fallback)
  try {
    console.log('Iniciando procesamiento de PDF (método tradicional)...');
    console.log('Tamaño del buffer:', buffer.length, 'bytes');
    
    const parser = await getPdfParser();
    
    // Opciones para pdf-parse - asegurar que se procesen TODAS las páginas
    const options = {
      max: 0, // 0 = procesar todas las páginas (sin límite)
      version: 'v1.10.100', // Versión específica si es necesario
    };
    
    console.log('Parseando PDF (todas las páginas)...');
    
    // Intentar parsear el PDF con opciones explícitas para todas las páginas
    let data: any;
    try {
      // Intentar primero con opciones explícitas para asegurar todas las páginas
      data = await parser(buffer, options);
      console.log(`PDF parseado exitosamente. Páginas procesadas: ${data?.numpages || 'desconocido'}`);
    } catch (parseError: any) {
      console.warn('Primer intento con opciones falló, intentando sin opciones:', parseError.message);
      try {
        // Fallback: intentar sin opciones
        data = await parser(buffer);
        console.log(`PDF parseado sin opciones. Páginas procesadas: ${data?.numpages || 'desconocido'}`);
      } catch (secondError: any) {
        console.error('Error parseando PDF:', secondError);
        throw new Error(`Error al parsear PDF: ${secondError.message}. El PDF puede estar corrupto o en un formato no soportado.`);
      }
    }
    
    const text = data?.text || data;
    const numPages = data?.numpages || 'desconocido';
    
    console.log(`PDF extraído: ${text.length} caracteres de ${numPages} página(s)`);
    
    if (!text || text.trim().length === 0) {
      throw new Error('El PDF no contiene texto legible. Puede ser un PDF escaneado o protegido.');
    }
    
    // Verificar si el texto parece estar completo (buscar indicadores de múltiples páginas)
    const pageIndicators = text.match(/\b(página|page|pag)\s*\d+/gi);
    if (pageIndicators && pageIndicators.length > 1) {
      console.log(`Se detectaron ${pageIndicators.length} indicadores de páginas en el texto`);
    }
    
    // Detectar moneda del contenido del PDF
    const detectedCurrency = detectCurrencyFromText(text);
    console.log(`Moneda detectada en PDF: ${detectedCurrency}`);
    
    // Buscar el período del reporte en el texto (ej: "Del 1 al 30 de septiembre de 2025")
    const periodMatch = text.match(/(?:del|from)\s+(\d{1,2})\s+(?:al|to)\s+(\d{1,2})\s+(?:de|of)\s+(\w+)\s+(?:de|of)\s+(\d{4})/i);
    if (periodMatch) {
      console.log(`Período detectado en PDF: ${periodMatch[0]}`);
    }
    
    const rawTransactions: Array<{ date: string; description: string; amount: number }> = [];
    
    // Dividir en líneas y procesar
    const lines = text.split(/\r?\n/).map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    
    console.log(`Procesando ${lines.length} líneas del PDF...`);
    
    // Log de las primeras y últimas líneas para debugging
    if (lines.length > 0) {
      console.log(`Primeras 3 líneas: ${lines.slice(0, 3).join(' | ')}`);
      console.log(`Últimas 3 líneas: ${lines.slice(-3).join(' | ')}`);
    }
    
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
        // Determinar si es ingreso o gasto
        const amount = parseFloat(transaction.amount);
        
        // Si la transacción tiene el signo explícito, usarlo directamente
        let isIncome = false;
        if (transaction.isPositive !== undefined) {
          // Si tiene signo explícito en el monto, usarlo
          isIncome = transaction.isPositive;
          console.log(`Transacción con signo explícito: ${isIncome ? 'INGRESO' : 'GASTO'} - ${transaction.description.substring(0, 50)} - ${isIncome ? '+' : '-'}$${amount}`);
        } else {
          // Si no tiene signo explícito, usar la detección por descripción
          const originalLine = i > 0 ? lines[i - 1] + ' ' + line : line;
          const hasPlusSign = originalLine.includes('+$') || originalLine.includes('+ $') || originalLine.includes('+');
          const hasMinusSign = originalLine.includes('-$') || originalLine.includes('- $') || (originalLine.includes('-') && !hasPlusSign);
          
          if (hasPlusSign) {
            isIncome = true;
            console.log(`Ingreso detectado por signo + en línea: ${transaction.description.substring(0, 50)}`);
          } else if (hasMinusSign) {
            isIncome = false;
            console.log(`Gasto detectado por signo - en línea: ${transaction.description.substring(0, 50)}`);
          } else {
            // Fallback a detección por descripción
            isIncome = detectIncome(transaction.description, amount, hasPlusSign);
            console.log(`Transacción procesada: ${isIncome ? 'INGRESO' : 'GASTO'} - ${transaction.description.substring(0, 50)} - ${amount}`);
          }
        }
        
        // Validar el monto antes de agregar
        const finalAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);
        
        if (isNaN(finalAmount) || finalAmount === 0) {
          console.error(`ERROR: Monto inválido después de procesamiento: ${amount}, isIncome: ${isIncome}`);
          continue; // Saltar esta transacción
        }
        
        console.log(`Agregando transacción: ${transaction.date} | ${isIncome ? 'INGRESO' : 'GASTO'} | ${transaction.description.substring(0, 50)} | $${Math.abs(finalAmount).toFixed(2)}`);
        
        rawTransactions.push({
          date: transaction.date,
          description: transaction.description,
          amount: finalAmount,
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

function extractTransactionFromLine(line: string): { date: string; description: string; amount: string; isPositive?: boolean } | null {
  // Patrones más flexibles para fechas
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,  // DD/MM/YYYY o DD-MM-YYYY
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,    // YYYY/MM/DD
    /(\d{1,2}\s+\w{3}\s+\d{2,4})/,           // DD MMM YYYY
  ];
  
  // Patrones para montos con signo + o - (prioridad a estos)
  const amountPatterns = [
    /([\+\-]\$\s*\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/, // +$ o -$ con formato mexicano
    /([\+\-]\s*\$\s*\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/, // + $ o - $ con espacios
    /([\+\-]\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/,  // + o - sin símbolo $
    /([\+\-]?\$\s*\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/, // Con símbolo $ opcional
    /([\+\-]?\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/,  // Formato estándar
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
  
  // Buscar montos (priorizar los que tienen signo explícito)
  let amountMatch: string | null = null;
  let isPositive = false;
  
  for (const pattern of amountPatterns) {
    const matches = line.match(new RegExp(pattern, 'g'));
    if (matches && matches.length > 0) {
      // Buscar el monto con signo explícito primero
      const signedMatch = matches.find(m => m.startsWith('+') || m.startsWith('-'));
      if (signedMatch) {
        amountMatch = signedMatch;
        isPositive = signedMatch.startsWith('+');
        break;
      }
      // Si no hay signo explícito, tomar el último monto
      amountMatch = matches[matches.length - 1];
      // Verificar si tiene signo implícito (si empieza con -)
      if (amountMatch.startsWith('-')) {
        isPositive = false;
      } else if (amountMatch.startsWith('+')) {
        isPositive = true;
      }
      break;
    }
  }
  
  if (!amountMatch) {
    return null;
  }
  
  const date = normalizeDate(dateMatch[1]);
  
  // Detectar signo del monto antes de limpiarlo
  const hasPlusSign = amountMatch.includes('+') || amountMatch.startsWith('+');
  const hasMinusSign = amountMatch.includes('-') || amountMatch.startsWith('-');
  
  // Limpiar el monto
  let amountStr = amountMatch
    .replace(/\$/g, '')
    .replace(/\s+/g, '')
    .replace(/\+/g, '')  // Remover + para parseFloat
    .replace(/\-/g, '')  // Remover - para parseFloat (lo manejamos con isPositive)
    .replace(/\./g, (match: string, offset: number, string: string) => {
      // Si hay múltiples puntos, mantener solo el último como decimal
      const after = string.substring(offset + 1);
      return after.includes('.') ? '' : match;
    })
    .replace(',', '.');
  
  const amount = parseFloat(amountStr);
  
  if (isNaN(amount) || amount === 0) {
    console.warn(`Monto inválido o cero en línea: ${line.substring(0, 100)}`);
    return null;
  }
  
  // Validar que el monto sea razonable (no muy pequeño, probablemente error)
  if (Math.abs(amount) < 0.01) {
    console.warn(`Monto muy pequeño (${amount}) en línea: ${line.substring(0, 100)}`);
    return null;
  }
  
  // Determinar si es positivo basado en el signo encontrado
  if (hasPlusSign) {
    isPositive = true;
  } else if (hasMinusSign) {
    isPositive = false;
  }
  
  // Extraer descripción (todo excepto fecha y monto)
  let description = line
    .replace(dateMatch[0], '')
    .replace(amountMatch, '')
    .trim();
  
  // Limpiar patrones comunes de metadatos que no son parte de la descripción real
  description = description
    .replace(/Fecha\s+hora\s*:?\s*\d{1,2}:\d{2}:\d{2}/gi, '')  // Remover "Fecha hora: HH:MM:SS"
    .replace(/Fecha\s+y\s+hora\s*:?\s*\d{1,2}:\d{2}:\d{2}/gi, '')  // Remover "Fecha y hora: HH:MM:SS"
    .replace(/Fecha\s+generaci[oó]n\s*:?\s*\d{1,2}:\d{2}:\d{2}/gi, '')  // Remover "Fecha generación: HH:MM:SS"
    .replace(/Fecha\s+de\s+generaci[oó]n\s*:?\s*\d{1,2}:\d{2}:\d{2}/gi, '')  // Remover "Fecha de generación: HH:MM:SS"
    .replace(/Comisi[oó]n\s+\d+\.?\d*\s*Fecha/gi, '')  // Remover "Comisión X.XX Fecha"
    .replace(/^\s*Fecha\s*/gi, '')  // Remover "Fecha" al inicio
    .replace(/\s+/g, ' ')  // Normalizar espacios
    .trim();
  
  // Si después de limpiar solo quedan números o caracteres especiales, intentar extraer mejor
  if (!description || description.length < 3 || /^[\d\s\-:\.]+$/.test(description)) {
    // Intentar extraer la descripción de otra manera - buscar texto antes de la fecha
    const beforeDate = line.substring(0, line.indexOf(dateMatch[0])).trim();
    if (beforeDate && beforeDate.length >= 3 && !/^[\d\s\-:\.]+$/.test(beforeDate)) {
      description = beforeDate;
    } else {
      console.warn(`Descripción muy corta o inválida en línea: ${line.substring(0, 100)}`);
      return null;
    }
  }
  
  description = description.slice(0, 500);  // Limitar longitud
  
  // Log detallado para debugging
  console.log(`Transacción extraída: ${date} | ${description.substring(0, 60)} | ${isPositive ? '+' : '-'}$${amount.toFixed(2)} | amountMatch="${amountMatch}" | amountStr="${amountStr}"`);
  
  return {
    date,
    description,
    amount: amount.toString(),
    isPositive,
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

function detectIncome(description: string, amount: number, hasPlusSign: boolean = false): boolean {
  const desc = description.toLowerCase();
  
  // Si tiene signo + explícito, es definitivamente un ingreso
  if (hasPlusSign || description.includes('+$') || description.includes('+ $') || description.includes('+')) {
    console.log(`Ingreso detectado por signo + en: ${description.substring(0, 50)}`);
    return true;
  }
  
  // Keywords más completas para detectar ingresos
  const incomeKeywords = [
    'deposito', 'depósito', 'depositos', 'depósitos',
    'transferencia recibida', 'transferencia recib', 'transfer recibida', 'transfer recib',
    'abono', 'abonos', 'abono -', 'abono transferencia', 'abono transfer',
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
  
  // Si el monto es muy grande y positivo, probablemente es un ingreso
  if (amount > 1000) {
    console.log(`Posible ingreso por monto grande (${amount}) en: ${description.substring(0, 50)}`);
    // Pero no asumir automáticamente, solo si no hay keywords de gasto
    const expenseKeywords = ['cargo', 'cargos', 'retiro', 'retiros', 'pago', 'pagos', 'compra', 'compras', 'gasto', 'gastos', 'debito', 'débito'];
    const hasExpenseKeyword = expenseKeywords.some(kw => desc.includes(kw));
    if (!hasExpenseKeyword) {
      return true;
    }
  }
  
  return false;
}

function normalizeDate(dateStr: string): string {
  // Primero intentar detectar formato con mes en texto (ej: "01/sep/2025" o "1 oct 2025")
  const textMonthPattern = /(\d{1,2})[\/\s]+(\w{3,})[\/\s]+(\d{2,4})/i;
  const textMonthMatch = dateStr.match(textMonthPattern);
  
  if (textMonthMatch) {
    const [, day, monthText, year] = textMonthMatch;
    const monthNames: Record<string, string> = {
      'ene': '01', 'jan': '01', 'enero': '01', 'january': '01',
      'feb': '02', 'febrero': '02', 'february': '02',
      'mar': '03', 'marzo': '03', 'march': '03',
      'abr': '04', 'apr': '04', 'abril': '04', 'april': '04',
      'may': '05', 'mayo': '05',
      'jun': '06', 'junio': '06', 'june': '06',
      'jul': '07', 'julio': '07', 'july': '07',
      'ago': '08', 'aug': '08', 'agosto': '08', 'august': '08',
      'sep': '09', 'septiembre': '09', 'september': '09',
      'oct': '10', 'octubre': '10', 'october': '10',
      'nov': '11', 'noviembre': '11', 'november': '11',
      'dic': '12', 'dec': '12', 'diciembre': '12', 'december': '12',
    };
    
    const monthLower = monthText.toLowerCase();
    if (monthNames[monthLower]) {
      const normalizedYear = year.length === 2 ? '20' + year : year;
      const normalized = `${normalizedYear}-${monthNames[monthLower]}-${day.padStart(2, '0')}`;
      console.log(`Fecha normalizada (texto): ${dateStr} -> ${normalized}`);
      return normalized;
    }
  }
  
  // Formato numérico estándar (DD/MM/YYYY o DD-MM-YYYY)
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) {
    console.warn(`Fecha inválida: ${dateStr}`);
    return new Date().toISOString().split('T')[0];
  }
  
  let [day, month, year] = parts;
  
  if (year.length === 2) {
    year = '20' + year;
  }
  
  const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  console.log(`Fecha normalizada (numérico): ${dateStr} -> ${normalized}`);
  return normalized;
}

// Funciones de categorización básica movidas a ai-service.ts
// Se mantienen aquí solo como fallback si la IA no está disponible
