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

const PASSWORD_CHARS = '23456789abcdefghjkmnpqrstuvwxyz';

export function generateClassPassword(className: string): string {
  const cleaned = (className || '')
    .replace(/^(Kelas|Tingkat)\s*/i, '')
    .replace(/^(XII|XI|X|\d+)\b\s*/i, '')
    .trim();

  const match = cleaned.match(/[A-Za-z]+/);
  const prefix = (match ? match[0] : 'CBT').toUpperCase();

  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * PASSWORD_CHARS.length);
    randomPart += PASSWORD_CHARS[idx];
  }

  return `${prefix}-${randomPart}`;
}
