/**
 * Script para agregar el campo "bank" a la colección de transacciones existente en PocketBase
 * Ejecutar: tsx server/agregar-campo-bank.ts
 */

// Cargar variables de entorno desde .env
try {
  const dotenv = await import("dotenv");
  if (dotenv.default) {
    dotenv.default.config();
  } else if (dotenv.config) {
    dotenv.config();
  }
} catch (e) {
  console.log("dotenv no disponible, usando variables de entorno del sistema");
}

let POCKETBASE_URL = process.env.POCKETBASE_URL || "https://estadosdecuenta-db.david-cloud.online/_/";
// Usar la URL exactamente como está configurada - NO remover nada
if (POCKETBASE_URL.endsWith("/") && !POCKETBASE_URL.endsWith("/_/")) {
  POCKETBASE_URL = POCKETBASE_URL.slice(0, -1);
}
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

// Helper para obtener la URL limpia de la API
function getApiUrl(): string {
  let apiUrl = POCKETBASE_URL.trim();
  if (apiUrl.endsWith("/_/")) {
    apiUrl = apiUrl.slice(0, -3); // Remover "/_/"
  }
  if (!apiUrl.endsWith("/")) {
    apiUrl += "/";
  }
  return apiUrl;
}

async function authenticateAdmin(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD deben estar configuradas");
  }

  const apiUrl = getApiUrl();
  console.log(`Autenticando con PocketBase en: ${apiUrl}`);

  // Configurar para ignorar certificados SSL si es necesario
  if (typeof process !== "undefined" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "1") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  try {
    // Usar el endpoint correcto para PocketBase v0.23+
    const endpoint = "api/collections/_superusers/auth-with-password";
    const authUrl = apiUrl + endpoint;
    console.log(`Intentando autenticación en: ${authUrl}`);
    
    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Error de autenticación: ${response.status} ${response.statusText}`;
      try {
        const error = JSON.parse(errorText);
        errorMessage = `Error de autenticación: ${error.message || errorMessage}`;
      } catch {
        errorMessage = `Error de autenticación: ${errorText || errorMessage}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.token;
  } catch (error: any) {
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new Error(`No se pudo conectar a ${POCKETBASE_URL}. Verifica que el servidor esté accesible.`);
    }
    if (error.message.includes("certificate") || error.message.includes("SSL")) {
      throw new Error(`Error de certificado SSL. El servidor podría tener un certificado auto-firmado.`);
    }
    throw error;
  }
}

async function addBankField(token: string): Promise<void> {
  const apiUrl = getApiUrl();
  
  console.log("\n📋 Obteniendo colección actual...");
  const getResponse = await fetch(`${apiUrl}api/collections/transactions`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!getResponse.ok) {
    throw new Error(`Error obteniendo colección: ${getResponse.statusText}`);
  }

  const collection = await getResponse.json();
  console.log(`✓ Colección obtenida. Campos actuales: ${collection.schema?.length || 0}`);

  // Verificar si el campo bank ya existe
  const bankFieldExists = collection.schema?.some((field: any) => field.name === 'bank');
  if (bankFieldExists) {
    console.log("✅ El campo 'bank' ya existe en la colección");
    return;
  }

  console.log("\n➕ Agregando campo 'bank'...");
  
  // Obtener campos existentes
  const existingFields = collection.schema || [];
  
  // Agregar el nuevo campo
  const newField = {
    name: "bank",
    type: "text",
    required: false,
    options: {
      min: null,
      max: 50,
      pattern: "",
    },
  };

  const updatedFields = [...existingFields, newField];

  // Actualizar la colección
  const updateResponse = await fetch(`${apiUrl}api/collections/transactions`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      fields: updatedFields,
    }),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    let errorMessage = `Error actualizando colección: ${updateResponse.statusText}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = `Error actualizando colección: ${error.message || errorMessage}`;
    } catch {
      errorMessage = `Error actualizando colección: ${errorText || errorMessage}`;
    }
    throw new Error(errorMessage);
  }

  console.log("✅ Campo 'bank' agregado exitosamente");
}

async function main() {
  try {
    console.log("🔐 Autenticando con PocketBase...");
    const token = await authenticateAdmin();
    console.log("✓ Autenticación exitosa\n");

    await addBankField(token);

    console.log("\n✅ Proceso completado exitosamente!");
    console.log("\nEl campo 'bank' está disponible en la colección 'transactions'.");
    console.log("Las transacciones nuevas incluirán este campo automáticamente.");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();

