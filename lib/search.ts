// Einfache Suchfunktion für Events, Kontakte, Nachrichten
export function searchItems<T extends { [k: string]: any }>(items: T[], query: string, fields: (keyof T)[]): T[] {
  const q = query.toLowerCase();
  return items.filter(item => fields.some(f => (item[f]||'').toString().toLowerCase().includes(q)));
}
