export type Message = {
  id: string
  sender: string
  senderName?: string
  content: string
  time: string
  files?: {
    name: string
    type: string
    size: number
    url?: string
  }[]
  conversationId?: string
}
