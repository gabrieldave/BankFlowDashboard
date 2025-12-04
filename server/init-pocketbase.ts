/**
 * Script para inicializar las colecciones en PocketBase
 * Ejecutar: tsx server/init-pocketbase.ts
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

interface Field {
  name: string;
  type: string;
  required: boolean;
  options?: any;
}

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

  // En Node.js, podemos configurar para ignorar certificados SSL no válidos
  if (typeof process !== "undefined" && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "1") {
    // Solo si no está explícitamente configurado para rechazar
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  try {
    // Ajustar URL para la API (remover /_/ si existe, la API está en la raíz)
    // Exactamente como en storage.ts
    let apiUrl = POCKETBASE_URL.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3) + "/"; // Remover "/_/" y agregar "/"
    } else if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }

    // El endpoint correcto de PocketBase para autenticación de admin
    const endpoint = "api/admins/auth-with-password";
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
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new Error(`No se pudo conectar a ${POCKETBASE_URL}. Verifica que el servidor esté accesible y que no haya problemas de firewall.`);
    }
    if (error.message.includes("certificate") || error.message.includes("SSL") || error.message.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE")) {
      throw new Error(`Error de certificado SSL. El servidor podría tener un certificado auto-firmado. Intenta acceder desde el navegador primero para aceptar el certificado.`);
    }
    if (error.message === "fetch failed") {
      throw new Error(`No se pudo establecer conexión con ${POCKETBASE_URL}. Verifica:\n  1. Que el servidor esté en línea\n  2. Que no haya problemas de firewall\n  3. Que la URL sea correcta\n  4. Intenta acceder desde el navegador: ${POCKETBASE_URL}`);
    }
    throw error;
  }
}

async function createCollection(
  token: string,
  name: string,
  fields: Field[],
  type: "base" | "auth" = "base"
) {
  const collectionData = {
    name,
    type,
    schema: fields.map((field) => ({
      name: field.name,
      type: field.type,
      required: field.required,
      ...field.options,
    })),
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
  };

  const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(collectionData),
  });

  if (!response.ok) {
    const error = await response.json();
    // Si la colección ya existe, no es un error
    if (error.message?.includes("already exists") || response.status === 400) {
      console.log(`✓ Colección "${name}" ya existe`);
      return;
    }
    throw new Error(`Error creando colección ${name}: ${error.message || response.statusText}`);
  }

  console.log(`✓ Colección "${name}" creada exitosamente`);
}

async function main() {
  try {
    console.log("🔐 Autenticando con PocketBase...");
    const token = await authenticateAdmin();
    console.log("✓ Autenticación exitosa\n");

    console.log("📦 Creando colecciones...\n");

    // Colección de usuarios (tipo auth para autenticación)
    // Crear con configuración completa para autenticación
    const usersCollectionData = {
      name: "users",
      type: "auth",
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

    const usersResponse = await fetch(`${POCKETBASE_URL}/api/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(usersCollectionData),
    });

    if (!usersResponse.ok) {
      const error = await usersResponse.json();
      if (error.message?.includes("already exists") || usersResponse.status === 400) {
        console.log(`✓ Colección "users" ya existe`);
      } else {
        throw new Error(`Error creando colección users: ${error.message || usersResponse.statusText}`);
      }
    } else {
      console.log(`✓ Colección "users" creada exitosamente`);
    }

    // Colección de transacciones
    await createCollection(
      token,
      "transactions",
      [
        { name: "id_number", type: "number", required: false }, // Campo numérico para compatibilidad
        { name: "date", type: "text", required: true },
        { name: "description", type: "text", required: true },
        { name: "amount", type: "number", required: true },
        { name: "type", type: "text", required: true },
        { name: "category", type: "text", required: true },
        { name: "merchant", type: "text", required: true },
        { name: "currency", type: "text", required: true, options: { defaultValue: "MXN" } },
      ],
      "base"
    );

    console.log("\n✅ Inicialización completada!");
    console.log("\nLas colecciones están listas para usar.");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();

