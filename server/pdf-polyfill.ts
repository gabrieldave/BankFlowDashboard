// Polyfills para APIs del DOM necesarias para pdf-parse en Node.js
// Estos polyfills son críticos para evitar errores de "cannot be invoked without 'new'"

// Polyfill para DOMMatrix
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a: number = 1;
    b: number = 0;
    c: number = 0;
    d: number = 1;
    e: number = 0;
    f: number = 0;
    m11: number = 1;
    m12: number = 0;
    m13: number = 0;
    m14: number = 0;
    m21: number = 0;
    m22: number = 1;
    m23: number = 0;
    m24: number = 0;
    m31: number = 0;
    m32: number = 0;
    m33: number = 1;
    m34: number = 0;
    m41: number = 0;
    m42: number = 0;
    m43: number = 0;
    m44: number = 1;

    constructor(init?: string | number[]) {
      if (init) {
        // Implementación básica
      }
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

// Polyfill para DOMPoint
if (typeof globalThis.DOMPoint === 'undefined') {
  (globalThis as any).DOMPoint = class DOMPoint {
    x: number = 0;
    y: number = 0;
    z: number = 0;
    w: number = 1;

    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
  };
}

// Polyfill para AbortController (puede ser necesario para algunas versiones)
if (typeof globalThis.AbortController === 'undefined') {
  (globalThis as any).AbortController = class AbortController {
    signal: AbortSignal;

    constructor() {
      this.signal = new AbortSignal();
    }

    abort() {
      this.signal.aborted = true;
    }
  };

  (globalThis as any).AbortSignal = class AbortSignal {
    aborted: boolean = false;

    constructor() {
      this.aborted = false;
    }
  };
}

