/**
 * Script para verificar si los campos de transacciones están vacíos en PocketBase
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

interface FieldStats {
  empty: number;
  filled: number;
  nullCount: number;
  undefinedCount: number;
}

async function verificarCamposVacios() {
  try {
    console.log("🔍 Verificando si los campos de transacciones están vacíos en PocketBase...\n");
    console.log(`URL: ${POCKETBASE_URL}\n`);
    
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
      const items = data.items || [];
      
      // Verificar si solo tiene metadata
      if (items.length > 0) {
        const firstItem = items[0];
        const keys = Object.keys(firstItem);
        console.log(`\n📋 Página ${page} - Primer registro - Claves disponibles:`, keys);
        
        // Verificar si solo tiene metadata
        const hasOnlyMetadata = firstItem.collectionId && firstItem.collectionName && firstItem.id && 
                                !firstItem.date && !firstItem.description && !firstItem.amount;
        
        if (hasOnlyMetadata) {
          console.log(`⚠️  Página ${page}: Los registros solo tienen metadata (sin campos de datos)`);
          console.log(`   Estructura del primer registro:`, JSON.stringify(firstItem, null, 2));
          
          // Intentar obtener con getOne para ver si tiene campos
          if (firstItem.id) {
            try {
              const singleResponse = await fetch(`${apiUrl}api/collections/transactions/records/${firstItem.id}`, {
                headers: {
                  "Authorization": `Bearer ${token}`,
                },
              });
              
              if (singleResponse.ok) {
                const singleRecord = await singleResponse.json();
                const singleKeys = Object.keys(singleRecord);
                console.log(`   🔍 Registro individual - Claves disponibles:`, singleKeys);
                
                // Verificar campos de datos
                const camposDatos = ['date', 'description', 'amount', 'type', 'category', 'merchant', 'currency', 'id_number'];
                console.log(`   📝 Campos de datos:`);
                camposDatos.forEach(campo => {
                  const valor = singleRecord[campo];
                  const estaVacio = valor === null || valor === undefined || valor === '';
                  console.log(`      - ${campo}: ${estaVacio ? '❌ VACÍO' : '✅ ' + JSON.stringify(valor)}`);
                });
                
                // Mostrar registro completo
                console.log(`   📋 Registro completo:`, JSON.stringify(singleRecord, null, 2));
              }
            } catch (e: any) {
              console.log(`   ⚠️  Error obteniendo registro individual:`, e.message);
            }
          }
        } else {
          allRecords.push(...items);
        }
      }
      
      hasMore = items.length === 500;
      page++;
      
      if (page > 10) break; // Limitar a 10 páginas para diagnóstico
    }
    
    console.log(`\n✅ Total de registros con campos de datos: ${allRecords.length}\n`);
    
    if (allRecords.length === 0) {
      console.log("❌ NO se encontraron registros con campos de datos");
      console.log("💡 Los registros pueden estar vacíos o solo tener metadata\n");
      return;
    }
    
    // Analizar campos vacíos
    const camposRequeridos = ['date', 'description', 'amount', 'type', 'category', 'merchant', 'currency'];
    const estadisticas: Record<string, FieldStats> = {};
    
    camposRequeridos.forEach(campo => {
      estadisticas[campo] = {
        empty: 0,
        filled: 0,
        nullCount: 0,
        undefinedCount: 0,
      };
    });
    
    allRecords.forEach((record: any) => {
      camposRequeridos.forEach(campo => {
        const valor = record[campo];
        
        if (valor === null) {
          estadisticas[campo].nullCount++;
          estadisticas[campo].empty++;
        } else if (valor === undefined) {
          estadisticas[campo].undefinedCount++;
          estadisticas[campo].empty++;
        } else if (String(valor).trim() === '') {
          estadisticas[campo].empty++;
        } else {
          estadisticas[campo].filled++;
        }
      });
    });
    
    // Mostrar estadísticas
    console.log("📊 Análisis de campos:\n");
    camposRequeridos.forEach(campo => {
      const stats = estadisticas[campo];
      const total = stats.empty + stats.filled;
      const porcentajeVacio = total > 0 ? ((stats.empty / total) * 100).toFixed(1) : 0;
      
      console.log(`   ${campo}:`);
      console.log(`      ✅ Con datos: ${stats.filled} (${(100 - parseFloat(porcentajeVacio)).toFixed(1)}%)`);
      console.log(`      ❌ Vacíos: ${stats.empty} (${porcentajeVacio}%)`);
      if (stats.nullCount > 0) console.log(`         - null: ${stats.nullCount}`);
      if (stats.undefinedCount > 0) console.log(`         - undefined: ${stats.undefinedCount}`);
      if (stats.empty - stats.nullCount - stats.undefinedCount > 0) {
        console.log(`         - string vacío: ${stats.empty - stats.nullCount - stats.undefinedCount}`);
      }
    });
    
    // Mostrar ejemplos de registros con campos vacíos
    console.log("\n🔍 Ejemplos de registros con campos vacíos:\n");
    let ejemplosMostrados = 0;
    for (const record of allRecords) {
      const camposVacios = camposRequeridos.filter(campo => {
        const valor = record[campo];
        return valor === null || valor === undefined || String(valor).trim() === '';
      });
      
      if (camposVacios.length > 0 && ejemplosMostrados < 5) {
        console.log(`   Registro ID: ${record.id}`);
        console.log(`   Campos vacíos: ${camposVacios.join(', ')}`);
        console.log(`   Estructura completa:`, JSON.stringify(record, null, 2));
        console.log("");
        ejemplosMostrados++;
      }
    }
    
    // Mostrar primeros 3 registros completos como referencia
    console.log("\n📋 Primeros 3 registros completos:\n");
    allRecords.slice(0, 3).forEach((record: any, idx: number) => {
      console.log(`   Registro ${idx + 1}:`);
      console.log(JSON.stringify(record, null, 2));
      console.log("");
    });
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

verificarCamposVacios();

