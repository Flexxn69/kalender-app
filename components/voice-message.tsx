"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Play, Pause, Trash2 } from "lucide-react"
import { voiceManager } from "@/lib/voice-manager"
import { useToast } from "@/hooks/use-toast"

interface VoiceMessageProps {
  onSend: (audioData: string, duration: number) => void
  disabled?: boolean
}

export function VoiceMessage({ onSend, disabled }: VoiceMessageProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  const startRecording = async () => {
    try {
      const hasPermission = await voiceManager.requestPermission()
      if (!hasPermission) {
        toast({
          title: "Mikrofon-Berechtigung erforderlich",
          description: "Bitte erlauben Sie den Zugriff auf das Mikrofon.",
          variant: "destructive",
        })
        return
      }

      await voiceManager.startRecording()
      setIsRecording(true)
    } catch (error) {
      toast({
        title: "Aufnahme fehlgeschlagen",
        description: "Die Sprachaufnahme konnte nicht gestartet werden.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = async () => {
    try {
      const blob = await voiceManager.stopRecording()
      const audioDuration = await voiceManager.getDuration(blob)

      setAudioBlob(blob)
      setDuration(audioDuration)
      setIsRecording(false)

      // Erstelle Audio-Element für Vorschau
      audioRef.current = voiceManager.createAudioElement(blob)
      audioRef.current.onended = () => setIsPlaying(false)
    } catch (error) {
      toast({
        title: "Aufnahme fehlgeschlagen",
        description: "Die Sprachaufnahme konnte nicht beendet werden.",
        variant: "destructive",
      })
      setIsRecording(false)
    }
  }

  const playPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const deleteRecording = () => {
    setAudioBlob(null)
    setDuration(0)
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }

  const sendVoiceMessage = async () => {
    if (!audioBlob) return

    try {
      const audioData = await voiceManager.convertToBase64(audioBlob)
      onSend(audioData, duration)
      deleteRecording()
    } catch (error) {
      toast({
        title: "Senden fehlgeschlagen",
        description: "Die Sprachnachricht konnte nicht gesendet werden.",
        variant: "destructive",
      })
    }
  }

  if (audioBlob) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
        <Button variant="ghost" size="sm" onClick={playPause} className="h-8 w-8 p-0">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="flex-1">
          <div className="text-sm font-medium">Sprachnachricht</div>
          <div className="text-xs text-muted-foreground">{voiceManager.formatDuration(duration)}</div>
        </div>

        <Button variant="ghost" size="sm" onClick={deleteRecording} className="h-8 w-8 p-0 text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button size="sm" onClick={sendVoiceMessage} disabled={disabled}>
          Senden
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      className="shrink-0"
    >
      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  )
}
