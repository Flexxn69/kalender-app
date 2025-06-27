import type { Message } from "@/types/message"

export function generateChatIdFromMembers(members: { id: string }[]): string {
  return members.map(m => m.id).sort().join("-")
}

export function groupMessagesByChatId(messagesByChatId: Record<string, Message[]>): Record<string, Message[]> {
  return messagesByChatId
}
