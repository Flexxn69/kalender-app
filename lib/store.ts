"use client"

// Zustand und persist werden nicht mehr benötigt

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

// Dummy-Store für UI-State (nur noch aktuelle UserId und Tab)
export const useAppStore = () => {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [currentUserId, setCurrentUserId] = useState<string>("")
  return { activeTab, setActiveTab, currentUserId, setCurrentUserId }
}
