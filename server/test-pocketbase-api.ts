/**
 * Script para probar diferentes endpoints de PocketBase
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

console.log(`🔍 Probando URL base: ${POCKETBASE_URL}\n`);

// Probar diferentes endpoints comunes
const endpoints = [
  "/api/health",
  "/api",
  "/api/collections",
  "/api/admins/auth-with-password",
];

for (const endpoint of endpoints) {
  try {
    console.log(`Probando: ${POCKETBASE_URL}${endpoint}`);
    const response = await fetch(`${POCKETBASE_URL}${endpoint}`, {
      method: "GET",
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    if (text.length < 200) {
      console.log(`  Respuesta: ${text.substring(0, 100)}`);
    }
    console.log("");
  } catch (error: any) {
    console.log(`  Error: ${error.message}\n`);
  }
}

// Probar con diferentes puertos
const ports = ["", ":443", ":80", ":8080"];
for (const port of ports) {
  const testUrl = `https://estadosdecuenta-db.david-cloud.online${port}`;
  try {
    console.log(`Probando puerto: ${testUrl}/api/health`);
    const response = await fetch(`${testUrl}/api/health`, {
      method: "GET",
    });
    console.log(`  ✓ Funciona: ${response.status}`);
    break;
  } catch (error: any) {
    console.log(`  ✗ No funciona`);
  }
}


