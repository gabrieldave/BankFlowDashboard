import type { InsertTransaction } from "@shared/schema";
import { classifyTransaction, classifyTransactionsBatch } from "./ai-service";

let pdfParse: any;

async function getPdfParser() {
  if (!pdfParse) {
    const pdfParseModule = await import("pdf-parse");
    // pdf-parse puede exportar de diferentes formas
    pdfParse = (pdfParseModule as any).default || pdfParseModule;
  }
  return pdfParse;
}

export async function parseCSV(content: string): Promise<InsertTransaction[]> {
  const lines = content.trim().split('\n');
  const rawTransactions: Array<{ date: string; description: string; amount: number }> = [];
  
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
    };
  });
  
  return transactions;
}

export async function parsePDF(buffer: Buffer): Promise<InsertTransaction[]> {
  try {
    console.log('Iniciando procesamiento de PDF...');
    const parser = await getPdfParser();
    const data = await parser(buffer);
    const text = data.text;
    
    console.log(`PDF extraído: ${text.length} caracteres`);
    
    if (!text || text.trim().length === 0) {
      throw new Error('El PDF no contiene texto legible. Puede ser un PDF escaneado o protegido.');
    }
    
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
      const altTransactions = extractTransactionsAlternative(text);
      if (altTransactions.length > 0) {
        console.log(`Encontradas ${altTransactions.length} transacciones con método alternativo`);
        rawTransactions.push(...altTransactions);
      }
    }

    if (rawTransactions.length === 0) {
      throw new Error('No se encontraron transacciones en el PDF. Verifica que el archivo sea un estado de cuenta válido.');
    }

    // Clasificar todas las transacciones usando IA
    console.log('Clasificando transacciones con IA...');
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
      };
    });
    
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
  
  // Patrones más flexibles para montos
  const amountPatterns = [
    /([\-]?\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/,  // Formato estándar
    /([\-]?\d+[,\.]\d{2})/,                           // Formato simple
    /([\-]?\$\s*\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/, // Con símbolo $
    /([\-]?\d+\.\d{2})/,                              // Formato decimal
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
  
  // Limpiar el monto
  let amountStr = amountMatch
    .replace(/\$/g, '')
    .replace(/\s+/g, '')
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
  let description = line
    .replace(dateMatch[0], '')
    .replace(amountMatch, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  
  if (!description || description.length < 3) {
    return null;
  }
  
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
  const incomeKeywords = ['deposito', 'depósito', 'transferencia recibida', 'abono', 'nomina', 'nómina', 'salario', 'sueldo', 'pago recibido', 'ingreso'];
  
  // Si el monto es muy grande y positivo, probablemente es un ingreso
  if (amount > 1000 && !incomeKeywords.some(kw => desc.includes(kw))) {
    // Verificar si hay palabras de ingreso
    return incomeKeywords.some(kw => desc.includes(kw));
  }
  
  return incomeKeywords.some(kw => desc.includes(kw));
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
