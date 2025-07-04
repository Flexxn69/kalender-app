"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function ContactRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  // Funktion zum Nachladen der Requests
  const fetchRequests = () => {
    setLoading(true)
    fetch("/api/contact-requests", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setRequests(data))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    fetchRequests()
  }, [])

  async function handleAction(id: string, action: "accept" | "reject") {
    // PATCH-Request für Annahme/Ablehnung (wird gleich im Backend ergänzt)
    const res = await fetch(`/api/contact-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action })
    })
    if (res.ok) {
      fetchRequests() // Nach Annahme/Ablehnung neu laden
      toast({ title: action === "accept" ? "Kontakt hinzugefügt" : "Anfrage abgelehnt" })
      // In-App-Benachrichtigung für Annahme/Ablehnung
      if (typeof window !== "undefined") {
        const { addNotificationIfEnabled } = await import("@/lib/notify")
        addNotificationIfEnabled("contactRequest", {
          title: action === "accept" ? "Kontaktanfrage angenommen" : "Kontaktanfrage abgelehnt",
          description: action === "accept"
            ? "Du hast die Kontaktanfrage angenommen. Ihr seid jetzt verbunden."
            : "Du hast die Kontaktanfrage abgelehnt."
        })
      }
    } else {
      toast({ title: "Fehler", description: "Aktion fehlgeschlagen", variant: "destructive" })
    }
  }

  if (loading) return <div className="p-8 text-center">Lade Anfragen...</div>

  return (
    <div className="flex flex-col items-center min-h-[60vh] p-2 w-full max-w-full overflow-x-hidden">
      <Card className="w-full max-w-full">
        <CardHeader>
          <CardTitle>Kontaktanfragen</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 && <div className="text-muted-foreground">Keine Kontaktanfragen.</div>}
          <div className="flex flex-col gap-2 w-full">
            {requests.map((req) => (
              <div key={req.id} className="border-b py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
                <div>
                  {req.status === "pending" ? (
                    <>
                      <span className="font-medium">{req.from.name}</span> möchte dich als Kontakt hinzufügen.
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{req.from.name}</span> – <span className="text-xs">{req.status === "accepted" ? "Angenommen" : "Abgelehnt"}</span>
                    </>
                  )}
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" className="flex-1 sm:flex-none" onClick={() => handleAction(req.id, "accept")}>Annehmen</Button>
                    <Button size="sm" className="flex-1 sm:flex-none" variant="outline" onClick={() => handleAction(req.id, "reject")}>Ablehnen</Button>
                  </div>
                )}
                {req.status === "accepted" && (
                  <Button size="sm" className="flex-1 sm:flex-none" variant="secondary" onClick={() => router.push(`/profile/${req.from.id}`)}>
                    Profil ansehen
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
