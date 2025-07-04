"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function UserProfilePage() {
  const params = useParams()
  const { toast } = useToast()
  const userId = params.userId as string
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [requestSent, setRequestSent] = useState(false)
  const [groups, setGroups] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    if (!userId) return
    fetch(`/api/users?id=${userId}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .finally(() => setLoading(false))
    // Gemeinsame Gruppen laden
    fetch(`/api/groups?memberId=${userId}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setGroups(data))
    // Events laden (Dummy: alle Events des Users)
    fetch(`/api/events/all-for-user?userId=${userId}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setEvents(data))
  }, [userId])

  async function sendContactRequest() {
    const res = await fetch("/api/contact-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ toId: userId })
    })
    if (res.ok) {
      setRequestSent(true)
      toast({ title: "Anfrage gesendet", description: "Kontaktanfrage wurde verschickt." })
    } else {
      const err = await res.json()
      toast({ title: "Fehler", description: err.error || "Anfrage fehlgeschlagen", variant: "destructive" })
    }
  }

  if (loading) return <div className="p-8 text-center">Lade Profil...</div>
  if (!user) return <div className="p-8 text-center">Nutzer nicht gefunden.</div>

  return (
    <div className="flex justify-center items-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="font-bold text-lg">{user.name}</div>
            <div className="text-muted-foreground text-sm">{user.email}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant={user.status === "online" ? "success" : "secondary"}>{user.status || "offline"}</Badge>
            </div>
          </div>
          <Button onClick={sendContactRequest} disabled={requestSent} className="mb-4 w-full">
            {requestSent ? "Anfrage gesendet" : "Kontaktanfrage senden"}
          </Button>
          <div className="mb-2">
            <div className="font-semibold mb-1">Gemeinsame Gruppen</div>
            {groups.length === 0 ? <div className="text-xs text-muted-foreground">Keine gemeinsamen Gruppen.</div> : (
              <ul className="list-disc pl-4 text-xs">
                {groups.map((g: any) => <li key={g.id}>{g.name}</li>)}
              </ul>
            )}
          </div>
          <div>
            <div className="font-semibold mb-1">Events</div>
            {events.length === 0 ? <div className="text-xs text-muted-foreground">Keine Events.</div> : (
              <ul className="list-disc pl-4 text-xs">
                {events.map((e: any) => <li key={e.id}>{e.title} ({e.date})</li>)}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
