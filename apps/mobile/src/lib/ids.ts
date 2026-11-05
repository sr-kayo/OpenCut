let sequence = 0;

export function newId(prefix: string): string {
  sequence += 1;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}_${sequence.toString(36)}_${random}`;
}
