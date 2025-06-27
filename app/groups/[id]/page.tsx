"use client"

import React, { useRef } from "react"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/calendar"
import { EventDialog, type Event } from "@/components/event-dialog"
import { GroupDialog, type Group, type GroupPoll } from "@/components/group-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  Users,
  CalendarDays,
  FileText,
  BarChart,
  Settings,
  ArrowLeft,
  PlusCircle,
  Check,
  Clock,
  Phone,
  Video,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Importieren Sie die GroupChat-Komponente
import { GroupChat } from "./chat"


export default function GroupDetailPage() {
  const params = useParams()
  const groupId = params.id as string
  const groups = useAppStore(state => state.groups)
  const updateGroup = useAppStore(state => state.updateGroup)
  const deleteGroup = useAppStore(state => state.deleteGroup)
  const { toast } = useToast()

  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageInput, setMessageInput] = useState("")
  const [groupEvents, setGroupEvents] = useState<Event[]>([])
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [newPollDialogOpen, setNewPollDialogOpen] = useState(false)
  const [newPoll, setNewPoll] = useState<Omit<GroupPoll, "id" | "createdBy" | "createdAt" | "isActive">>({
    title: "",
    description: "",
    options: [
      { id: "1", text: "", votes: [] },
      { id: "2", text: "", votes: [] },
    ],
  })

const sampleEvents: Event[] = [];

  // Hier kannst du die Chat-Nachrichten und Mitglieder definieren
  const chatGroup = {
    chat: [], // Hier sollten die Nachrichten gespeichert werden
    members: [
      { id: "current-user", name: "Dein Name" },
      // Weitere Mitglieder...
    ],
  };

const fileInputChatRef = useRef<HTMLInputElement | null>(null)
const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
const [chatMessages, setChatMessages] = useState<
  { id: string; sender: string; message?: string; timestamp: Date; files?: File[] }[]
>([]);

const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files
  if (files && files.length > 0) {
    const filesArray = Array.from(files)
    setUploadedFiles(prev => [...prev, ...filesArray])
  }
}


  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click() // Öffne den Datei-Explorer
    }
  }

const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = event.target.files
  if (files) {
    const filesArray = Array.from(files)
    setUploadedFiles(prev => [...prev, ...filesArray])
    // Optional: weitere Verarbeitung/Upload etc.
  }
}


const router = useRouter()


  // Sample contacts data for the group dialog
  const contacts = [
    {
      id: "1",
      name: "Anna Schmidt",
      email: "anna@beispiel.de",
      phone: "+49 123 456789",
      status: "online",
    },
    {
      id: "2",
      name: "Thomas Müller",
      email: "thomas@beispiel.de",
      phone: "+49 123 456790",
      status: "offline",
    },
    {
      id: "3",
      name: "Lisa Weber",
      email: "lisa@beispiel.de",
      phone: "+49 123 456791",
      status: "away",
    },
    {
      id: "4",
      name: "Michael Becker",
      email: "michael@beispiel.de",
      phone: "+49 123 456792",
      status: "online",
    },
    {
      id: "5",
      name: "Sarah Fischer",
      email: "sarah@beispiel.de",
      phone: "+49 123 456793",
      status: "busy",
    },
  ]

  const [activeTab, setActiveTab] = useState("chat")

  useEffect(() => {
    setLoading(true)
    const foundGroup = groups.find((g) => g.id === groupId)
    if (foundGroup) {
      setGroup(foundGroup)
      const eventsForGroup = sampleEvents.filter((event) => event.groupId === groupId)
      setGroupEvents(eventsForGroup)

      if (typeof window !== "undefined") {
        const savedTab = localStorage.getItem(`group-${groupId}-tab`)
        if (savedTab) {
          setActiveTab(savedTab)
        } else {
          setActiveTab("chat")
        }
      }
    } else {
      setGroup(null)
    }
    setLoading(false)
  }, [groupId, groups])

const handleSendMessage = (message: string, files?: File[]) => {
  const newMessage = {
    id: generateUniqueId(), // Funktion zum Generieren einer eindeutigen ID
    sender: "current-user",
    message,
    timestamp: new Date(),
    files: files || [],
  };
  setChatMessages(prevMessages => [...prevMessages, newMessage]);
};


  const handleAddEvent = () => {
    setSelectedEvent(undefined)
    setEventDialogOpen(true)
  }

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event)
    setEventDialogOpen(true)
  }

  const handleSaveEvent = (event: Event) => {
    if (selectedEvent) {
      setGroupEvents(groupEvents.map((e) => (e.id === event.id ? { ...event, groupId } : e)))
    } else {
      setGroupEvents([...groupEvents, { ...event, isGroupEvent: true, groupId }])
    }
    setEventDialogOpen(false)
  }

  const handleDeleteEvent = (id: string) => {
    setGroupEvents(groupEvents.filter((e) => e.id !== id))
    setEventDialogOpen(false)
  }

  const handleEditGroup = () => {
    if (group) {
      setGroupDialogOpen(true)
    }
  }

  // Neu: handleDeleteGroupButtonClick öffnet den Lösch-Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

const handleDeleteGroup = (id: string) => {
  console.log("Gruppe löschen:", id)
  deleteGroup(id)
  toast({
    title: "Gruppe gelöscht",
    description: "Die Gruppe wurde erfolgreich gelöscht.",
    variant: "destructive",
  })
}


  // Neu: Funktion zum Löschen und schließen des Dialogs
const confirmDeleteGroup = () => {
  console.log("confirmDeleteGroup aufgerufen");
  console.log("Gruppe zum Löschen:", group);

  if (group) {
    deleteGroup(group.id);
    setGroup(null);
    setDeleteDialogOpen(false);
    setGroupDialogOpen(false);
    toast({
      title: "Gruppe gelöscht",
      description: "Die Gruppe wurde erfolgreich gelöscht.",
    });
  } else {
    console.warn("Keine Gruppe zum Löschen ausgewählt");
  }
};


  const handleSaveGroup = (updatedGroup: Group) => {
    updateGroup(updatedGroup)
    setGroup(updatedGroup)
    setGroupDialogOpen(false)
    toast({
      title: "Gruppe aktualisiert",
      description: `"${updatedGroup.name}" wurde erfolgreich aktualisiert.`,
    })
  }

  const handleVote = (pollId: string, optionId: string) => {
    if (!group) return

    const updatedPolls = (group.polls || []).map((poll) => {
      if (poll.id === pollId) {
        const updatedOptions = poll.options.map((option) => {
          if (option.id === optionId) {
            if (option.votes.includes("current-user")) {
              return {
                ...option,
                votes: option.votes.filter((v) => v !== "current-user"),
              }
            } else {
              return {
                ...option,
                votes: [...option.votes, "current-user"],
              }
            }
          } else {
            return {
              ...option,
              votes: option.votes.filter((v) => v !== "current-user"),
            }
          }
        })
        return {
          ...poll,
          options: updatedOptions,
        }
      }
      return poll
    })

    setGroup({
      ...group,
      polls: updatedPolls,
    })

    toast({
      title: "Abstimmung aktualisiert",
      description: "Ihre Stimme wurde erfolgreich gespeichert.",
    })
  }

  const handleAddPoll = () => {
    if (!group || !newPoll.title || newPoll.options.some((o) => !o.text)) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    const newPollComplete: GroupPoll = {
      id: `poll-${Date.now()}`,
      title: newPoll.title,
      description: newPoll.description,
      options: newPoll.options,
      createdBy: "current-user",
      createdAt: new Date(),
      isActive: true,
    }

    setGroup({
      ...group,
      polls: [...(group.polls || []), newPollComplete],
    })

    setNewPoll({
      title: "",
      description: "",
      options: [
        { id: "1", text: "", votes: [] },
        { id: "2", text: "", votes: [] },
      ],
    })

    setNewPollDialogOpen(false)

    toast({
      title: "Abstimmung erstellt",
      description: "Die Abstimmung wurde erfolgreich erstellt.",
    })
  }

  const addPollOption = () => {
    setNewPoll({
      ...newPoll,
      options: [...newPoll.options, { id: `${newPoll.options.length + 1}`, text: "", votes: [] }],
    })
  }

  const updatePollOption = (index: number, value: string) => {
    const updatedOptions = [...newPoll.options]
    updatedOptions[index] = { ...updatedOptions[index], text: value }
    setNewPoll({
      ...newPoll,
      options: updatedOptions,
    })
  }

  if (loading) {
    return (
      <div className="container py-6 md:py-10">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Gruppe wird geladen...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container py-6 md:py-10">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Gruppe nicht gefunden</h2>
            <p className="text-muted-foreground mb-4">Die angeforderte Gruppe existiert nicht.</p>
            <Button asChild>
              <Link href="/contacts">Zurück zur Gruppenübersicht</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
          <Badge variant="outline">{group.members.length} Mitglieder</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" title="Anruf starten">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" title="Videoanruf starten">
            <Video className="h-4 w-4" />
          </Button>
          <Button onClick={handleEditGroup}>
            <Settings className="mr-2 h-4 w-4" />
            Gruppe bearbeiten
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mb-6">{group.description}</p>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value)
          if (typeof window !== "undefined") {
            localStorage.setItem(`group-${groupId}-tab`, value)
          }
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="chat" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            Termine
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Dateien
          </TabsTrigger>
          <TabsTrigger value="polls" className="flex items-center gap-1">
            <BarChart className="h-4 w-4" />
            Abstimmungen
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Mitglieder
          </TabsTrigger>
        </TabsList>

<TabsContent value="chat">
  <GroupChat
    group={group}
    onSendMessage={(message) => {
      if (!group) return

      const newMessage = {
        id: `${group.id}-${Date.now()}`,
        sender: "current-user",
        message: message,
        timestamp: new Date(),
        files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined, // Füge die hochgeladenen Dateien hinzu
      }

      setGroup({
        ...group,
        chat: [...(group.chat || []), newMessage],
      })
      setUploadedFiles([]) // Leere die hochgeladenen Dateien nach dem Senden
    }}
  />
</TabsContent>


        <TabsContent value="files">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Dateien</CardTitle>
                <CardDescription>Geteilte Dateien und Dokumente</CardDescription>
              </div>
              <Button onClick={handleFileUpload}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Datei hochladen
              </Button>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <p>Keine Dateien hochgeladen.</p>
              ) : (
                <div>
                  {uploadedFiles.map((file, index) => {
                    const fileUrl = URL.createObjectURL(file)
                    return (
                      <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-4">
                      {file.type.startsWith("image/") ? (
                        <img
                          src={fileUrl}
                          alt={file.name}
                          className="h-20 w-20 object-cover rounded-md"
                        />
                      ) : (
                        <span className="text-3xl">📄</span>
                      )}
                      <span>{file.name}</span>
                    </div>
                    <a href={fileUrl} download={file.name}>
                      <Button variant="outline">Herunterladen</Button>
                    </a>
                  </div>

                    )
                  })}
                </div>
              )}
            </CardContent>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              multiple
            />
          </Card>
        </TabsContent>


<TabsContent value="polls">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle>Abstimmungen</CardTitle>
        <CardDescription>Erstellen und teilnehmen an Gruppenabstimmungen</CardDescription>
      </div>
      <Button onClick={() => setNewPollDialogOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Abstimmung erstellen
      </Button>
    </CardHeader>
    <CardContent>
      {group.polls && group.polls.length > 0 ? (
        <div className="space-y-6">
          {group.polls.map((poll) => {
            const creator = group.members.find((m) => m.id === poll.createdBy)
            const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0)
            const createdAtDate = poll.createdAt instanceof Date ? poll.createdAt : new Date(poll.createdAt)
            return (
              <div key={poll.id} className="border rounded-lg p-4">
                <div className="mb-2">
                  <h3 className="text-lg font-medium">{poll.title}</h3>
                  {poll.description && <p className="text-muted-foreground text-sm">{poll.description}</p>}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>Erstellt von {creator?.name || "Unbekannt"}</span>
                    <span>•</span>
                    <span>
                      {createdAtDate.toLocaleDateString([], {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    <span>{totalVotes} Stimmen</span>
                  </div>
                </div>
                <div className="space-y-3 mt-4">
                  {poll.options.map((option) => {
                    const percentage = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0
                    const hasVoted = option.votes.includes("current-user")
                    return (
                      <div key={option.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant={hasVoted ? "default" : "outline"}
                              size="sm"
                              className="h-7 w-7 p-0 rounded-full"
                              onClick={() => handleVote(poll.id, option.id)}
                            >
                              {hasVoted && <Check className="h-4 w-4" />}
                            </Button>
                            <span>{option.text}</span>
                          </div>
                          <span className="text-sm">
                            {option.votes.length} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={hasVoted ? "h-full bg-primary" : "h-full bg-muted-foreground/30"}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Keine Abstimmungen vorhanden</p>
          <p className="text-sm">Erstellen Sie eine Abstimmung, um Feedback von der Gruppe zu erhalten.</p>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>


        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Mitglieder</CardTitle>
              <CardDescription>Mitglieder und ihre Rollen in dieser Gruppe</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.members.map((member) => {
                  const isCurrentUser = member.id === "current-user"
                  const contact = contacts.find((c) => c.id === member.id)
                  const status = contact?.status || "offline"

                  return (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 relative">
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          <div
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                              status === "online"
                                ? "bg-green-500"
                                : status === "busy"
                                  ? "bg-red-500"
                                  : status === "away"
                                    ? "bg-yellow-500"
                                    : "bg-gray-500"
                            }`}
                          ></div>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {member.name}
                            {isCurrentUser && <Badge variant="outline">Sie</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                          <div className="text-xs flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {status === "online"
                              ? "Online"
                              : status === "busy"
                                ? "Beschäftigt"
                                : status === "away"
                                  ? "Abwesend"
                                  : "Offline"}
                          </div>
                        </div>
                      </div>
                      <Badge variant={member.role === "Admin" ? "default" : "outline"}>{member.role}</Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EventDialog
        event={selectedEvent}
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      <GroupDialog
        group={group}
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        onSave={handleSaveGroup}
        onDelete={(id) => {
    console.log("Löschen:", id)
    deleteGroup(id)
    router.push("/contacts") // oder Dialog schließen
}}
        contacts={contacts}
      />

      {/* Neue AlertDialog für Löschbestätigung */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Gruppe löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diese Gruppe löschen möchten? Dieser Vorgang kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup} className="bg-red-600 text-white hover:bg-red-700">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={newPollDialogOpen} onOpenChange={setNewPollDialogOpen}>
        <AlertDialogContent className="max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Neue Abstimmung erstellen</AlertDialogTitle>
            <AlertDialogDescription>
              Erstellen Sie eine Abstimmung, um Feedback von der Gruppe zu erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="poll-title">Titel</Label>
              <Input
                id="poll-title"
                value={newPoll.title}
                onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                placeholder="Titel der Abstimmung"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="poll-description">Beschreibung (optional)</Label>
              <Input
                id="poll-description"
                value={newPoll.description}
                onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                placeholder="Beschreibung der Abstimmung"
              />
            </div>

            <div className="grid gap-2">
              <Label>Optionen</Label>
              {newPoll.options.map((option, index) => (
                <Input
                  key={index}
                  value={option.text}
                  onChange={(e) => updatePollOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="mb-2"
                />
              ))}
              <Button variant="outline" onClick={addPollOption} type="button">
                Option hinzufügen
              </Button>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddPoll}>Abstimmung erstellen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
