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
    const startTime = Date.now();
    console.log('🚀 [getAllTransactions] INICIANDO obtención de transacciones...');
    
    // Si ya hay una llamada en progreso, esperar a que termine (con timeout)
    if (this.getAllTransactionsPromise) {
      console.log('⏳ [getAllTransactions] Esperando que termine llamada anterior...');
      try {
        // Esperar máximo 60 segundos para que termine la llamada anterior
        const result = await Promise.race([
          this.getAllTransactionsPromise,
          new Promise<Transaction[]>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout esperando llamada anterior')), 60000)
          )
        ]);
        const duration = Date.now() - startTime;
        console.log(`✅ [getAllTransactions] COMPLETADO en ${duration}ms (esperó llamada anterior)`);
        return result;
      } catch (error: any) {
        // Si la llamada anterior falló o se colgó, limpiar el lock y continuar
        console.warn('⚠️  [getAllTransactions] Limpiando lock bloqueado:', error?.message || error);
        this.getAllTransactionsPromise = null;
      }
    }

    // Crear la promesa y guardarla como lock
    console.log('🔒 [getAllTransactions] Creando nueva llamada (lock activado)');
    this.getAllTransactionsPromise = this._getAllTransactionsInternal();
    
    try {
      // Agregar timeout global de 90 segundos para toda la operación
      const result = await Promise.race([
        this.getAllTransactionsPromise,
        new Promise<Transaction[]>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout obteniendo transacciones (90s)')), 90000)
        )
      ]);
      const duration = Date.now() - startTime;
      console.log(`✅ [getAllTransactions] COMPLETADO EXITOSAMENTE en ${duration}ms - ${result.length} transacciones obtenidas`);
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ [getAllTransactions] ERROR después de ${duration}ms:`, error.message);
      console.error(`❌ [getAllTransactions] Stack:`, error.stack);
      // Si hay error, devolver array vacío en lugar de fallar completamente
      return [];
    } finally {
      // SIEMPRE limpiar el lock después de completar (incluso si hay error)
      this.getAllTransactionsPromise = null;
      const duration = Date.now() - startTime;
      console.log(`🔓 [getAllTransactions] Lock liberado después de ${duration}ms`);
    }
  }

  private async _getAllTransactionsInternal(): Promise<Transaction[]> {
    const internalStartTime = Date.now();
    console.log('🔐 [getAllTransactions] Verificando autenticación...');
    await this.ensureAuth();
    
    // Verificar estado de autenticación
    const isAuthValid = this.isAuthenticated && this.pb.authStore.isValid;
    if (isAuthValid) {
      console.log('✅ [getAllTransactions] Estado de autenticación: ✓ Autenticado');
    } else {
      console.warn('⚠️  [getAllTransactions] Estado de autenticación: ✗ No autenticado');
    }
    
    // Intentar obtener un conteo rápido de transacciones para diagnóstico
    try {
      console.log('🔍 [getAllTransactions] Realizando test de conexión...');
      const testResult = await this.pb.collection('transactions').getList(1, 1);
      const totalItems = testResult.totalItems || 0;
      console.log(`📊 [getAllTransactions] Test de conexión exitoso: ${totalItems} transacciones totales según PocketBase`);
    } catch (testError: any) {
      console.warn(`⚠️  [getAllTransactions] Error en test de conexión:`, testError.message);
    }
    
    // Helper para detectar errores de autocancelación
    const isAutoCancelledError = (error: any): boolean => {
      return error?.message?.includes('autocancelled') || 
             error?.message?.includes('autocancel');
    };

    // Helper para esperar un poco antes de reintentar
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Helper para agregar timeout a operaciones de PocketBase
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout en ${operation} después de ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    };
    
    // Helper para crear AbortSignal con timeout (compatible con versiones antiguas de Node.js)
    const createTimeoutSignal = (timeoutMs: number): AbortSignal => {
      if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
        return AbortSignal.timeout(timeoutMs);
      }
      // Fallback para versiones antiguas de Node.js
      const controller = new AbortController();
      setTimeout(() => controller.abort(), timeoutMs);
      return controller.signal;
    };
    
    // Try different sort options, falling back if one fails
    let records: any[] = [];
    let lastError: any = null;
    let strategySuccess = false;
    
    // Usar getList con paginación directamente - getFullList puede devolver solo metadata
    // Intentar con diferentes estrategias de ordenamiento usando getList
    // Limitar a solo 2 estrategias para evitar loops largos
    const strategies = [
      { name: '-id', sort: '-id' },
      { name: 'no sort', sort: '' },
    ];

    console.log(`🔄 [getAllTransactions] Intentando ${strategies.length} estrategias de ordenamiento...`);

    for (const strategy of strategies) {
      try {
        console.log(`🔄 [getAllTransactions] Probando estrategia: "${strategy.name}"`);
        await wait(100); // Pequeño delay para evitar autocancelación
        records = [];
        let page = 1;
        let hasMore = true;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 3;
        const strategyStartTime = Date.now();

        while (hasMore && consecutiveErrors < maxConsecutiveErrors) {
          try {
            await wait(50); // Delay entre páginas
            
            // Agregar timeout de 15 segundos por página
            // Intentar obtener sin fields primero (PocketBase puede tener problemas con fields)
            let result;
            try {
              if (page === 1) {
                console.log(`📄 [getAllTransactions] Obteniendo página ${page} (estrategia: "${strategy.name}")...`);
              }
              result = await withTimeout(
                this.pb.collection('transactions').getList(page, 500, {
                  sort: strategy.sort || undefined,
                  expand: '',
                }),
                15000,
                `getList página ${page}`
              );
              
              // Si solo viene metadata, intentar con fields
              if (result.items && result.items.length > 0) {
                const firstItem = result.items[0];
                const hasDataFields = firstItem.date !== undefined || firstItem.description !== undefined || firstItem.amount !== undefined;
                if (!hasDataFields) {
                  console.warn(`⚠️  [getAllTransactions] Página ${page}: getList sin fields devolvió solo metadata, intentando con fields...`);
                  result = await withTimeout(
                    this.pb.collection('transactions').getList(page, 500, {
                      sort: strategy.sort || undefined,
                      fields: 'id,date,description,amount,type,category,merchant,currency,bank,id_number,created,updated',
                      expand: '',
                    }),
                    15000,
                    `getList página ${page} con fields`
                  );
                }
              }
            } catch (fieldsError: any) {
              // Si falla con fields, intentar sin fields
              console.warn(`⚠️  [getAllTransactions] Página ${page}: Error con fields, intentando sin fields:`, fieldsError.message);
              result = await withTimeout(
                this.pb.collection('transactions').getList(page, 500, {
                  sort: strategy.sort || undefined,
                  expand: '',
                }),
                15000,
                `getList página ${page} sin fields (fallback)`
              );
            }
            
            if (result.items && result.items.length > 0) {
              // Verificar que los items tengan los campos de datos
              const firstItem = result.items[0];
              const hasDataFields = firstItem.date !== undefined || firstItem.description !== undefined || firstItem.amount !== undefined || firstItem.type !== undefined;
              const onlyMetadata = firstItem.collectionId && firstItem.collectionName && firstItem.id && !hasDataFields;
              
              if (onlyMetadata) {
                console.warn(`⚠️  [getAllTransactions] Página ${page}: Los items solo tienen metadata, obteniendo campos individualmente...`);
                console.log(`📋 [getAllTransactions] Primer item (solo metadata):`, JSON.stringify(firstItem));
                // Si solo tiene metadata, obtener cada registro individualmente
                // LIMITAR a máximo 100 registros por página para evitar timeouts
                const itemsToExpand = result.items.slice(0, 100);
                console.warn(`🔄 [getAllTransactions] Expandiendo ${itemsToExpand.length} registros (limitado de ${result.items.length})`);
                
                const expandedItems = await Promise.all(
                  itemsToExpand.map(async (item: any, idx: number) => {
                    try {
                      // Agregar timeout de 5 segundos por registro individual
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
                          const fetchPromise = fetch(`${apiUrl}api/collections/transactions/records/${item.id}?fields=id,date,description,amount,type,category,merchant,currency,bank,id_number,created,updated`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                            signal: createTimeoutSignal(5000), // Timeout de 5 segundos
                          });
                          
                          const response = await fetchPromise;
                          
                          if (response.ok) {
                            const fullRecord = await response.json();
                            if (idx === 0) {
                              console.log(`✅ [getAllTransactions] Primer registro expandido (API REST con fields):`, JSON.stringify(fullRecord));
                            }
                            // Verificar que tiene campos de datos
                            if (fullRecord.date || fullRecord.description || fullRecord.amount !== undefined) {
                              return fullRecord;
                            } else {
                              console.warn(`⚠️  [getAllTransactions] API REST con fields devolvió solo metadata, intentando sin fields...`);
                              // Intentar sin fields parameter
                              const response2 = await fetch(`${apiUrl}api/collections/transactions/records/${item.id}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                                signal: createTimeoutSignal(5000), // Timeout de 5 segundos
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
                          console.warn(`⚠️  [getAllTransactions] Error en fetch API REST para registro ${item.id}:`, fetchError.message);
                        }
                      }
                      
                      // Fallback al método SDK con fields explícitos
                      try {
                        const fullRecord = await withTimeout(
                          this.pb.collection('transactions').getOne(item.id, {
                            fields: 'id,date,description,amount,type,category,merchant,currency,bank,id_number,created,updated',
                          }),
                          5000,
                          `getOne registro ${item.id}`
                        );
                        if (idx === 0) {
                          console.log(`✅ [getAllTransactions] Primer registro expandido (SDK):`, JSON.stringify(fullRecord));
                        }
                        // Si el SDK también devuelve solo metadata, intentar con API REST sin fields
                        if (!fullRecord.date && !fullRecord.description && fullRecord.amount === undefined) {
                          console.warn(`⚠️  [getAllTransactions] SDK también devolvió solo metadata, intentando API REST sin fields...`);
                          if (apiUrl && token) {
                            const response2 = await fetch(`${apiUrl}api/collections/transactions/records/${item.id}`, {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                              },
                              signal: createTimeoutSignal(5000), // Timeout de 5 segundos
                            });
                            if (response2.ok) {
                              const fullRecord2 = await response2.json();
                              if (idx === 0) {
                                console.log(`✅ [getAllTransactions] Registro obtenido sin fields:`, JSON.stringify(fullRecord2));
                              }
                              return fullRecord2;
                            }
                          }
                        }
                        return fullRecord;
                      } catch (sdkError: any) {
                        console.warn(`⚠️  [getAllTransactions] Error con SDK getOne para registro ${item.id}:`, sdkError.message);
                        // Último intento: API REST sin fields
                        if (apiUrl && token) {
                          const response3 = await fetch(`${apiUrl}api/collections/transactions/records/${item.id}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                            signal: createTimeoutSignal(5000), // Timeout de 5 segundos
                          });
                          if (response3.ok) {
                            return await response3.json();
                          }
                        }
                        throw sdkError;
                      }
                    } catch (e: any) {
                      console.warn(`⚠️  [getAllTransactions] Error obteniendo registro ${item.id}:`, e.message);
                      if (e.stack) {
                        console.warn(`📚 [getAllTransactions] Stack:`, e.stack);
                      }
                      return item; // Devolver el item original si falla
                    }
                  })
                );
                records.push(...expandedItems);
              } else {
                records.push(...result.items);
              }
              hasMore = result.items.length === 500;
              if (page % 5 === 0 || !hasMore) {
                console.log(`📄 [getAllTransactions] Página ${page} procesada: ${result.items.length} registros (total acumulado: ${records.length})`);
              }
              page++;
              consecutiveErrors = 0;
            } else {
              hasMore = false;
              console.log(`📄 [getAllTransactions] Página ${page}: Sin más registros`);
            }
          } catch (pageError: any) {
            consecutiveErrors++;
            if (isAutoCancelledError(pageError)) {
              console.warn(`⚠️  [getAllTransactions] Página ${page} autocancelada con estrategia "${strategy.name}", reintentando... (intento ${consecutiveErrors}/${maxConsecutiveErrors})`);
              await wait(200);
              continue;
            }
            console.error(`❌ [getAllTransactions] Error en página ${page} (intento ${consecutiveErrors}/${maxConsecutiveErrors}):`, pageError.message);
            if (consecutiveErrors >= maxConsecutiveErrors) {
              console.error(`❌ [getAllTransactions] Máximo de errores consecutivos alcanzado para estrategia "${strategy.name}"`);
              throw pageError; // Lanzar error para que se intente la siguiente estrategia
            }
            await wait(100);
          }
        }

        const strategyDuration = Date.now() - strategyStartTime;
        if (records && records.length > 0) {
          console.log(`✅ [getAllTransactions] Estrategia "${strategy.name}" EXITOSA en ${strategyDuration}ms: ${records.length} registros obtenidos`);
          strategySuccess = true;
          break; // Éxito, salir del loop
        } else {
          console.log(`⚠️  [getAllTransactions] Estrategia "${strategy.name}" devolvió 0 registros después de ${strategyDuration}ms, intentando siguiente...`);
          // Continuar con la siguiente estrategia si devuelve 0 registros
          continue;
        }
      } catch (error: any) {
        lastError = error;
        const strategyDuration = Date.now() - strategyStartTime;
        if (isAutoCancelledError(error)) {
          console.warn(`⚠️  [getAllTransactions] Solicitud autocancelada con estrategia "${strategy.name}" después de ${strategyDuration}ms, intentando siguiente...`);
          await wait(200); // Esperar un poco más antes del siguiente intento
          continue;
        }
        console.error(`❌ [getAllTransactions] Error con estrategia "${strategy.name}" después de ${strategyDuration}ms:`, error.message);
        if (error.stack) {
          console.error(`📚 [getAllTransactions] Stack:`, error.stack);
        }
        // Si no es autocancelación, continuar con la siguiente estrategia
      }
    }

    // Si todas las estrategias fallaron
    if (!strategySuccess || records.length === 0) {
      const totalDuration = Date.now() - internalStartTime;
      console.error(`❌ [getAllTransactions] FALLO después de ${totalDuration}ms: No se pudieron obtener transacciones después de intentar todas las estrategias`);
      console.error(`❌ [getAllTransactions] Último error: ${lastError?.message || 'N/A'}`);
      if (lastError?.stack) {
        console.error(`📚 [getAllTransactions] Stack del último error:`, lastError.stack);
      }
      // Devolver array vacío en lugar de fallar completamente
      return [];
    }
    
    // Log para diagnóstico
    console.log(`📊 [getAllTransactions] Registros obtenidos antes de procesar: ${records.length}`);
    if (records.length > 0) {
      console.log(`📋 [getAllTransactions] Ejemplo de primer registro:`, JSON.stringify(records[0], null, 2));
    }
    
    // Sort records by date in memory if we couldn't sort on the server
    // Only sort if we have records and they don't have a created field (meaning server-side sort failed)
    if (records.length > 0) {
      const hasCreatedField = records.some(r => r.created);
      if (!hasCreatedField) {
        console.log(`🔄 [getAllTransactions] Ordenando registros por fecha en memoria...`);
        records.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        console.log(`✅ [getAllTransactions] Ordenamiento completado`);
      }
    }
    
    // Filtrar y mapear registros
    console.log(`🔍 [getAllTransactions] Filtrando registros inválidos...`);
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
    
    const filteredOut = records.length - filtered.length;
    if (filteredOut > 0) {
      console.warn(`⚠️  [getAllTransactions] ${filteredOut} registros filtrados (inválidos)`);
    }
    console.log(`✅ [getAllTransactions] Registros después del filtro: ${filtered.length}`);
    
    console.log(`🔄 [getAllTransactions] Mapeando registros a formato interno...`);
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
    
    const totalDuration = Date.now() - internalStartTime;
    console.log(`✅ [getAllTransactions] Mapeo completado: ${mapped.length} registros finales en ${totalDuration}ms`);
    if (mapped.length > 0) {
      console.log(`📋 [getAllTransactions] Ejemplo de primer registro mapeado:`, JSON.stringify(mapped[0], null, 2));
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
