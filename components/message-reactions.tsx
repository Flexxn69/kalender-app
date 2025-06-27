"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus } from "lucide-react"

interface Reaction {
  emoji: string
  users: string[]
  count: number
}

interface MessageReactionsProps {
  messageId: string
  reactions: Reaction[]
  currentUserId: string
  onAddReaction: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, emoji: string) => void
}

const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"]

export function MessageReactions({
  messageId,
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
}: MessageReactionsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find((r) => r.emoji === emoji)
    const userHasReacted = existingReaction?.users.includes(currentUserId)

    if (userHasReacted) {
      onRemoveReaction(messageId, emoji)
    } else {
      onAddReaction(messageId, emoji)
    }
  }

  const handleQuickReaction = (emoji: string) => {
    handleReactionClick(emoji)
    setShowReactionPicker(false)
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {reactions.map((reaction) => {
        const userHasReacted = reaction.users.includes(currentUserId)
        return (
          <Button
            key={reaction.emoji}
            variant={userHasReacted ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => handleReactionClick(reaction.emoji)}
          >
            <span className="mr-1">{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </Button>
        )
      })}

      <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-50 hover:opacity-100">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {quickReactions.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-lg"
                onClick={() => handleQuickReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
