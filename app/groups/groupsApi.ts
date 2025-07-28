// API-Helper für Gruppen

export async function fetchGroups(userId: string) {
  const res = await fetch(`/api/groups?userId=${userId}`)
  if (!res.ok) throw new Error("Fehler beim Laden der Gruppen")
  return await res.json()
}

export async function addGroupApi({ name, description, members }: { name: string, description?: string, members: string[] }) {
  const res = await fetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, members })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Fehler beim Anlegen")
  }
  return await res.json()
}
