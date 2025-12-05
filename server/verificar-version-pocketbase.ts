/**
 * Verificar versión de PocketBase y usar API de admin
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

async function verificarYCorregir() {
  try {
    console.log("🔍 VERIFICANDO VERSIÓN Y USANDO API DE ADMIN\n");
    console.log("=" .repeat(60));
    console.log("\n");
    
    const apiUrl = getApiUrl();
    
    // Autenticar como admin usando el endpoint correcto
    console.log("🔐 Autenticando como admin...");
    
    // Intentar con el endpoint de admins (v0.22 y anteriores)
    let token: string;
    let authMethod = "";
    
    try {
      const authResponse = await fetch(`${apiUrl}api/admins/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        }),
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        token = authData.token;
        authMethod = "admins";
        console.log("✅ Autenticación exitosa usando endpoint 'admins'\n");
      } else {
        throw new Error("Endpoint admins no disponible");
      }
    } catch (e) {
      // Intentar con _superusers (v0.23+)
      console.log("   Intentando con endpoint '_superusers'...");
      const authResponse = await fetch(`${apiUrl}api/collections/_superusers/auth-with-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        }),
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        token = authData.token;
        authMethod = "_superusers";
        console.log("✅ Autenticación exitosa usando endpoint '_superusers'\n");
      } else {
        const errorText = await authResponse.text();
        throw new Error(`Error de autenticación: ${errorText}`);
      }
    }
    
    // Verificar versión de PocketBase
    console.log("📋 Verificando información del servidor...");
    try {
      const healthResponse = await fetch(`${apiUrl}api/health`);
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        console.log("   Información del servidor:", JSON.stringify(health, null, 2));
      }
    } catch (e) {
      // Ignorar si no hay endpoint de health
    }
    
    // Obtener información de la colección
    console.log("\n📦 Verificando colección 'transactions'...\n");
    
    const collectionResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!collectionResponse.ok) {
      throw new Error(`Error obteniendo colección: ${collectionResponse.status}`);
    }
    
    const collection = await collectionResponse.json();
    console.log(`   ID: ${collection.id}`);
    console.log(`   Nombre: ${collection.name}`);
    console.log(`   Tipo: ${collection.type}`);
    console.log(`   Campos en schema: ${collection.schema?.length || 0}\n`);
    
    // Eliminar la colección
    console.log("🗑️  Eliminando colección...");
    const deleteResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Error eliminando: ${errorText}`);
    }
    
    console.log("✅ Colección eliminada\n");
    
    // Esperar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Crear colección usando formato exacto de la API
    console.log("📦 Creando colección con formato exacto de API...\n");
    
    const collectionData = {
      name: "transactions",
      type: "base",
      schema: [
        {
          name: "id_number",
          type: "number",
          required: false,
        },
        {
          name: "date",
          type: "text",
          required: true,
        },
        {
          name: "description",
          type: "text",
          required: true,
        },
        {
          name: "amount",
          type: "number",
          required: true,
        },
        {
          name: "type",
          type: "text",
          required: true,
        },
        {
          name: "category",
          type: "text",
          required: true,
        },
        {
          name: "merchant",
          type: "text",
          required: true,
        },
        {
          name: "currency",
          type: "text",
          required: true,
          options: {
            defaultValue: "MXN",
          },
        },
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    };
    
    console.log("   Enviando datos de creación...");
    console.log("   Schema enviado:", JSON.stringify(collectionData.schema, null, 2));
    
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
      throw new Error(`Error creando: ${errorText}`);
    }
    
    const createdCollection = await createResponse.json();
    console.log("✅ Colección creada");
    console.log(`   - ID: ${createdCollection.id}`);
    console.log(`   - Nombre: ${createdCollection.name}`);
    
    // Verificar inmediatamente
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const verifyResponse = await fetch(`${apiUrl}api/collections/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    const verifyCollection = await verifyResponse.json();
    console.log(`\n   - Campos en schema después de crear: ${verifyCollection.schema?.length || 0}`);
    
    if (verifyCollection.schema && verifyCollection.schema.length > 0) {
      console.log("\n✅ ¡ÉXITO! Campos guardados:\n");
      verifyCollection.schema.forEach((field: any, idx: number) => {
        console.log(`   ${idx + 1}. ${field.name} (${field.type})`);
      });
    } else {
      console.log("\n❌ PROBLEMA: Los campos no se guardaron");
      console.log("   Collection completa:", JSON.stringify(verifyCollection, null, 2));
    }
    
  } catch (error: any) {
    console.error("\n❌ ERROR:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

verificarYCorregir();


