/**
 * Servicio de DeepSeek API para clasificación inteligente de transacciones
 */

declare const process: {
  env: {
    DEEPSEEK_API_KEY?: string;
  };
};

export interface TransactionClassification {
  category: string;
  merchant: string;
  subcategory?: string;
  confidence: number;
  tags?: string[];
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = (typeof process !== 'undefined' && process.env?.DEEPSEEK_API_KEY) || '';

// Categorías principales que queremos detectar (expandidas para mejor clasificación)
const CATEGORIES = [
  // Ingresos
  'Salario',
  'Freelance',
  'Transferencias',
  'Inversiones',
  'Devoluciones',
  'Cashback',
  
  // Gastos esenciales
  'Alimentación',
  'Restaurantes',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Salud',
  'Educación',
  
  // Compras
  'Amazon',
  'MercadoLibre',
  'Compras Online',
  'Ropa',
  'Tecnología',
  'Electrónica',
  'Hogar',
  
  // Entretenimiento y estilo de vida
  'Entretenimiento',
  'Streaming',
  'Gimnasio',
  'Viajes',
  'Turismo',
  
  // Finanzas
  'Tarjetas',
  'Comisiones',
  'Préstamos',
  
  // General (fallback)
  'General'
];

/**
 * Clasifica una transacción usando DeepSeek API
 */
export async function classifyTransaction(
  description: string,
  amount: number,
  date?: string
): Promise<TransactionClassification> {
  if (!DEEPSEEK_API_KEY) {
    console.warn('DEEPSEEK_API_KEY no configurada, usando clasificación básica');
    return fallbackClassification(description, amount);
  }

  try {
    const prompt = buildClassificationPrompt(description, amount, date);
    
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
            content: `Eres un experto en análisis financiero. Clasifica transacciones bancarias en español de manera precisa y consistente.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error en DeepSeek API:', error);
      return fallbackClassification(description, amount);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return fallbackClassification(description, amount);
    }

    return parseAIResponse(content, description);
  } catch (error) {
    console.error('Error llamando a DeepSeek API:', error);
    return fallbackClassification(description, amount);
  }
}

/**
 * Clasifica múltiples transacciones en batch (más eficiente)
 */
export async function classifyTransactionsBatch(
  transactions: Array<{ description: string; amount: number; date?: string }>
): Promise<TransactionClassification[]> {
  if (!DEEPSEEK_API_KEY || transactions.length === 0) {
    return transactions.map(t => fallbackClassification(t.description, t.amount));
  }

  // Procesar en lotes de 10 para evitar límites de tokens
  const batchSize = 10;
  const results: TransactionClassification[] = [];

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    try {
      const batchPrompt = buildBatchClassificationPrompt(batch);
      
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
              content: `Eres un experto en análisis financiero. Clasifica múltiples transacciones bancarias en español de manera precisa y consistente. Responde SOLO con JSON válido.`
            },
            {
              role: 'user',
              content: batchPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
          const parsed = parseBatchAIResponse(content, batch);
          results.push(...parsed);
          continue;
        }
      }
    } catch (error) {
      console.error('Error en batch classification:', error);
    }

    // Fallback a clasificación individual si falla el batch
    for (const transaction of batch) {
      const classification = await classifyTransaction(
        transaction.description,
        transaction.amount,
        transaction.date
      );
      results.push(classification);
      
      // Pequeña pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

function buildClassificationPrompt(description: string, amount: number, date?: string): string {
  return `Analiza esta transacción bancaria y clasifícala:

Descripción: "${description}"
Monto: ${amount > 0 ? '+' : ''}${amount.toFixed(2)}
${date ? `Fecha: ${date}` : ''}

Categorías disponibles: ${CATEGORIES.join(', ')}

Responde SOLO con un JSON válido en este formato exacto:
{
  "category": "nombre de la categoría",
  "merchant": "nombre del comercio extraído",
  "subcategory": "subcategoría opcional",
  "confidence": 0.95,
  "tags": ["tag1", "tag2"]
}

Reglas importantes:
- Si menciona "AMAZON", "AMZN", "amazon" → categoría "Amazon"
- Si menciona "MERCADOLIBRE", "MERCADO LIBRE", "ML" → categoría "MercadoLibre"
- Si menciona supermercados, comida, alimentos → categoría "Alimentación"
- Si menciona restaurantes, comida rápida → categoría "Restaurantes"
- Si menciona "NETFLIX", "SPOTIFY", "DISNEY", "HBO" → categoría "Streaming"
- Si menciona "UBER", "DIDI", "CABIFY", "RAPPI" → categoría "Transporte"
- Si menciona "STRIPE", "PAYPAL", "MERCADO PAGO" → categoría "Transferencias"
- Si el monto es positivo y grande (>5000), probablemente es "Salario", "Freelance" o "Transferencias"
- Si menciona "CASHBACK" o "DEVOLUCIÓN" → categoría correspondiente
- Si menciona suscripciones recurrentes → categoría específica (Streaming, Gimnasio, etc.)
- Extrae el nombre del comercio de la descripción (limpio, sin códigos)
- confidence debe ser entre 0 y 1
- Usa subcategorías cuando sea relevante (ej: "Restaurantes - Comida Rápida")`;
}

function buildBatchClassificationPrompt(
  transactions: Array<{ description: string; amount: number; date?: string }>
): string {
  const transactionsList = transactions.map((t, idx) => 
    `${idx + 1}. "${t.description}" - ${t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}`
  ).join('\n');

  return `Clasifica estas ${transactions.length} transacciones bancarias:

${transactionsList}

Categorías disponibles: ${CATEGORIES.join(', ')}

Responde SOLO con un JSON array válido en este formato:
[
  {
    "category": "nombre de la categoría",
    "merchant": "nombre del comercio",
    "subcategory": "subcategoría opcional",
    "confidence": 0.95,
    "tags": ["tag1"]
  },
  ...
]

Aplica las mismas reglas de clasificación para cada transacción.`;
}

function parseAIResponse(content: string, originalDescription: string): TransactionClassification {
  try {
    // Intentar extraer JSON del contenido
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category || 'General',
        merchant: parsed.merchant || extractMerchant(originalDescription),
        subcategory: parsed.subcategory,
        confidence: parsed.confidence || 0.8,
        tags: parsed.tags || [],
      };
    }
  } catch (error) {
    console.error('Error parseando respuesta de IA:', error);
  }

  return fallbackClassification(originalDescription, 0);
}

function parseBatchAIResponse(
  content: string,
  originalTransactions: Array<{ description: string; amount: number }>
): TransactionClassification[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length === originalTransactions.length) {
        return parsed.map((item: any, idx: number) => ({
          category: item.category || 'General',
          merchant: item.merchant || extractMerchant(originalTransactions[idx].description),
          subcategory: item.subcategory,
          confidence: item.confidence || 0.8,
          tags: item.tags || [],
        }));
      }
    }
  } catch (error) {
    console.error('Error parseando respuesta batch de IA:', error);
  }

  // Fallback: clasificar individualmente
  return originalTransactions.map(t => fallbackClassification(t.description, t.amount));
}

function fallbackClassification(description: string, amount: number): TransactionClassification {
  const desc = description.toLowerCase();
  
  // Detección mejorada de categorías
  let category = 'General';
  let merchant = extractMerchant(description);
  let confidence = 0.7;

  // Amazon
  if (desc.includes('amazon') || desc.includes('amzn')) {
    category = 'Amazon';
    confidence = 0.95;
  }
  // MercadoLibre
  else if (desc.includes('mercadolibre') || desc.includes('mercado libre') || desc.includes(' ml ') || desc.startsWith('ml ')) {
    category = 'MercadoLibre';
    confidence = 0.95;
  }
  // Alimentación
  else if (
    desc.includes('mercadona') || desc.includes('carrefour') || 
    desc.includes('lidl') || desc.includes('dia') || 
    desc.includes('eroski') || desc.includes('alcampo') ||
    desc.includes('supermercado') || desc.includes('super') ||
    desc.includes('hipercor') || desc.includes('el corte inglés')
  ) {
    category = 'Alimentación';
    confidence = 0.9;
  }
  // Restaurantes
  else if (
    desc.includes('restaurante') || desc.includes('vips') ||
    desc.includes('mcdonalds') || desc.includes('burger') ||
    desc.includes('pizza') || desc.includes('cafe') ||
    desc.includes('bar') || desc.includes('comida')
  ) {
    category = 'Restaurantes';
    confidence = 0.85;
  }
  // Transporte
  else if (
    desc.includes('uber') || desc.includes('cabify') ||
    desc.includes('gasolinera') || desc.includes('repsol') ||
    desc.includes('cepsa') || desc.includes('metro') ||
    desc.includes('renfe') || desc.includes('taxi')
  ) {
    category = 'Transporte';
    confidence = 0.85;
  }
  // Compras Online
  else if (
    desc.includes('zara') || desc.includes('h&m') ||
    desc.includes('corte inglés') || desc.includes('fnac') ||
    desc.includes('media markt') || desc.includes('el corte')
  ) {
    category = 'Compras Online';
    confidence = 0.8;
  }
  // Salario
  else if (
    (amount > 1000 && desc.includes('nomina')) ||
    desc.includes('salario') || desc.includes('sueldo') ||
    desc.includes('paga') || desc.includes('nómina')
  ) {
    category = 'Salario';
    confidence = 0.9;
  }
  // Salud
  else if (
    desc.includes('farmacia') || desc.includes('hospital') ||
    desc.includes('medico') || desc.includes('clinica') ||
    desc.includes('dentista') || desc.includes('farmacia')
  ) {
    category = 'Salud';
    confidence = 0.85;
  }
  // Vivienda
  else if (
    desc.includes('alquiler') || desc.includes('hipoteca') ||
    desc.includes('luz') || desc.includes('agua') ||
    desc.includes('gas') || desc.includes('internet') ||
    desc.includes('electricidad')
  ) {
    category = 'Vivienda';
    confidence = 0.9;
  }

  return {
    category,
    merchant,
    confidence,
    tags: [],
  };
}

function extractMerchant(description: string): string {
  // Extraer las primeras palabras significativas (excluyendo números y fechas)
  const words = description
    .split(/[\s\-_]+/)
    .filter(w => w.length > 2 && !/^\d+$/.test(w))
    .slice(0, 3);
  
  return words.join(' ') || 'Desconocido';
}

