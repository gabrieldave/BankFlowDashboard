/**
 * Script para agregar campos al schema de la colección de transacciones
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

async function agregarCamposSchema() {
  try {
    console.log("🔧 Agregando campos al schema de la colección 'transactions'...\n");
    console.log(`URL: ${POCKETBASE_URL}\n`);
    
    // Limpiar URL
    let apiUrl = POCKETBASE_URL.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3);
    }
    if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }
    
    // Autenticar
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
    
    // Obtener información de la colección actual
    console.log("📋 Obteniendo información de la colección...");
    const collectionResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!collectionResponse.ok) {
      throw new Error(`Error obteniendo colección: ${collectionResponse.status}`);
    }
    
    const collection = await collectionResponse.json();
    console.log(`✅ Colección encontrada`);
    console.log(`   - Campos actuales en schema: ${collection.schema?.length || 0}\n`);
    
    // Definir los campos que necesitamos
    const camposRequeridos = [
      { name: "id_number", type: "number", required: false, options: {} },
      { name: "date", type: "text", required: true, options: {} },
      { name: "description", type: "text", required: true, options: {} },
      { name: "amount", type: "number", required: true, options: {} },
      { name: "type", type: "text", required: true, options: {} },
      { name: "category", type: "text", required: true, options: {} },
      { name: "merchant", type: "text", required: true, options: {} },
      { name: "currency", type: "text", required: true, options: { defaultValue: "MXN" } },
    ];
    
    // Verificar qué campos ya existen
    const schemaActual = collection.schema || [];
    const nombresExistentes = new Set(schemaActual.map((f: any) => f.name));
    
    console.log("📊 Campos existentes:");
    if (schemaActual.length === 0) {
      console.log("   (ninguno)");
    } else {
      schemaActual.forEach((field: any) => {
        console.log(`   - ${field.name} (${field.type})`);
      });
    }
    console.log("");
    
    // Agregar campos faltantes
    const camposAAgregar = camposRequeridos.filter(campo => !nombresExistentes.has(campo.name));
    
    if (camposAAgregar.length === 0) {
      console.log("✅ Todos los campos ya están en el schema\n");
      return;
    }
    
    console.log(`🔧 Agregando ${camposAAgregar.length} campos al schema...\n`);
    
    // Agregar cada campo uno por uno
    for (const campo of camposAAgregar) {
      console.log(`   Agregando campo: ${campo.name} (${campo.type})...`);
      
      // Construir el campo según el formato de PocketBase
      const campoPocketBase: any = {
        name: campo.name,
        type: campo.type,
        required: campo.required,
        ...campo.options,
      };
      
      // Agregar el campo al schema existente
      const nuevoSchema = [...schemaActual, campoPocketBase];
      
      // Actualizar la colección
      const updateData = {
        ...collection,
        schema: nuevoSchema,
      };
      
      const updateResponse = await fetch(`${apiUrl}api/collections/transactions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.log(`   ❌ Error agregando campo ${campo.name}: ${errorText}`);
        throw new Error(`Error agregando campo ${campo.name}: ${updateResponse.status} - ${errorText}`);
      }
      
      // Actualizar el schema actual para la siguiente iteración
      schemaActual.push(campoPocketBase);
      console.log(`   ✅ Campo ${campo.name} agregado exitosamente`);
    }
    
    console.log("\n✅ Todos los campos agregados exitosamente\n");
    
    // Verificar el resultado final
    console.log("📋 Verificando schema final...");
    const finalResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (finalResponse.ok) {
      const finalCollection = await finalResponse.json();
      console.log(`✅ Schema final tiene ${finalCollection.schema?.length || 0} campos:`);
      finalCollection.schema?.forEach((field: any) => {
        console.log(`   - ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
      });
    }
    
    console.log("\n💡 NOTA: Los campos se han agregado al schema, pero los registros existentes seguirán vacíos.");
    console.log("💡 Necesitarás volver a subir los archivos o migrar los datos existentes.\n");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

agregarCamposSchema();

