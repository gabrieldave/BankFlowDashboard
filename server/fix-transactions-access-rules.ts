/**
 * Script para verificar y corregir las reglas de acceso de la colección transactions
 * Ejecutar: tsx server/fix-transactions-access-rules.ts
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

const POCKETBASE_URL = process.env.POCKETBASE_URL || "";
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || "";

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
    throw new Error("POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD son requeridos");
  }

  if (!POCKETBASE_URL) {
    throw new Error("POCKETBASE_URL no está configurada");
  }

  console.log(`Conectando a: ${POCKETBASE_URL}`);

  const fetchOptions: any = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  };

  if (typeof process !== "undefined" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "1") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  try {
    const apiUrl = getApiUrl();
    const endpoint = "api/collections/_superusers/auth-with-password";
    const authUrl = apiUrl + endpoint;
    console.log(`Intentando autenticación en: ${authUrl}`);
    const response = await fetch(authUrl, fetchOptions);

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
    throw error;
  }
}

async function fixAccessRules(token: string) {
  const apiUrl = getApiUrl();
  const collectionUrl = `${apiUrl}api/collections/transactions`;

  // Primero obtener la colección actual
  console.log("\n📋 Obteniendo información de la colección transactions...");
  const getResponse = await fetch(collectionUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!getResponse.ok) {
    throw new Error(`Error obteniendo colección: ${getResponse.statusText}`);
  }

  const collection = await getResponse.json();
  console.log("Reglas actuales:");
  console.log(`  - List Rule: "${collection.listRule || '(vacía)'}"`);
  console.log(`  - View Rule: "${collection.viewRule || '(vacía)'}"`);
  console.log(`  - Create Rule: "${collection.createRule || '(vacía)'}"`);
  console.log(`  - Update Rule: "${collection.updateRule || '(vacía)'}"`);
  console.log(`  - Delete Rule: "${collection.deleteRule || '(vacía)'}"`);

  // Actualizar reglas a vacías (acceso completo para admin)
  console.log("\n🔧 Actualizando reglas de acceso a vacías (acceso completo)...");
  const updateData = {
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  };

  const updateResponse = await fetch(collectionUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updateData),
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.json();
    throw new Error(`Error actualizando reglas: ${error.message || updateResponse.statusText}`);
  }

  console.log("✓ Reglas de acceso actualizadas correctamente");

  // Verificar que se actualizaron
  const verifyResponse = await fetch(collectionUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const updatedCollection = await verifyResponse.json();
  console.log("\n✅ Reglas actualizadas:");
  console.log(`  - List Rule: "${updatedCollection.listRule || '(vacía)'}"`);
  console.log(`  - View Rule: "${updatedCollection.viewRule || '(vacía)'}"`);
  console.log(`  - Create Rule: "${updatedCollection.createRule || '(vacía)'}"`);
  console.log(`  - Update Rule: "${updatedCollection.updateRule || '(vacía)'}"`);
  console.log(`  - Delete Rule: "${updatedCollection.deleteRule || '(vacía)'}"`);
}

async function main() {
  try {
    console.log("🔐 Autenticando con PocketBase...");
    const token = await authenticateAdmin();
    console.log("✓ Autenticación exitosa\n");

    await fixAccessRules(token);

    console.log("\n✅ Proceso completado exitosamente");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();

