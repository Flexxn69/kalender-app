"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CalendarIcon, Clock, Trash, Users } from "lucide-react"
import { Calendar as UiCalendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

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

export type Event = {
  id: string
  title: string
  date: Date
  startTime: string
  endTime: string
  description: string
  location?: string
  reminder?: string
  category: string
  sharedWith: string[]
  isGroupEvent?: boolean
  groupId?: string
}

type EventDialogProps = {
  event?: Event
  events: Event[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (event: Event) => "created" | "updated" | false | undefined
  onDelete?: (id: string) => void
  contacts?: Contact[]
  groups?: Group[]
  currentUserId?: string
  showParticipants?: boolean
  forcedParticipants?: string[]
  isGroupEvent?: boolean
  groupId?: string
}

function getEventParticipants(
  event: Event,
  contacts: Contact[],
  groups: Group[] = [],
  currentUserId = "current-user",
): string {
  if (event.isGroupEvent && event.groupId) {
    const group = groups.find((g) => g.id === event.groupId)
    if (group) {
      const memberNames = group.members.filter((m) => m.id !== currentUserId).map((m) => m.name)
      return `Gruppe: ${group.name}` + (memberNames.length ? " (" + memberNames.join(", ") + ")" : "")
    }
    return "Gruppe unbekannt"
  } else {
    const otherIds = (event.sharedWith || []).filter((id) => id !== currentUserId)
    if (otherIds.length === 0) return "Nur du selbst"
    const names = otherIds
      .map((id) => {
        const c = contacts.find((c) => c.id === id)
        return c ? c.name : `Unbekannt`
      })
      .filter(Boolean)
    return names.length > 0 ? names.join(", ") : "Unbekannt"
  }
}

const reminderOptions = [
  { value: "5min", label: "5 Minuten vorher" },
  { value: "10min", label: "10 Minuten vorher" },
  { value: "15min", label: "15 Minuten vorher" },
  { value: "30min", label: "30 Minuten vorher" },
  { value: "60min", label: "1 Stunde vorher" },
  { value: "180min", label: "3 Stunden vorher" },
  { value: "1day", label: "1 Tag vorher" },
  { value: "2day", label: "2 Tage vorher" },
  { value: "none", label: "Keine Erinnerung" },
]

export function EventDialog({
  event,
  events = [], // Add default empty array
  open,
  onOpenChange,
  onSave,
  onDelete,
  contacts = [],
  groups = [],
  currentUserId = "me",
  showParticipants = true,
  forcedParticipants,
  isGroupEvent,
  groupId,
}: EventDialogProps) {
  const isEditing = !!event && events && events.some((e) => e.id === event.id)
  const [alertOpen, setAlertOpen] = useState(false)

  const [formData, setFormData] = useState<Event>(
    event
      ? { ...event }
      : {
          id: Math.random().toString(36).substring(2, 9),
          title: "",
          date: new Date(),
          startTime: "09:00",
          endTime: "10:00",
          description: "",
          location: "",
          reminder: "30min",
          category: "Arbeit",
          sharedWith:
            forcedParticipants && forcedParticipants.length
              ? Array.from(new Set(forcedParticipants))
              : event?.sharedWith?.length
                ? Array.from(new Set(event.sharedWith.concat(currentUserId)))
                : [currentUserId],
          isGroupEvent: isGroupEvent ?? false,
          groupId: groupId,
        },
  )

  const allContactOptions = contacts.filter(
    (c) => c.id !== currentUserId && (!forcedParticipants || !forcedParticipants.includes(c.id)),
  )

  // --- Formulardaten immer beim Wechsel von event ODER Dialog-Öffnung aktualisieren! ---
  useEffect(() => {
    if (open) {
      if (event) {
        setFormData({
          ...event,
          date: event.date instanceof Date ? event.date : new Date(event.date),
          sharedWith:
            forcedParticipants && forcedParticipants.length
              ? Array.from(new Set(forcedParticipants))
              : event.sharedWith?.length
                ? Array.from(new Set(event.sharedWith.concat(currentUserId)))
                : [currentUserId],
          isGroupEvent: typeof isGroupEvent !== "undefined" ? isGroupEvent : event.isGroupEvent,
          groupId: groupId ?? event.groupId,
          category: event.category ?? "",
        })
      } else {
        setFormData({
          id: Math.random().toString(36).substring(2, 9),
          title: "",
          date: new Date(),
          startTime: "09:00",
          endTime: "10:00",
          description: "",
          location: "",
          reminder: "30min",
          category: "Arbeit",
          sharedWith:
            forcedParticipants && forcedParticipants.length ? Array.from(new Set(forcedParticipants)) : [currentUserId],
          isGroupEvent: isGroupEvent ?? false,
          groupId: groupId,
        })
      }
    }
    // WICHTIG: JSON.stringify(event) im Dependency-Array für alle Änderungen!
  }, [open, JSON.stringify(event), forcedParticipants, isGroupEvent, groupId, currentUserId])

  const handleChange = (field: keyof Event, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleToggleContact = (contactId: string) => {
    if (!showParticipants || forcedParticipants) return
    setFormData((prev) => {
      const isSelected = prev.sharedWith.includes(contactId)
      return {
        ...prev,
        sharedWith: isSelected ? prev.sharedWith.filter((id) => id !== contactId) : [...prev.sharedWith, contactId],
      }
    })
  }

  // NICHT automatisch Dialog schließen!
  const handleSubmit = () => {
    const data: Event = {
      ...formData,
      sharedWith: forcedParticipants
        ? Array.from(new Set(forcedParticipants))
        : Array.from(new Set([...formData.sharedWith, currentUserId])),
      isGroupEvent: typeof isGroupEvent !== "undefined" ? isGroupEvent : formData.isGroupEvent,
      groupId: groupId ?? formData.groupId,
      category: formData.category ?? "Arbeit",
    }
    onSave(data)
  }

  const handleDelete = () => {
    if (onDelete && formData.id) {
      onDelete(formData.id)
      setAlertOpen(false)
      onOpenChange(false)
    }
  }

  const participantDisplay = getEventParticipants(event || formData, contacts, groups, currentUserId)
  const showSelection = showParticipants && !forcedParticipants

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Termin bearbeiten" : "Neuer Termin"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Bearbeiten Sie die Details des Termins."
                : "Fügen Sie einen neuen Termin zu Ihrem Kalender hinzu."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Terminname eingeben"
              />
            </div>
            <div className="grid gap-2">
              <Label>Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !formData.date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP", { locale: de }) : <span>Datum auswählen</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <UiCalendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => handleChange("date", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Startzeit</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleChange("startTime", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endTime">Endzeit</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleChange("endTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Ort</Label>
              <Input
                id="location"
                value={formData.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Ort eingeben (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Beschreibung eingeben"
                rows={3}
              />
            </div>
            {/* Erinnerungsabstand-Auswahl */}
            <div className="grid gap-2">
              <Label htmlFor="reminder">Benachrichtigung</Label>
              <select
                id="reminder"
                value={formData.reminder || "30min"}
                onChange={(e) => handleChange("reminder", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              >
                {reminderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                Wählen Sie aus, wie früh Sie an den Termin erinnert werden möchten.
              </span>
            </div>
            {showSelection ? (
              <div className="grid gap-2">
                <Label>Teilnehmer</Label>
                <div className="flex flex-wrap gap-2">
                  {allContactOptions.map((contact) => (
                    <Button
                      key={contact.id}
                      type="button"
                      variant={formData.sharedWith.includes(contact.id) ? "default" : "outline"}
                      className="flex items-center gap-1 px-3 py-1"
                      onClick={() => handleToggleContact(contact.id)}
                    >
                      {contact.avatarUrl ? (
                        <img
                          src={contact.avatarUrl || "/placeholder.svg"}
                          alt=""
                          className="h-5 w-5 rounded-full mr-1"
                        />
                      ) : (
                        <Users className="h-4 w-4 mr-1" />
                      )}
                      {contact.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Teilnehmer</Label>
                <div className="mt-2 text-xs text-muted-foreground">{participantDisplay}</div>
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between">
            {isEditing && (
              <Button variant="destructive" size="sm" onClick={() => setAlertOpen(true)}>
                <Trash className="mr-2 h-4 w-4" />
                Löschen
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSubmit}>Speichern</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {alertOpen && (
        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Termin löschen</AlertDialogTitle>
              <AlertDialogDescription>
                Sind Sie sicher, dass Sie diesen Termin löschen möchten? Diese Aktion kann nicht rückgängig gemacht
                werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  )
}
