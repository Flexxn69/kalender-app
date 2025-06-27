"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Plus, Send, Paperclip, Video, Search, X, CalendarIcon, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAppStore, type Event } from "@/lib/store";
import { EventDialog } from "@/components/event-dialog";
import { GroupDialog, type Group } from "@/components/group-dialog";
import { useSearchParams } from "next/navigation";
import { generateChatIdFromMembers, groupMessagesByChatId } from "@/lib/chat-utils";
import type { Message as MessageType } from "@/types/message";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { Smile } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email: string;
  status: "online" | "offline" | "away" | "busy";
};

type Conversation = {
  id: string;
  name: string;
  type: "group" | "individual";
  lastMessage: string;
  time: string;
  unread?: number;
  participants: Contact[];
  description?: string;
  members?: Contact[];
};

function formatMessageTime(isoString: string) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatChatDate(date: Date) {
  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return "Heute";
  }
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const { toast } = useToast();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { conversations, messages, addMessage, events, updateEvent, deleteEvent, updateConversation } = useAppStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // GroupDialog für Gruppe bearbeiten
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);

  const filteredConversations = conversations.filter(
    (conversation) =>
      conversation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );

  const handleContactSelect = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const [fileUrls, setFileUrls] = useState<{ [key: string]: string }>({});
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const conversationId = searchParams.get("conversation");

  useEffect(() => {
    if (conversationId && !activeConversation) {
      const found = conversations.find((c) => c.id === conversationId);
      if (found) setActiveConversation(found);
    }
  }, [conversationId, conversations, activeConversation]);

  const groupChatMessages = groupMessagesByChatId(messages);
  const chatId = activeConversation ? generateChatIdFromMembers(activeConversation.participants) : "";
  const chatMessages: MessageType[] = chatId ? groupChatMessages[chatId] || [] : [];

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validFiles = Array.from(files).filter((file): file is File => file instanceof File);
      setUploadedFiles(validFiles);
    }
  };

  const handleSendMessage = async () => {
    if (!activeConversation || (!messageInput.trim() && uploadedFiles.length === 0)) return;

    const filesWithBase64 = await Promise.all(
      uploadedFiles.map(async (file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: await fileToBase64(file),
      }))
    );

    const newMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "me",
      content: messageInput,
      time: new Date().toISOString(),
      files: filesWithBase64,
    };
    addMessage(activeConversation.id, newMessage);
    setMessageInput("");
    setUploadedFiles([]);
  };

  const handleCreateConversation = () => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Kontakt aus.",
        variant: "destructive",
      });
      return;
    }

    const selectedContactObjects = contacts.filter((contact) =>
      selectedContacts.includes(contact.id)
    );

    const newConversationId = Math.random().toString(36).substring(2, 9);

    const newConversation: Conversation = {
      id: newConversationId,
      name:
        selectedContacts.length === 1
          ? selectedContactObjects[0].name
          : newGroupName ||
            `Neue Gruppe (${selectedContactObjects
              .map((c) => c.name.split(" ")[0])
              .join(", ")})`,
      type: selectedContacts.length === 1 ? "individual" : "group",
      lastMessage: "Neue Konversation gestartet",
      time: new Date().toISOString(),
      participants: selectedContactObjects,
    };

    const updatedConversations = [newConversation, ...conversations];
    const updatedMessages = { ...messages };
    updatedMessages[newConversationId] = [];

    useAppStore.setState({
      conversations: updatedConversations,
      messages: updatedMessages,
    });

    setNewMessageDialogOpen(false);
    setSelectedContacts([]);
    setNewGroupName("");
    setActiveConversation(newConversation);

    toast({
      title: "Konversation erstellt",
      description: `${
        newConversation.type === "individual" ? "Einzelchat" : "Gruppenchat"
      } wurde erfolgreich erstellt.`,
    });
  };

function handleOpenGroupDialog() {
  if (activeConversation && activeConversation.type === "group") {
    // Suche die Gruppe, die zur Conversation passt
    // Meist ist die ID gleich, aber falls nicht, kannst du auch mit Name matchen
    const group = useAppStore.getState().groups.find(
      g => g.id === activeConversation.id ||
           g.name === activeConversation.name
    );
    if (group) {
      setGroupToEdit(group);
      setGroupDialogOpen(true);
    } else {
      // Optional: Warnung, falls keine Gruppe gefunden
      toast({
        title: "Gruppe nicht gefunden",
        description: "Es wurde keine passende Gruppe zu dieser Unterhaltung gefunden.",
        variant: "destructive",
      });
    }
  }
}

function handleSaveGroup(updatedGroup: Group) {
  // Gruppe im Store aktualisieren
  useAppStore.getState().updateGroup(updatedGroup);

  // Conversation updaten, Name und ggf. Beschreibung aktualisieren
  useAppStore.getState().updateConversation({
    id: updatedGroup.id,
    name: updatedGroup.name,
    description: updatedGroup.description
  });

  setGroupDialogOpen(false);
  setGroupToEdit(null);
  toast({
    title: "Gruppe aktualisiert",
    description: `"${updatedGroup.name}" wurde erfolgreich aktualisiert.`,
  });

  // Falls die aktuelle Conversation gerade offen ist, auch lokal updaten
  setActiveConversation((cur) =>
    cur && cur.id === updatedGroup.id
      ? { ...cur, name: updatedGroup.name, description: updatedGroup.description }
      : cur
  );
}

function handleDeleteGroup(id: string) {
  useAppStore.getState().deleteGroup(id);
  setGroupDialogOpen(false);
  setGroupToEdit(null);
  // Optional: Toast oder Redirect
  toast({
    title: "Gruppe gelöscht",
    description: "Die Gruppe wurde erfolgreich gelöscht.",
  });
  // Du kannst ggf. auch die aktive Conversation zurücksetzen:
  setActiveConversation(null);
}

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "busy":
        return "bg-red-500";
      case "away":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const router = useRouter();

  const handleOpenEventDetails = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setEventDialogOpen(true);
    }
  };

  const handleAddEvent = () => {
    if (!activeConversation) return;
    const newEvent: Event = {
      id: Math.random().toString(36).substring(2, 9),
      title: "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      description: "",
      category: "Arbeit",
      isGroupEvent: activeConversation.type === "group",
      groupId: activeConversation.type === "group" ? activeConversation.id : undefined,
      sharedWith:
        activeConversation.type === "individual"
          ? [activeConversation.participants[0]?.id]
          : undefined,
    };
    setSelectedEvent(newEvent);
    setEventDialogOpen(true);
  };

  const handleSaveEvent = (event: Event) => {
    const { addEvent, updateEvent, events } = useAppStore.getState();
    const exists = events.some((e) => e.id === event.id);

    if (exists) {
      updateEvent(event);
      toast({
        title: "Termin aktualisiert",
        description: `"${event.title}" wurde erfolgreich aktualisiert.`,
      });
    } else {
      addEvent(event);
      toast({
        title: "Neuer Termin hinzugefügt",
        description: `"${event.title}" wurde erfolgreich hinzugefügt.`,
      });
    }

    setEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id);
    setEventDialogOpen(false);
    setSelectedEvent(null);
    toast({
      title: "Termin gelöscht",
      description: "Der Termin wurde erfolgreich gelöscht.",
    });
  };

  const [activeTab, setActiveTab] = useState("chat");
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (
        activeTab === "chat" &&
        activeConversation &&
        scrollAnchorRef.current
      ) {
        scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [activeTab, activeConversation?.id, messages[activeConversation?.id]?.length]);

  useEffect(() => {
    const allContacts = useAppStore.getState().contacts;
    setContacts(allContacts);
  }, []);

  const currentUserId = "me";

  // POLLS MIT LOCALSTORAGE PRO KONVERSATION
  const [polls, setPolls] = useState<any[]>([]);
  const [newPollDialogOpen, setNewPollDialogOpen] = useState(false);

  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    options: [
      { id: "opt-new-1", text: "" },
      { id: "opt-new-2", text: "" },
    ],
  });

  useEffect(() => {
    if (activeConversation?.id) {
      const stored = localStorage.getItem(`polls-${activeConversation.id}`);
      if (stored) setPolls(JSON.parse(stored));
      else setPolls([
        {
          id: "poll1",
          title: "Wann treffen wir uns zum nächsten Meeting?",
          description: "Bitte wählt einen Termin aus.",
          createdBy: "user1",
          createdAt: new Date("2024-06-01"),
          options: [
            { id: "opt1", text: "Dienstag, 14:00 Uhr", votes: ["user2", "user3"] },
            { id: "opt2", text: "Mittwoch, 10:00 Uhr", votes: ["user4"] },
            { id: "opt3", text: "Donnerstag, 15:00 Uhr", votes: ["user5"] },
          ],
        },
      ]);
    }
  }, [activeConversation?.id]);

  useEffect(() => {
    if (activeConversation?.id) {
      localStorage.setItem(`polls-${activeConversation.id}`, JSON.stringify(polls));
    }
  }, [polls, activeConversation?.id]);

  function updateNewPollOptionText(index: number, text: string) {
    setNewPoll((prev) => {
      const newOptions = [...prev.options];
      newOptions[index].text = text;
      return { ...prev, options: newOptions };
    });
  }

  function addNewPollOption() {
    setNewPoll((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { id: `opt-new-${prev.options.length + 1}`, text: "" },
      ],
    }));
  }

  function canAddPoll() {
    return (
      newPoll.title.trim().length > 0 &&
      newPoll.options.filter((o) => o.text.trim() !== "").length >= 2
    );
  }

  function handleCreatePoll() {
    if (!canAddPoll()) {
      alert("Bitte gib einen Titel und mindestens 2 Optionen ein.");
      return;
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
    };
    setPolls((prev) => [newPollEntry, ...prev]);
    setNewPollDialogOpen(false);
    setNewPoll({
      title: "",
      description: "",
      options: [
        { id: "opt-new-1", text: "" },
        { id: "opt-new-2", text: "" },
      ],
    });
  }

  function handleVote(pollId: string, optionId: string) {
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const updatedOptions = poll.options.map((opt) => ({
          ...opt,
          votes: opt.votes.filter((v: string) => v !== currentUserId),
        }));
        const optionIndex = updatedOptions.findIndex((opt) => opt.id === optionId);
        if (optionIndex !== -1) {
          updatedOptions[optionIndex].votes.push(currentUserId);
        }
        return { ...poll, options: updatedOptions };
      })
    );
  }

  function getCreatorName(userId: string) {
    if (userId === "user1") return "Michael";
    if (userId === currentUserId) return "Du";
    return "Unbekannt";
  }

  // DATEIEN-TAB FILTER & LOGIK
  const [fileTab, setFileTab] = useState<"all" | "images" | "files">("all");
  const files =
    (activeConversation &&
      messages[activeConversation.id]?.flatMap((message: any) =>
        (message.files ?? []).map((file: any) => ({
          ...file,
          sender: message.sender,
          senderName: message.senderName,
          time: message.time,
        }))
      )) ||
    [];

  const filteredFiles = files
    .filter((file) => {
      if (fileTab === "all") return true;
      const isImage = file.type?.startsWith("image/");
      return fileTab === "images" ? isImage : !isImage;
    })
    .sort((a, b) => {
      const at = a.time ? new Date(a.time).getTime() : 0;
      const bt = b.time ? new Date(b.time).getTime() : 0;
      return bt - at;
    });
    
  return (
    <div className="container py-6 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nachrichten</h1>
        <Button onClick={() => setNewMessageDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Nachricht
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Konversationen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Suchen..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex items-center gap-3 rounded-lg p-3 hover:bg-accent cursor-pointer ${
                      activeConversation?.id === conversation.id ? "bg-accent" : ""
                    }`}
                    onClick={() => setActiveConversation(conversation)}
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center relative">
                      {conversation.type === "group" ? (
                        <Users className="h-5 w-5" />
                      ) : (
                        <div className="font-medium text-sm">
                          {conversation.name.charAt(0)}
                        </div>
                      )}
                      {conversation.type === "individual" &&
                        conversation.participants[0] && (
                          <div
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(
                              conversation.participants[0].status
                            )}`}
                          />
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-medium">{conversation.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-muted-foreground">
                        {conversation.time && formatMessageTime(conversation.time)}
                      </div>
                      {conversation.unread && (
                        <div className="mt-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {conversation.unread}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          {activeConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <h2
                    className={`text-2xl font-bold tracking-tight ${
                      activeConversation?.type === "group" ? "cursor-pointer hover:underline" : ""
                    }`}
                    title={activeConversation?.type === "group" ? "Gruppe bearbeiten" : undefined}
                    onClick={activeConversation?.type === "group" ? handleOpenGroupDialog : undefined}
                    tabIndex={activeConversation?.type === "group" ? 0 : -1}
                    role={activeConversation?.type === "group" ? "button" : undefined}
                    onKeyDown={e => {
                      if (activeConversation?.type === "group" && (e.key === "Enter" || e.key === " ")) {
                        handleOpenGroupDialog();
                      }
                    }}
                  >
                    {activeConversation?.name}
                  </h2>
                  {activeConversation?.type === "group" && (
                    <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                      {activeConversation.participants.length} Mitglieder
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 flex flex-col h-[calc(100vh-300px)]">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="border-b px-4">
                    <TabsList className="w-full justify-start h-12 p-0 bg-transparent">
                      <TabsTrigger
                        value="chat"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Chat
                      </TabsTrigger>
                      <TabsTrigger
                        value="files"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Dateien
                      </TabsTrigger>
                      <TabsTrigger
                        value="events"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Termine
                      </TabsTrigger>
                      {activeConversation?.type === "group" && (
                        <TabsTrigger
                          value="polls"
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          Abstimmungen
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  <TabsContent value="chat" className="m-0 data-[state=inactive]:hidden h-full">
                    <div className="flex flex-col h-[60vh]">
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <ScrollArea ref={scrollAreaRef} className="h-full p-4">
                          <div className="space-y-4">
                            {activeConversation &&
                              messages[activeConversation.id]?.map((message: any, i: number, arr: any[]) => {
                                const currentDateObj = message.time ? new Date(message.time) : null;
                                const currentDate =
                                  currentDateObj &&
                                  `${currentDateObj.getFullYear()}-${currentDateObj.getMonth()}-${currentDateObj.getDate()}`;
                                const prevDateObj =
                                  i > 0 && arr[i - 1].time ? new Date(arr[i - 1].time) : null;
                                const prevDate =
                                  prevDateObj &&
                                  `${prevDateObj.getFullYear()}-${prevDateObj.getMonth()}-${prevDateObj.getDate()}`;
                                const isNewDay = !prevDate || currentDate !== prevDate;
                                return (
                                  <div key={message.id}>
                                    {isNewDay && currentDateObj && (
                                      <div className="flex justify-center my-4">
                                        <span className="bg-muted px-4 py-1 rounded-full text-xs font-medium text-muted-foreground shadow">
                                          {formatChatDate(currentDateObj)}
                                        </span>
                                      </div>
                                    )}
                                    <div className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}>
                                      <div className={`max-w-[80%] rounded-lg p-3 ${message.sender === "me" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                        {message.senderName && message.sender !== "me" && (
                                          <div className="font-medium text-xs mb-1">{message.senderName}</div>
                                        )}
                                        <div>{message.content}</div>
                                        {message.files && message.files.length > 0 && (
                                          <div className="flex flex-wrap mt-2 gap-4">
                                            {message.files.map((file: any) => {
                                              const isImage = file.type?.startsWith("image/");
                                              const url = file.url;
                                              return (
                                                <div key={file.name} className="flex items-center space-x-3">
                                                  {isImage && url ? (
                                                    <img
                                                      src={url}
                                                      alt={file.name}
                                                      className="h-16 w-16 rounded object-cover border border-gray-300"
                                                    />
                                                  ) : (
                                                    <span className="text-3xl select-none">📄</span>
                                                  )}
                                                  {url ? (
                                                    <a
                                                      href={url}
                                                      download={file.name}
                                                      className="text-blue-600 underline hover:text-blue-800"
                                                    >
                                                      {file.name}
                                                    </a>
                                                  ) : (
                                                    <span>{file.name}</span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        <div className="text-xs mt-1 text-muted-foreground">
                                          {message.time ? formatMessageTime(message.time) : ""}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            <div ref={scrollAnchorRef} />
                          </div>
                        </ScrollArea>
                      </div>
                      <div className="border-t p-4 bg-background">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleFileUpload}
                            className="shrink-0"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleChatFileSelect}
                            className="hidden"
                            multiple
                          />

                          <div className="relative">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className="shrink-0"
                            >
                              <Smile className="h-4 w-4" />
                            </Button>
                            {showEmojiPicker && (
                              <div className="absolute bottom-full mb-2 right-0 z-20">
                                <Picker
                                  data={data}
                                  onEmojiSelect={(emoji: any) =>
                                    setMessageInput((prev) => prev + emoji.native)
                                  }
                                  theme="light"
                                />
                              </div>
                            )}
                          </div>

                          <Input
                            placeholder="Nachricht schreiben..."
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                await handleSendMessage();
                              }
                            }}
                            className="flex-grow min-w-0"
                          />

                          <Button size="icon" onClick={handleSendMessage} className="shrink-0">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                        {uploadedFiles.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {uploadedFiles.map((file, index) => {
                              const isImage = file.type.startsWith("image/");
                              // Info: Vorschau vor Upload, daher weiterhin Blob-URL
                              const url = URL.createObjectURL(file);

                              return (
                                <div
                                  key={file.name}
                                  className="relative flex items-center space-x-2 border rounded p-2 bg-muted max-w-xs"
                                >
                                  <button
                                    onClick={() => {
                                      const newFiles = [...uploadedFiles];
                                      newFiles.splice(index, 1);
                                      setUploadedFiles(newFiles);
                                    }}
                                    className="absolute -top-1 -right-1 bg-white text-black border border-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500 hover:text-white"
                                    title="Datei entfernen"
                                  >
                                    ×
                                  </button>

                                  {isImage ? (
                                    <img
                                      src={url}
                                      alt={file.name}
                                      className="h-10 w-10 object-cover rounded flex-shrink-0"
                                      onLoad={() => URL.revokeObjectURL(url)}
                                    />
                                  ) : (
                                    <span className="text-3xl select-none">📄</span>
                                  )}

                                  <span className="text-sm truncate">{file.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* ----------- Dateien-Tab mit Unterreitern ----------- */}
                  <TabsContent value="files" className="m-0 data-[state=inactive]:hidden h-full">
                    <div className="flex flex-col h-[60vh]">
                      <div className="flex items-center gap-2 px-4 py-2 border-b">
                        <button
                          className={`px-3 py-1 rounded-full text-sm font-medium transition ${fileTab === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                          onClick={() => setFileTab("all")}
                        >
                          Alle
                        </button>
                        <button
                          className={`px-3 py-1 rounded-full text-sm font-medium transition ${fileTab === "images" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                          onClick={() => setFileTab("images")}
                        >
                          Bilder
                        </button>
                        <button
                          className={`px-3 py-1 rounded-full text-sm font-medium transition ${fileTab === "files" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                          onClick={() => setFileTab("files")}
                        >
                          Dateien
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full p-4">
                          <div className="space-y-4">
                            {filteredFiles.length === 0 && (
                              <div className="text-center text-muted-foreground py-12">
                                Keine Dateien vorhanden.
                              </div>
                            )}
                            {filteredFiles.map((file: any, index: number) => {
                              const isImage = file.type?.startsWith("image/");
                              const url = file.url;
                              return (
                                <div
                                  key={index}
                                  className="flex items-center space-x-3 border p-2 rounded bg-muted"
                                >
                                  {isImage && url ? (
                                    <img
                                      src={url}
                                      alt={file.name}
                                      className="h-16 w-16 object-cover rounded border border-gray-300"
                                    />
                                  ) : (
                                    <span className="text-3xl select-none">📄</span>
                                  )}
                                  <div className="flex flex-col overflow-hidden">
                                    <a
                                      href={url}
                                      download={file.name}
                                      className="text-blue-600 underline truncate max-w-xs"
                                    >
                                      {file.name}
                                    </a>
                                    <span className="text-xs text-muted-foreground truncate">
                                      von {file.senderName || file.sender} –{" "}
                                      {file.time &&
                                        new Date(file.time).toLocaleDateString("de-DE", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                        }) +
                                          ", " +
                                          new Date(file.time).toLocaleTimeString("de-DE", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </TabsContent>
                  {/* ----------- /Dateien-Tab mit Unterreitern ----------- */}

                  <TabsContent value="events" className="m-0 data-[state=inactive]:hidden h-full">
                    <div className="flex flex-col h-[70vh]">
                      <div className="flex items-center justify-between px-4 py-2 border-b">
                        <h3 className="text-lg font-medium">Gemeinsame Termine</h3>
                        <Button variant="outline" size="sm" onClick={handleAddEvent}>
                          <Plus className="mr-2 h-4 w-4" />
                          Termin hinzufügen
                        </Button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full px-4 py-2">
                          <div className="space-y-4">
                            {activeConversation
                              ? events
                                  .filter(
                                    (event) =>
                                      event.isGroupEvent &&
                                      event.groupId === activeConversation.id
                                  )
                                  .map((event) => (
                                    <div key={event.id} className="bg-accent/50 p-3 rounded-md">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <CalendarIcon className="h-4 w-4 text-primary" />
                                          <div>
                                            <div className="font-medium">
                                              {event.title}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                              {new Date(event.date).toLocaleDateString("de-DE", {
                                                day: "2-digit",
                                                month: "2-digit",
                                              })}
                                              , {event.startTime} - {event.endTime}
                                            </div>
                                          </div>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleOpenEventDetails(event.id)}
                                        >
                                          Details
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                              : null}
                            {activeConversation &&
                              events.filter(
                                (e) => e.isGroupEvent && e.groupId === activeConversation.id
                              ).length === 0 && (
                                <div className="text-center text-muted-foreground py-4">
                                  Keine Termine vorhanden
                                </div>
                              )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="polls"
                    className="flex-1 p-0 m-0 data-[state=inactive]:hidden h-full"
                  >
                    {activeConversation?.type !== "group" ? (
                      <div className="text-center text-muted-foreground py-12">
                        <p>Abstimmungen sind nur in Gruppen verfügbar.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col h-[60vh]">
                        <div className="flex items-center justify-between px-4 py-2 border-b">
                          <h3 className="text-lg font-medium">Abstimmungen</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewPollDialogOpen(true)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Abstimmung erstellen
                          </Button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-hidden">
                          <ScrollArea className="h-full px-4 py-2">
                            {polls.length > 0 ? (
                              <div className="space-y-6">
                                {polls.map((poll) => {
                                  const totalVotes = poll.options.reduce(
                                    (sum: number, o: any) => sum + o.votes.length,
                                    0
                                  );
                                  const createdAtDate =
                                    poll.createdAt instanceof Date
                                      ? poll.createdAt
                                      : new Date(poll.createdAt);
                                  return (
                                    <div key={poll.id} className="border rounded-lg p-4">
                                      <div className="mb-2">
                                        <h3 className="text-lg font-medium">{poll.title}</h3>
                                        {poll.description && (
                                          <p className="text-muted-foreground text-sm">
                                            {poll.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                          <span>Erstellt von {getCreatorName(poll.createdBy)}</span>
                                          <span>•</span>
                                          <span>
                                            {createdAtDate.toLocaleDateString([], {
                                              year: "numeric",
                                              month: "long",
                                              day: "numeric",
                                            })}
                                          </span>
                                          <span>•</span>
                                          <span>
                                            {totalVotes} Stimme
                                            {totalVotes !== 1 ? "n" : ""}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-3 mt-4">
                                        {poll.options.map((option: any) => {
                                          const percentage =
                                            totalVotes > 0
                                              ? Math.round(
                                                  (option.votes.length / totalVotes) * 100
                                                )
                                              : 0;
                                          const hasVoted = option.votes.includes(currentUserId);
                                          return (
                                            <div key={option.id} className="space-y-1">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    variant={hasVoted ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-7 w-7 p-0 rounded-full"
                                                    onClick={() =>
                                                      handleVote(poll.id, option.id)
                                                    }
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
                                                  className={
                                                    hasVoted
                                                      ? "h-full bg-primary"
                                                      : "h-full bg-muted-foreground/30"
                                                  }
                                                  style={{ width: `${percentage}%` }}
                                                />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-12 text-muted-foreground">
                                <p>Keine Abstimmungen vorhanden.</p>
                                <p className="text-sm">
                                  Erstelle eine Abstimmung, um Feedback von der Gruppe zu erhalten.
                                </p>
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent>
              <div className="text-center text-muted-foreground py-12">
                Bitte wähle eine Konversation aus.
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Moderner Abstimmungsdialog im Card-Stil */}
      <Dialog open={newPollDialogOpen} onOpenChange={setNewPollDialogOpen}>
        <DialogContent className="max-w-[500px] p-0 bg-transparent shadow-none border-none">
          <Card>
            <CardHeader>
              <CardTitle>Neue Abstimmung erstellen</CardTitle>
              <CardDescription>
                Erstellen Sie eine Abstimmung, um Feedback von der Gruppe zu erhalten.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
                      onChange={(e) => updateNewPollOptionText(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="mb-2"
                    />
                  ))}
                  <Button variant="outline" onClick={addNewPollOption} type="button">
                    Option hinzufügen
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewPollDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleCreatePoll}>Abstimmung erstellen</Button>
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>

      <Dialog open={newMessageDialogOpen} onOpenChange={setNewMessageDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Neue Nachricht</DialogTitle>
            <DialogDescription>
              Wählen Sie Kontakte aus, um eine neue Konversation zu starten.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Empfänger</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedContacts.map((contactId) => {
                  const contact = contacts.find((c) => c.id === contactId);
                  if (!contact) return null;
                  return (
                    <div key={contact.id} className="flex items-center gap-1 bg-accent rounded-full px-3 py-1">
                      <span className="text-sm">{contact.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full"
                        onClick={() => handleContactSelect(contact.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Kontakte suchen..."
                  className="pl-8"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => handleContactSelect(contact.id)}
                    >
                      <Checkbox
                        id={`contact-${contact.id}`}
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => handleContactSelect(contact.id)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-xs text-muted-foreground">{contact.email}</div>
                        </div>
                      </div>
                      <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(contact.status)}`} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            {selectedContacts.length > 1 && (
              <div className="grid gap-2">
                <Label htmlFor="groupName">Gruppenname</Label>
                <Input
                  id="groupName"
                  placeholder="Geben Sie einen Gruppennamen ein"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMessageDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateConversation}>Konversation starten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

<GroupDialog
  open={groupDialogOpen}
  onOpenChange={setGroupDialogOpen}
  group={groupToEdit || undefined}
  onSave={handleSaveGroup}
  onDelete={handleDeleteGroup}
  contacts={contacts}
/>

      <EventDialog
        event={selectedEvent || undefined}
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
