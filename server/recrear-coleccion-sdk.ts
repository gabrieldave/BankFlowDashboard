/**
 * Script para eliminar y recrear la colección de transacciones usando el SDK de PocketBase
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

async function recrearColeccion() {
  try {
    console.log("🗑️  Eliminando y recreando la colección 'transactions' usando SDK...\n");
    console.log(`URL: ${POCKETBASE_URL}\n`);
    
    // Importar PocketBase SDK
    const { default: PocketBase } = await import("pocketbase");
    
    // Limpiar URL para el SDK
    let apiUrl = POCKETBASE_URL.trim();
    if (apiUrl.endsWith("/_/")) {
      apiUrl = apiUrl.slice(0, -3);
    }
    if (!apiUrl.endsWith("/")) {
      apiUrl += "/";
    }
    
    const pb = new PocketBase(apiUrl);
    
    // Autenticar
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error("POCKETBASE_ADMIN_EMAIL y POCKETBASE_ADMIN_PASSWORD son requeridos");
    }
    
    console.log("🔐 Autenticando...");
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✅ Autenticación exitosa\n");
    
    // Verificar si la colección existe
    console.log("📋 Verificando si la colección existe...");
    try {
      const collection = await pb.collections.getOne('transactions');
      console.log(`✅ Colección encontrada`);
      console.log(`   - Campos en schema: ${collection.schema?.length || 0}\n`);
      
      // Obtener conteo de registros
      try {
        const records = await pb.collection('transactions').getList(1, 1);
        console.log(`   - Total de registros: ${records.totalItems || 0}\n`);
      } catch (e) {
        // Ignorar error
      }
      
      // Eliminar la colección
      console.log("🗑️  Eliminando colección existente...");
      await pb.collections.delete('transactions');
      console.log("✅ Colección eliminada exitosamente\n");
    } catch (error: any) {
      if (error.status === 404) {
        console.log("ℹ️  La colección no existe, se creará nueva\n");
      } else {
        throw error;
      }
    }
    
    // Crear la colección con el schema correcto usando el SDK
    console.log("📦 Creando colección con schema correcto usando SDK...\n");
    
    const collectionData = {
      name: "transactions",
      type: "base",
      schema: [
        { name: "id_number", type: "number", required: false },
        { name: "date", type: "text", required: true },
        { name: "description", type: "text", required: true },
        { name: "amount", type: "number", required: true },
        { name: "type", type: "text", required: true },
        { name: "category", type: "text", required: true },
        { name: "merchant", type: "text", required: true },
        { name: "currency", type: "text", required: true, options: { defaultValue: "MXN" } },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    };
    
    const newCollection = await pb.collections.create(collectionData);
    
    console.log("✅ Colección creada exitosamente!");
    console.log(`   - Nombre: ${newCollection.name}`);
    console.log(`   - Tipo: ${newCollection.type}`);
    console.log(`   - Campos en schema: ${newCollection.schema?.length || 0}\n`);
    
    if (newCollection.schema && newCollection.schema.length > 0) {
      console.log("   Campos configurados:");
      newCollection.schema.forEach((field: any) => {
        console.log(`     - ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
      });
      console.log("");
    }
    
    // Verificar que los campos se guardaron
    console.log("🔍 Verificando schema guardado...");
    const verifyCollection = await pb.collections.getOne('transactions');
    console.log(`✅ Schema verificado: ${verifyCollection.schema?.length || 0} campos\n`);
    
    if (verifyCollection.schema && verifyCollection.schema.length > 0) {
      console.log("✅ ¡Colección recreada exitosamente con todos los campos!");
      console.log("💡 Ahora puedes volver a subir tus archivos CSV/PDF para crear transacciones con datos.\n");
    } else {
      console.log("⚠️  Advertencia: El schema no tiene campos después de crearse.");
      console.log("💡 Esto puede indicar un problema con la versión de PocketBase o la configuración.\n");
    }
    
  } catch (error: any) {
    if (error.message.includes("Cannot find module")) {
      console.error("❌ El SDK de PocketBase no está instalado.");
      console.log("   Ejecuta: npm install pocketbase");
    } else {
      console.error("❌ Error:", error.message);
      console.error("Stack:", error.stack);
      if (error.response) {
        console.error("Response:", JSON.stringify(error.response, null, 2));
      }
    }
    process.exit(1);
  }
}

recrearColeccion();

