"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
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

interface MessagesPageProps {
  mobileConversationId?: string
}

export default function MessagesPage({ mobileConversationId, forceMobile }: { mobileConversationId?: string, forceMobile?: boolean } = {}) {
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

  useEffect(() => {
    if (mobileConversationId) {
      const found = conversations.find((c) => c.id === mobileConversationId)
      if (found && (!activeConversation || activeConversation.id !== found.id)) {
        setActiveConversation(found)
      }
    }
  }, [mobileConversationId, conversations])

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

  const currentUser = {
    id: currentUserId,
    name: "Du",
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
      router.push(`/messages?conversation=${newConversationId}`)
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
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  // window-abhängige States für SSR-Sicherheit
  const [isMobileState, setIsMobile] = useState(forceMobile ?? false)
  const [clientConversationId, setClientConversationId] = useState<string | undefined>(mobileConversationId)

  useEffect(() => {
    if (typeof window !== "undefined" && !forceMobile) {
      setIsMobile(window.innerWidth < 768)
      if (!mobileConversationId) {
        const urlConv = new URLSearchParams(window.location.search).get("conversation") || undefined
        setClientConversationId(urlConv)
      }
    } else if (forceMobile) {
      setIsMobile(true)
    }
  }, [mobileConversationId, forceMobile])

  // activeConversation bestimmen
  useEffect(() => {
    if (clientConversationId) {
      const found = conversations.find((c) => c.id === clientConversationId)
      if (found && (!activeConversation || activeConversation.id !== found.id)) {
        setActiveConversation(found)
      }
    }
  }, [clientConversationId, conversations])

  // Conversation-Auswahl: auf Mobile redirecten
  const handleConversationClick = (conversation: Conversation) => {
    if (isMobileState) {
      router.push(`/messages/${conversation.id}`)
    } else {
      setActiveConversation(conversation)
      router.push(`/messages?conversation=${conversation.id}`)
    }
  }

  // Dummy-Implementierung für handleAddEvent
  const handleAddEvent = () => {
    toast({
      title: "Termin hinzufügen",
      description: "Hier könnte ein Dialog zum Hinzufügen eines Termins geöffnet werden.",
    })
  }

  // Hilfsfunktion: Events für eine Conversation filtern
  function getConversationEvents(conversation: Conversation | null) {
    if (!conversation) return []
    // Dummy: alle Events, die mindestens einen Teilnehmer aus der Conversation haben
    return events.filter((event: any) =>
      conversation.participants.some((p) => event.participants?.includes?.(p.id))
    )
  }

  // Tab- und Content-States/Refs für Chat-Bereich (sowohl Mobile als auch Desktop)
  const [activeTab, setActiveTab] = useState("chat")
  const [fileTab, setFileTab] = useState("all")
  const [polls, setPolls] = useState<PollType[]>([])
  const [newPollDialogOpen, setNewPollDialogOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

  // Filter für geteilte Dateien (Dateien-Tab)
  const filteredFiles = useMemo(() => {
    if (!chatMessages) return []
    let files = chatMessages
      .flatMap((msg) =>
        (msg.files || []).map((file) => ({
          ...file,
          sender: msg.sender,
          senderName: msg.senderName,
          time: msg.time,
        }))
      )
      .filter((file) => !!file)
    if (fileTab === "images") {
      files = files.filter((file) => file.type?.startsWith("image/"))
    } else if (fileTab === "files") {
      files = files.filter((file) => !file.type?.startsWith("image/"))
    }
    return files
  }, [chatMessages, fileTab])

  // Layout: Mobile = nur Konversationsliste ODER nur Chat, Desktop = Liste + Chat
  if (isMobileState) {
    // Wenn eine Konversation aktiv ist (mobileConversationId), zeige nur den Chat (ohne Liste)
    if (mobileConversationId && activeConversation) {
      return (
        <div className="flex flex-col h-[100dvh] min-h-0">
          <Card className="h-full flex-1 flex flex-col">
            {/* Chat-Bereich wie auf Desktop, aber ohne Liste */}
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
              <div className="px-4">
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
              <TabsContent value="chat" className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 min-h-0 h-full px-4 overflow-y-auto" ref={scrollAreaRef}>
                  <div className="space-y-3 py-4">
                    {chatMessages.length > 0 ? (
                      chatMessages.map((message, index) => {
                        const isMe = message.sender === "me"
                        const showDate =
                          index === 0 ||
                          formatChatDate(new Date(message.time)) !==
                            formatChatDate(new Date(chatMessages[index - 1].time))

                        return (
                          <div key={message.id}>
                            {showDate && (
                              <div className="text-center text-xs text-muted-foreground my-4">
                                {formatChatDate(new Date(message.time))}
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
                                            {file.duration && (
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
                                  <span className="text-xs opacity-75">{formatMessageTime(message.time)}</span>
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
                      <div className="text-center py-8 text-muted-foreground">
                        Noch keine Nachrichten. Starten Sie die Konversation!
                      </div>
                    )}
                    <div ref={scrollAnchorRef} />
                  </div>
                </ScrollArea>

                {/* Eingabebereich */}
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

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleChatFileSelect}
                  multiple
                  className="hidden"
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
                />
              </TabsContent>

              <TabsContent value="events" className="flex-1 px-4">
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Gemeinsame Termine</h3>
                    <Button onClick={handleAddEvent} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Termin hinzufügen
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px]">
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

              <TabsContent value="files" className="flex-1 px-4">
                <div>
                  <div className="flex justify-between items-center mb-4">
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
                  <ScrollArea className="h-[400px]">
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
                              {file.time && formatMessageTime(file.time)}
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
                  </ScrollArea>
                </div>
              </TabsContent>

              {activeConversation.type === "group" && (
                <TabsContent value="polls" className="flex-1 px-4">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Umfragen</h3>
                      <Button onClick={() => setNewPollDialogOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Umfrage erstellen
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px]">
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
                    </ScrollArea>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </Card>
        </div>
      )
    }
    // Sonst: Nur die Liste anzeigen
    return (
      <div className="flex flex-col h-[100dvh] min-h-0">
        <Card className="h-full flex-1 flex flex-col">
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
          <CardContent className="p-0 flex-1 min-h-0">
            <ScrollArea className="h-full">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 border-b cursor-pointer hover:bg-accent transition-colors ${
                    activeConversation?.id === conversation.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleConversationClick(conversation)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{conversation.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate text-sm">{conversation.name}</h3>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(conversation.time)}
                        </span>
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
    )
  }

  // Desktop-Ansicht: Tabs und Inhalte auf der rechten Seite
  return (
    <div className="container py-4 md:py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Nachrichten</h1>
        <Button onClick={() => setNewMessageDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Neue Nachricht
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Konversationsliste */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] md:h-[700px]">
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
                    }`}
                    onClick={() => handleConversationClick(conversation)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{conversation.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate text-sm">{conversation.name}</h3>
                          <span className="text-xs text-muted-foreground">
                            {formatMessageTime(conversation.time)}
                          </span>
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
        {/* Chat-Bereich */}
        <div className="lg:col-span-2">
          {activeConversation ? (
            <Card className="h-[600px] md:h-[700px] flex flex-col">
              {/* Tabs-Bereich wie im Mobile-Block */}
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
                <div className="px-4">
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
                <TabsContent value="chat" className="flex-1 flex flex-col min-h-0">
                  <ScrollArea className="flex-1 min-h-0 h-full px-4 overflow-y-auto" ref={scrollAreaRef}>
                    <div className="space-y-3 py-4">
                      {chatMessages.length > 0 ? (
                        chatMessages.map((message, index) => {
                          const isMe = message.sender === "me"
                          const showDate =
                            index === 0 ||
                            formatChatDate(new Date(message.time)) !==
                              formatChatDate(new Date(chatMessages[index - 1].time))

                          return (
                            <div key={message.id}>
                              {showDate && (
                                <div className="text-center text-xs text-muted-foreground my-4">
                                  {formatChatDate(new Date(message.time))}
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
                                              {file.duration && (
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
                                    <span className="text-xs opacity-75">{formatMessageTime(message.time)}</span>
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
                        <div className="text-center py-8 text-muted-foreground">
                          Noch keine Nachrichten. Starten Sie die Konversation!
                        </div>
                      )}
                      <div ref={scrollAnchorRef} />
                    </div>
                  </ScrollArea>

                  {/* Eingabebereich */}
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

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleChatFileSelect}
                    multiple
                    className="hidden"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
                  />
                </TabsContent>

                <TabsContent value="events" className="flex-1 px-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Gemeinsame Termine</h3>
                      <Button onClick={handleAddEvent} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Termin hinzufügen
                      </Button>
                    </div>
                    <ScrollArea className="h-[400px]">
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

                <TabsContent value="files" className="flex-1 px-4">
                  <div>
                    <div className="flex justify-between items-center mb-4">
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
                    <ScrollArea className="h-[400px]">
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
                                {file.time && formatMessageTime(file.time)}
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
                    </ScrollArea>
                  </div>
                </TabsContent>

                {activeConversation.type === "group" && (
                  <TabsContent value="polls" className="flex-1 px-4">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Umfragen</h3>
                        <Button onClick={() => setNewPollDialogOpen(true)} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Umfrage erstellen
                        </Button>
                      </div>
                      <ScrollArea className="h-[400px]">
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
      </div>
      {/* ...Dialoge etc. wie gehabt... */}
    </div>
  )
}

// Dummy-Handler für Event-Details (öffnet nur Toast)
function handleOpenEventDetails(eventId: string) {
  toast({
    title: "Event-Details",
    description: `Event-ID: ${eventId}`,
  })
}

// Dummy-Funktion für Poll-Ersteller
function getCreatorName(userId: string) {
  if (!userId) return "Unbekannt"
  const user = contacts.find((c) => c.id === userId)
  return user ? user.name : userId
}

// Dummy-Handler für Poll-Voting
function handleVote(pollId: string, optionId: string) {
  toast({
    title: "Abstimmung",
    description: `Abgestimmt für Option ${optionId} in Umfrage ${pollId}`,
  })
}

// Hilfsfunktion für duration-Check bei Dateien
function getFileDuration(file: any) {
  return typeof file.duration === "number" ? file.duration : undefined
}