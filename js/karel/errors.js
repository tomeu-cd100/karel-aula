// Error que veu l'alumne: missatge en català i, si se sap, la línia del programa.

export class KarelError extends Error {
  constructor(message, line = null) {
    super(message);
    this.name = 'KarelError';
    this.line = line;
  }

  get display() {
    return this.line ? `Línia ${this.line}: ${this.message}` : this.message;
  }
}
