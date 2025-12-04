/**
 * Script para probar diferentes métodos de autenticación en PocketBase
 */

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
POCKETBASE_URL = POCKETBASE_URL.replace(/\/_\//g, "").replace(/\/$/, "");

const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

console.log(`🔍 Probando autenticación en: ${POCKETBASE_URL}\n`);

// Probar diferentes endpoints de autenticación
const authEndpoints = [
  "/api/admins/auth-with-password",
  "/api/admins/auth",
  "/api/auth/admins",
  "/api/auth/admins/with-password",
  "/_api/admins/auth-with-password",
];

for (const endpoint of authEndpoints) {
  try {
    console.log(`Probando: ${endpoint}`);
    const response = await fetch(`${POCKETBASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    if (text.length < 300) {
      console.log(`  Respuesta: ${text}`);
    } else {
      console.log(`  Respuesta: ${text.substring(0, 200)}...`);
    }
    if (response.ok) {
      console.log(`  ✓ ÉXITO! Este es el endpoint correcto.\n`);
      break;
    }
    console.log("");
  } catch (error: any) {
    console.log(`  Error: ${error.message}\n`);
  }
}

// También probar accediendo al panel de admin para ver la estructura
console.log(`\n📋 Información del servidor:`);
try {
  const healthResponse = await fetch(`${POCKETBASE_URL}/api/health`);
  const healthData = await healthResponse.json();
  console.log(`Health check:`, healthData);
} catch (error: any) {
  console.log(`Error en health check: ${error.message}`);
}


