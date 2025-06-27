import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function GroupCalendars() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Gruppenkalender
        </CardTitle>
        <CardDescription>Ihre gemeinsamen Kalender</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {groupCalendars.map((group, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{group.name}</div>
                  <Badge variant={group.unread ? "default" : "outline"}>
                    {group.unread ? `${group.unread} neu` : "Aktuell"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">{group.members} Mitglieder</div>
                <div className="text-sm text-muted-foreground">Nächster Termin: {group.nextEvent}</div>
              </div>
            </div>
          ))}

          <Button variant="outline" asChild className="w-full mt-4">
            <Link href="/groups">Alle Gruppen anzeigen</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const groupCalendars = [
  {
    name: "Marketing Team",
    members: 8,
    unread: 3,
    nextEvent: "Team Meeting (15. Mai)",
  },
  {
    name: "Familie",
    members: 4,
    unread: 0,
    nextEvent: "Grillabend (22. Mai)",
  },
  {
    name: "Projektteam Alpha",
    members: 6,
    unread: 2,
    nextEvent: "Projektabgabe (15. Mai)",
  },
  {
    name: "Fußballmannschaft",
    members: 15,
    unread: 0,
    nextEvent: "Training (17. Mai)",
  },
]
