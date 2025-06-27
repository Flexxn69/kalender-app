// Hilfsfunktionen für wiederkehrende Termine
export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval?: number, // z.B. alle 2 Wochen
  count?: number, // wie oft
  until?: string // bis Datum (ISO)
}

export function getRecurringDates(startDate: string, rule: RecurrenceRule): string[] {
  // Dummy: gibt nur das Startdatum zurück
  // TODO: Implementiere echte Logik mit rrule.js oder date-fns
  return [startDate];
}
