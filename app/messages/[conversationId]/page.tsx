import dynamic from "next/dynamic"
const MessagesPage = dynamic(() => import("../page"), { ssr: false })

export default function MobileChatPage({ params }: { params: { conversationId: string } }) {
  // Immer mobile Ansicht erzwingen, unabhängig von window.innerWidth
  return <MessagesPage mobileConversationId={params.conversationId} forceMobile={true} />
}
