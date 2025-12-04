import { type User, type InsertUser, type Transaction, type InsertTransaction } from "@shared/schema";
import { randomUUID } from "crypto";
import PocketBase from "pocketbase";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllTransactions(): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  createTransactions(transactions: InsertTransaction[]): Promise<{ saved: Transaction[]; duplicates: number; skipped: number }>;
  updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
  deleteAllTransactions(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private transactionsMap: Map<number, Transaction>;
  private nextTransactionId: number;

  constructor() {
    this.users = new Map();
    this.transactionsMap = new Map();
    this.nextTransactionId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactionsMap.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactionsMap.get(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.nextTransactionId++;
    const newTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: new Date(),
    };
    this.transactionsMap.set(id, newTransaction);
    return newTransaction;
  }

  async createTransactions(transactionsToInsert: InsertTransaction[]): Promise<{ saved: Transaction[]; duplicates: number; skipped: number }> {
    // Para MemStorage, simplemente insertamos todas (no hay persistencia, así que no hay duplicados reales)
    const results: Transaction[] = [];
    for (const transaction of transactionsToInsert) {
      const result = await this.createTransaction(transaction);
      results.push(result);
    }
    return { saved: results, duplicates: 0, skipped: 0 };
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction> {
    const existing = this.transactionsMap.get(id);
    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }
    const updated: Transaction = {
      ...existing,
      ...updates,
    };
    this.transactionsMap.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: number): Promise<void> {
    this.transactionsMap.delete(id);
  }

  async deleteAllTransactions(): Promise<void> {
    this.transactionsMap.clear();
    this.nextTransactionId = 1;
  }
}

export class PocketBaseStorage implements IStorage {
  private pb: PocketBase;
  private isAuthenticated: boolean = false;
  private getAllTransactionsPromise: Promise<Transaction[]> | null = null; // Lock para evitar llamadas concurrentes

  constructor() {
    const baseUrl = process.env.POCKETBASE_URL || "";
    if (!baseUrl) {
      throw new Error("POCKETBASE_URL no está configurada");
    }

    // Asegurar que la URL no tenga /_/ al final para el SDK
    let apiUrl = baseUrl.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3); // Remover "/_/"
    }
    if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }

    this.pb = new PocketBase(apiUrl);
  }

  private async authenticateAdmin(): Promise<void> {
    if (this.isAuthenticated && this.pb.authStore.isValid) return;

    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error("⚠️  POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD no están configuradas. Las operaciones pueden fallar si las colecciones requieren autenticación.");
      return;
    }

    try {
      // Configurar para ignorar certificados SSL si es necesario
      if (typeof process !== "undefined" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "1") {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }

      // Usar _superusers para PocketBase v0.23+
      await this.pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
      this.isAuthenticated = true;
      console.log("✓ Autenticación exitosa como admin de PocketBase");
    } catch (error: any) {
      console.error(`❌ Error de autenticación: ${error.message}`);
      console.error(`Verifica que las credenciales sean correctas y que el admin exista en PocketBase.`);
      this.isAuthenticated = false;
    }
  }

  // Método helper para asegurar autenticación antes de operaciones
  private async ensureAuth(): Promise<void> {
    await this.authenticateAdmin();
    if (!this.isAuthenticated && !this.pb.authStore.isValid) {
      console.warn("⚠️  No autenticado. Algunas operaciones pueden fallar.");
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      await this.ensureAuth();
      const data = await this.pb.collection('users').getOne(id);
      return {
        id: data.id,
        username: data.username || data.email || '',
        password: '', // No devolver la contraseña
      };
    } catch (error: any) {
      if (error.status === 404 || error.message.includes("Not found")) {
        return undefined;
      }
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      await this.ensureAuth();
      const records = await this.pb.collection('users').getList(1, 1, {
        filter: `username = "${username}"`,
      });
      if (records.items && records.items.length > 0) {
        const item = records.items[0];
        return {
          id: item.id,
          username: item.username || item.email || '',
          password: '', // No devolver la contraseña
        };
      }
      return undefined;
    } catch (error: any) {
      if (error.status === 404 || error.message.includes("Not found")) {
        return undefined;
      }
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureAuth();
    const data = await this.pb.collection('users').create(insertUser);
    return {
      id: data.id,
      username: data.username || data.email || '',
      password: '', // No devolver la contraseña
    };
  }

  async getAllTransactions(): Promise<Transaction[]> {
    // Si ya hay una llamada en progreso, esperar a que termine
    if (this.getAllTransactionsPromise) {
      return this.getAllTransactionsPromise;
    }

    // Crear la promesa y guardarla como lock
    this.getAllTransactionsPromise = this._getAllTransactionsInternal();
    
    try {
      const result = await this.getAllTransactionsPromise;
      return result;
    } finally {
      // Limpiar el lock después de completar
      this.getAllTransactionsPromise = null;
    }
  }

  private async _getAllTransactionsInternal(): Promise<Transaction[]> {
    await this.ensureAuth();
    
    // Verificar estado de autenticación
    const isAuthValid = this.isAuthenticated && this.pb.authStore.isValid;
    console.log(`[getAllTransactions] Estado de autenticación: ${isAuthValid ? '✓ Autenticado' : '✗ No autenticado'}`);
    
    // Intentar obtener un conteo rápido de transacciones para diagnóstico
    try {
      const testResult = await this.pb.collection('transactions').getList(1, 1);
      console.log(`[getAllTransactions] Test de conexión: ${testResult.totalItems || 0} transacciones totales según PocketBase`);
    } catch (testError: any) {
      console.warn(`[getAllTransactions] Error en test de conexión:`, testError.message);
    }
    
    // Helper para detectar errores de autocancelación
    const isAutoCancelledError = (error: any): boolean => {
      return error?.message?.includes('autocancelled') || 
             error?.message?.includes('autocancel');
    };

    // Helper para esperar un poco antes de reintentar
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Try different sort options, falling back if one fails
    let records: any[] = [];
    let lastError: any = null;
    let strategySuccess = false;
    
    // Usar getList con paginación directamente - getFullList puede devolver solo metadata
    // Intentar con diferentes estrategias de ordenamiento usando getList
    const strategies = [
      { name: '-id', sort: '-id' },
      { name: 'id', sort: 'id' },
      { name: '-created', sort: '-created' },
      { name: 'no sort', sort: '' },
    ];

    for (const strategy of strategies) {
      try {
        await wait(100); // Pequeño delay para evitar autocancelación
        records = [];
        let page = 1;
        let hasMore = true;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 3;

        while (hasMore && consecutiveErrors < maxConsecutiveErrors) {
          try {
            await wait(50); // Delay entre páginas
            // Intentar obtener sin fields primero (PocketBase puede tener problemas con fields)
            let result;
            try {
              result = await this.pb.collection('transactions').getList(page, 500, {
                sort: strategy.sort || undefined,
                expand: '',
              });
              
              // Si solo viene metadata, intentar con fields
              if (result.items && result.items.length > 0) {
                const firstItem = result.items[0];
                const hasDataFields = firstItem.date !== undefined || firstItem.description !== undefined || firstItem.amount !== undefined;
                if (!hasDataFields) {
                  console.warn(`[getAllTransactions] getList sin fields devolvió solo metadata, intentando con fields...`);
                  result = await this.pb.collection('transactions').getList(page, 500, {
                    sort: strategy.sort || undefined,
                    fields: 'id,date,description,amount,type,category,merchant,currency,bank,id_number,created,updated',
                    expand: '',
                  });
                }
              }
            } catch (fieldsError: any) {
              // Si falla con fields, intentar sin fields
              console.warn(`[getAllTransactions] Error con fields, intentando sin fields:`, fieldsError.message);
              result = await this.pb.collection('transactions').getList(page, 500, {
                sort: strategy.sort || undefined,
                expand: '',
              });
            }
            
            if (result.items && result.items.length > 0) {
              // Verificar que los items tengan los campos de datos
              const firstItem = result.items[0];
              const hasDataFields = firstItem.date !== undefined || firstItem.description !== undefined || firstItem.amount !== undefined || firstItem.type !== undefined;
              const onlyMetadata = firstItem.collectionId && firstItem.collectionName && firstItem.id && !hasDataFields;
              
              if (onlyMetadata) {
                console.warn(`[getAllTransactions] Los items solo tienen metadata (página ${page}), obteniendo campos individualmente...`);
                console.log(`[getAllTransactions] Primer item (solo metadata):`, JSON.stringify(firstItem));
                // Si solo tiene metadata, obtener cada registro individualmente
                const expandedItems = await Promise.all(
                  result.items.map(async (item: any, idx: number) => {
                    try {
                      // Intentar obtener con campos específicos usando la API REST directamente
                      let apiUrl = process.env.POCKETBASE_URL?.trim() || '';
                      // Asegurar que la URL no tenga /_/ para la API REST
                      if (apiUrl.endsWith('/_/')) {
                        apiUrl = apiUrl.slice(0, -3);
                      }
                      if (!apiUrl.endsWith('/')) {
                        apiUrl += '/';
                      }
                      const token = this.pb.authStore.token;
                      
                      if (apiUrl && token) {
                        try {
                          const response = await fetch(`${apiUrl}api/collections/transactions/records/${item.id}?fields=id,date,description,amount,type,category,merchant,currency,bank,id_number,created,updated`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                          });
                          
                          if (response.ok) {
                            const fullRecord = await response.json();
                            if (idx === 0) {
                              console.log(`[getAllTransactions] Primer registro expandido (API REST con fields):`, JSON.stringify(fullRecord));
                            }
                            // Verificar que tiene campos de datos
                            if (fullRecord.date || fullRecord.description || fullRecord.amount !== undefined) {
                              return fullRecord;
                            } else {
                              console.warn(`[getAllTransactions] API REST con fields devolvió solo metadata, intentando sin fields...`);
                              // Intentar sin fields parameter
                              const response2 = await fetch(`${apiUrl}api/collections/transactions/records/${item.id}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              });
                              if (response2.ok) {
                                const fullRecord2 = await response2.json();
                                if (idx === 0) {
                                  console.log(`[getAllTransactions] Registro sin fields:`, JSON.stringify(fullRecord2));
                                }
                                return fullRecord2;
                              }
                            }
                          }
                        } catch (fetchError: any) {
                          console.warn(`[getAllTransactions] Error en fetch API REST:`, fetchError.message);
                        }
                      }
                      
                      // Fallback al método SDK con fields explícitos
                      try {
                        const fullRecord = await this.pb.collection('transactions').getOne(item.id, {
                          fields: 'id,date,description,amount,type,category,merchant,currency,bank,id_number,created,updated',
                        });
                        if (idx === 0) {
                          console.log(`[getAllTransactions] Primer registro expandido (SDK):`, JSON.stringify(fullRecord));
                        }
                        // Si el SDK también devuelve solo metadata, intentar con API REST sin fields
                        if (!fullRecord.date && !fullRecord.description && fullRecord.amount === undefined) {
                          console.warn(`[getAllTransactions] SDK también devolvió solo metadata, intentando API REST sin fields...`);
                          if (apiUrl && token) {
                            const response2 = await fetch(`${apiUrl}api/collections/transactions/records/${item.id}`, {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                              },
                            });
                            if (response2.ok) {
                              const fullRecord2 = await response2.json();
                              if (idx === 0) {
                                console.log(`[getAllTransactions] Registro obtenido sin fields:`, JSON.stringify(fullRecord2));
                              }
                              return fullRecord2;
                            }
                          }
                        }
                        return fullRecord;
                      } catch (sdkError: any) {
                        console.warn(`[getAllTransactions] Error con SDK getOne:`, sdkError.message);
                        // Último intento: API REST sin fields
                        if (apiUrl && token) {
                          const response3 = await fetch(`${apiUrl}api/collections/transactions/records/${item.id}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                          });
                          if (response3.ok) {
                            return await response3.json();
                          }
                        }
                        throw sdkError;
                      }
                    } catch (e: any) {
                      console.warn(`[getAllTransactions] Error obteniendo registro ${item.id}:`, e.message);
                      console.warn(`[getAllTransactions] Stack:`, e.stack);
                      return item; // Devolver el item original si falla
                    }
                  })
                );
                records.push(...expandedItems);
              } else {
                records.push(...result.items);
              }
              hasMore = result.items.length === 500;
              page++;
              consecutiveErrors = 0;
            } else {
              hasMore = false;
            }
          } catch (pageError: any) {
            consecutiveErrors++;
            if (isAutoCancelledError(pageError)) {
              console.warn(`Página ${page} autocancelada con estrategia "${strategy.name}", reintentando...`);
              await wait(200);
              continue;
            }
            if (consecutiveErrors >= maxConsecutiveErrors) {
              throw pageError; // Lanzar error para que se intente la siguiente estrategia
            }
            await wait(100);
          }
        }

        if (records && records.length > 0) {
          console.log(`✓ Estrategia "${strategy.name}" exitosa: ${records.length} registros obtenidos`);
          strategySuccess = true;
          break; // Éxito, salir del loop
        } else {
          console.log(`⚠ Estrategia "${strategy.name}" devolvió 0 registros, intentando siguiente...`);
          // Continuar con la siguiente estrategia si devuelve 0 registros
          continue;
        }
      } catch (error: any) {
        lastError = error;
        if (isAutoCancelledError(error)) {
          console.warn(`Solicitud autocancelada con estrategia "${strategy.name}", intentando siguiente...`);
          await wait(200); // Esperar un poco más antes del siguiente intento
          continue;
        }
        console.warn(`Error con estrategia "${strategy.name}":`, error.message);
        // Si no es autocancelación, continuar con la siguiente estrategia
      }
    }

    // Si todas las estrategias fallaron
    if (!strategySuccess || records.length === 0) {
      console.warn(`⚠ No se pudieron obtener transacciones después de intentar todas las estrategias. Último error: ${lastError?.message || 'N/A'}`);
    }
    
    // Log para diagnóstico
    console.log(`[getAllTransactions] Registros obtenidos antes de procesar: ${records.length}`);
    if (records.length > 0) {
      console.log(`[getAllTransactions] Ejemplo de primer registro:`, JSON.stringify(records[0], null, 2));
    }
    
    // Sort records by date in memory if we couldn't sort on the server
    // Only sort if we have records and they don't have a created field (meaning server-side sort failed)
    if (records.length > 0) {
      const hasCreatedField = records.some(r => r.created);
      if (!hasCreatedField) {
        records.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
      }
    }
    
    // Filtrar y mapear registros
    const filtered = records.filter((item: any) => {
      // Filtrar registros inválidos - ser más permisivo
      if (!item || typeof item !== 'object') {
        return false;
      }
      // Aceptar si tiene al menos uno de estos campos
      const hasDate = item.date !== undefined && item.date !== null && String(item.date).trim() !== '';
      const hasDescription = item.description !== undefined && item.description !== null && String(item.description).trim() !== '';
      const hasAmount = item.amount !== undefined && item.amount !== null;
      
      return hasDate || hasDescription || hasAmount;
    });
    
    console.log(`[getAllTransactions] Registros después del filtro: ${filtered.length}`);
    
    const mapped = filtered.map((item: any, index: number) => ({
      id: item.id_number || this.hashStringToNumber(item.id) || (index + 1),
      date: String(item.date || '').trim() || new Date().toISOString().split('T')[0],
      description: String(item.description || '').trim() || 'Sin descripción',
      amount: item.amount !== undefined && item.amount !== null ? String(item.amount) : '0',
      type: String(item.type || 'expense').trim(),
      category: String(item.category || 'Sin categoría').trim(),
      merchant: String(item.merchant || '').trim(),
      currency: String(item.currency || 'MXN').trim().toUpperCase(),
      bank: item.bank && String(item.bank).trim() ? String(item.bank).trim() : undefined, // Solo incluir si tiene valor válido
      createdAt: item.created ? new Date(item.created) : new Date(),
    }));
    
    console.log(`[getAllTransactions] Registros finales mapeados: ${mapped.length}`);
    if (mapped.length > 0) {
      console.log(`[getAllTransactions] Ejemplo de primer registro mapeado:`, JSON.stringify(mapped[0], null, 2));
    }
    
    return mapped;
  }

  private hashStringToNumber(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      await this.ensureAuth();
      const records = await this.pb.collection('transactions').getList(1, 1, {
        filter: `id_number = ${id}`,
      });
      if (records.items && records.items.length > 0) {
        const item = records.items[0];
        return {
          id: item.id_number || this.hashStringToNumber(item.id) || id,
          date: item.date,
          description: item.description,
          amount: item.amount,
          type: item.type,
          category: item.category,
          merchant: item.merchant,
          currency: item.currency || "MXN",
          createdAt: item.created ? new Date(item.created) : new Date(),
        };
      }
      return undefined;
    } catch (error: any) {
      if (error.status === 404 || error.message.includes("Not found")) {
        return undefined;
      }
      throw error;
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    await this.ensureAuth();
    
    // Obtener el máximo id_number para generar el siguiente
    let nextId = 1;
    try {
      const existingRecords = await this.pb.collection('transactions').getList(1, 1, {
        sort: '-id_number',
      });
      if (existingRecords.items && existingRecords.items.length > 0 && existingRecords.items[0].id_number) {
        nextId = existingRecords.items[0].id_number + 1;
      }
    } catch (error) {
      // Si falla, empezamos desde 1
    }

    // Validar y sanitizar datos según reglas de PocketBase
    // SIEMPRE validar que los datos existen antes de mapearlos
    // Sanitizar strings con .trim() antes de guardar
    // Usar valores por defecto para campos opcionales
    const bankValue = (transaction as any).bank ? String((transaction as any).bank).trim() : '';
    
    // Validar que el banco no esté vacío (ahora es obligatorio)
    if (!bankValue || bankValue === '') {
      throw new Error('El banco es obligatorio. Todas las transacciones deben tener un banco asignado.');
    }
    
    const dataToSave = {
      date: String(transaction.date || '').trim(),
      description: String(transaction.description || '').trim(),
      amount: String(transaction.amount || '0').trim(),
      type: String(transaction.type || 'expense').trim(),
      category: String(transaction.category || 'General').trim(),
      merchant: String(transaction.merchant || '').trim(),
      currency: String(transaction.currency || 'MXN').trim().toUpperCase(),
      bank: bankValue, // Banco obligatorio y sanitizado
      id_number: nextId,
    };
    
    // Validar que los campos requeridos no estén vacíos
    if (!dataToSave.date || !dataToSave.description || !dataToSave.amount) {
      throw new Error('Campos requeridos faltantes: date, description o amount');
    }
    
    console.log(`[createTransaction] Guardando transacción:`, JSON.stringify(dataToSave, null, 2));
    
    const data = await this.pb.collection('transactions').create(dataToSave);
    
    console.log(`[createTransaction] Transacción guardada, respuesta:`, JSON.stringify(data, null, 2));
    
    return {
      id: data.id_number || this.hashStringToNumber(data.id) || nextId,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category,
      merchant: data.merchant,
      currency: data.currency || "MXN",
      bank: (data as any).bank,
      createdAt: data.created ? new Date(data.created) : new Date(),
    };
  }

  async createTransactions(transactionsToInsert: InsertTransaction[]): Promise<{ saved: Transaction[]; duplicates: number; skipped: number }> {
    if (transactionsToInsert.length === 0) return { saved: [], duplicates: 0, skipped: 0 };

    // Obtener todas las transacciones existentes para detectar duplicados
    let existingTransactions: Transaction[] = [];
    try {
      existingTransactions = await this.getAllTransactions();
    } catch (error) {
      console.warn("No se pudieron obtener transacciones existentes para detección de duplicados:", error);
    }

    // Función para normalizar y comparar transacciones
    const normalizeTransaction = (t: InsertTransaction | Transaction) => {
      // Validar y sanitizar valores
      const date = (t.date ? String(t.date).trim() : '').toLowerCase();
      const description = (t.description ? String(t.description).trim() : '').toLowerCase().substring(0, 100);
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0);
      const type = String(t.type || 'expense').trim();
      const bank = String((t as any).bank || '').trim().toLowerCase();
      
      return {
        date: date || new Date().toISOString().split('T')[0],
        description: description || 'sin descripción',
        amount: Math.abs(amount || 0).toFixed(2), // Normalizar monto (sin signo, 2 decimales)
        type: type || 'expense',
        bank: bank || '',
      };
    };

    // Crear un Set de transacciones existentes normalizadas para búsqueda rápida
    const existingSet = new Set(
      existingTransactions.map(t => {
        const normalized = normalizeTransaction(t);
        return `${normalized.date}|${normalized.description}|${normalized.amount}|${normalized.type}|${normalized.bank}`;
      })
    );

    // Filtrar duplicados
    const uniqueTransactions: InsertTransaction[] = [];
    let duplicates = 0;

    for (const transaction of transactionsToInsert) {
      const normalized = normalizeTransaction(transaction);
      const key = `${normalized.date}|${normalized.description}|${normalized.amount}|${normalized.type}|${normalized.bank}`;
      
      if (existingSet.has(key)) {
        duplicates++;
        continue; // Omitir duplicado
      }

      // Agregar a la lista de únicos y al set para evitar duplicados dentro del mismo batch
      existingSet.add(key);
      uniqueTransactions.push(transaction);
    }

    // Insertar solo las transacciones únicas
    const results: Transaction[] = [];
    for (const transaction of uniqueTransactions) {
      try {
        const result = await this.createTransaction(transaction);
        results.push(result);
      } catch (error: any) {
        // Si falla la inserción (puede ser duplicado que se insertó entre la verificación y la inserción)
        console.warn("Error insertando transacción (puede ser duplicado):", error.message);
        duplicates++;
      }
    }

    return {
      saved: results,
      duplicates,
      skipped: transactionsToInsert.length - results.length - duplicates,
    };
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction> {
    await this.ensureAuth();
    
    // Primero buscar el registro por id_number
    const searchRecords = await this.pb.collection('transactions').getList(1, 1, {
      filter: `id_number = ${id}`,
    });
    if (!searchRecords.items || searchRecords.items.length === 0) {
      throw new Error(`Transaction ${id} not found`);
    }
    const recordId = searchRecords.items[0].id;
    
    const data = await this.pb.collection('transactions').update(recordId, updates);
    return {
      id: data.id_number || this.hashStringToNumber(data.id) || id,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category,
      merchant: data.merchant,
      currency: data.currency || "MXN",
      bank: (data as any).bank && String((data as any).bank).trim() ? String((data as any).bank).trim() : undefined,
      createdAt: data.created ? new Date(data.created) : new Date(),
    };
  }

  async deleteTransaction(id: number): Promise<void> {
    await this.ensureAuth();
    
    // Buscar el registro por id_number
    const searchRecords = await this.pb.collection('transactions').getList(1, 1, {
      filter: `id_number = ${id}`,
    });
    if (!searchRecords.items || searchRecords.items.length === 0) {
      throw new Error(`Transaction ${id} not found`);
    }
    const recordId = searchRecords.items[0].id;
    await this.pb.collection('transactions').delete(recordId);
  }

  async deleteAllTransactions(): Promise<void> {
    await this.ensureAuth();
    
    // Obtener todos los registros y eliminarlos
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const records = await this.pb.collection('transactions').getList(page, 500);
      const items = records.items || [];
      
      if (items.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const item of items) {
        await this.pb.collection('transactions').delete(item.id);
      }
      
      hasMore = items.length === 500;
      page++;
    }
  }
}

export const storage = process.env.POCKETBASE_URL 
  ? new PocketBaseStorage() 
  : new MemStorage();
