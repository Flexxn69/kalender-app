"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type Event = {
  id: string
  title: string
  date: Date | string
  startTime: string
  endTime: string
  description?: string
  location?: string
  reminder?: string
  category?: string
  sharedWith: string[]
  isGroupEvent?: boolean
  groupId?: string
}

export type Contact = {
  id: string
  name: string
  email: string
  phone?: string
  status: "online" | "offline" | "away" | "busy"
  favorite?: boolean
  availableAt?: string
  department?: string
  importedOnly?: boolean
  isRegistered?: boolean
}

export type GroupMember = {
  id: string
  name: string
  email: string
  role: "Admin" | "Mitglied"
}

export type Group = {
  id: string
  name: string
  description: string
  members: GroupMember[]
  avatarUrl?: string
}

export type Message = {
  id: string
  sender: string
  senderName?: string
  content: string
  time: string
  files?: Array<{
    name: string
    type: string
    size: number
    url: string
    duration?: number
  }>
  isVoiceMessage?: boolean
}

export type Conversation = {
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

export type Notification = {
  id: string
  type: string
  title: string
  description: string
  href?: string
  createdAt?: string
  read?: boolean // NEU: gelesen-Flag
}

type AppState = {
  // Events
  events: Event[]
  addEvent: (event: Event) => void
  updateEvent: (event: Event) => void
  deleteEvent: (id: string) => void

  // Contacts
  contacts: Contact[]
  addContact: (contact: Contact) => void
  updateContact: (contact: Contact) => void
  deleteContact: (id: string) => void
  toggleFavorite: (id: string) => void

  // Groups
  groups: Group[]
  addGroup: (group: Group) => void
  updateGroup: (group: Group) => void
  deleteGroup: (id: string) => void

  // Messages & Conversations
  conversations: Conversation[]
  messages: Record<string, Message[]>
  addMessage: (conversationId: string, message: Message) => void
  updateConversation: (update: Partial<Conversation> & { id: string }) => void

  // UI State
  activeTab: string
  setActiveTab: (tab: string) => void
  currentUserId: string
  setCurrentUserId: (id: string) => void

  // User Registration State
  registeredUsers: Record<
    string,
    {
      id: string
      name: string
      email: string
      registeredAt: string
    }
  >
  registerUser: (user: { id: string; name: string; email: string }) => void

  // Notifications
  notifications: Notification[]
  addNotification: (type: string, payload: Omit<Notification, "id" | "type" | "createdAt" | "read">) => void
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Events
      events: [
        {
          id: "1",
          title: "Team Meeting",
          date: new Date(2024, 11, 25, 10, 0),
          startTime: "10:00",
          endTime: "11:00",
          description: "Wöchentliches Team Meeting",
          category: "Arbeit",
          sharedWith: ["user-1", "user-2"],
          isGroupEvent: false,
        },
        {
          id: "2",
          title: "Projekt Review",
          date: new Date(2024, 11, 27, 14, 0),
          startTime: "14:00",
          endTime: "15:30",
          description: "Review des aktuellen Projektstatus",
          category: "Arbeit",
          sharedWith: ["user-1", "user-3"],
          isGroupEvent: false,
        },
      ],
      addEvent: (event) =>
        set((state) => ({
          events: [...state.events, { ...event, id: event.id || Math.random().toString(36).substring(2, 9) }],
        })),
      updateEvent: (event) =>
        set((state) => ({
          events: state.events.map((e) => (e.id === event.id ? event : e)),
        })),
      deleteEvent: (id) =>
        set((state) => ({
          events: state.events.filter((e) => e.id !== id),
        })),

      // Contacts
      contacts: [
        {
          id: "user-1",
          name: "Anna Schmidt",
          email: "anna.schmidt@example.com",
          phone: "+49 123 456789",
          status: "online",
          favorite: true,
          department: "Marketing",
          isRegistered: true,
        },
        {
          id: "user-2",
          name: "Max Mustermann",
          email: "max.mustermann@example.com",
          phone: "+49 987 654321",
          status: "busy",
          department: "IT",
          isRegistered: true,
        },
        {
          id: "user-3",
          name: "Lisa Weber",
          email: "lisa.weber@example.com",
          status: "away",
          department: "Vertrieb",
          isRegistered: true,
        },
        {
          id: "user-4",
          name: "Tom Müller",
          email: "tom.mueller@example.com",
          phone: "+49 555 123456",
          status: "offline",
          isRegistered: false,
        },
      ],
      addContact: (contact) =>
        set((state) => ({
          contacts: [...state.contacts, contact],
        })),
      updateContact: (contact) =>
        set((state) => ({
          contacts: state.contacts.map((c) => (c.id === contact.id ? contact : c)),
        })),
      deleteContact: (id) =>
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== id),
        })),
      toggleFavorite: (id) =>
        set((state) => ({
          contacts: state.contacts.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)),
        })),

      // Groups
      groups: [
        {
          id: "group-1",
          name: "Marketing Team",
          description: "Unser Marketing Team",
          members: [
            { id: "user-1", name: "Anna Schmidt", email: "anna.schmidt@example.com", role: "Admin" },
            { id: "user-2", name: "Max Mustermann", email: "max.mustermann@example.com", role: "Mitglied" },
          ],
        },
      ],
      addGroup: (group) =>
        set((state) => ({
          groups: [...state.groups, group],
        })),
      updateGroup: (group) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === group.id ? group : g)),
        })),
      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
        })),

      // Messages & Conversations
      conversations: [
        {
          id: "conv-1",
          name: "Anna Schmidt",
          type: "individual",
          lastMessage: "Hallo! Wie geht es dir?",
          time: new Date().toISOString(),
          participants: [
            { id: "current-user", name: "Du", email: "current@user.com", status: "online" },
            { id: "user-1", name: "Anna Schmidt", email: "anna.schmidt@example.com", status: "online" },
          ],
        },
        {
          id: "conv-2",
          name: "Marketing Team",
          type: "group",
          lastMessage: "Meeting um 14:00 Uhr",
          time: new Date(Date.now() - 3600000).toISOString(),
          participants: [
            { id: "current-user", name: "Du", email: "current@user.com", status: "online" },
            { id: "user-1", name: "Anna Schmidt", email: "anna.schmidt@example.com", status: "online" },
            { id: "user-2", name: "Max Mustermann", email: "max.mustermann@example.com", status: "busy" },
          ],
        },
      ],
      messages: {
        "conv-1": [
          {
            id: "msg-1",
            sender: "user-1",
            senderName: "Anna Schmidt",
            content: "Hallo! Wie geht es dir?",
            time: new Date().toISOString(),
          },
          {
            id: "msg-2",
            sender: "me",
            content: "Hallo Anna! Mir geht es gut, danke der Nachfrage. Wie läuft dein Projekt?",
            time: new Date(Date.now() + 60000).toISOString(),
          },
        ],
        "conv-2": [
          {
            id: "msg-3",
            sender: "user-1",
            senderName: "Anna Schmidt",
            content: "Meeting um 14:00 Uhr im Konferenzraum",
            time: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: "msg-4",
            sender: "user-2",
            senderName: "Max Mustermann",
            content: "Perfekt, ich bin dabei!",
            time: new Date(Date.now() - 3500000).toISOString(),
          },
        ],
      },
      addMessage: (conversationId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message],
          },
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: message.content || "Datei gesendet",
                  time: message.time,
                }
              : conv,
          ),
        })),
      updateConversation: (update) =>
        set((state) => ({
          conversations: state.conversations.map((conv) => (conv.id === update.id ? { ...conv, ...update } : conv)),
        })),

      // UI State
      activeTab: "all",
      setActiveTab: (tab) => set({ activeTab: tab }),
      currentUserId: "current-user",
      setCurrentUserId: (id) => set({ currentUserId: id }),

      // User Registration
      registeredUsers: {},
      registerUser: (user) =>
        set((state) => ({
          registeredUsers: {
            ...state.registeredUsers,
            [user.id]: {
              ...user,
              registeredAt: new Date().toISOString(),
            },
          },
          contacts: state.contacts.map((contact) =>
            contact.email === user.email ? { ...contact, isRegistered: true, status: "online" } : contact,
          ),
        })),

      // Notifications
      notifications: [],
      addNotification: (type, payload) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              id: Math.random().toString(36).substring(2, 9),
              type,
              ...payload,
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllNotificationsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.read ? n : { ...n, read: true }
          ),
        })),
    }),
    {
      name: "calendar-app-storage",
      partialize: (state) => ({
        events: state.events,
        contacts: state.contacts,
        groups: state.groups,
        conversations: state.conversations,
        messages: state.messages,
        activeTab: state.activeTab,
        currentUserId: state.currentUserId,
        registeredUsers: state.registeredUsers,
        notifications: state.notifications,
      }),
    },
  ),
)
