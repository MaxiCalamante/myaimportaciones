// Rechazo elimina el sesgo del módulo. El servidor suministra randomBytes de Node.
export function secureIndex(size: number, word: () => number) {
  if (!Number.isInteger(size) || size < 1 || size > 50000) throw new Error('Cantidad de participantes inválida.');
  const ceiling = Math.floor(0x100000000 / size) * size;
  const words: number[] = [];
  for (let tries = 0; tries < 1000; tries++) {
    const value = word();
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Entropía inválida.');
    words.push(value);
    if (value < ceiling) return { index: value % size, words, ceiling };
  }
  throw new Error('No se pudo completar la selección aleatoria.');
}
