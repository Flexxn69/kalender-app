"use client"

import React, { useRef, useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Send, Paperclip } from "lucide-react"

import { useAppStore } from "@/lib/store"
import { generateChatIdFromMembers } from "@/lib/chat-utils"
import type { Message } from "@/types/message"

export type ChatProps = {
  group: {
    chatId?: string
    members: { id: string; name: string }[]
  }
  onSendMessage?: (message: string, files?: File[]) => void
}

export function GroupChat({ group, onSendMessage }: ChatProps) {
  const [messageInput, setMessageInput] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null)

  const chatId = group.chatId || generateChatIdFromMembers(group.members)
  const { messages, addMessage } = useAppStore()
  const chatMessages: Message[] = messages[chatId] || []

  useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [chatMessages])

  const handleSendMessage = () => {
    if (!messageInput.trim() && uploadedFiles.length === 0) return

    const newMessage: Message = {
      id: crypto.randomUUID(),
      sender: "me",
      content: messageInput,
      time: new Date().toISOString(),
      files: uploadedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      })),
      conversationId: chatId,
    }

    addMessage(chatId, newMessage)
    onSendMessage?.(messageInput, uploadedFiles)

    setMessageInput("")
    setUploadedFiles([])
  }

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)])
    }
  }

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  const renderFilePreview = (file: Message["files"][number]) => {
    const isImage = file.type.startsWith("image/")
    return (
      <div
        key={file.name}
        title={file.name}
        className="flex items-center space-x-2 border rounded p-1 bg-gray-100 max-w-xs"
      >
        {isImage && file.url ? (
          <img
            src={file.url}
            alt={file.name}
            className="h-20 w-20 object-cover rounded flex-shrink-0 cursor-default"
          />
        ) : (
          <span className="text-3xl select-none">📄</span>
        )}
        <span className="text-sm truncate">{file.name}</span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gruppenchat</CardTitle>
        <CardDescription>Kommunizieren Sie mit den Gruppenmitgliedern</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col h-[60vh]">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.length > 0 ? (
                chatMessages.map(message => {
                  const sender = group.members.find(m => m.id === message.sender)
                  const isCurrentUser = message.sender === "me"
                  const filesToShow = message.files ?? []

                  return (
                    <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                      {!isCurrentUser && (
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback>{sender?.name.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {!isCurrentUser && (
                          <div className="font-medium text-xs mb-1">{sender?.name}</div>
                        )}
                        <div>{message.content}</div>
                        {filesToShow.length > 0 && (
                          <div className="flex flex-wrap mt-2 gap-2">
                            {filesToShow.map(file => renderFilePreview(file))}
                          </div>
                        )}
                        <div
                          className={`text-xs mt-1 ${
                            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(message.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Noch keine Nachrichten. Starten Sie die Konversation!
                </div>
              )}
              <div ref={scrollAnchorRef} />
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleFileUpload} className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleChatFileSelect}
                className="hidden"
                multiple
              />
              <Input
                placeholder="Nachricht schreiben..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button size="icon" onClick={handleSendMessage} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {uploadedFiles.map(file => (
                  <div key={file.name} className="flex items-center space-x-2 border rounded p-1 bg-muted max-w-xs">
                    <span className="text-3xl select-none">📄</span>
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
