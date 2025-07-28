"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UpcomingEvents } from "@/components/upcoming-events"
import type { Event } from "@/lib/store"
import { EventDialog } from "@/components/event-dialog"
import { useAppStore } from "@/lib/store"
import { addNotificationIfEnabled } from "@/lib/notify"
import { fetchEvents, addEventApi } from "./eventsApi"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Bell } from "lucide-react"

function normalizeDateToMidnight(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateString(d: Date | string) {
  if (!d) return ""
  const dateObj = typeof d === "string" ? new Date(d) : d
  dateObj.setHours(0, 0, 0, 0)
  return dateObj.toISOString().slice(0, 10)
}

type Reminder = {
  id: string
  title: string
  date: string
  time: string
  repeat: "none" | "yearly"
  reminderAdvance: string
}

function formatGermanDate(dateStr: string, timeStr?: string) {
  if (!dateStr) return ""
  const date = new Date(dateStr + (timeStr ? "T" + timeStr : ""))
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }
  let result = date.toLocaleDateString("de-DE", options)
  if (timeStr) {
    result += ", " + timeStr
  }
  return result
}

export default function CalendarPage() {
  // ---- Termin-State ----
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined)
  const [invalidPastDialogOpen, setInvalidPastDialogOpen] = useState(false)
  const [invalidTimeDialogOpen, setInvalidTimeDialogOpen] = useState(false)
  const [conflictEventDialogOpen, setConflictEventDialogOpen] = useState(false)
  const [conflictingEvents, setConflictingEvents] = useState<Event[]>([])
  const [suggestedTime, setSuggestedTime] = useState<{ startTime: string; endTime: string } | null>(null)
  // Events aus DB
  const [events, setEvents] = useState<Event[]>([])
  const currentUserId = useAppStore((s) => s.currentUserId)
  // Events aus Datenbank laden
  useEffect(() => {
    if (!currentUserId) return
    fetchEvents(currentUserId)
      .then(setEvents)
      .catch(() => {/* Fehlerbehandlung */})
  }, [currentUserId])
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const contacts = useAppStore((s) => s.contacts)
  const groups = useAppStore((s) => s.groups)

  // Kalender-Ansicht State
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("month")
  const [calendarDate, setCalendarDate] = useState(new Date())

  const addEvent = async (event: Event) => {
    if (!currentUserId) return
    try {
      const saved = await addEventApi({
        userId: currentUserId,
        title: event.title,
        date: toDateString(event.date),
        startTime: event.startTime,
        endTime: event.endTime,
        description: event.description,
      })
      setEvents((prev) => [...prev, saved])
    } catch (err) {
      // Fehlerbehandlung
    }
  }
  const updateEvent = (event: Event) => updateEventRaw({ ...event, date: normalizeDateToMidnight(event.date) })

  // --- Erinnerungen ---
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [reminderDraft, setReminderDraft] = useState<Reminder | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("reminders")
    if (stored) {
      const arr = JSON.parse(stored)
      setReminders(
        arr.map((r: any) => ({
          ...r,
          reminderAdvance: r.reminderAdvance ?? "exactly",
          repeat: r.repeat ?? "none",
        })),
      )
    }
  }, [])
  useEffect(() => {
    localStorage.setItem("reminders", JSON.stringify(reminders))
  }, [reminders])

  function getReminderDate(reminder: Reminder) {
    const advance = reminder.reminderAdvance ?? "exactly"
    const [year, month, day] = reminder.date.split("-").map(Number)
    let d = new Date(year, month - 1, day)
    if (reminder.time) {
      const [h, m] = reminder.time.split(":").map(Number)
      d.setHours(h, m, 0, 0)
    } else {
      d.setHours(8, 0, 0, 0)
    }
    let ms = 0
    if (advance === "exactly") ms = 0
    else if (advance.endsWith("min")) ms = Number.parseInt(advance) * 60 * 1000
    else if (advance.endsWith("h")) ms = Number.parseInt(advance) * 60 * 60 * 1000
    else if (advance.endsWith("day")) ms = Number.parseInt(advance) * 24 * 60 * 60 * 1000
    d = new Date(d.getTime() - ms)
    if (reminder.repeat === "yearly") {
      const now = new Date()
      const reminderThisYear = new Date(now.getFullYear(), month - 1, day, d.getHours(), d.getMinutes())
      if (reminderThisYear < now) reminderThisYear.setFullYear(now.getFullYear() + 1)
      d = new Date(reminderThisYear.getTime() - ms)
    }
    return d
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      reminders.forEach((reminder) => {
           const remindAt = getReminderDate(reminder);
      if (
        remindAt.getTime() <= now.getTime() &&
        remindAt.getTime() > now.getTime() - 60000 &&
        !(window as any).__reminderNotified?.[reminder.id]
      )
    {
          addNotificationIfEnabled("reminder", {
            title: "Erinnerung",
            description: reminder.title + (reminder.date ? ` (${formatGermanDate(reminder.date, reminder.time)})` : ""),
            href: "/calendar",
          })
          if (!(window as any).__reminderNotified) (window as any).__reminderNotified = {}
          ;(window as any).__reminderNotified[reminder.id] = true
        }
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [reminders])

  useEffect(() => {
  const interval = setInterval(() => {
    const now = new Date()
    events.forEach((event) => {
      // Prüfe, ob ein Reminder für diesen Event eingestellt ist
      // (z.B. 30min vorher, 15min vorher, etc.)
      const advance = event.reminder || "exactly"
      const eventDate = new Date(event.date)
      if (event.startTime) {
        const [h, m] = event.startTime.split(":").map(Number)
        eventDate.setHours(h, m, 0, 0)
      } else {
        eventDate.setHours(8, 0, 0, 0)
      }

      let ms = 0
      if (advance === "exactly") ms = 0
      else if (advance.endsWith("min")) ms = parseInt(advance) * 60 * 1000
      else if (advance.endsWith("h")) ms = parseInt(advance) * 60 * 60 * 1000
      else if (advance.endsWith("day")) ms = parseInt(advance) * 24 * 60 * 60 * 1000

      const notifyAt = new Date(eventDate.getTime() - ms)

      if (
        notifyAt.getTime() <= now.getTime() &&
        notifyAt.getTime() > now.getTime() - 60000 &&
        !(window as any).__eventNotified?.[event.id]
      ) {
        addNotificationIfEnabled("event", {
          title: "Termin",
          description: event.title + (event.date ? ` (${formatGermanDate(toDateString(event.date), event.startTime)})` : ""),
          href: "/calendar",
        })
        if (!(window as any).__eventNotified) (window as any).__eventNotified = {}
        ;(window as any).__eventNotified[event.id] = true
      }
    })
  }, 60000)
  return () => clearInterval(interval)
}, [events])

  function handleSaveReminder(reminder: Reminder) {
    if (!reminder.title || !reminder.date) return
    if (reminder.id) {
      setReminders((reminders) => reminders.map((r) => (r.id === reminder.id ? reminder : r)))
    } else {
      setReminders((reminders) => [...reminders, { ...reminder, id: Math.random().toString(36).substring(2, 9) }])
    }
    setReminderDialogOpen(false)
    setReminderDraft(null)
  }

  function handleDeleteReminder(id: string) {
    setReminders((reminders) => reminders.filter((r) => r.id !== id))
    setReminderDialogOpen(false)
    setReminderDraft(null)
  }

  function handleEditReminder(reminder: Reminder) {
    setReminderDraft({
      ...reminder,
      reminderAdvance: reminder.reminderAdvance ?? "exactly",
      repeat: reminder.repeat ?? "none",
    })
    setReminderDialogOpen(true)
  }

  function openNewReminderDialog() {
    setReminderDraft({
      id: "",
      title: "",
      date: "",
      time: "",
      repeat: "none",
      reminderAdvance: "exactly",
    })
    setReminderDialogOpen(true)
  }

  // ---- Termine ----
  function timesOverlap(startA: string, endA: string, startB: string, endB: string) {
    const sA = Number.parseInt(startA.replace(":", ""), 10)
    const eA = Number.parseInt(endA.replace(":", ""), 10)
    const sB = Number.parseInt(startB.replace(":", ""), 10)
    const eB = Number.parseInt(endB.replace(":", ""), 10)
    return sA < eB && eA > sB
  }
  function isEventInPast(event: Event): boolean {
    const now = new Date()
    const eventDate = normalizeDateToMidnight(event.date)
    if (!event.startTime) return eventDate.getTime() < normalizeDateToMidnight(now).getTime()
    const [h, m] = event.startTime.split(":").map(Number)
    eventDate.setHours(h, m, 0, 0)
    return eventDate.getTime() < now.getTime()
  }
  function isEndTimeBeforeStartTime(event: Event): boolean {
    if (!event.startTime || !event.endTime) return false
    const s = Number.parseInt(event.startTime.replace(":", ""), 10)
    const e = Number.parseInt(event.endTime.replace(":", ""), 10)
    return e < s
  }
  const getConflictingEvents = (event: Event) => {
    const normalizedDate = toDateString(event.date)
    return events.filter((e) => {
      const sameDate = toDateString(e.date) === normalizedDate
      if (!sameDate || (event.id && e.id === event.id)) return false
      return timesOverlap(
        event.startTime || "00:00",
        event.endTime || "23:59",
        e.startTime || "00:00",
        e.endTime || "23:59",
      )
    })
  }
  function suggestFreeTime(
    date: Date | string,
    allEvents: Event[],
    currentEventId?: string,
    desiredStartTime?: string,
  ): { startTime: string; endTime: string } | null {
    const normalizedDate = toDateString(date)
    const now = new Date()
    const isToday = normalizedDate === toDateString(now)
    const dayEvents = allEvents
      .filter((e) => toDateString(e.date) === normalizedDate && (!currentEventId || e.id !== currentEventId))
      .map((e) => ({
        start: e.startTime ? Number.parseInt(e.startTime.replace(":", ""), 10) : 0,
        end: e.endTime ? Number.parseInt(e.endTime.replace(":", ""), 10) : 2359,
      }))
      .sort((a, b) => a.start - b.start)
    let slotStartHour = 7
    if (desiredStartTime) {
      const parsed = Number.parseInt(desiredStartTime.replace(":", ""), 10)
      slotStartHour = Math.floor(parsed / 100)
      if (parsed % 100 > 0) slotStartHour += 1
      if (slotStartHour < 7) slotStartHour = 7
      if (slotStartHour >= 22) return null
    } else if (isToday) {
      slotStartHour = now.getHours()
      if (now.getMinutes() > 0) slotStartHour += 1
      if (slotStartHour < 7) slotStartHour = 7
      if (slotStartHour >= 22) return null
    }
    let lastEnd = slotStartHour * 100
    for (const ev of dayEvents) {
      if (ev.start - lastEnd >= 100 && lastEnd >= slotStartHour * 100 && lastEnd < 2200) {
        const start = `${Math.floor(lastEnd / 100)
          .toString()
          .padStart(2, "0")}:00`
        const end = `${(Math.floor(lastEnd / 100) + 1).toString().padStart(2, "0")}:00`
        return { startTime: start, endTime: end }
      }
      if (ev.end > lastEnd) lastEnd = ev.end
    }
    if (2200 - lastEnd >= 100 && lastEnd < 2200) {
      const start = `${Math.floor(lastEnd / 100)
        .toString()
        .padStart(2, "0")}:00`
      const end = `${(Math.floor(lastEnd / 100) + 1).toString().padStart(2, "0")}:00`
      return { startTime: start, endTime: end }
    }
    return null
  }

  // --- TERMIN BUTTON LOGIK: NUR SPEICHERN, WENN ALLES GÜLTIG ---
  function handleSaveEvent(event: Event) {
    if (!event.title || !event.date || !event.startTime || !event.endTime) {
      return false
    }
    if (isEndTimeBeforeStartTime(event)) {
      setSelectedEvent(event)
      setInvalidTimeDialogOpen(true)
      return false
    }
    if (isEventInPast(event)) {
      setSelectedEvent(event)
      setInvalidPastDialogOpen(true)
      return false
    }
    const conflicts = getConflictingEvents(event)
    if (conflicts.length > 0) {
      setSelectedEvent(event)
      setConflictingEvents(conflicts)
      setSuggestedTime(suggestFreeTime(event.date, events, event.id, event.startTime))
      setConflictEventDialogOpen(true)
      return false
    }
    // NEU: Wenn selectedEvent undefined ist, ist es ein neuer Termin!
    if (!event.id || !events.find((e) => e.id === event.id)) {
      addEvent(event)
      setEventDialogOpen(false)
      setSelectedEvent(undefined)
      setConflictingEvents([])
      setSuggestedTime(null)
      return "created"
    } else {
      updateEvent(event)
      setEventDialogOpen(false)
      setSelectedEvent(undefined)
      setConflictingEvents([])
      setSuggestedTime(null)
      return "updated"
    }
  }

  function handleDeleteEvent(id: string) {
    deleteEvent(id)
    setEventDialogOpen(false)
    setSelectedEvent(undefined)
  }

  // --- "Neuer Termin"-Button ---
  function handleCreateNewEvent() {
    setSelectedEvent({
      id: Math.random().toString(36).substring(2, 9),
      title: "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      description: "",
      location: "",
      reminder: "30min",
      category: "Arbeit",
      sharedWith: [currentUserId],
      isGroupEvent: false,
      groupId: undefined,
    })
    setEventDialogOpen(true)
  }

  function getUpcomingEvents(eventsToShow: Event[]) {
    return (
      <Card style={{ boxShadow: "none", maxHeight: 500, minHeight: 300, overflow: "hidden", marginBottom: 16 }}>
        <CardHeader>
          <CardTitle>Anstehende Termine</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <UpcomingEvents
              events={eventsToShow}
              onEditEvent={(event) => {
                setSelectedEvent(event)
                setEventDialogOpen(true)
              }}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  function getRemindersBox() {
    return (
      <Card style={{ boxShadow: "none", maxHeight: 300, minHeight: 160, overflow: "hidden" }}>
        <CardHeader className="pb-2">
          <CardTitle>Erinnerungen</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {reminders.length === 0 && (
              <div className="text-muted-foreground text-center py-4">Keine Erinnerungen vorhanden.</div>
            )}
            <ul className="flex flex-col gap-2">
              {reminders
                .sort((a, b) => getReminderDate(a).getTime() - getReminderDate(b).getTime())
                .map((reminder) => (
                  <li
                    key={reminder.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent px-2 py-1 rounded transition"
                    onClick={() => handleEditReminder(reminder)}
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium">{reminder.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatGermanDate(reminder.date, reminder.time)}
                      {reminder.repeat === "yearly" && " (jährlich)"}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Fehlerdialoge
  const handlePastDialogEdit = () => setInvalidPastDialogOpen(false)
  const handleInvalidTimeEdit = () => setInvalidTimeDialogOpen(false)

  // --- Zeit übernehmen: wie MessagePage: Dialog bleibt offen, nur Event wird überschrieben ---
  const handleTakeSuggestion = () => {
    setConflictEventDialogOpen(false)
    setEventDialogOpen(false)
    if (!selectedEvent || !suggestedTime) return
    requestAnimationFrame(() => {
      setSelectedEvent({
        ...selectedEvent,
        startTime: suggestedTime.startTime,
        endTime: suggestedTime.endTime,
      })
      setEventDialogOpen(true)
    })
  }

  const handleConfirmConflict = () => {
    if (!selectedEvent) return
    if (isEventInPast(selectedEvent)) {
      setConflictEventDialogOpen(false)
      setInvalidPastDialogOpen(true)
      return
    }
    addEvent({ ...selectedEvent, id: undefined })
    setEventDialogOpen(false)
    setSelectedEvent(undefined)
    setConflictEventDialogOpen(false)
    setConflictingEvents([])
    setSuggestedTime(null)
  }
  const handleCancelConflict = () => {
    setConflictEventDialogOpen(false)
    setConflictingEvents([])
    setSuggestedTime(null)
  }

  const allEvents = events
  const personalEvents = events.filter((event) => !event.isGroupEvent)
  const groupEvents = events.filter((event) => event.isGroupEvent)

  return (
    <div className="container py-4 md:py-6 min-h-screen px-4" style={{ minHeight: "100vh", overflowY: "auto" }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Kalender</h1>
        <div className="flex gap-2">
          <Button onClick={openNewReminderDialog} variant="outline" size="sm">
            <Bell className="mr-2 h-4 w-4" />
            Erinnerung
          </Button>
          <Button onClick={handleCreateNewEvent} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Termin
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="personal">Persönlich</TabsTrigger>
          <TabsTrigger value="groups">Gruppen</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Alle Termine</CardTitle>
                <CardDescription>Persönliche und Gruppentermine in einer Übersicht</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  events={allEvents}
                  onEventAdd={handleSaveEvent}
                  onEventUpdate={handleSaveEvent}
                  onEventDelete={handleDeleteEvent}
                  type="all"
                  contacts={contacts}
                  groups={groups}
                  currentUserId={currentUserId}
                  view={calendarView}
                  onViewChange={setCalendarView}
                  currentDate={calendarDate}
                  onDateChange={setCalendarDate}
                />
              </CardContent>
            </Card>
            <div className="flex flex-col space-y-4">
              {getUpcomingEvents(allEvents)}
              {getRemindersBox()}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Persönliche Termine</CardTitle>
                <CardDescription>Verwalten Sie Ihre persönlichen Termine</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  events={personalEvents}
                  onEventAdd={handleSaveEvent}
                  onEventUpdate={handleSaveEvent}
                  onEventDelete={handleDeleteEvent}
                  type="personal"
                  contacts={contacts}
                  groups={groups}
                  currentUserId={currentUserId}
                  view={calendarView}
                  onViewChange={setCalendarView}
                  currentDate={calendarDate}
                  onDateChange={setCalendarDate}
                />
              </CardContent>
            </Card>
            <div className="flex flex-col space-y-4">
              {getUpcomingEvents(personalEvents)}
              {getRemindersBox()}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Gruppentermine</CardTitle>
                <CardDescription>Gemeinsame Kalender mit Teams, Familie oder Freunden</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  events={groupEvents}
                  onEventAdd={handleSaveEvent}
                  onEventUpdate={handleSaveEvent}
                  onEventDelete={handleDeleteEvent}
                  type="group"
                  contacts={contacts}
                  groups={groups}
                  currentUserId={currentUserId}
                  view={calendarView}
                  onViewChange={setCalendarView}
                  currentDate={calendarDate}
                  onDateChange={setCalendarDate}
                />
              </CardContent>
            </Card>
            <div className="flex flex-col space-y-4">
              {getUpcomingEvents(groupEvents)}
              {getRemindersBox()}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Erinnerungs-Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{reminderDraft?.id ? "Erinnerung bearbeiten" : "Neue Erinnerung"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminderTitle">Titel</Label>
              <Input
                id="reminderTitle"
                value={reminderDraft?.title || ""}
                onChange={(e) => setReminderDraft((prev) => (prev ? { ...prev, title: e.target.value } : null))}
                placeholder="Erinnerung eingeben"
              />
            </div>
            <div>
              <Label htmlFor="reminderDate">Datum</Label>
              <Input
                id="reminderDate"
                type="date"
                value={reminderDraft?.date || ""}
                onChange={(e) => setReminderDraft((prev) => (prev ? { ...prev, date: e.target.value } : null))}
              />
            </div>
            <div>
              <Label htmlFor="reminderTime">Zeit (optional)</Label>
              <Input
                id="reminderTime"
                type="time"
                value={reminderDraft?.time || ""}
                onChange={(e) => setReminderDraft((prev) => (prev ? { ...prev, time: e.target.value } : null))}
              />
            </div>
            <div>
              <Label htmlFor="reminderAdvance">Erinnerung</Label>
              <select
                id="reminderAdvance"
                value={reminderDraft?.reminderAdvance || "exactly"}
                onChange={(e) =>
                  setReminderDraft((prev) => (prev ? { ...prev, reminderAdvance: e.target.value } : null))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="exactly">Zur Zeit</option>
                <option value="5min">5 Min vorher</option>
                <option value="15min">15 Min vorher</option>
                <option value="30min">30 Min vorher</option>
                <option value="1h">1 Std vorher</option>
                <option value="1day">1 Tag vorher</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reminderRepeat">Wiederholung</Label>
              <select
                id="reminderRepeat"
                value={reminderDraft?.repeat || "none"}
                onChange={(e) =>
                  setReminderDraft((prev) => (prev ? { ...prev, repeat: e.target.value as "none" | "yearly" } : null))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="none">Keine</option>
                <option value="yearly">Jährlich</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            {reminderDraft?.id && (
              <Button variant="destructive" onClick={() => reminderDraft && handleDeleteReminder(reminderDraft.id)}>
                Löschen
              </Button>
            )}
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => reminderDraft && handleSaveReminder(reminderDraft)}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EventDialog & Fehlerdialoge */}
      <EventDialog
        event={selectedEvent}
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        contacts={contacts}
        currentUserId={currentUserId}
        showParticipants={false}
        groups={groups}
        events={events}
      />

      <Dialog open={invalidPastDialogOpen} onOpenChange={setInvalidPastDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Termin ungültig</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Der Termin kann nicht angelegt werden, da er in der Vergangenheit liegt.</p>
          </div>
          <DialogFooter>
            <Button onClick={handlePastDialogEdit} variant="outline">
              Bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={invalidTimeDialogOpen} onOpenChange={setInvalidTimeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ungültige Zeitangabe</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Die Endzeit darf nicht vor der Startzeit liegen.</p>
          </div>
          <DialogFooter>
            <Button onClick={handleInvalidTimeEdit} variant="outline">
              Bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={conflictEventDialogOpen} onOpenChange={setConflictEventDialogOpen}>
        <DialogContent className="w-full max-w-screen-md px-4 sm:px-8">
          <DialogHeader>
            <DialogTitle>Termin-Konflikt</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {conflictingEvents.map((e) => (
              <div key={e.id} className="p-3 border rounded">
                <div className="font-semibold">{e.title}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(e.date).toLocaleDateString("de-DE")} {e.startTime}–{e.endTime}
                </div>
              </div>
            ))}
            {suggestedTime && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm">
                  <strong>
                    Vorschlag: {suggestedTime.startTime} – {suggestedTime.endTime}
                  </strong>
                </p>
              </div>
            )}
            <p>Möchtest du den neuen Termin trotzdem erstellen?</p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {suggestedTime && (
              <Button onClick={handleTakeSuggestion} className="w-full sm:w-auto">
                Zeit übernehmen und bearbeiten
              </Button>
            )}
            <Button variant="outline" onClick={handleConfirmConflict} className="w-full sm:w-auto">
              Trotzdem erstellen
            </Button>
            <Button variant="outline" onClick={handleCancelConflict} className="w-full sm:w-auto">
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
