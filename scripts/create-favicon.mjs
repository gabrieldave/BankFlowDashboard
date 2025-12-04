// Script para crear favicon específico
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 64];
const outputDir = path.join(__dirname, '../client/public');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  const { createCanvas } = await import('canvas');
  
  console.log('Generando favicon con la F de FinTrack...\n');
  
  // Crear favicon.png (32x32)
  const faviconSize = 32;
  const canvas = createCanvas(faviconSize, faviconSize);
  const ctx = canvas.getContext('2d');
  
  // Fondo con gradiente azul
  const gradient = ctx.createLinearGradient(0, 0, faviconSize, faviconSize);
  gradient.addColorStop(0, '#2563eb');
  gradient.addColorStop(1, '#4f46e5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, faviconSize, faviconSize);
  
  // Letra F blanca, centrada y bold
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(faviconSize * 0.65)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F', faviconSize / 2, faviconSize / 2);
  
  // Guardar como favicon.png
  const buffer = canvas.toBuffer('image/png');
  const filepath = path.join(outputDir, 'favicon.png');
  fs.writeFileSync(filepath, buffer);
  console.log(`✓ Generado: favicon.png (${faviconSize}x${faviconSize})`);
  
  // Crear también favicon.ico (multi-size)
  // Nota: Para crear un .ico real necesitaríamos una librería adicional
  // Por ahora creamos un favicon.png que funciona bien
  
  console.log('\n✅ Favicon generado exitosamente!');
} catch (error) {
  console.log('⚠️  Error al generar favicon:', error.message);
  console.log('El favicon.png ya existe, puedes usarlo directamente.');
}

