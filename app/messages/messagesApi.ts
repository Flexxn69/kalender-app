// API-Helper für Nachrichten

export async function fetchMessages(conversationId: string) {
  const res = await fetch(`/api/messages?conversationId=${conversationId}`)
  if (!res.ok) throw new Error("Fehler beim Laden der Nachrichten")
  return await res.json()
}

export async function sendMessageApi({ conversationId, senderId, text }: { conversationId: string, senderId: string, text: string }) {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, senderId, text })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Fehler beim Senden")
  }
  return await res.json()
}
