import type { InsertTransaction } from "@shared/schema";
import { classifyTransactionsBatch } from "./ai-service";
import { detectCurrencyFromText } from "./currency-detector";

export async function parseCSV(content: string, bank?: string): Promise<InsertTransaction[]> {
  const lines = content.trim().split('\n');
  const rawTransactions: Array<{ date: string; description: string; amount: number }> = [];
  
  // Detectar moneda del contenido
  const detectedCurrency = detectCurrencyFromText(content);
  console.log(`[CSV Parser] Moneda detectada: ${detectedCurrency}`);
  
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
      bank: bank || undefined,
    };
  });
  
  return transactions;
}

export async function parsePDF(buffer: Buffer, bank?: string): Promise<InsertTransaction[]> {
  // SIEMPRE usar IA (DeepSeek Vision) para parsing - NO usar método tradicional
  const DEEPSEEK_API_KEY = (typeof process !== 'undefined' && process.env?.DEEPSEEK_API_KEY) || '';
  
  console.log(`[PDF Parser] Usando IA para parsing. API_KEY presente: ${DEEPSEEK_API_KEY ? 'SÍ (' + DEEPSEEK_API_KEY.substring(0, 10) + '...)' : 'NO'}`);
  
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY no configurada. El parsing de PDF requiere IA. Por favor configura DEEPSEEK_API_KEY en tu archivo .env');
  }
  
  try {
    console.log('Procesando PDF con DeepSeek Vision API (IA)...');
    const { parsePDFWithVision } = await import('./pdf-vision-service');
    const result = await parsePDFWithVision(buffer, bank);
    console.log(`[PDF Parser] IA exitosa, ${result.length} transacciones extraídas`);
    return result;
  } catch (visionError: any) {
    console.error('❌ [PDF Parser] Error procesando PDF con IA:', visionError.message);
    console.error('📋 [PDF Parser] Stack trace:', visionError.stack);
    throw new Error(`Error procesando PDF con IA: ${visionError.message}. Asegúrate de que DEEPSEEK_API_KEY esté configurada correctamente.`);
  }
}
