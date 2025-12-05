/**
 * Script para probar conexión a PocketBase con puerto 8080
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

// Agregar puerto 8080 si no está presente
if (POCKETBASE_URL.includes("estadosdecuenta-db.david-cloud.online") && !POCKETBASE_URL.includes(":8080")) {
  if (POCKETBASE_URL.startsWith("https://")) {
    POCKETBASE_URL = POCKETBASE_URL.replace("estadosdecuenta-db.david-cloud.online", "estadosdecuenta-db.david-cloud.online:8080");
  } else if (POCKETBASE_URL.startsWith("http://")) {
    POCKETBASE_URL = POCKETBASE_URL.replace("estadosdecuenta-db.david-cloud.online", "estadosdecuenta-db.david-cloud.online:8080");
  }
}

const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

console.log(`🔍 Probando conexión con puerto 8080:`);
console.log(`URL: ${POCKETBASE_URL}\n`);

// Probar health check
console.log("1. Probando health check...");
try {
  const healthResponse = await fetch(`${POCKETBASE_URL}/api/health`);
  const healthData = await healthResponse.json();
  console.log(`   ✓ Health: ${JSON.stringify(healthData)}\n`);
} catch (error: any) {
  console.log(`   ✗ Error: ${error.message}\n`);
}

// Probar diferentes endpoints de autenticación de admin
console.log("2. Probando endpoints de autenticación de admin...");
const authEndpoints = [
  "/api/admins/auth-with-password",
  "/api/admins/auth",
  "/api/auth/admins/with-password",
  "/_api/admins/auth-with-password",
];

for (const endpoint of authEndpoints) {
  try {
    console.log(`   Probando: ${endpoint}`);
    const response = await fetch(`${POCKETBASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    if (response.ok) {
      const data = JSON.parse(text);
      console.log(`   ✓ ÉXITO! Token recibido: ${data.token ? "Sí" : "No"}`);
      console.log(`   Endpoint correcto: ${endpoint}\n`);
      break;
    } else {
      console.log(`   Respuesta: ${text.substring(0, 150)}\n`);
    }
  } catch (error: any) {
    console.log(`   Error: ${error.message}\n`);
  }
}

// Probar acceso a colecciones
console.log("3. Probando acceso a colecciones...");
try {
  const collectionsResponse = await fetch(`${POCKETBASE_URL}/api/collections`);
  console.log(`   Status: ${collectionsResponse.status} ${collectionsResponse.statusText}`);
  if (collectionsResponse.ok) {
    const data = await collectionsResponse.json();
    console.log(`   ✓ Colecciones accesibles: ${data.items?.length || 0} encontradas`);
    if (data.items && data.items.length > 0) {
      console.log(`   Colecciones:`);
      data.items.forEach((c: any) => {
        console.log(`     - ${c.name} (${c.type})`);
      });
    }
  } else {
    const text = await collectionsResponse.text();
    console.log(`   Respuesta: ${text.substring(0, 150)}`);
  }
} catch (error: any) {
  console.log(`   Error: ${error.message}`);
}

console.log("\n✅ Prueba completada");




