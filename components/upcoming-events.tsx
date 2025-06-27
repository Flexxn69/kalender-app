"use client"

import type { Event } from "@/components/event-dialog"

export function UpcomingEvents({
  events,
  onEditEvent,
  showAll = false,
}: {
  events: Event[]
  onEditEvent?: (event: Event) => void
  showAll?: boolean
}) {
  // Filtere: nur zukünftige Termine und der gerade laufende
  const now = new Date()
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    if (event.startTime) {
      const [h, m] = event.startTime.split(":").map(Number)
      eventDate.setHours(h, m, 0, 0)
    }
    const eventEnd = new Date(eventDate)
    if (event.endTime) {
      const [eh, em] = event.endTime.split(":").map(Number)
      eventEnd.setHours(eh, em, 0, 0)
    } else {
      eventEnd.setHours(23, 59, 59, 999)
    }
    // Zeige, wenn Event noch nicht vorbei ist (endet in der Zukunft) ODER gerade läuft (jetzt >= start && jetzt <= end)
    return eventEnd >= now
  }).sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    if (a.startTime) {
      const [h, m] = a.startTime.split(":").map(Number)
      dateA.setHours(h, m, 0, 0)
    }
    if (b.startTime) {
      const [h, m] = b.startTime.split(":").map(Number)
      dateB.setHours(h, m, 0, 0)
    }
    return dateA.getTime() - dateB.getTime()
  })

  // Hilfsfunktion: Prüfe, ob das Event noch in der aktuellen Liste ist
  function handleEdit(event: Event) {
    // Falls das Event schon gelöscht ist, tue nichts!
    const stillExists = events.some(e => e.id === event.id)
    if (stillExists && onEditEvent) {
      onEditEvent(event)
    }
  }

  return (
    <div className="space-y-4">
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md"
              onClick={() => handleEdit(event)}
            >
              <div className="h-2 w-2 mt-1.5 rounded-full bg-primary" />
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(event.date).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                  , {event.startTime} - {event.endTime}
                </div>
                {event.location && <div className="text-xs text-muted-foreground mt-1">{event.location}</div>}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-4">Keine bevorstehenden Termine</div>
        )}
      </div>
    </div>
  )
}
