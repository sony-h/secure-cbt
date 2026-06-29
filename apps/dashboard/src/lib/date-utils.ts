export function toWIB(date: Date | string): Date {
  const d = new Date(date);
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
}
export function formatDateWIB(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short' }).format(new Date(date));
}
export function dateToDatetimeLocal(date: Date): string { const wib = toWIB(date); return wib.toISOString().slice(0, 16); }
export function datetimeLocalToUTC(local: string): string { const wib = new Date(local + ':00+07:00'); return wib.toISOString(); }
