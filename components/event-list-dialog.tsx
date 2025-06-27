import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Event } from "@/lib/store"

type EventListDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: Event[]
  onEventClick: (event: Event) => void
  date: Date
}

export function EventListDialog({
  open,
  onOpenChange,
  events,
  onEventClick,
  date,
}: EventListDialogProps) {
  // Formatiere das Datum für den Titel
  const dateStr = date.toLocaleDateString("de-DE", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const getCategoryColorClass = (category: string) => {
    switch (category) {
      case "Arbeit":
        return "bg-blue-100 dark:bg-blue-900/30"
      case "Persönlich":
        return "bg-green-100 dark:bg-green-900/30"
      case "Wichtig":
        return "bg-red-100 dark:bg-red-900/30"
      case "Freizeit":
        return "bg-yellow-100 dark:bg-yellow-900/30"
      default:
        return "bg-purple-100 dark:bg-purple-900/30"
    }
  }

  // Sortiere Termine nach Startzeit
  const sortedEvents = [...events].sort((a, b) => 
    a.startTime.localeCompare(b.startTime)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Termine am {dateStr}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] mt-4">
          <div className="space-y-2">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity",
                  getCategoryColorClass(event.category)
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {event.startTime} - {event.endTime}
                  </div>
                </div>
                {event.location && (
                  <div className="text-sm text-muted-foreground mt-1">
                    📍 {event.location}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
