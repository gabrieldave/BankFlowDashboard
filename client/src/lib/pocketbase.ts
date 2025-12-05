import PocketBase from 'pocketbase';

// Obtener la URL de PocketBase desde las variables de entorno o usar la URL por defecto
const getPocketBaseUrl = (): string => {
  // En el cliente, podemos usar una variable de entorno o una URL por defecto
  // En producción, esto debería venir de las variables de entorno del servidor
  const url = import.meta.env.VITE_POCKETBASE_URL || 'https://estadosdecuenta-db.david-cloud.online/_/';
  
  // Remover /_/ si existe para la API
  if (url.endsWith('/_/')) {
    return url.replace('/_/', '/');
  }
  return url;
};

export const pb = new PocketBase(getPocketBaseUrl());

// Configurar para que funcione con certificados SSL
if (typeof window !== 'undefined') {
  // En el navegador, no necesitamos configurar SSL
  // Pero podemos configurar otras opciones si es necesario
}

export default pb;




