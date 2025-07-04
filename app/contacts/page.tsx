"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Plus, MoreHorizontal, UserPlus, Calendar as CalendarIcon, MessageCircle, Info, Users } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppStore } from "@/lib/store"
import EditContactDialog from "./EditContactDialog"
import { EventDialog } from "@/components/event-dialog"
import { GroupDialog, type Group } from "@/components/group-dialog"
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, isSameMonth, isSameDay, addDays } from "date-fns"
import de from "date-fns/locale/de"
import type { Event } from "@/lib/store"

type Contact = {
  id: string
  name: string
  email: string
  phone?: string
  status: "online" | "offline" | "away" | "busy"
  favorite?: boolean
  availableAt?: string
  importedOnly?: boolean
  isRegistered?: boolean
}

type CalendarState = {
  contactId: string | null
  open: boolean
  selectedDay: Date | null
  month: Date
}

type InfoState = {
  contactId: string | null
  open: boolean
}

function getStatusColor(status: string) {
  switch (status) {
    case "online":
      return "bg-green-500"
    case "busy":
      return "bg-red-500"
    case "away":
      return "bg-yellow-500"
    default:
      return "bg-gray-500"
  }
}

function CalendarMonth({
  events,
  month,
  onDayClick,
  selectedDate,
}: {
  events: { date: Date | string }[]
  month: Date
  onDayClick?: (d: Date) => void
  selectedDate?: Date | null
}) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const eventDates = new Set(
    events.map((e) =>
      format(typeof e.date === "string" ? new Date(e.date) : e.date, "yyyy-MM-dd")
    )
  )

  const weekdays = []
  for (let i = 1; i <= 7; i++) {
    weekdays.push(
      <div key={i} className="w-8 h-6 flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 font-medium">
        {format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i - 1), "EE", { locale: de })}
      </div>
    )
  }

  const rows: JSX.Element[] = []
  let curr = new Date(startDate)
  while (curr <= endDate) {
    const days: JSX.Element[] = []
    for (let i = 0; i < 7; i++) {
      const thisDay = new Date(curr)
      const isCurrentMonth = isSameMonth(thisDay, month)
      const dayIso = format(thisDay, "yyyy-MM-dd")
      const hasEvent = eventDates.has(dayIso)
      const isSelected = selectedDate && isSameDay(thisDay, selectedDate)
      days.push(
        <div
          key={dayIso}
          className={`w-8 h-14 sm:h-14 h-10 flex flex-col items-center justify-center rounded-md cursor-pointer select-none border transition-all mobile-calendar-day
            ${isCurrentMonth ? "text-black" : "text-gray-400"}
            ${isSelected ? "border-blue-500 bg-blue-50 font-semibold" : "border-transparent"}
          `}
          onClick={() => isCurrentMonth && onDayClick && onDayClick(thisDay)}
        >
          <span className="text-sm dark:text-white">{format(thisDay, "d")}</span>
          {hasEvent && (
            <span className="w-2 h-2 rounded-full bg-red-500 mt-1" />
          )}
        </div>
      )
      curr = addDays(curr, 1)
    }
    rows.push(
      <div key={curr.toISOString()} className="flex">{days}</div>
    )
  }

  return (
    <div>
      <style jsx global>{`
        @media (max-width: 640px) {
          .mobile-calendar-day {
            height: 2.2rem !important;
            min-height: 2.2rem !important;
            max-height: 2.2rem !important;
          }
        }
      `}</style>
      <div className="flex">{weekdays}</div>
      <div>{rows}</div>
    </div>
  )
}

export default function ContactsPage() {

  // State-Management
  const [searchQuery, setSearchQuery] = useState("")
  const [newContactDialogOpen, setNewContactDialogOpen] = useState(false)
  const [inviteContactDialogOpen, setInviteContactDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
  const [confirmDeleteContactDialogOpen, setConfirmDeleteContactDialogOpen] = useState(false)
  const [confirmDeleteGroupDialogOpen, setConfirmDeleteGroupDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)
  const [calendarState, setCalendarState] = useState<CalendarState>({ contactId: null, open: false, selectedDay: null, month: new Date() })
  const [infoState, setInfoState] = useState<InfoState>({ contactId: null, open: false })
  const [tab, setTab] = useState<"contacts" | "groups">("contacts")
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "" })
  const [addRegisteredDialogOpen, setAddRegisteredDialogOpen] = useState(false)
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<{id:string,name:string,email:string}[]>([])
  const [userSearch, setUserSearch] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Für Termin-Konflikt/Fehler-Dialoge
  const [invalidPastDialogOpen, setInvalidPastDialogOpen] = useState(false)
  const [invalidTimeDialogOpen, setInvalidTimeDialogOpen] = useState(false)
  const [conflictEventDialogOpen, setConflictEventDialogOpen] = useState(false)
  const [conflictingEvents, setConflictingEvents] = useState<Event[]>([])
  const [suggestedTime, setSuggestedTime] = useState<{ startTime: string; endTime: string } | null>(null)

  // AppStore
  const currentUserId = useAppStore((s) => s.currentUserId)
  const conversations = useAppStore((s) => s.conversations)
  const router = useRouter()
  const { toast } = useToast()
  const {
    contacts,
    addContact,
    updateContact,
    toggleFavorite,
    deleteContact,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    groups,
    updateGroup,
    deleteGroup,
  } = useAppStore()

  // Einladung
  const [inviteData, setInviteData] = useState({
    email: "",
    message: "Hallo! Ich lade dich ein, unsere Kalender-App zu nutzen. Hier ist dein Einladungslink:",
  })

  // Filter
  const registeredContacts = contacts.filter((c) => c.isRegistered !== false)
  const filteredRegisteredContacts = registeredContacts.filter(
    (contact) => contact.name.toLowerCase().includes(searchQuery.toLowerCase())
      || contact.email.toLowerCase().includes(searchQuery.toLowerCase())
      || (contact.phone && contact.phone.includes(searchQuery))
  )
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Events für Kontakt (bisher: nur geteilte Events)
  // Neu: Alle Events des Kontakts per API laden und im State speichern
  const [contactEvents, setContactEvents] = useState<Record<string, Event[]>>({})
  const [loadingContactEvents, setLoadingContactEvents] = useState<string | null>(null)

  async function fetchAllEventsForContact(contactId: string) {
    setLoadingContactEvents(contactId)
    try {
      const res = await fetch(`/api/events/all-for-user?userId=${contactId}`, {
        credentials: "include"
      })
      if (!res.ok) throw new Error('Fehler beim Laden der Termine')
      const data = await res.json()
      setContactEvents(prev => ({ ...prev, [contactId]: data }))
    } catch (e) {
      toast({ title: 'Fehler', description: 'Termine konnten nicht geladen werden', variant: 'destructive' })
    } finally {
      setLoadingContactEvents(null)
    }
  }

  // Chat starten
  const handleStartChat = (id: string, isGroup: boolean) => {
    if (isGroup) {
      const group = groups.find((g) => g.id === id)
      if (group) {
        let conv = conversations.find((c) => c.type === "group" && c.id === group.id)
        if (!conv) {
          // Neue Gruppen-Konversation erstellen
          conv = {
            id: group.id,
            name: group.name,
            type: "group",
            lastMessage: "Neue Gruppenunterhaltung gestartet",
            time: new Date().toISOString(),
            participants: group.members ?? [],
          }
          useAppStore.setState((state) => ({
            conversations: [conv, ...state.conversations],
            messages: { ...state.messages, [group.id]: [] },
          }))
        }
        router.push(`/messages?conversation=${group.id}`)
      }
    } else {
      const contact = contacts.find((c) => c.id === id)
      if (!contact) return
      const existingConversation = conversations.find(
        (conv) =>
          conv.type === "individual" &&
          conv.participants.some((p) => p.id === contact.id) &&
          conv.participants.some((p) => p.id === currentUserId),
      )
      if (existingConversation) {
        router.push(`/messages?conversation=${existingConversation.id}`)
      } else {
        const newConversationId = Math.random().toString(36).substring(2, 9)
        const currentUser = {
          id: currentUserId,
          name: "Du",
          email: "current@user.com",
          status: "online" as const,
        }
        const newConversation = {
          id: newConversationId,
          name: contact.name,
          type: "individual",
          lastMessage: "Neue Konversation gestartet",
          time: new Date().toISOString(),
          participants: [currentUser, contact],
        }
        useAppStore.setState((state) => ({
          conversations: [newConversation, ...state.conversations],
          messages: { ...state.messages, [newConversationId]: [] },
        }))
        router.push(`/messages?conversation=${newConversationId}`)
      }
    }
  }

  // Kalender/Info toggeln
  const handleToggleCalendar = (contact: Contact) => {
    setCalendarState((prev) =>
      prev.open && prev.contactId === contact.id
        ? { contactId: null, open: false, selectedDay: null, month: new Date() }
        : { contactId: contact.id, open: true, selectedDay: null, month: new Date() }
    )
    setInfoState({ contactId: null, open: false })
    if (!calendarState.open || calendarState.contactId !== contact.id) {
      // Nur laden, wenn noch nicht geladen
      if (!contactEvents[contact.id]) fetchAllEventsForContact(contact.id)
    }
  }
  const handleToggleInfo = (contact: Contact) => {
    setInfoState((prev) =>
      prev.open && prev.contactId === contact.id
        ? { contactId: null, open: false }
        : { contactId: contact.id, open: true }
    )
    setCalendarState({ contactId: null, open: false, selectedDay: null, month: new Date() })
  }

  // Fehlerdialoge und Konfliktprüfung
  function normalizeDateToMidnight(date: Date | string): Date {
    const d = typeof date === "string" ? new Date(date) : new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }
  function toDateString2(d: Date | string) {
    if (!d) return ""
    const dateObj = typeof d === "string" ? new Date(d) : d
    dateObj.setHours(0, 0, 0, 0)
    return dateObj.toISOString().slice(0, 10)
  }
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
  function getConflictingEvents(event: Event, allEvents: Event[]) {
    const normalizedDate = toDateString2(event.date)
    return allEvents.filter((e) => {
      const sameDate = toDateString2(e.date) === normalizedDate
      if (!sameDate || (event.id && e.id === event.id)) return false
      return timesOverlap(
        event.startTime || "00:00",
        event.endTime || "23:59",
        e.startTime || "00:00",
        e.endTime || "23:59",
      )
    })
  }
  function suggestFreeTime(date: Date | string, allEvents: Event[], currentEventId?: string, desiredStartTime?: string): { startTime: string; endTime: string } | null {
    const normalizedDate = toDateString2(date)
    const now = new Date()
    const isToday = normalizedDate === toDateString2(now)
    const dayEvents = allEvents
      .filter((e) => toDateString2(e.date) === normalizedDate && (!currentEventId || e.id !== currentEventId))
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
        const start = `${Math.floor(lastEnd / 100).toString().padStart(2, "0")}:00`
        const end = `${(Math.floor(lastEnd / 100) + 1).toString().padStart(2, "0")}:00`
        return { startTime: start, endTime: end }
      }
      if (ev.end > lastEnd) lastEnd = ev.end
    }
    if (2200 - lastEnd >= 100 && lastEnd < 2200) {
      const start = `${Math.floor(lastEnd / 100).toString().padStart(2, "0")}:00`
      const end = `${(Math.floor(lastEnd / 100) + 1).toString().padStart(2, "0")}:00`
      return { startTime: start, endTime: end }
    }
    return null
  }

  function handleSaveEvent(event: Event) {
    if (!event.title && (!event.startTime || !event.endTime || !event.date)) return false
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
    const conflicts = getConflictingEvents(event, events)
    if (conflicts.length > 0) {
      setSelectedEvent(event)
      setConflictingEvents(conflicts)
      setSuggestedTime(suggestFreeTime(event.date, events, event.id, event.startTime))
      setConflictEventDialogOpen(true)
      return false
    }
    if (!event.id || !events.find((e) => e.id === event.id)) {
      addEvent(event)
      setEventDialogOpen(false)
      setSelectedEvent(null)
      setConflictingEvents([])
      setSuggestedTime(null)
      return "created"
    } else {
      updateEvent(event)
      setEventDialogOpen(false)
      setSelectedEvent(null)
      setConflictingEvents([])
      setSuggestedTime(null)
      return "updated"
    }
  }
  const handlePastDialogEdit = () => setInvalidPastDialogOpen(false)
  const handleInvalidTimeEdit = () => setInvalidTimeDialogOpen(false)
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
    setSelectedEvent(null)
    setConflictEventDialogOpen(false)
    setConflictingEvents([])
    setSuggestedTime(null)
  }
  const handleCancelConflict = () => {
    setConflictEventDialogOpen(false)
    setConflictingEvents([])
    setSuggestedTime(null)
  }

  // Kontakt-Card
  const ContactCard = ({ contact }: { contact: Contact }) => (
    <Card key={contact.id} className="hover:shadow-md transition-shadow mb-3 w-full max-w-full py-2">
      <CardContent className="p-3 w-full max-w-full">
        <div className="flex items-center justify-between flex-wrap gap-0.5">
          <div className="flex items-center gap-1 min-w-0">
            <div className="relative flex-shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{contact.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {contact.isRegistered !== false && (
                <div
                  className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-background ${getStatusColor(contact.status)}`}
                />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-xs truncate max-w-[90px] sm:max-w-[120px]">{contact.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartChat(contact.id, false)}>
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant={calendarState.open && calendarState.contactId === contact.id ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              aria-label="Kalender öffnen"
              onClick={() => handleToggleCalendar(contact)}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={infoState.open && infoState.contactId === contact.id ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              aria-label="Info anzeigen"
              onClick={() => handleToggleInfo(contact)}
            >
              <Info className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedContact(contact)}>Bearbeiten</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleFavorite(contact.id)}>
                  {contact.favorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setContactToDelete(contact) || setConfirmDeleteContactDialogOpen(true)} className="text-destructive">
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {calendarState.open && calendarState.contactId === contact.id && (
          <div className="border-t mt-4 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[900px]">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Button variant="ghost" size="icon" onClick={() => setCalendarState((s) => ({ ...s, month: subMonths(s.month, 1) }))}><span>&lt;</span></Button>
                <span className="font-medium whitespace-nowrap">{format(calendarState.month, "MMMM yyyy", { locale: de })}</span>
                <Button variant="ghost" size="icon" onClick={() => setCalendarState((s) => ({ ...s, month: addMonths(s.month, 1) }))}><span>&gt;</span></Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedEvent({
                      id: Math.random().toString(36).substring(2, 9),
                      title: "",
                      date: calendarState.selectedDay ?? new Date(),
                      startTime: "09:00",
                      endTime: "10:00",
                      description: "",
                      category: "Meeting",
                      sharedWith: [currentUserId, contact.id],
                      isGroupEvent: false,
                    })
                    setEventDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Termin
                </Button>
              </div>
              <div className="overflow-x-auto max-w-full">
                <CalendarMonth
                  events={getContactEvents(contact)}
                  month={calendarState.month}
                  selectedDate={calendarState.selectedDay}
                  onDayClick={(d) =>
                    setCalendarState((s) => ({
                      ...s,
                      selectedDay: isSameMonth(d, s.month) ? d : s.selectedDay,
                    }))
                  }
                />
              </div>
            </div>
            <div className="pl-2">
              <div className="mt-0">
                {calendarState.selectedDay && (() => {
                  const eventList = getContactEvents(contact).filter(e =>
                    format(typeof e.date === "string" ? new Date(e.date) : e.date, "yyyy-MM-dd") === format(calendarState.selectedDay!, "yyyy-MM-dd")
                  )
                  if (eventList.length > 0) {
                    return (
                      <div
                        style={{ maxHeight: 400, overflowY: "auto" }}
                        className="pr-2"
                      >
                        <div className="font-medium text-sm mb-1">
                          {eventList.length === 1
                            ? "Termin:"
                            : "Termine:"}
                        </div>
                        {eventList.map(event => (
                          <div key={event.id} className="mb-2">
                            <div className="font-semibold truncate">Termin {event.startTime} - {event.endTime}</div>
                          </div>
                        ))}
                      </div>
                    )
                  } else {
                    return (
                      <div className="text-xs text-muted-foreground">Keine Termine für diesen Tag.</div>
                    )
                  }
                })()}
                {!calendarState.selectedDay && (
                  <div className="text-xs text-muted-foreground">Klicken Sie auf ein Datum.</div>
                )}
              </div>
            </div>
          </div>
        )}
        {infoState.open && infoState.contactId === contact.id && (
          <div className="border-t mt-4 pt-4 w-full max-w-full">
            <div className="font-medium mb-2">Kontaktinformationen</div>
            <div className="text-sm text-muted-foreground break-words">E-Mail: {contact.email}</div>
            {contact.phone && <div className="text-sm text-muted-foreground break-words">Telefon: {contact.phone}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  )

  // GroupCard analog zu oben
  const GroupCard = ({ group }: { group: Group }) => (
    <Card key={group.id} className="hover:shadow-md transition-shadow mb-4 w-full max-w-full py-4">
      <CardContent className="p-6 flex items-center justify-between flex-wrap gap-2 w-full">
        <div>
          <h4 className="font-medium text-sm truncate max-w-[200px]">{group.name}</h4>
          <p className="text-xs text-muted-foreground">{group.members?.length || 0} Mitglieder</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleStartChat(group.id, true)}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingGroup(group) || setGroupDialogOpen(true)}>Bearbeiten</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupToDelete(group) || setConfirmDeleteGroupDialogOpen(true)} className="text-destructive">
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )

  useEffect(() => {
    if (addRegisteredDialogOpen) {
      setLoadingUsers(true)
      fetch("/api/users")
        .then(r => r.json())
        .then(data => setAllRegisteredUsers(data))
        .finally(() => setLoadingUsers(false))
    }
  }, [addRegisteredDialogOpen])

  // Filter für Dialog: nur Nutzer, die noch nicht in contacts sind und nicht der aktuelle User
  const selectableUsers = allRegisteredUsers.filter(u =>
    !contacts.some(c => c.email === u.email) && u.id !== currentUserId &&
    (u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
  )

  // Hilfsfunktion zum Prüfen, ob ein Nutzer registriert ist
  async function checkIfRegistered(email: string, phone?: string) {
    const res = await fetch(`/api/users?email=${encodeURIComponent(email)}${phone ? `&phone=${encodeURIComponent(phone)}` : ""}`)
    if (!res.ok) return null
    const users = await res.json()
    // E-Mail oder Telefonnummer muss passen
    return users.find((u: any) => u.email === email || (phone && u.phone === phone))
  }

  // Gibt alle Events für einen Kontakt zurück (geladen per API)
  function getContactEvents(contact: Contact): Event[] {
    return contactEvents[contact.id] || []
  }

  return (
    <div className="container py-4 md:py-6 px-4 min-h-screen">
      <style jsx global>{`
        @media (max-width: 640px) {
          .mobile-card-longer {
            padding-top: 2.5rem !important;
            padding-bottom: 2.5rem !important;
            min-height: 340px !important;
          }
        }
      `}</style>
      {/* Überschrift und Buttons */}
      <div className="w-full max-w-[900px] flex items-center justify-between mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Kontakte
        </h1>
        {/* Mobile: 3-Punkte-Menü, Desktop: Buttons */}
        {/* Entfernt: Doppelte/obere 3-Punkte-Menüleiste und manuelles Hinzufügen. Nur noch die Menüleiste neben Tabs bleibt. */}
      </div>

      {/* Tabs und 3-Punkte-Button auf einer Linie */}
      <div className="flex items-center justify-between mb-4 w-full max-w-[900px]">
        <Tabs value={tab} onValueChange={val => setTab(val as "contacts" | "groups")} className="">
          <TabsList className="w-fit">
            <TabsTrigger value="contacts">
              <MessageCircle className="h-4 w-4 mr-2" />
              Kontakte
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Users className="h-4 w-4 mr-2" />
              Gruppen
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {/* 3-Punkte-Button nur auf Mobile sichtbar, aber für Layout-Gleichheit immer rendern (unsichtbar auf Desktop) */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const message = "Hallo! Ich lade dich ein, unsere Kalender-App zu nutzen. Hier ist dein Einladungslink:";
                const inviteLink = `${window.location.origin}/auth/register`;
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({
                    text: `${message}\n${inviteLink}`,
                    url: inviteLink,
                  });
                } else {
                  window.location.href = `mailto:?subject=Einladung zur Kalender-App&body=${encodeURIComponent(message + "\n\n" + inviteLink)}`;
                }
              }}>
                <UserPlus className="h-4 w-4 mr-2" /> Einladen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAddRegisteredDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Kontakt hinzufügen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Gruppe erstellen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card-Bereich */}
      <div className="grid gap-4 lg:grid-cols-4 max-w-full">
        <div className="lg:col-span-3">
          <Card className="w-full max-w-[900px] py-10 px-0 min-h-[420px] mobile-card-longer">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>{tab === "contacts" ? "Meine Kontakte" : "Gruppen"}</CardTitle>
                  <CardDescription>
                    {tab === "contacts"
                      ? "Verwalten Sie Ihre Kontakte und starten Sie Unterhaltungen"
                      : "Verwalten Sie Ihre Gruppen und Gruppenchats"}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tab === "contacts" ? "Kontakte durchsuchen..." : "Gruppen durchsuchen..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-full sm:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-4 w-full">
                {tab === "contacts"
                  ? filteredRegisteredContacts.map((contact) => (
                      <ContactCard key={contact.id} contact={contact} />
                    ))
                  : filteredGroups.map((group) => (
                      <GroupCard key={group.id} group={group} />
                    ))}
                {tab === "contacts" && filteredRegisteredContacts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">Keine Kontakte gefunden.</div>
                )}
                {tab === "groups" && filteredGroups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">Keine Gruppen gefunden.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Dialoge */}
      {/* Entfernt: Dialog für manuelles Hinzufügen eines Kontakts */}
      <EditContactDialog
        contact={selectedContact}
        open={!!selectedContact}
        onOpenChange={() => setSelectedContact(null)}
        onSave={(updatedContact) => {
          updateContact(updatedContact)
          setSelectedContact(null)
          toast({
            title: "Kontakt aktualisiert",
            description: `${updatedContact.name} wurde erfolgreich aktualisiert.`,
          })
        }}
      />
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={editingGroup}
        onSave={(g) => {
          const exists = groups.some((gg) => gg.id === g.id)
          if (exists) {
            updateGroup(g)
            toast({
              title: "Gruppe aktualisiert",
              description: `"${g.name}" wurde erfolgreich aktualisiert.`,
            })
          } else {
            useAppStore.getState().addGroup(g)
            toast({
              title: "Neue Gruppe erstellt",
              description: `"${g.name}" wurde erfolgreich erstellt.`,
            })
          }
          setGroupDialogOpen(false)
          setEditingGroup(undefined)
          return true
        }}
        onDelete={(id) => {
          const group = groups.find((g) => g.id === id)
          if (group) setGroupToDelete(group), setConfirmDeleteGroupDialogOpen(true)
        }}
        contacts={contacts}
        currentUserId={currentUserId}
      />
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        onSave={handleSaveEvent}
        onDelete={(id) => {
          deleteEvent(id)
          setEventDialogOpen(false)
          setSelectedEvent(null)
        }}
        contacts={contacts}
        currentUserId={currentUserId}
        groups={groups}
        events={events}
      />
      {/* Fehlerdialoge */}
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
      <Dialog open={confirmDeleteContactDialogOpen} onOpenChange={setConfirmDeleteContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kontakt löschen</DialogTitle>
            <DialogDescription>
              Möchtest du diesen Kontakt wirklich löschen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteContactDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (contactToDelete) deleteContact(contactToDelete.id)
                setConfirmDeleteContactDialogOpen(false)
                setContactToDelete(null)
              }}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDeleteGroupDialogOpen} onOpenChange={setConfirmDeleteGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gruppe löschen</DialogTitle>
            <DialogDescription>
              Möchtest du diese Gruppe wirklich löschen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteGroupDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (groupToDelete) deleteGroup(groupToDelete.id)
                setConfirmDeleteGroupDialogOpen(false)
                setGroupToDelete(null)
              }}
            >
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog: Registrierten Kontakt hinzufügen */}
      <Dialog open={addRegisteredDialogOpen} onOpenChange={setAddRegisteredDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrierten Kontakt hinzufügen</DialogTitle>
            <DialogDescription>Füge einen Nutzer hinzu, der bereits registriert ist.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Name oder E-Mail suchen..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="mb-2"
            />
            {loadingUsers ? (
              <div>Lade Nutzer...</div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y">
                {selectableUsers.length === 0 && <div className="text-muted-foreground text-sm py-2">Kein passender Nutzer gefunden.</div>}
                {selectableUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    <Button size="sm" onClick={() => {
                      addContact({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        status: "offline",
                        isRegistered: true,
                      })
                      setAddRegisteredDialogOpen(false)
                      toast({
                        title: "Kontakt hinzugefügt",
                        description: `${u.name} wurde zu deinen Kontakten hinzugefügt.`,
                      })
                    }}>Hinzufügen</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
