// Script simple para probar si el servidor puede iniciar
console.log('Probando inicio del servidor...\n');

try {
  console.log('1. Verificando Node.js...');
  console.log('   Node version:', process.version);
  
  console.log('\n2. Verificando módulos...');
  const express = require('express');
  console.log('   ✓ express cargado');
  
  const http = require('http');
  console.log('   ✓ http cargado');
  
  console.log('\n3. Creando servidor básico...');
  const app = express();
  const server = http.createServer(app);
  
  app.get('/', (req, res) => {
    res.send('Servidor funcionando!');
  });
  
  const port = 5000;
  server.listen(port, () => {
    console.log(`\n✅ SERVIDOR INICIADO EN PUERTO ${port}`);
    console.log(`   Abre: http://localhost:${port}`);
    console.log('\n   Presiona Ctrl+C para detener\n');
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`\n❌ ERROR: El puerto ${port} ya está en uso`);
      console.log('   Cierra otras aplicaciones que usen el puerto 5000\n');
    } else {
      console.log('\n❌ ERROR:', err.message);
    }
    process.exit(1);
  });
  
} catch (error) {
  console.log('\n❌ ERROR AL INICIAR:');
  console.log('   Mensaje:', error.message);
  console.log('   Stack:', error.stack);
  process.exit(1);
}







