"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Brain, Clock, Users, Lightbulb, CheckCircle, AlertTriangle, Sparkles } from "lucide-react"
import { aiAssistant } from "@/lib/ai-assistant"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

interface AISuggestion {
  type: "time" | "category" | "agenda" | "conflict"
  title: string
  description: string
  confidence: number
  action?: () => void
}

interface AISchedulingAssistantProps {
  eventData?: {
    title: string
    description: string
    participants: string[]
    duration: number
    date: Date
  }
  onSuggestionApply?: (suggestion: any) => void
}

export function AISchedulingAssistant({ eventData, onSuggestionApply }: AISchedulingAssistantProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [conflicts, setConflicts] = useState<any[]>([])
  const { events, contacts } = useAppStore()
  const { toast } = useToast()

  useEffect(() => {
    if (eventData) {
      analyzeMeeting()
    }
  }, [eventData])

  const analyzeMeeting = async () => {
    if (!eventData) return

    setIsAnalyzing(true)
    try {
      const newSuggestions: AISuggestion[] = []

      // 1. Kategorisierung vorschlagen
      const suggestedCategory = await aiAssistant.categorizeEvent(eventData.title, eventData.description)

      newSuggestions.push({
        type: "category",
        title: "Kategorie-Vorschlag",
        description: `Basierend auf Titel und Beschreibung wird die Kategorie "${suggestedCategory}" vorgeschlagen.`,
        confidence: 0.8,
        action: () => onSuggestionApply?.({ type: "category", value: suggestedCategory }),
      })

      // 2. Optimale Zeiten vorschlagen
      const timeSlots = await aiAssistant.suggestOptimalMeetingTime(eventData.participants, eventData.duration, {
        preferredTimes: ["09:00", "10:00", "14:00", "15:00"],
      })

      if (timeSlots.length > 0) {
        newSuggestions.push({
          type: "time",
          title: "Optimale Zeiten",
          description: `Beste Zeit: ${timeSlots[0].startTime} - ${timeSlots[0].endTime} (${Math.round(timeSlots[0].confidence * 100)}% Übereinstimmung)`,
          confidence: timeSlots[0].confidence,
          action: () =>
            onSuggestionApply?.({
              type: "time",
              value: { startTime: timeSlots[0].startTime, endTime: timeSlots[0].endTime },
            }),
        })
      }

      // 3. Agenda generieren
      const agenda = await aiAssistant.generateMeetingAgenda(
        eventData.title,
        eventData.participants,
        eventData.duration,
      )

      newSuggestions.push({
        type: "agenda",
        title: "Meeting-Agenda",
        description: `Automatisch generierte Agenda mit ${agenda.length} Punkten.`,
        confidence: 0.7,
        action: () => onSuggestionApply?.({ type: "agenda", value: agenda }),
      })

      // 4. Konflikte erkennen
      const detectedConflicts = await aiAssistant.detectConflicts(
        {
          ...eventData,
          date: eventData.date.toISOString().split("T")[0],
          startTime: "10:00", // Beispielzeit
          endTime: "11:00",
        },
        events,
      )

      if (detectedConflicts.length > 0) {
        setConflicts(detectedConflicts)
        newSuggestions.push({
          type: "conflict",
          title: "Terminkonflikt erkannt",
          description: `${detectedConflicts.length} potentielle Konflikte gefunden. Alternative Zeiten verfügbar.`,
          confidence: 0.9,
        })
      }

      setSuggestions(newSuggestions)
    } catch (error) {
      console.error("AI analysis failed:", error)
      toast({
        title: "KI-Analyse fehlgeschlagen",
        description: "Die automatische Analyse konnte nicht durchgeführt werden.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (confidence >= 0.6) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "time":
        return <Clock className="h-4 w-4" />
      case "category":
        return <Lightbulb className="h-4 w-4" />
      case "agenda":
        return <Users className="h-4 w-4" />
      case "conflict":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Sparkles className="h-4 w-4" />
    }
  }

  if (!eventData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>KI-Assistent bereit</p>
            <p className="text-sm mt-1">Erstellen Sie einen Termin, um intelligente Vorschläge zu erhalten.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          KI-Terminassistent
          {isAnalyzing && <Sparkles className="h-4 w-4 animate-pulse text-primary" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-4 animate-pulse text-primary" />
              <p className="text-sm text-muted-foreground">Analysiere Termin...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div key={index}>
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getSuggestionIcon(suggestion.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{suggestion.title}</h4>
                          {getConfidenceIcon(suggestion.confidence)}
                          <Badge variant="outline" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                        {suggestion.action && (
                          <Button size="sm" onClick={suggestion.action} className="w-full">
                            Anwenden
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                  {index < suggestions.length - 1 && <Separator className="my-2" />}
                </div>
              ))}

              {/* Konflikte anzeigen */}
              {conflicts.length > 0 && (
                <Card className="border-destructive/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Erkannte Konflikte
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {conflicts.map((conflict, index) => (
                        <div key={index} className="text-sm">
                          <div className="font-medium">{conflict.event.title}</div>
                          <div className="text-muted-foreground">
                            {conflict.event.startTime} - {conflict.event.endTime}
                          </div>
                          {conflict.suggestion && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                Vorschlag: {conflict.suggestion.startTime} - {conflict.suggestion.endTime}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {suggestions.length === 0 && !isAnalyzing && (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine Vorschläge verfügbar</p>
                  <p className="text-sm mt-1">Fügen Sie mehr Details hinzu, um bessere Vorschläge zu erhalten.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
