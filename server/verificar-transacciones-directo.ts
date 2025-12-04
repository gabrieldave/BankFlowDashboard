/**
 * Script para verificar transacciones directamente desde PocketBase API
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

const POCKETBASE_URL = process.env.POCKETBASE_URL || "https://estadosdecuenta-db.david-cloud.online";
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

async function verificarDirecto() {
  try {
    console.log("🔍 Verificando transacciones directamente desde PocketBase API...\n");
    console.log(`URL: ${POCKETBASE_URL}`);
    
    // Limpiar URL
    let apiUrl = POCKETBASE_URL.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3);
    }
    if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }
    
    // Autenticar usando _superusers (PocketBase v0.23+)
    console.log("🔐 Autenticando...");
    const authResponse = await fetch(`${apiUrl}api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`Error de autenticación: ${authResponse.status} - ${errorText}`);
    }
    
    const authData = await authResponse.json();
    const token = authData.token;
    console.log("✅ Autenticación exitosa\n");
    
    // Obtener transacciones directamente
    console.log("📊 Obteniendo transacciones...");
    let allRecords: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(`${apiUrl}api/collections/transactions/records?page=${page}&perPage=500&expand=`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error obteniendo transacciones: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      allRecords.push(...(data.items || []));
      
      hasMore = data.items && data.items.length === 500;
      page++;
      
      console.log(`   Página ${page - 1}: ${data.items?.length || 0} transacciones`);
    }
    
    console.log(`\n✅ Total encontrado: ${allRecords.length} transacciones\n`);
    
    if (allRecords.length === 0) {
      console.log("❌ NO hay transacciones guardadas");
      return;
    }
    
    // Estadísticas
    const income = allRecords.filter((t: any) => t.type === 'income').length;
    const expense = allRecords.filter((t: any) => t.type === 'expense').length;
    
    console.log(`📊 Estadísticas:`);
    console.log(`   - Total: ${allRecords.length}`);
    console.log(`   - Ingresos: ${income}`);
    console.log(`   - Gastos: ${expense}\n`);
    
    // Mostrar estructura completa de la primera transacción
    if (allRecords.length > 0) {
      console.log("📋 Estructura de la primera transacción:");
      console.log(JSON.stringify(allRecords[0], null, 2));
      console.log("\n📋 Primeras 5 transacciones:");
      allRecords.slice(0, 5).forEach((t: any, idx: number) => {
        const date = t.date || t.fecha || t.Date || 'N/A';
        const type = t.type || t.tipo || t.Type || 'N/A';
        const description = t.description || t.descripcion || t.Description || 'N/A';
        const amount = t.amount || t.monto || t.Amount || t.amount_value || 'N/A';
        console.log(`   ${idx + 1}. [${date}] ${type} - ${String(description).substring(0, 50)} - $${amount}`);
      });
    }
    
    // Verificar si coincide con las 149 extraídas
    if (allRecords.length >= 140 && allRecords.length <= 160) {
      console.log(`\n✅ Hay ${allRecords.length} transacciones guardadas (cerca de las 149 extraídas)`);
      console.log("✅ Las transacciones SÍ están guardadas en PocketBase");
      console.log("💡 El usuario NO necesita volver a subir el PDF\n");
    } else {
      console.log(`\n⚠️  Hay ${allRecords.length} transacciones guardadas`);
      console.log("💡 Verificar si faltan algunas transacciones\n");
    }
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

verificarDirecto();

