import { type User, type InsertUser, type Transaction, type InsertTransaction } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllTransactions(): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  createTransactions(transactions: InsertTransaction[]): Promise<Transaction[]>;
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

  async createTransactions(transactionsToInsert: InsertTransaction[]): Promise<Transaction[]> {
    const results: Transaction[] = [];
    for (const transaction of transactionsToInsert) {
      const result = await this.createTransaction(transaction);
      results.push(result);
    }
    return results;
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
  private baseUrl: string;
  private adminToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.POCKETBASE_URL || "";
    if (!this.baseUrl) {
      throw new Error("POCKETBASE_URL no está configurada");
    }
    // Usar la URL exactamente como está configurada - NO remover nada
    // Solo remover trailing slash si existe (excepto si termina en /_/)
    if (this.baseUrl.endsWith("/") && !this.baseUrl.endsWith("/_/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  private async authenticateAdmin(): Promise<void> {
    if (this.adminToken) return;

    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      // Si no hay credenciales de admin, intentamos sin autenticación
      // (asumiendo que las colecciones son públicas o usan reglas de acceso)
      return;
    }

    try {
      // Configurar para ignorar certificados SSL si es necesario
      if (typeof process !== "undefined" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "1") {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }

      // Ajustar URL para la API (remover /_/ si existe, la API está en la raíz)
      let apiUrl = this.baseUrl;
      if (apiUrl.endsWith("/_/")) {
        apiUrl = apiUrl.replace("/_/", "/");
      }

      // Intentar diferentes endpoints de autenticación
      const authEndpoints = [
        "/api/admins/auth-with-password",
        "/api/admins/auth",
        "/api/auth/admins/with-password",
      ];

      for (const endpoint of authEndpoints) {
        try {
          const response = await fetch(`${apiUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              identity: adminEmail,
              password: adminPassword,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            this.adminToken = data.token;
            console.log("✓ Autenticación exitosa como admin");
            return;
          } else {
            const errorText = await response.text();
            console.warn(`Endpoint ${endpoint} falló: ${response.status} - ${errorText.substring(0, 100)}`);
          }
        } catch (e: any) {
          console.warn(`Error en endpoint ${endpoint}:`, e.message);
          // Continuar con el siguiente endpoint
        }
      }

      console.warn("No se pudo autenticar como admin, continuando sin autenticación");
    } catch (error) {
      console.warn("Error al autenticar admin:", error);
      // Continuar sin autenticación, las colecciones podrían ser públicas
    }
  }

  private async request(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    await this.authenticateAdmin();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.adminToken) {
      headers["Authorization"] = `Bearer ${this.adminToken}`;
    }

    // Configurar para ignorar certificados SSL si es necesario
    if (typeof process !== "undefined" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "1") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    // Si la URL base termina en /_/, removerlo para los endpoints de API
    // (/_/ es solo para el panel web, la API está en la raíz)
    let apiUrl = this.baseUrl;
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.replace("/_/", "/");
    }

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `PocketBase error: ${response.status} ${response.statusText}`;
        try {
          const error = JSON.parse(errorText);
          errorMessage = `PocketBase error: ${error.message || errorMessage}`;
        } catch {
          errorMessage = `PocketBase error: ${errorText || errorMessage}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error: any) {
      if (error.message.includes("fetch failed") || error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        throw new Error(`No se pudo conectar a PocketBase en ${this.baseUrl}. Verifica que el servidor esté accesible.`);
      }
      throw error;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const data = await this.request("GET", `/api/collections/users/records/${id}`);
      return {
        id: data.id,
        username: data.username,
        password: data.password,
      };
    } catch (error: any) {
      if (error.message.includes("404") || error.message.includes("Not found")) {
        return undefined;
      }
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const data = await this.request(
        "GET",
        `/api/collections/users/records?filter=(username='${username}')&perPage=1`
      );
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          id: item.id,
          username: item.username,
          password: item.password,
        };
      }
      return undefined;
    } catch (error: any) {
      if (error.message.includes("404") || error.message.includes("Not found")) {
        return undefined;
      }
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const data = await this.request("POST", "/api/collections/users/records", insertUser);
    return {
      id: data.id,
      username: data.username,
      password: data.password,
    };
  }

  async getAllTransactions(): Promise<Transaction[]> {
    const data = await this.request(
      "GET",
      "/api/collections/transactions/records?sort=-created_at&perPage=500"
    );
    return (data.items || []).map((item: any, index: number) => ({
      // Usar un hash del ID de PocketBase para generar un número único
      // o usar el índice si el ID no es numérico
      id: item.id_number || this.hashStringToNumber(item.id) || (index + 1),
      date: item.date,
      description: item.description,
      amount: item.amount,
      type: item.type,
      category: item.category,
      merchant: item.merchant,
      currency: item.currency || "MXN",
      createdAt: item.created ? new Date(item.created) : new Date(),
    }));
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
      // Buscar por id_number si existe, o buscar todas y filtrar
      const data = await this.request(
        "GET",
        `/api/collections/transactions/records?filter=(id_number=${id})&perPage=1`
      );
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
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
      if (error.message.includes("404") || error.message.includes("Not found")) {
        return undefined;
      }
      throw error;
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Obtener el máximo id_number para generar el siguiente
    let nextId = 1;
    try {
      const existingData = await this.request(
        "GET",
        "/api/collections/transactions/records?sort=-id_number&perPage=1"
      );
      if (existingData.items && existingData.items.length > 0 && existingData.items[0].id_number) {
        nextId = existingData.items[0].id_number + 1;
      }
    } catch (error) {
      // Si falla, empezamos desde 1
    }

    const data = await this.request(
      "POST",
      "/api/collections/transactions/records",
      {
        ...transaction,
        id_number: nextId,
      }
    );
    return {
      id: data.id_number || this.hashStringToNumber(data.id) || nextId,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category,
      merchant: data.merchant,
      currency: data.currency || "MXN",
      createdAt: data.created ? new Date(data.created) : new Date(),
    };
  }

  async createTransactions(transactionsToInsert: InsertTransaction[]): Promise<Transaction[]> {
    if (transactionsToInsert.length === 0) return [];

    // PocketBase no tiene bulk insert nativo, así que hacemos múltiples requests
    // o podemos usar un endpoint personalizado si existe
    const results: Transaction[] = [];
    for (const transaction of transactionsToInsert) {
      const result = await this.createTransaction(transaction);
      results.push(result);
    }
    return results;
  }

  async updateTransaction(id: number, updates: Partial<InsertTransaction>): Promise<Transaction> {
    // Primero buscar el registro por id_number
    const searchData = await this.request(
      "GET",
      `/api/collections/transactions/records?filter=(id_number=${id})&perPage=1`
    );
    if (!searchData.items || searchData.items.length === 0) {
      throw new Error(`Transaction ${id} not found`);
    }
    const recordId = searchData.items[0].id;
    
    const data = await this.request(
      "PATCH",
      `/api/collections/transactions/records/${recordId}`,
      updates
    );
    return {
      id: data.id_number || this.hashStringToNumber(data.id) || id,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category: data.category,
      merchant: data.merchant,
      currency: data.currency || "MXN",
      createdAt: data.created ? new Date(data.created) : new Date(),
    };
  }

  async deleteTransaction(id: number): Promise<void> {
    // Buscar el registro por id_number
    const searchData = await this.request(
      "GET",
      `/api/collections/transactions/records?filter=(id_number=${id})&perPage=1`
    );
    if (!searchData.items || searchData.items.length === 0) {
      throw new Error(`Transaction ${id} not found`);
    }
    const recordId = searchData.items[0].id;
    await this.request("DELETE", `/api/collections/transactions/records/${recordId}`);
  }

  async deleteAllTransactions(): Promise<void> {
    // Obtener todos los IDs y eliminarlos
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const data = await this.request(
        "GET",
        `/api/collections/transactions/records?perPage=500&page=${page}`
      );
      const items = data.items || [];
      
      if (items.length === 0) {
        hasMore = false;
        break;
      }
      
      for (const item of items) {
        await this.request("DELETE", `/api/collections/transactions/records/${item.id}`);
      }
      
      hasMore = items.length === 500;
      page++;
    }
  }
}

export const storage = process.env.POCKETBASE_URL 
  ? new PocketBaseStorage() 
  : new MemStorage();
