/**
 * Script para crear la colección de usuarios tipo "auth" en PocketBase
 * Ejecutar: tsx server/init-users-collection.ts
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

async function authenticateAdmin(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD son requeridos");
  }

  if (!POCKETBASE_URL) {
    throw new Error("POCKETBASE_URL no está configurada");
  }

  console.log(`Conectando a: ${POCKETBASE_URL}`);

  // Configurar fetch para ignorar certificados SSL si es necesario
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
    const response = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, fetchOptions);

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
    if (error.message.includes("certificate") || error.message.includes("SSL") || error.message.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE")) {
      throw new Error(`Error de certificado SSL. El servidor podría tener un certificado auto-firmado.`);
    }
    if (error.message === "fetch failed") {
      throw new Error(`No se pudo establecer conexión con ${POCKETBASE_URL}.`);
    }
    throw error;
  }
}

async function createUsersCollection(token: string) {
  // Ajustar URL para la API
  let apiUrl = POCKETBASE_URL;
  if (apiUrl.endsWith("/_/")) {
    apiUrl = apiUrl.replace("/_/", "/");
  }

  // Verificar si la colección ya existe
  try {
    const checkResponse = await fetch(`${apiUrl}/api/collections/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (checkResponse.ok) {
      console.log("✓ Colección 'users' ya existe");
      return;
    }
  } catch (e) {
    // Continuar con la creación
  }

  // Crear colección de usuarios tipo "auth"
  const collectionData = {
    name: "users",
    type: "auth", // Tipo auth para autenticación
    schema: [
      {
        name: "name",
        type: "text",
        required: false,
      },
      {
        name: "avatar",
        type: "file",
        required: false,
        options: {
          maxSelect: 1,
          maxSize: 5242880, // 5MB
          mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        },
      },
    ],
    options: {
      allowEmailAuth: true,
      allowOAuth2Auth: false,
      allowUsernameAuth: false,
      exceptEmailDomains: [],
      onlyEmailDomains: [],
      requireEmail: true,
      minPasswordLength: 8,
    },
    listRule: "",
    viewRule: "id = @request.auth.id",
    createRule: "",
    updateRule: "id = @request.auth.id",
    deleteRule: "id = @request.auth.id",
  };

  const response = await fetch(`${apiUrl}/api/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(collectionData),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.message?.includes("already exists") || response.status === 400) {
      console.log(`✓ Colección "users" ya existe`);
      return;
    }
    throw new Error(`Error creando colección users: ${error.message || response.statusText}`);
  }

  console.log(`✓ Colección "users" creada exitosamente`);
}

async function main() {
  try {
    console.log("🔐 Autenticando con PocketBase...");
    const token = await authenticateAdmin();
    console.log("✓ Autenticación exitosa\n");

    console.log("📦 Creando colección de usuarios...\n");
    await createUsersCollection(token);

    console.log("\n✅ Inicialización completada!");
    console.log("\nLa colección 'users' está lista para autenticación.");
    console.log("\nNota: Los usuarios pueden registrarse desde la aplicación.");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();

