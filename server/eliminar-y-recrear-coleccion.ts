/**
 * Script para eliminar y recrear la colección de transacciones con el schema correcto
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

// Helper para obtener la URL limpia de la API
function getApiUrl(): string {
  let apiUrl = POCKETBASE_URL.trim();
  if (apiUrl.endsWith("/_/")) {
    apiUrl = apiUrl.slice(0, -3);
  }
  if (!apiUrl.endsWith("/")) {
    apiUrl += "/";
  }
  return apiUrl;
}

async function eliminarYRecrear() {
  try {
    console.log("🗑️  Eliminando y recreando la colección 'transactions'...\n");
    console.log(`URL: ${POCKETBASE_URL}\n`);
    
    const apiUrl = getApiUrl();
    
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
    
    // Verificar si la colección existe
    console.log("📋 Verificando si la colección existe...");
    const checkResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (checkResponse.ok) {
      const collection = await checkResponse.json();
      const totalRecords = collection.schema?.length || 0;
      
      console.log(`✅ Colección encontrada`);
      console.log(`   - Campos en schema: ${collection.schema?.length || 0}`);
      console.log(`   - Total de registros: ${collection.totalItems || 'N/A'}\n`);
      
      // Obtener conteo de registros
      try {
        const recordsResponse = await fetch(`${apiUrl}api/collections/transactions/records?page=1&perPage=1`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (recordsResponse.ok) {
          const recordsData = await recordsResponse.json();
          console.log(`   - Total de registros: ${recordsData.totalItems || 0}\n`);
        }
      } catch (e) {
        // Ignorar error
      }
      
      // Eliminar la colección
      console.log("🗑️  Eliminando colección existente...");
      const deleteResponse = await fetch(`${apiUrl}api/collections/transactions`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      
      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(`Error eliminando colección: ${deleteResponse.status} - ${errorText}`);
      }
      
      console.log("✅ Colección eliminada exitosamente\n");
    } else if (checkResponse.status === 404) {
      console.log("ℹ️  La colección no existe, se creará nueva\n");
    } else {
      const errorText = await checkResponse.text();
      throw new Error(`Error verificando colección: ${checkResponse.status} - ${errorText}`);
    }
    
    // Crear la colección con el schema correcto
    console.log("📦 Creando colección con schema correcto...\n");
    
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
    
    const createResponse = await fetch(`${apiUrl}api/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(collectionData),
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Error creando colección: ${createResponse.status} - ${errorText}`);
    }
    
    const newCollection = await createResponse.json();
    console.log("✅ Colección creada exitosamente!");
    console.log(`   - Nombre: ${newCollection.name}`);
    console.log(`   - Tipo: ${newCollection.type}`);
    console.log(`   - Campos en schema: ${newCollection.schema?.length || 0}\n`);
    
    if (newCollection.schema && newCollection.schema.length > 0) {
      console.log("   Campos configurados:");
      newCollection.schema.forEach((field: any) => {
        console.log(`     - ${field.name} (${field.type}) ${field.required ? '[requerido]' : '[opcional]'}`);
      });
    }
    
    console.log("\n✅ ¡Colección recreada exitosamente!");
    console.log("💡 Ahora puedes volver a subir tus archivos CSV/PDF para crear transacciones con datos.\n");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

eliminarYRecrear();

