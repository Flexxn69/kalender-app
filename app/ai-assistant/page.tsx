"use client"

import { useState } from "react"
import { AISchedulingAssistant } from "@/components/ai-scheduling-assistant"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Brain } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

export default function AIAssistantPage() {
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    participants: [] as string[],
    duration: 60,
    date: new Date(),
  })

  const [showAssistant, setShowAssistant] = useState(false)

  const handleAnalyze = () => {
    if (!eventData.title.trim()) {
      alert("Bitte geben Sie einen Titel ein")
      return
    }
    setShowAssistant(true)
  }

  const handleSuggestionApply = (suggestion: any) => {
    switch (suggestion.type) {
      case "category":
        console.log("Kategorie angewendet:", suggestion.value)
        break
      case "time":
        setEventData((prev) => ({
          ...prev,
          startTime: suggestion.value.startTime,
          endTime: suggestion.value.endTime,
        }))
        break
      case "agenda":
        console.log("Agenda angewendet:", suggestion.value)
        break
    }
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="flex items-center gap-4 mb-6">
        <Brain className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">KI-Terminassistent</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Eingabeformular */}
        <Card>
          <CardHeader>
            <CardTitle>Termin-Details eingeben</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                placeholder="Meeting-Titel..."
                value={eventData.title}
                onChange={(e) => setEventData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                placeholder="Beschreibung des Meetings..."
                value={eventData.description}
                onChange={(e) => setEventData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="participants">Teilnehmer (E-Mails, durch Komma getrennt)</Label>
              <Input
                id="participants"
                placeholder="user1@example.com, user2@example.com"
                onChange={(e) =>
                  setEventData((prev) => ({
                    ...prev,
                    participants: e.target.value
                      .split(",")
                      .map((p) => p.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="duration">Dauer (Minuten)</Label>
              <Input
                id="duration"
                type="number"
                value={eventData.duration}
                onChange={(e) => setEventData((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) || 60 }))}
              />
            </div>

            <div>
              <Label>Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(eventData.date, "dd.MM.yyyy", { locale: de })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eventData.date}
                    onSelect={(date) => date && setEventData((prev) => ({ ...prev, date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleAnalyze} className="w-full">
              <Brain className="mr-2 h-4 w-4" />
              KI-Analyse starten
            </Button>
          </CardContent>
        </Card>

        {/* KI-Assistent */}
        <AISchedulingAssistant
          eventData={showAssistant ? eventData : undefined}
          onSuggestionApply={handleSuggestionApply}
        />
      </div>
    </div>
  )
}
