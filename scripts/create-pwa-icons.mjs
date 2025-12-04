// Script simple para crear iconos PWA
// Usa el paquete canvas si está disponible, sino genera instrucciones

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outputDir = path.join(__dirname, '../client/public');

// Crear directorio si no existe
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  // Intentar usar canvas
  const { createCanvas } = await import('canvas');
  
  console.log('Generando iconos PWA con canvas...\n');
  
  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Fondo con gradiente azul
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2563eb');
    gradient.addColorStop(1, '#4f46e5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Letra F blanca, centrada y bold
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(size * 0.6)}px 'Arial', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', size / 2, size / 2);
    
    // Guardar como PNG
    const buffer = canvas.toBuffer('image/png');
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`✓ Generado: ${filename}`);
  });
  
  console.log('\n✅ Todos los iconos generados exitosamente!');
} catch (error) {
  console.log('⚠️  Canvas no disponible. Usa el generador HTML:');
  console.log('   1. Abre client/public/icon-generator.html en tu navegador');
  console.log('   2. Haz clic en "Generar Iconos"');
  console.log('   3. Los iconos se descargarán automáticamente');
  console.log('   4. Mueve los iconos a client/public/');
}

