"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Phone,
  Plus,
  Send,
  Paperclip,
  Video,
  Search,
  X,
  CalendarIcon,
  Check,
  Users,
  FileText,
  MessageSquare,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useAppStore, type Event } from "@/lib/store"
import { EventDialog } from "@/components/event-dialog"
import { GroupDialog, type Group } from "@/components/group-dialog"
import { useSearchParams } from "next/navigation"
import { generateChatIdFromMembers, groupMessagesByChatId } from "@/lib/chat-utils"
import type { Message as MessageType } from "@/types/message"

import { addNotificationIfEnabled } from "@/lib/notify"

// Neue Imports für erweiterte Features
import { RichTextEditor } from "@/components/rich-text-editor"
import { VoiceMessage } from "@/components/voice-message"
import { MessageReactions } from "@/components/message-reactions"

type Contact = {
  id: string
  name: string
  email: string
  status: "online" | "offline" | "away" | "busy"
  avatarUrl?: string
}

type Conversation = {
  id: string
  name: string
  type: "group" | "individual"
  lastMessage: string
  time: string
  unread?: number
  participants: Contact[]
  description?: string
  members?: Contact[]
  avatarUrl?: string
}

type MessageReaction = {
  emoji: string
  users: string[]
  count: number
}

function formatMessageTime(isoString: string) {
  if (!isoString) return ""
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
}

function formatChatDate(date: Date) {
  const today = new Date()
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return "Heute"
  }
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function downloadFile(file: any) {
  if (file.url) {
    const link = document.createElement("a")
    link.href = file.url
    link.download = file.name || "download"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

function normalizeDateToMidnight(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Funktion, um Zeitbereiche zu vergleichen (Überschneidung)
function timesOverlap(start1: string, end1: string, start2: string, end2: string) {
  const toMinutes = (s: string) => {
    const [h, m] = s.split(":").map(Number)
    return h * 60 + m
  }
  const s1 = toMinutes(start1),
    e1 = toMinutes(end1)
  const s2 = toMinutes(start2),
    e2 = toMinutes(end2)
  return s1 < e2 && s2 < e1
}

// Hilfsfunktion: Gibt alle Events zurück, die mit den Teilnehmern geteilt sind (Frei/Belegt-Prinzip)
function getSharedEvents(events: Event[], participantIds: string[]) {
  return events.filter(
    (event) =>
      event.sharedWith &&
      participantIds.every((id) => event.sharedWith.includes(id)) &&
      event.sharedWith.length === participantIds.length
  )
}

function getConflictingEvents(event: Event, allEvents: Event[], userIds: string[]) {
  const targetDate = normalizeDateToMidnight(event.date)
  return allEvents.filter((e) => {
    const eventDate = normalizeDateToMidnight(e.date)
    if (event.id && e.id === event.id) return false
    if (eventDate.getTime() !== targetDate.getTime()) return false
    return (
      e.sharedWith && e.sharedWith.some((uid) => userIds.includes(uid)) &&
      timesOverlap(e.startTime, e.endTime, event.startTime, event.endTime)
    )
  })
}

export default function MessagesPage({ conversationId }: { conversationId?: string } = {}) {
  // ...alle bisherigen useState und useEffect Hooks...
  // (Die Variable showOnlyChatMobile MUSS nach isMobile deklariert werden)
  // (Deshalb erst nach allen useState/useEffect Hooks deklarieren!)

  // ...nach Deklaration von isMobile (also nach allen Hooks!):
  // (isMobile ist erst ab Zeile 928 initialisiert!)
  // ...alle useState/useEffect Hooks...
  // isMobile ist jetzt initialisiert:
  // Entferne doppelte Deklaration!
  // Hydration-sichere Zeit/Datum-Formatierung (immer im Render-Scope verfügbar)
  const [clientHasMounted, setClientHasMounted] = useState(false)
  useEffect(() => { setClientHasMounted(true) }, [])
  function safeFormatMessageTime(isoString: string) {
    if (!clientHasMounted) return ""
    return formatMessageTime(isoString)
  }
  function safeFormatChatDate(date: Date) {
    if (!clientHasMounted) return ""
    return formatChatDate(date)
  }
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [newGroupName, setNewGroupName] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const { toast } = useToast()
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const { messages, addMessage, events, updateEvent, deleteEvent, updateConversation } = useAppStore()
  const conversations = useAppStore((state) => state.conversations)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const groups = useAppStore((s) => s.groups)

  // Neue States für erweiterte Features
  const [messageReactions, setMessageReactions] = useState<Record<string, MessageReaction[]>>({})
  const [isRichTextMode, setIsRichTextMode] = useState(false)

  // Dialog States für Validierung
  const [invalidPastDialogOpen, setInvalidPastDialogOpen] = useState(false)
  const [invalidTimeDialogOpen, setInvalidTimeDialogOpen] = useState(false)

  const filteredConversations = conversations.filter(
    (conversation) =>
      conversation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const [contactSearchQuery, setContactSearchQuery] = useState("")
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(contactSearchQuery.toLowerCase()),
  )

  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflictingEvents, setConflictingEvents] = useState<{ user: Contact; event: Event }[]>([])
  const [suggestedTime, setSuggestedTime] = useState<{ startTime: string; endTime: string } | null>(null)
  const [pendingEvent, setPendingEvent] = useState<Event | null>(null)

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    )
  }

  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({})
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const otherParticipant = activeConversation?.participants.find((c) => c.id !== currentUserId)
  const kontaktId = otherParticipant?.id
  const conversationIdFromParams = searchParams?.get("conversation")
  const forcedParticipants =
    activeConversation?.type === "group"
      ? activeConversation.participants.map((p) => p.id)
      : activeConversation?.participants.map((p) => p.id)

  // conversationId aus Prop oder aus searchParams holen
  const paramConversationId = conversationId || conversationIdFromParams
  useEffect(() => {
    if (paramConversationId) {
      const found = conversations.find((c) => c.id === paramConversationId)
      if (found && (!activeConversation || activeConversation.id !== found.id)) {
        setActiveConversation(found)
      }
    }
  }, [paramConversationId, conversations])

  const groupChatMessages = groupMessagesByChatId(messages)
  const chatId = activeConversation ? generateChatIdFromMembers(activeConversation.participants) : ""
  const chatMessages: MessageType[] = activeConversation ? messages[activeConversation.id] || [] : []

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const validFiles = Array.from(files).filter((file): file is File => file instanceof File)
      setUploadedFiles(validFiles)
    }
  }

  const handleSendMessage = async () => {
    if (!activeConversation || (!messageInput.trim() && uploadedFiles.length === 0)) return

    const filesWithBase64 = await Promise.all(
      uploadedFiles.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: await fileToBase64(file),
      })),
    )

    const content = messageInput

    const newMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "me",
      content,
      time: new Date().toISOString(),
      files: filesWithBase64,
    }

    // Nachricht lokal hinzufügen
    addMessage(activeConversation.id, newMessage)

    setMessageInput("")
    setUploadedFiles([])
  }

  // Sprachnachricht senden
  const handleSendVoiceMessage = async (audioData: string, duration: number) => {
    if (!activeConversation) return

    const newMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "me",
      content: "",
      time: new Date().toISOString(),
      files: [
        {
          name: `voice-${Date.now()}.webm`,
          type: "audio/webm",
          size: audioData.length,
          url: audioData,
          duration,
        },
      ],
      isVoiceMessage: true,
    }

    addMessage(activeConversation.id, newMessage)
  }

  // Reaktionen verwalten
  const handleReactionUpdate = (messageId: string, emoji: string, userId: string, action: "add" | "remove") => {
    setMessageReactions((prev) => {
      const messageReactions = prev[messageId] || []
      const existingReaction = messageReactions.find((r) => r.emoji === emoji)

      if (action === "add") {
        if (existingReaction) {
          if (!existingReaction.users.includes(userId)) {
            existingReaction.users.push(userId)
            existingReaction.count++
          }
        } else {
          messageReactions.push({
            emoji,
            users: [userId],
            count: 1,
          })
        }
      } else {
        if (existingReaction) {
          existingReaction.users = existingReaction.users.filter((id) => id !== userId)
          existingReaction.count = existingReaction.users.length
          if (existingReaction.count === 0) {
            const index = messageReactions.indexOf(existingReaction)
            messageReactions.splice(index, 1)
          }
        }
      }

      return {
        ...prev,
        [messageId]: messageReactions.filter((r) => r.count > 0),
      }
    })
  }

  const handleAddReaction = (messageId: string, emoji: string) => {
    handleReactionUpdate(messageId, emoji, currentUserId, "add")
  }

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    handleReactionUpdate(messageId, emoji, currentUserId, "remove")
  }

  const currentUser: Contact = {
    id: currentUserId,
    name: "Du",
    email: "",
    status: "online",
    avatarUrl: undefined,
  }

  const handleCreateConversation = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Kontakt aus.",
        variant: "destructive",
      })
      return
    }
    const newConversationId = Math.random().toString(36).substring(2, 9)
    const selectedContactObjects = contacts.filter((contact) => selectedContacts.includes(contact.id))
    const participants: Contact[] = [currentUser, ...selectedContactObjects].filter(
      (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i,
    )
    let groupAvatarUrl: string | undefined = undefined
    if (selectedContacts.length > 1) {
      const selectedAvatars = selectedContactObjects.map((c) => c.avatarUrl).filter(Boolean)
      groupAvatarUrl = selectedAvatars.length > 0 ? selectedAvatars[0] : undefined
    }
    const newConversation: Conversation = {
      id: newConversationId,
      name:
        selectedContacts.length === 1
          ? selectedContactObjects[0].name
          : newGroupName || `Neue Gruppe (${participants.map((c) => c.name.split(" ")[0]).join(", ")})`,
      type: selectedContacts.length === 1 ? "individual" : "group",
      lastMessage: "Neue Konversation gestartet",
      time: new Date().toISOString(),
      participants,
      avatarUrl: selectedContacts.length > 1 ? groupAvatarUrl : selectedContactObjects[0]?.avatarUrl,
    }
    const updatedConversations = [newConversation, ...conversations]
    const updatedMessages = { ...messages }
    updatedMessages[newConversationId] = []
    useAppStore.setState({
      conversations: updatedConversations,
      messages: updatedMessages,
    })
    setTimeout(() => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        router.push(`/messages/${newConversationId}`)
      } else {
        router.push(`/messages?conversation=${newConversationId}`)
      }
    }, 0)
    setNewMessageDialogOpen(false)
    setSelectedContacts([])
    setNewGroupName("")

    toast({
      title: "Konversation erstellt",
      description: `${
        newConversation.type === "individual" ? "Einzelchat" : "Gruppenchat"
      } wurde erfolgreich erstellt.`,
    })
  }

  // Gruppen-Dialog
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null)

  const handleOpenGroupDialog = () => {
    if (activeConversation && activeConversation.type === "group") {
      const group = useAppStore
        .getState()
        .groups.find((g) => g.id === activeConversation.id || g.name === activeConversation.name)
      if (group) {
        setGroupToEdit(group)
        setGroupDialogOpen(true)
      } else {
        toast({
          title: "Gruppe nicht gefunden",
          description: "Es wurde keine passende Gruppe zu dieser Unterhaltung gefunden.",
          variant: "destructive",
        })
      }
    }
  }

  function handleSaveGroup(updatedGroup: Group) {
    const prevGroup = useAppStore.getState().groups.find((g) => g.id === updatedGroup.id)
    const oldIds = new Set(prevGroup?.members?.map((m) => m.id))
    const newMembers = updatedGroup.members?.filter((m) => !oldIds.has(m.id)) || []

    useAppStore.getState().updateGroup(updatedGroup)
    useAppStore.getState().updateConversation({
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      avatarUrl: updatedGroup.avatarUrl ?? undefined,
    })

    setGroupDialogOpen(false)
    setGroupToEdit(null)

    toast({
      title: "Gruppe aktualisiert",
      description: `"${updatedGroup.name}" wurde erfolgreich aktualisiert.`,
    })

    setActiveConversation((cur) =>
      cur && cur.id === updatedGroup.id
        ? {
            ...cur,
            name: updatedGroup.name,
            description: updatedGroup.description,
            avatarUrl: updatedGroup.avatarUrl ?? undefined,
          }
        : cur,
    )

    if (newMembers.length > 0) {
      newMembers.forEach((newMember) =>
        addNotificationIfEnabled("newMember", {
          title: `Neues Gruppenmitglied`,
          description: `${newMember.name} ist der Gruppe "${updatedGroup.name}" beigetreten.`,
          href: `/messages?conversation=${updatedGroup.id}`,
        }),
      )
    }

    addNotificationIfEnabled("group", {
      title: `Gruppe geändert`,
      description: `Die Gruppe "${updatedGroup.name}" wurde bearbeitet.`,
      href: `/messages?conversation=${updatedGroup.id}`,
    })
  }

  function handleDeleteGroup(id: string) {
    useAppStore.getState().deleteGroup(id)
    useAppStore.setState((state) => ({
      conversations: state.conversations.filter((conv) => !(conv.type === "group" && conv.id === id)),
      messages: Object.fromEntries(Object.entries(state.messages).filter(([key]) => key !== id)),
    }))
    if (activeConversation?.id === id) {
      setActiveConversation(null)
      router.replace("/messages")
    }
    setGroupDialogOpen(false)
    setGroupToEdit(null)
    toast({
      title: "Gruppe gelöscht",
      description: "Die Gruppe wurde erfolgreich gelöscht.",
    })
  }

  const getStatusColor = (status: string) => {
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

  const router = useRouter()

  const handleOpenEventDetails = (eventId: string) => {
    const event = events.find((e) => e.id === eventId)
    if (event) {
      setSelectedEvent(event)
      setEventDialogOpen(true)
    }
  }

  const handleAddEvent = () => {
    if (!activeConversation) return
    const isGroup = activeConversation.type === "group"
    const sharedWith = activeConversation.participants.map((p) => p.id)
    const newEvent: Event = {
      id: Math.random().toString(36).substring(2, 9),
      title: "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      description: "",
      category: "Arbeit",
      isGroupEvent: isGroup,
      groupId: isGroup ? activeConversation.id : undefined,
      sharedWith,
    }
    setSelectedEvent(newEvent)
    setEventDialogOpen(true)
  }

  const handleSaveEvent = (event: Event) => {
    const { addEvent, updateEvent, events } = useAppStore.getState()
    const exists = events.some((e) => e.id === event.id)

    // Validierung: Alle Felder müssen ausgefüllt sein
    if (!event.title || !event.date || !event.startTime || !event.endTime) {
      return false
    }

    // Validierung: Endzeit darf nicht vor Startzeit liegen
    const startMinutes = event.startTime.split(":").reduce((h: number, m: string) => h * 60 + parseInt(m, 10), 0)
    const endMinutes = event.endTime.split(":").reduce((h: number, m: string) => h * 60 + parseInt(m, 10), 0)
    if (endMinutes <= startMinutes) {
      setInvalidTimeDialogOpen(true)
      return false
    }

    // Validierung: Termin darf nicht in der Vergangenheit liegen
    const now = new Date()
    const eventDate = new Date(event.date)
    const [hours, minutes] = event.startTime.split(":").map(Number)
    eventDate.setHours(hours, minutes, 0, 0)

    if (eventDate.getTime() < now.getTime()) {
      setInvalidPastDialogOpen(true)
      return false
    }

    let sharedWith = event.sharedWith
    if (!sharedWith || sharedWith.length === 0) {
      sharedWith = activeConversation?.participants.map((p) => p.id) ?? []
    }
    const conflicts = getConflictingEvents(event, events, sharedWith)

    if (conflicts.length > 0) {
      const users = contacts.filter((u) => sharedWith!.includes(u.id))
      const conflictInfo = conflicts.map((c) => ({
        user: users.find((u) => c.sharedWith.includes(u.id)) || {
          id: "?",
          name: "Unbekannt",
          email: "",
          status: "offline",
        },
        event: c,
      }))
      setConflictingEvents(conflictInfo)
      setPendingEvent(event)

      const suggestion = suggestFreeTime(event, events, sharedWith)
      setSuggestedTime(suggestion)

      setConflictDialogOpen(true)
      return false
    }

    const patchedEvent = { ...event }
    if (activeConversation?.type === "group") {
      patchedEvent.isGroupEvent = true
      patchedEvent.groupId = activeConversation.id
      patchedEvent.sharedWith = activeConversation.participants.map((p) => p.id)
    } else {
      patchedEvent.isGroupEvent = false
      patchedEvent.groupId = undefined
      if (!patchedEvent.sharedWith) {
        patchedEvent.sharedWith = activeConversation?.participants.map((p) => p.id) ?? []
      }
    }

    if (exists) {
      updateEvent(patchedEvent)
      toast({
        title: "Termin aktualisiert",
        description: `"${event.title}" wurde erfolgreich aktualisiert.`,
      })
    } else {
      addEvent(patchedEvent)
      toast({
        title: "Neuer Termin hinzugefügt",
        description: `"${event.title}" wurde erfolgreich hinzugefügt.`,
      })
    }
    setEventDialogOpen(false)
    setSelectedEvent(null)
    setEventConflictInfo([])
    return true
  }

  function suggestFreeTime(event: Event, allEvents: Event[], userIds: string[]) {
    const date = normalizeDateToMidnight(event.date)
    const now = new Date()
    let earliestHour = 8
    if (date.getTime() === normalizeDateToMidnight(now).getTime()) {
      earliestHour = Math.max(8, now.getHours() + (now.getMinutes() > 0 ? 1 : 0))
    }
    for (let hour = earliestHour; hour < 18; hour++) {
      const start = `${hour.toString().padStart(2, "0")}:00`
      const end = `${(hour + 1).toString().padStart(2, "0")}:00`
      const overlap = allEvents.some(
        (e) =>
          normalizeDateToMidnight(e.date).getTime() === date.getTime() &&
          e.sharedWith.some((uid) => userIds.includes(uid)) &&
          timesOverlap(start, end, e.startTime, e.endTime),
      )
      if (!overlap) return { startTime: start, endTime: end }
    }
    return null
  }

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id)
    setEventDialogOpen(false)
    setSelectedEvent(null)
    toast({
      title: "Termin gelöscht",
      description: "Der Termin wurde erfolgreich gelöscht.",
    })
  }

  const [activeTab, setActiveTab] = useState("chat")
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

  // Automatisches Scrollen ans Chat-Ende (auch bei mobiler Ansicht)
  useEffect(() => {
    if (activeTab === "chat" && activeConversation && scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [activeTab, activeConversation, activeConversation?.id ? messages[activeConversation.id]?.length : undefined])

  useEffect(() => {
    const allContacts = useAppStore.getState().contacts
    setContacts(allContacts)
  }, [])

  // State für Termin-Konflikte
  const [eventConflictInfo, setEventConflictInfo] = useState<{ user: Contact; event: Event }[]>([])

  // Benachrichtigungen für neue Nachrichten
  useEffect(() => {
    if (!activeConversation) return
    const convMessages = messages[activeConversation.id] || []
    if (convMessages.length === 0) return
    const lastMsg = convMessages[convMessages.length - 1]

    // Keine Benachrichtigung für eigene Nachrichten
    if (lastMsg.sender === "me") return

    const user = useAppStore.getState().contacts.find((c) => c.id === currentUserId)
    const mentionPatterns = [user?.name && `@${user.name}`, user?.email && `@${user.email}`, "@du", "@ich"].filter(Boolean)
    const isMentioned = mentionPatterns.some(
      (pattern) => lastMsg.content && lastMsg.content.toLowerCase().includes(pattern!.toLowerCase()),
    )

    if ((lastMsg.sender !== "me" || isMentioned) && (window as any).__lastNotifiedMsgId !== lastMsg.id) {
      addNotificationIfEnabled(isMentioned ? "mention" : "message", {
        title: isMentioned
          ? `Du wurdest erwähnt von ${lastMsg.senderName || lastMsg.sender}`
          : `Neue Nachricht von ${lastMsg.senderName || lastMsg.sender}`,
        description: lastMsg.content,
        href: `/messages?conversation=${activeConversation.id}`,
      })
      ;(window as any).__lastNotifiedMsgId = lastMsg.id
    }
  }, [messages, activeConversation, currentUserId])

  // POLLS MIT LOCALSTORAGE PRO KONVERSATION
  const [polls, setPolls] = useState<any[]>([])
  const [newPollDialogOpen, setNewPollDialogOpen] = useState(false)

  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    options: [
      { id: "opt-new-1", text: "" },
      { id: "opt-new-2", text: "" },
    ],
  })

  useEffect(() => {
    if (activeConversation?.id) {
      const stored = localStorage.getItem(`polls-${activeConversation.id}`)
      if (stored) setPolls(JSON.parse(stored))
      else setPolls([])
    }
  }, [activeConversation?.id])

  useEffect(() => {
    if (activeConversation?.id) {
      localStorage.setItem(`polls-${activeConversation.id}`, JSON.stringify(polls))
    }
  }, [polls, activeConversation?.id])

  function updateNewPollOptionText(index: number, text: string) {
    setNewPoll((prev) => {
      const newOptions = [...prev.options]
      newOptions[index].text = text
      return { ...prev, options: newOptions }
    })
  }

  function addNewPollOption() {
    setNewPoll((prev) => ({
      ...prev,
      options: [...prev.options, { id: `opt-new-${prev.options.length + 1}`, text: "" }],
    }))
  }

  function canAddPoll() {
    return newPoll.title.trim().length > 0 && newPoll.options.filter((o) => o.text.trim() !== "").length >= 2
  }

  function handleCreatePoll() {
    if (!canAddPoll()) {
      alert("Bitte gib einen Titel und mindestens 2 Optionen ein.")
      return
    }
    const newPollEntry = {
      id: `poll-${Date.now()}`,
      title: newPoll.title,
      description: newPoll.description,
      createdBy: currentUserId || "current-user",
      createdAt: new Date(),
      options: newPoll.options
        .filter((o) => o.text.trim() !== "")
        .map((o, i) => ({
          id: `opt-${Date.now()}-${i}`,
          text: o.text,
          votes: [],
        })),
    }
    setPolls((prev) => [newPollEntry, ...prev])
    setNewPollDialogOpen(false)
    setNewPoll({
      title: "",
      description: "",
      options: [
        { id: "opt-new-1", text: "" },
        { id: "opt-new-2", text: "" },
      ],
    })
  }

  function handleVote(pollId: string, optionId: string) {
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll
        const updatedOptions = poll.options.map((opt: any) => ({
          ...opt,
          votes: opt.votes.filter((v: string) => v !== currentUserId),
        }))
        const optionIndex = updatedOptions.findIndex((opt: any) => opt.id === optionId)
        if (optionIndex !== -1) {
          updatedOptions[optionIndex].votes.push(currentUserId)
        }
        return { ...poll, options: updatedOptions }
      }),
    )
  }

  function getCreatorName(userId: string) {
    if (userId === currentUserId) return "Du"
    const contact = contacts.find((c) => c.id === userId)
    return contact?.name || "Unbekannt"
  }

  // DATEIEN-TAB FILTER & LOGIK
  const [fileTab, setFileTab] = useState<"all" | "images" | "files">("all")
  const files =
    (activeConversation &&
      messages[activeConversation.id]?.flatMap((message: any) =>
        (message.files ?? []).map((file: any) => ({
          ...file,
          sender: message.sender,
          senderName: message.senderName,
          time: message.time,
        })),
      )) ||
    []

  const filteredFiles = files
    .filter((file) => {
      if (fileTab === "all") return true
      const isImage = file.type?.startsWith("image/")
      return fileTab === "images" ? isImage : !isImage
    })
    .sort((a, b) => {
      const at = a.time ? new Date(a.time).getTime() : 0
      const bt = b.time ? new Date(b.time).getTime() : 0
      return bt - at
    })

  // EVENTS Einzelchat- und Gruppen-Events korrekt filtern
  const getConversationEvents = (conversation: Conversation | null) => {
    if (!conversation) return []
    const ids = conversation.participants.map((p) => p.id)
    if (conversation.type === "group") {
      return events.filter((event) => event.groupId === conversation.id)
    } else {
      return getSharedEvents(events, ids)
    }
  }

  // Multi-Select für Konversationen
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedConversations, setSelectedConversations] = useState<string[]>([])

  const longPressTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleConversationMouseDown = (conversationId: string) => {
    if (selectionMode) return
    longPressTimeout.current = setTimeout(() => {
      setSelectionMode(true)
      setSelectedConversations([conversationId])
    }, 600)
  }

  const handleConversationMouseUp = () => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current)
  }

  const handleConversationClick = (conversation: Conversation) => {
    if (selectionMode) {
      setSelectedConversations((prev) =>
        prev.includes(conversation.id) ? prev.filter((id) => id !== conversation.id) : [...prev, conversation.id],
      )
    } else {
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        router.push(`/messages/${conversation.id}`)
      } else {
        setActiveConversation(conversation)
        router.push(`/messages?conversation=${conversation.id}`)
      }
    }
  }

  const handleSelectionCancel = () => {
    setSelectionMode(false)
    setSelectedConversations([])
  }

  const handleDeleteSelectedConversations = () => {
    useAppStore.setState((state) => ({
      conversations: state.conversations.filter((conv) => !selectedConversations.includes(conv.id)),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => !selectedConversations.includes(key)),
      ),
    }))
    if (activeConversation && selectedConversations.includes(activeConversation.id)) {
      setActiveConversation(null)
      router.replace("/messages")
    }
    setSelectionMode(false)
    setSelectedConversations([])
    toast({
      title: "Konversation(en) gelöscht",
      description: "Die ausgewählten Konversationen wurden gelöscht.",
    })
  }


  // Ermittle, ob Mobilansicht aktiv ist
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Diese Zeile MUSS nach allen useState/useEffect Hooks stehen!
  // Nur eine Deklaration direkt vor return!
  const showOnlyChatMobile = isMobile && !!conversationId

  return (
    <div className="container py-0 px-4">
      {/* Header nur anzeigen, wenn NICHT in mobiler Chat-Detailansicht */}
      {!showOnlyChatMobile && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Nachrichten</h1>
          {selectionMode ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectionCancel} size="sm">
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSelectedConversations}
                disabled={selectedConversations.length === 0}
                size="sm"
              >
                Löschen ({selectedConversations.length})
              </Button>
            </div>
          ) : (
            <Button onClick={() => setNewMessageDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Neue Nachricht
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Konversationsliste (nur anzeigen, wenn nicht in mobiler Chat-Detailansicht) */}
        {!showOnlyChatMobile && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Konversationen</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Konversationen durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px] md:h-[600px]">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 border-b cursor-pointer hover:bg-accent transition-colors ${
                        activeConversation?.id === conversation.id ? "bg-accent" : ""
                      } ${selectedConversations.includes(conversation.id) ? "bg-blue-100" : ""}`}
                      onClick={() => handleConversationClick(conversation)}
                      onMouseDown={() => handleConversationMouseDown(conversation.id)}
                      onMouseUp={handleConversationMouseUp}
                      onMouseLeave={handleConversationMouseUp}
                    >
                      <div className="flex items-center gap-3">
                        {selectionMode && (
                          <Checkbox checked={selectedConversations.includes(conversation.id)} onChange={() => {}} />
                        )}
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{conversation.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium truncate text-sm">{conversation.name}</h3>
                            <span className="text-xs text-muted-foreground">{safeFormatMessageTime(conversation.time)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage}</p>
                          {conversation.unread && (
                            <div className="flex items-center justify-between mt-1">
                              <div />
                              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                                {conversation.unread}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chat-Bereich: Desktop ODER mobile Detailansicht */}
        {(!isMobile || showOnlyChatMobile) && (
          <div className="lg:col-span-2">
            {activeConversation ? (
              <Card className="h-[600px] md:h-[700px] flex flex-col min-h-0 sm:min-h-0 w-full sm:w-auto" style={{ height: isMobile ? '100dvh' : undefined }}>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{activeConversation.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-sm">{activeConversation.name}</h3>
                      <div className="flex items-center gap-2">
                        {activeConversation.type === "individual" && otherParticipant && (
                          <>
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(otherParticipant.status)}`} />
                            <span className="text-xs text-muted-foreground capitalize">{otherParticipant.status}</span>
                          </>
                        )}
                        {activeConversation.type === "group" && (
                          <span className="text-xs text-muted-foreground">
                            {activeConversation.participants.length} Mitglieder
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Video className="h-4 w-4" />
                    </Button>
                    {activeConversation.type === "group" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenGroupDialog}>
                        <Users className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {/* Infobereich für Termine, Dateien, Umfragen - ENTFERNT, damit keine Inhalte über den Tabs erscheinen */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                  <div
                    className="bg-muted rounded-b-xl px-4"
                    style={{
                      paddingTop: isMobile ? 4 : undefined,
                      paddingBottom: isMobile ? 16 : undefined,
                    }}
                  >
                    <TabsList
                      className={`grid w-full ${activeConversation.type === "group" ? "grid-cols-4" : "grid-cols-3"}`}
                    >
                      <TabsTrigger value="chat" className="text-xs">
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="events" className="text-xs">
                        Termine
                      </TabsTrigger>
                      <TabsTrigger value="files" className="text-xs">
                        Dateien
                      </TabsTrigger>
                      {activeConversation.type === "group" && (
                        <TabsTrigger value="polls" className="text-xs">
                          Umfragen
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                <TabsContent value="chat" className="flex-1 flex flex-col mt-0 px-4" >
                  {/* Chatbereich mit fixiertem Eingabefeld unten */}
                  <div className="flex flex-col flex-1 min-h-0 h-full">
                    <ScrollArea className="flex-1 min-h-[200px] h-0" ref={scrollAreaRef}>
                      <div className="space-y-3 py-4 flex-1">
                        {chatMessages.length > 0 ? (
                          chatMessages.map((message, index) => {
                            const isMe = message.sender === "me"
                            const showDate =
                              index === 0 || safeFormatChatDate(new Date(message.time)) !== safeFormatChatDate(new Date(chatMessages[index - 1].time))
                            return (
                              <div key={message.id}>
                                {showDate && (
                                  <div className="text-center text-xs text-muted-foreground my-4">
                                    {safeFormatChatDate(new Date(message.time))}
                                  </div>
                                )}
                                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                  <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                      isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                                    }`}
                                  >
                                    {!isMe && activeConversation.type === "group" && (
                                      <div className="text-xs font-medium mb-1">
                                        {message.senderName || message.sender}
                                      </div>
                                    )}
                                    {message.content && <div className="text-sm">{message.content}</div>}
                                    {/* Dateien anzeigen */}
                                    {message.files && message.files.length > 0 && (
                                      <div className="mt-2 space-y-2">
                                        {message.files.map((file, fileIndex) => (
                                          <div key={fileIndex}>
                                            {file.type?.startsWith("image/") ? (
                                              <div className="relative group">
                                                <img
                                                  src={file.url || "/placeholder.svg"}
                                                  alt={file.name}
                                                  className="max-w-full h-auto rounded cursor-pointer"
                                                  onClick={() => downloadFile(file)}
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                                  <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => downloadFile(file)}
                                                  >
                                                    Herunterladen
                                                  </Button>
                                                </div>
                                              </div>
                                            ) : file.type?.startsWith("audio/") ? (
                                              <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                                                <audio controls className="flex-1">
                                                  <source src={file.url} type={file.type} />
                                                </audio>
                                                <Button variant="ghost" size="sm" onClick={() => downloadFile(file)}>
                                                  ⬇️
                                                </Button>
                                                {"duration" in file && typeof file.duration === "number" && (
                                                    <span className="text-xs opacity-75">
                                                        {Math.floor(file.duration / 60)}:
                                                        {Math.floor(file.duration % 60)
                                                            .toString()
                                                            .padStart(2, "0")}
                                                    </span>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2 p-2 bg-background/10 rounded">
                                                <FileText className="h-4 w-4" />
                                                <span className="text-xs flex-1">{file.name}</span>
                                                <span className="text-xs opacity-75">
                                                  ({(file.size / 1024).toFixed(1)} KB)
                                                </span>
                                                <Button variant="ghost" size="sm" onClick={() => downloadFile(file)}>
                                                  ⬇️
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-xs opacity-75">{safeFormatMessageTime(message.time)}</span>
                                      {isMe && <Check className="h-3 w-3 opacity-75" />}
                                    </div>
                                  </div>
                                </div>
                                {/* Reaktionen */}
                                {messageReactions[message.id] && messageReactions[message.id].length > 0 && (
                                  <div className={`flex ${isMe ? "justify-end" : "justify-start"} mt-1`}>
                                    <MessageReactions
                                      messageId={message.id}
                                      reactions={messageReactions[message.id]}
                                      currentUserId={currentUserId}
                                      onAddReaction={handleAddReaction}
                                      onRemoveReaction={handleRemoveReaction}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-center py-8 text-muted-foreground flex-1">
                            Noch keine Nachrichten. Starten Sie die Konversation!
                          </div>
                        )}
                        <div ref={scrollAnchorRef} />
                      </div>
                    </ScrollArea>
                    {/* Eingabebereich fixiert am unteren Rand */}
                    <div className="sticky bottom-0 left-0 w-full bg-background z-10 border-t">
                      <CardFooter className="flex-col gap-3 p-4">
                        {/* Hochgeladene Dateien anzeigen */}
                        {uploadedFiles.length > 0 && (
                          <div className="w-full">
                            <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                              {uploadedFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 bg-background px-2 py-1 rounded text-sm"
                                >
                                  <span className="text-xs">{file.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0"
                                    onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-end gap-2 w-full">
                          <div className="flex-1">
                            {isRichTextMode ? (
                              <RichTextEditor
                                value={messageInput}
                                onChange={setMessageInput}
                                placeholder="Nachricht eingeben..."
                                className="min-h-[40px]"
                              />
                            ) : (
                              <Input
                                placeholder="Nachricht eingeben..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendMessage()
                                  }
                                }}
                                className="min-h-[40px]"
                              />
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsRichTextMode(!isRichTextMode)}
                            className={`h-10 w-10 ${isRichTextMode ? "bg-accent" : ""}`}
                          >
                            <span className="text-xs">RT</span>
                          </Button>
                          <Button variant="outline" size="icon" onClick={handleFileUpload} className="h-10 w-10">
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <VoiceMessage onSend={handleSendVoiceMessage} />
                          <Button onClick={handleSendMessage} size="icon" className="h-10 w-10">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleChatFileSelect}
                      multiple
                      className="hidden"
                      accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="events" className="flex flex-col mt-0 px-0">
                  {/* Header direkt unter dem grauen Tab-Bar-Kasten, ohne Abstand */}
                  <div className="flex justify-between items-center px-4 pt-0 pb-0">
                    <h3 className="text-lg font-medium">Gemeinsame Termine</h3>
                    <Button onClick={handleAddEvent} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Termin hinzufügen
                    </Button>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1 mt-0 px-4 pt-2">
                      <div className="space-y-3">
                        {getConversationEvents(activeConversation).map((event) => (
                          <Card
                            key={event.id}
                            className="p-3 cursor-pointer hover:bg-accent"
                            onClick={() => handleOpenEventDetails(event.id)}
                          >
                            <div className="flex items-center justify-between">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{event.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.date).toLocaleDateString("de-DE")} {event.startTime}–{event.endTime}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="files" className="flex-1 flex flex-col mt-0 px-4">
                  <div className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1">
                      <div className="space-y-4 py-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Geteilte Dateien</h3>
                          <Tabs value={fileTab} onValueChange={(v) => setFileTab(v as any)}>
                            <TabsList>
                              <TabsTrigger value="all" className="text-xs">
                                Alle
                              </TabsTrigger>
                              <TabsTrigger value="images" className="text-xs">
                                Bilder
                              </TabsTrigger>
                              <TabsTrigger value="files" className="text-xs">
                                Dateien
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {filteredFiles.map((file, index) => (
                            <Card
                              key={index}
                              className="p-2 cursor-pointer hover:bg-accent"
                              onClick={() => downloadFile(file)}
                            >
                              {file.type?.startsWith("image/") ? (
                                <img
                                  src={file.url || "/placeholder.svg"}
                                  alt={file.name}
                                  className="w-full h-24 object-cover rounded mb-2"
                                />
                              ) : (
                                <div className="w-full h-24 bg-muted rounded mb-2 flex items-center justify-center">
                                  <FileText className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div className="space-y-1">
                                <p className="text-xs font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">Von {file.senderName || file.sender}</p>
                                <p className="text-xs text-muted-foreground">
                                  {file.time && safeFormatMessageTime(file.time)}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2 h-6 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    downloadFile(file)
                                  }}
                                >
                                  Herunterladen
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                  {activeConversation.type === "group" && (
                    <TabsContent value="polls" className="flex-1 flex flex-col mt-0 px-4">
                      <div className="flex-1 flex flex-col">
                        <ScrollArea className="flex-1">
                          <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-medium">Umfragen</h3>
                              <Button onClick={() => setNewPollDialogOpen(true)} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Umfrage erstellen
                              </Button>
                            </div>
                            <div className="space-y-4">
                              {polls.map((poll) => (
                                <Card key={poll.id} className="p-3">
                                  <div className="space-y-3">
                                    <div>
                                      <h4 className="font-medium text-sm">{poll.title}</h4>
                                      {poll.description && (
                                        <p className="text-xs text-muted-foreground">{poll.description}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Von {getCreatorName(poll.createdBy)} •{" "}
                                        {new Date(poll.createdAt).toLocaleDateString("de-DE")}
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      {poll.options.map((option: any) => {
                                        const hasVoted = option.votes.includes(currentUserId)
                                        const percentage =
                                          poll.options.reduce((sum: number, opt: any) => sum + opt.votes.length, 0) > 0
                                            ? (option.votes.length /
                                                poll.options.reduce((sum: number, opt: any) => sum + opt.votes.length, 0)) *
                                              100
                                            : 0
                                        return (
                                          <div
                                            key={option.id}
                                            className={`p-2 rounded border cursor-pointer transition-colors ${
                                              hasVoted ? "bg-primary/10 border-primary" : "hover:bg-accent"
                                            }`}
                                            onClick={() => handleVote(poll.id, option.id)}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs">{option.text}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {option.votes.length} - {percentage.toFixed(1)}%
                                              </span>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </Card>
            ) : (
              <Card className="h-[600px] md:h-[700px] flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageSquare className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-xl font-bold tracking-tight mb-2">Konversation auswählen</h2>
                  <p className="text-muted-foreground text-sm">
                    Wählen Sie eine bestehende Konversation aus oder starten Sie eine neue, um Nachrichten anzuzeigen.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Dialoge */}
      <Dialog open={newMessageDialogOpen} onOpenChange={setNewMessageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Nachricht</DialogTitle>
            <DialogDescription>Wählen Sie Kontakte aus, um eine neue Konversation zu starten.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kontakte durchsuchen..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={contact.id}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleContactSelect(contact.id)}
                    />
                    <Label htmlFor={contact.id} className="text-sm">
                      {contact.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {selectedContacts.length > 1 && (
              <div>
                <Label htmlFor="group-name">Gruppenname (optional)</Label>
                <Input
                  id="group-name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Name der Gruppe"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleCreateConversation}>
              Konversation starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validierungs-Dialoge */}
      <Dialog open={invalidPastDialogOpen} onOpenChange={setInvalidPastDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Termin ungültig</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Der Termin kann nicht angelegt werden, da er in der Vergangenheit liegt.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInvalidPastDialogOpen(false)} variant="outline">
              OK
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
            <Button onClick={() => setInvalidTimeDialogOpen(false)} variant="outline">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Conflict Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent className="w-full max-w-screen-md px-4 sm:px-8">
          <DialogHeader>
            <DialogTitle>Terminkonflikt</DialogTitle>
            <DialogDescription>
              Der Termin überschneidet sich mit anderen Terminen. Bitte wählen Sie eine andere Zeit oder ignorieren Sie
              den Konflikt.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {conflictingEvents.map((conflict, index) => (
              <div key={index} className="border rounded-md p-3">
                <h4 className="font-medium text-sm">Konflikt mit: {conflict.user.name}</h4>
                <p className="text-xs text-muted-foreground">
                  Termin: {conflict.event.title} am {new Date(conflict.event.date).toLocaleDateString("de-DE")} von{" "}
                  {conflict.event.startTime} bis {conflict.event.endTime}
                </p>
              </div>
            ))}
            {suggestedTime && (
              <div className="border rounded-md p-3 bg-green-50">
                <h4 className="font-medium text-sm">Vorschlag:</h4>
                <p className="text-xs text-muted-foreground">
                  {new Date(pendingEvent!.date).toLocaleDateString("de-DE")} von {suggestedTime.startTime} bis{" "}
                  {suggestedTime.endTime}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    if (pendingEvent && suggestedTime) {
                      setConflictDialogOpen(false)
                      setEventDialogOpen(false)
                      setTimeout(() => {
                        setSelectedEvent({
                          ...pendingEvent,
                          startTime: suggestedTime.startTime,
                          endTime: suggestedTime.endTime,
                        })
                        setEventDialogOpen(true)
                      }, 100)
                    }
                  }}
                >
                  Zeit übernehmen
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConflictDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (pendingEvent) {
                  handleSaveEvent(pendingEvent)
                  setConflictDialogOpen(false)
                }
              }}
            >
              Trotzdem speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Dialog */}
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent ? {
          id: selectedEvent.id,
          title: selectedEvent.title,
          startTime: selectedEvent.startTime,
          endTime: selectedEvent.endTime,
          date: typeof selectedEvent.date === "string" ? new Date(selectedEvent.date) : selectedEvent.date,
          description: selectedEvent.description ?? "",
          category: selectedEvent.category ?? "",
          location: selectedEvent.location ?? "",
          reminder: selectedEvent.reminder ?? "",
          sharedWith: selectedEvent.sharedWith,
          isGroupEvent: selectedEvent.isGroupEvent ?? false,
          groupId: selectedEvent.groupId ?? ""
        } : undefined}
        onSave={(event) => {
          const result = handleSaveEvent(event)
          // Rückgabewert anpassen: boolean → "created" | "updated" | false | undefined
          if (result === true) return "created"
          if (result === false) return false
          return undefined
        }}
        onDelete={handleDeleteEvent}
        contacts={contacts}
        forcedParticipants={forcedParticipants}
        currentUserId={currentUserId}
        groups={groups}
        events={events.map(e => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          date: typeof e.date === "string" ? new Date(e.date) : e.date,
          description: e.description ?? "",
          category: e.category ?? "",
          location: e.location ?? "",
          reminder: e.reminder ?? "",
          sharedWith: e.sharedWith,
          isGroupEvent: e.isGroupEvent ?? false,
          groupId: e.groupId ?? ""
        }))}
      />

      {/* Group Dialog */}
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={groupToEdit ?? undefined}
        onSave={handleSaveGroup}
        onDelete={handleDeleteGroup}
        contacts={contacts}
        currentUserId={currentUserId}
      />

      {/* New Poll Dialog */}
      <Dialog open={newPollDialogOpen} onOpenChange={setNewPollDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Umfrage erstellen</DialogTitle>
            <DialogDescription>Gib einen Titel und mindestens 2 Optionen für die Umfrage ein.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="poll-title">Titel</Label>
              <Input
                id="poll-title"
                value={newPoll.title}
                onChange={(e) => setNewPoll((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Titel der Umfrage"
              />
            </div>
            <div>
              <Label htmlFor="poll-description">Beschreibung (optional)</Label>
              <Input
                id="poll-description"
                value={newPoll.description}
                onChange={(e) => setNewPoll((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Beschreibung der Umfrage"
              />
            </div>
            <div>
              <Label>Optionen</Label>
              <div className="space-y-2">
                {newPoll.options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Input
                      id={`option-${index}`}
                      value={option.text}
                      onChange={(e) => updateNewPollOptionText(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addNewPollOption}>
                  Weitere Option hinzufügen
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setNewPollDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreatePoll} disabled={!canAddPoll()}>
              Umfrage erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
