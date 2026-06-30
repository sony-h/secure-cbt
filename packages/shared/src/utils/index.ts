export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp: T = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}
