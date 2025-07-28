// API-Helper für Kontakte

export async function fetchContacts(userId: string) {
  const res = await fetch(`/api/contacts?userId=${userId}`)
  if (!res.ok) throw new Error("Fehler beim Laden der Kontakte")
  return await res.json()
}

export async function addContactApi({ userId, name, email, phone, status }: { userId: string, name: string, email: string, phone?: string, status?: string }) {
  const res = await fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, name, email, phone, status })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Fehler beim Hinzufügen")
  }
  return await res.json()
}
