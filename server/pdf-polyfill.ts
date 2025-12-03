// Polyfill para DOMMatrix en Node.js (necesario para pdf-parse)
if (typeof globalThis.DOMMatrix === 'undefined') {
  // Crear un polyfill básico para DOMMatrix
  (globalThis as any).DOMMatrix = class DOMMatrix {
    constructor(init?: string | number[]) {
      // Implementación básica para evitar errores
    }
    static fromMatrix(other?: any) {
      return new DOMMatrix();
    }
    static fromFloat32Array(array: Float32Array) {
      return new DOMMatrix();
    }
    static fromFloat64Array(array: Float64Array) {
      return new DOMMatrix();
    }
  };
}

// También polyfill para otras APIs del DOM que puedan necesitarse
if (typeof globalThis.DOMPoint === 'undefined') {
  (globalThis as any).DOMPoint = class DOMPoint {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
    x: number;
    y: number;
    z: number;
    w: number;
  };
}

