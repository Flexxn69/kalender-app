"use client"
import MessagesPage from "../page"

export default function MobileChatPage({ params }: { params: { conversationId: string } }) {
  // Immer mobile Ansicht erzwingen, unabhängig von window.innerWidth
  return <MessagesPage mobileConversationId={params.conversationId} forceMobile />
}