"use client"

import MessagesPage from "../page"
import { useParams } from "next/navigation"

export default function ConversationPage() {
  const params = useParams<{ conversationId?: string }>()
  const conversationId = params?.conversationId ?? ""
  return <MessagesPage conversationId={conversationId} />
}
