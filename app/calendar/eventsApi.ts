// API-Helper für Events

export async function fetchEvents(userId: string) {
  const res = await fetch(`/api/events?userId=${userId}`)
  if (!res.ok) throw new Error("Fehler beim Laden der Events")
  return await res.json()
}

export async function addEventApi({ userId, title, date, startTime, endTime, description }: { userId: string, title: string, date: string, startTime: string, endTime: string, description?: string }) {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, title, date, startTime, endTime, description })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Fehler beim Anlegen")
  }
  return await res.json()
}
