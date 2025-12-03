/**
 * Script alternativo para inicializar PocketBase usando módulos nativos de Node.js
 * Ejecutar: tsx server/init-pocketbase-node.ts
 */

import https from "https";
import http from "http";

// Cargar variables de entorno
try {
  const dotenv = await import("dotenv");
  if (dotenv.default) {
    dotenv.default.config();
  } else if (dotenv.config) {
    dotenv.config();
  }
} catch (e) {
  console.log("dotenv no disponible");
}

let POCKETBASE_URL = process.env.POCKETBASE_URL || "https://estadosdecuenta-db.david-cloud.online";
// Remover /_/ si está presente (panel de admin)
POCKETBASE_URL = POCKETBASE_URL.replace(/\/_\//g, "").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

// Deshabilitar verificación SSL temporalmente
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function makeRequest(url: string, options: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      headers: options.headers || {},
      rejectUnauthorized: false, // Ignorar certificados SSL
    };

    const req = client.request(requestOptions, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function authenticateAdmin(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD son requeridos");
  }

  console.log(`Conectando a: ${POCKETBASE_URL}`);

  try {
    const response = await makeRequest(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (response.status !== 200) {
      throw new Error(`Error de autenticación: ${response.status} - ${JSON.stringify(response.data)}`);
    }

    return response.data.token;
  } catch (error: any) {
    if (error.code === "ENOTFOUND") {
      throw new Error(`No se encontró el servidor. Verifica que la URL sea correcta: ${POCKETBASE_URL}`);
    }
    if (error.code === "ECONNREFUSED") {
      throw new Error(`Conexión rechazada. El servidor podría no estar accesible o el puerto está bloqueado.`);
    }
    throw error;
  }
}

async function createCollection(
  token: string,
  name: string,
  fields: any[],
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

  try {
    const response = await makeRequest(`${POCKETBASE_URL}/api/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(collectionData),
    });

    if (response.status === 200 || response.status === 201) {
      console.log(`✓ Colección "${name}" creada exitosamente`);
      return;
    }

    // Si la colección ya existe
    if (response.status === 400) {
      const errorMsg = JSON.stringify(response.data);
      if (errorMsg.includes("already exists") || errorMsg.includes("duplicate")) {
        console.log(`✓ Colección "${name}" ya existe`);
        return;
      }
    }

    throw new Error(`Error creando colección ${name}: ${response.status} - ${JSON.stringify(response.data)}`);
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      console.log(`✓ Colección "${name}" ya existe`);
      return;
    }
    throw error;
  }
}

async function main() {
  try {
    console.log("🔐 Autenticando con PocketBase...");
    const token = await authenticateAdmin();
    console.log("✓ Autenticación exitosa\n");

    console.log("📦 Creando colecciones...\n");

    // Colección de usuarios
    await createCollection(
      token,
      "users",
      [
        { name: "username", type: "text", required: true, options: { unique: true } },
        { name: "password", type: "text", required: true },
      ],
      "auth"
    );

    // Colección de transacciones
    await createCollection(
      token,
      "transactions",
      [
        { name: "id_number", type: "number", required: false },
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
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

main();

