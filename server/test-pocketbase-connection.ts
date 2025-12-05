/**
 * Script de prueba para verificar la conexión a PocketBase
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

const POCKETBASE_URL = process.env.POCKETBASE_URL || "https://estadosdecuenta-db.david-cloud.online:8080";
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

console.log("🔍 Verificando configuración...");
console.log(`URL: ${POCKETBASE_URL}`);
console.log(`Email: ${ADMIN_EMAIL ? "✓ Configurado" : "✗ No configurado"}`);
console.log(`Password: ${ADMIN_PASSWORD ? "✓ Configurado" : "✗ No configurado"}`);
console.log("");

// Probar conexión básica
console.log("🌐 Probando conexión al servidor...");
try {
  const healthResponse = await fetch(`${POCKETBASE_URL}/api/health`, {
    method: "GET",
  });
  console.log(`✓ Servidor responde: ${healthResponse.status} ${healthResponse.statusText}`);
} catch (error: any) {
  console.log(`✗ Error de conexión: ${error.message}`);
  console.log(`  Código: ${error.code || "N/A"}`);
  
  // Intentar con HTTP en lugar de HTTPS
  if (POCKETBASE_URL.startsWith("https://")) {
    const httpUrl = POCKETBASE_URL.replace("https://", "http://");
    console.log(`\n🔄 Intentando con HTTP: ${httpUrl}`);
    try {
      const httpResponse = await fetch(`${httpUrl}/api/health`, {
        method: "GET",
      });
      console.log(`✓ Servidor HTTP responde: ${httpResponse.status}`);
      console.log(`⚠️  Considera usar HTTP en lugar de HTTPS: ${httpUrl}`);
    } catch (httpError: any) {
      console.log(`✗ HTTP también falló: ${httpError.message}`);
    }
  }
}

// Probar autenticación
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  console.log("\n🔐 Probando autenticación...");
  try {
    const authResponse = await fetch(`${POCKETBASE_URL}/api/admins/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    if (authResponse.ok) {
      const data = await authResponse.json();
      console.log("✓ Autenticación exitosa");
      console.log(`  Token recibido: ${data.token ? "✓" : "✗"}`);
    } else {
      const errorText = await authResponse.text();
      console.log(`✗ Error de autenticación: ${authResponse.status} ${authResponse.statusText}`);
      try {
        const error = JSON.parse(errorText);
        console.log(`  Mensaje: ${error.message || "N/A"}`);
      } catch {
        console.log(`  Respuesta: ${errorText.substring(0, 100)}`);
      }
    }
  } catch (error: any) {
    console.log(`✗ Error en autenticación: ${error.message}`);
  }
}

console.log("\n✅ Prueba completada");




