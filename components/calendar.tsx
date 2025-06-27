"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { EventDialog, type Event } from "@/components/event-dialog"
import { useToast } from "@/hooks/use-toast"
import { EventListDialog } from "@/components/event-list-dialog"

type Contact = {
  id: string
  name: string
  email: string
  avatarUrl?: string
}
type GroupMember = {
  id: string
  name: string
  email: string
  role: "Admin" | "Mitglied"
}
type Group = {
  id: string
  name: string
  description: string
  members: GroupMember[]
}

type CalendarProps = {
  className?: string
  events: Event[]
  onEventAdd?: (event: Event) => "created" | false
  onEventUpdate?: (event: Event) => "updated" | false
  onEventDelete?: (id: string) => void
  type?: "personal" | "group" | "all"
  contacts?: Contact[]
  groups?: Group[]
  currentUserId?: string
  view?: "day" | "week" | "month"
  onViewChange?: (view: "day" | "week" | "month") => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
}

type ViewType = "day" | "week" | "month"

export function Calendar({
  className,
  events = [],
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  type = "all",
  contacts = [],
  groups = [],
  currentUserId,
  view: externalView,
  onViewChange,
  currentDate: externalDate,
  onDateChange,
}: CalendarProps) {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date())
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined)
  const [internalView, setInternalView] = useState<ViewType>("month")
  const { toast } = useToast()
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    events: Event[]
    date: Date
  } | null>(null)

  // Use external props if provided, otherwise use internal state
  const currentDate = externalDate || internalCurrentDate
  const view = externalView || internalView

  const setCurrentDate = (date: Date) => {
    if (onDateChange) {
      onDateChange(date)
    } else {
      setInternalCurrentDate(date)
    }
  }

  const setView = (newView: ViewType) => {
    if (onViewChange) {
      onViewChange(newView)
    } else {
      setInternalView(newView)
    }
  }

  // Normalisiere Events - IMMER Date-Objekt!
  const normalizedEvents = events.map((ev) => ({
    ...ev,
    date: ev.date instanceof Date ? ev.date : new Date(ev.date),
  }))

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const prevPeriod = () => {
    if (view === "day") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1))
    } else if (view === "week") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }
  }

  const nextPeriod = () => {
    if (view === "day") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1))
    } else if (view === "week") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }
  }

  const toggleView = () => {
    if (view === "month") setView("week")
    else if (view === "week") setView("day")
    else setView("month")
  }

  const monthName = currentDate.toLocaleString("de-DE", { month: "long" })
  const year = currentDate.getFullYear()
  const dayName = currentDate.toLocaleString("de-DE", { weekday: "long" })
  const dayNumber = currentDate.getDate()
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const handleEditEvent = (event: Event) => {
    const eventCopy = {
      ...event,
      date: event.date instanceof Date ? new Date(event.date) : new Date(event.date),
    }
    setSelectedEvent(eventCopy)
    setEventDialogOpen(true)
  }

  const handleSaveEvent = (event: Event) => {
    let result: "created" | "updated" | false | undefined = false
    if (selectedEvent) {
      if (onEventUpdate) result = onEventUpdate(event)
      if (result === "updated") {
        toast({
          title: "Termin aktualisiert",
          description: `"${event.title}" wurde erfolgreich aktualisiert.`,
        })
        setEventDialogOpen(false)
        setSelectedEvent(undefined)
      }
    } else {
      if (onEventAdd) result = onEventAdd(event)
      if (result === "created") {
        toast({
          title: "Termin erstellt",
          description: `"${event.title}" wurde erfolgreich erstellt.`,
        })
        setEventDialogOpen(false)
        setSelectedEvent(undefined)
      }
    }
    return result
  }

  const handleDeleteEvent = (id: string) => {
    if (onEventDelete) {
      onEventDelete(id)
      toast({
        title: "Termin gelöscht",
        description: "Der Termin wurde erfolgreich gelöscht.",
        variant: "destructive",
      })
    }
  }

  // Monatsansicht
  const getEventsForDay = (day: number) => {
    return normalizedEvents.filter((event) => {
      const eventDate = event.date
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      )
    })
  }

  const getWeekDays = () => {
    const firstDayOfWeek = new Date(currentDate)
    const day = currentDate.getDay()
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1)
    firstDayOfWeek.setDate(diff)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(firstDayOfWeek)
      date.setDate(date.getDate() + i)
      return {
        date,
        dayName: date.toLocaleString("de-DE", { weekday: "short" }),
        dayNumber: date.getDate(),
        isToday:
          date.getDate() === new Date().getDate() &&
          date.getMonth() === new Date().getMonth() &&
          date.getFullYear() === new Date().getFullYear(),
      }
    })
  }

  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {Array.from({ length: adjustedFirstDay }).map((_, index) => (
          <div key={`empty-${index}`} className="h-24 p-1 border rounded-md bg-muted/20" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const dayEvents = getEventsForDay(day)
          return (
            <div
              key={`day-${day}`}
              className={cn(
                "h-24 p-1 border rounded-md hover:bg-accent/50 transition-colors",
                new Date().getDate() === day &&
                  new Date().getMonth() === currentDate.getMonth() &&
                  new Date().getFullYear() === currentDate.getFullYear()
                  ? "bg-accent/30 border-primary"
                  : "",
              )}
            >
              <div className="text-sm font-medium mb-1">{day}</div>
              <div className="space-y-1">
                {dayEvents.length >= 2 ? (
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-1 text-xs font-medium"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedDayEvents({
                        events: dayEvents,
                        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
                      })
                    }}
                  >
                    {dayEvents.length} Termine anzeigen
                  </Button>
                ) : (
                  dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn("text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 bg-primary/20")}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditEvent(event)
                      }}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-[10px] opacity-80">{event.startTime}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderWeekView = () => {
    const weekDays = getWeekDays()
    const hours = Array.from({ length: 24 }, (_, i) => i)

    return (
      <div className="flex flex-col">
        {/* Header mit Wochentagen */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="h-12"></div> {/* Leerer Platz für Uhrzeiten */}
          {weekDays.map((day) => (
            <div key={day.date.toISOString()} className="h-12 flex flex-col items-center justify-center border rounded">
              <div className="text-xs text-muted-foreground">{day.dayName}</div>
              <div className={cn("text-lg font-medium", day.isToday ? "text-primary" : "")}>{day.dayNumber}</div>
            </div>
          ))}
        </div>

        {/* Stundenraster */}
        <div className="grid grid-cols-8 gap-1 max-h-96 overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="h-12 flex items-center justify-center text-xs text-muted-foreground border-r">
                {hour.toString().padStart(2, "0")}:00
              </div>
              {weekDays.map((day) => {
                const dayEvents = normalizedEvents.filter((event) => {
                  const eventDate = event.date
                  return (
                    eventDate.getDate() === day.date.getDate() &&
                    eventDate.getMonth() === day.date.getMonth() &&
                    eventDate.getFullYear() === day.date.getFullYear() &&
                    Number.parseInt(event.startTime.split(":")[0]) === hour
                  )
                })

                return (
                  <div key={`${day.date.toISOString()}-${hour}`} className="h-12 border rounded p-1 relative">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className="absolute inset-1 bg-primary/20 rounded text-xs p-1 cursor-pointer hover:bg-primary/30"
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const dayEvents = normalizedEvents.filter((event) => {
      const eventDate = event.date
      return (
        eventDate.getDate() === currentDate.getDate() &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      )
    })

    return (
      <div className="max-h-96 overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter((event) => Number.parseInt(event.startTime.split(":")[0]) === hour)

          return (
            <div key={hour} className="flex border-b">
              <div className="w-16 flex items-center justify-center text-xs text-muted-foreground py-4">
                {hour.toString().padStart(2, "0")}:00
              </div>
              <div className="flex-1 min-h-16 p-2 relative">
                {hourEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-primary/20 rounded p-2 mb-1 cursor-pointer hover:bg-primary/30"
                    onClick={() => handleEditEvent(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {event.startTime} - {event.endTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderView = () => {
    switch (view) {
      case "day":
        return renderDayView()
      case "week":
        return renderWeekView()
      default:
        return renderMonthView()
    }
  }

  const getViewTitle = () => {
    if (view === "day") {
      return `${dayName}, ${dayNumber}. ${monthName} ${year}`
    } else if (view === "week") {
      const weekDays = getWeekDays()
      const firstDay = weekDays[0]
      const lastDay = weekDays[6]
      const firstMonth = firstDay.date.toLocaleString("de-DE", { month: "long" })
      const lastMonth = lastDay.date.toLocaleString("de-DE", { month: "long" })
      if (firstMonth === lastMonth) {
        return `${firstDay.dayNumber}. - ${lastDay.dayNumber}. ${firstMonth} ${year}`
      } else {
        return `${firstDay.dayNumber}. ${firstMonth} - ${lastDay.dayNumber}. ${lastMonth} ${year}`
      }
    } else {
      return `${monthName} ${year}`
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{getViewTitle()}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={toggleView}>
            {view === "month" ? "Monat" : view === "week" ? "Woche" : "Tag"}
          </Button>
          <Button variant="outline" size="icon" onClick={nextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {renderView()}

      <EventDialog
        event={selectedEvent}
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        contacts={contacts}
        groups={groups}
        currentUserId={currentUserId}
        showParticipants={false}
        forcedParticipants={selectedEvent?.sharedWith}
      />

      <EventListDialog
        open={!!selectedDayEvents}
        onOpenChange={(open) => !open && setSelectedDayEvents(null)}
        events={selectedDayEvents?.events ?? []}
        date={selectedDayEvents?.date ?? new Date()}
        onEventClick={(event) => {
          handleEditEvent(event)
          setSelectedDayEvents(null)
        }}
        getCategoryColorClass={() => ""}
      />
    </div>
  )
}
