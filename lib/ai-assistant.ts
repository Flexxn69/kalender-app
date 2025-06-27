// KI-Assistent für intelligente Terminplanung
export class AIAssistant {
  private apiKey: string

  constructor(apiKey = "") {
    this.apiKey = apiKey
  }

  async suggestOptimalMeetingTime(
    participants: string[],
    duration: number,
    preferences: {
      preferredTimes?: string[]
      avoidTimes?: string[]
      timezone?: string
    } = {},
  ): Promise<{ startTime: string; endTime: string; confidence: number }[]> {
    // Simulierte KI-Logik für Terminvorschläge
    const suggestions = []
    const workingHours = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]

    for (const time of workingHours) {
      const endTime = this.addHours(time, duration)
      const confidence = this.calculateConfidence(time, preferences)

      suggestions.push({
        startTime: time,
        endTime,
        confidence,
      })
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  async categorizeEvent(title: string, description: string): Promise<string> {
    // Einfache Kategorisierung basierend auf Schlüsselwörtern
    const categories = {
      Arbeit: ["meeting", "projekt", "team", "call", "besprechung", "work"],
      Persönlich: ["arzt", "zahnarzt", "familie", "freunde", "hobby"],
      Sport: ["fitness", "gym", "training", "sport", "laufen"],
      Bildung: ["kurs", "seminar", "workshop", "lernen", "studium"],
    }

    const text = (title + " " + description).toLowerCase()

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return category
      }
    }

    return "Sonstiges"
  }

  async generateMeetingAgenda(title: string, participants: string[], duration: number): Promise<string[]> {
    // Generiere eine einfache Agenda basierend auf Meeting-Typ
    const agendaTemplates = {
      team: [
        "Begrüßung und Check-in (5 min)",
        "Projektupdate (15 min)",
        "Aktuelle Herausforderungen (10 min)",
        "Nächste Schritte (10 min)",
        "Abschluss (5 min)",
      ],
      planning: [
        "Zielsetzung (10 min)",
        "Brainstorming (20 min)",
        "Priorisierung (15 min)",
        "Zeitplanung (10 min)",
        "Verantwortlichkeiten (5 min)",
      ],
      review: [
        "Rückblick auf Ziele (10 min)",
        "Erreichte Meilensteine (15 min)",
        "Lessons Learned (15 min)",
        "Verbesserungsvorschläge (10 min)",
        "Ausblick (5 min)",
      ],
    }

    const titleLower = title.toLowerCase()
    let template = agendaTemplates.team // Default

    if (titleLower.includes("planning") || titleLower.includes("planung")) {
      template = agendaTemplates.planning
    } else if (titleLower.includes("review") || titleLower.includes("rückblick")) {
      template = agendaTemplates.review
    }

    return template
  }

  async detectConflicts(newEvent: any, existingEvents: any[]): Promise<any[]> {
    const conflicts = []
    const newStart = new Date(`${newEvent.date}T${newEvent.startTime}`)
    const newEnd = new Date(`${newEvent.date}T${newEvent.endTime}`)

    for (const event of existingEvents) {
      const eventStart = new Date(`${event.date}T${event.startTime}`)
      const eventEnd = new Date(`${event.date}T${event.endTime}`)

      if (this.timeRangesOverlap(newStart, newEnd, eventStart, eventEnd)) {
        conflicts.push({
          event,
          severity: this.calculateConflictSeverity(newEvent, event),
          suggestion: await this.suggestAlternativeTime(newEvent, existingEvents),
        })
      }
    }

    return conflicts
  }

  private addHours(time: string, hours: number): string {
    const [h, m] = time.split(":").map(Number)
    const newHour = h + hours
    return `${newHour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
  }

  private calculateConfidence(time: string, preferences: any): number {
    let confidence = 0.5 // Base confidence

    if (preferences.preferredTimes?.includes(time)) {
      confidence += 0.3
    }

    if (preferences.avoidTimes?.includes(time)) {
      confidence -= 0.4
    }

    // Bevorzuge Zeiten zwischen 9-17 Uhr
    const hour = Number.parseInt(time.split(":")[0])
    if (hour >= 9 && hour <= 17) {
      confidence += 0.2
    }

    return Math.max(0, Math.min(1, confidence))
  }

  private timeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && start2 < end1
  }

  private calculateConflictSeverity(event1: any, event2: any): "low" | "medium" | "high" {
    // Einfache Logik für Konfliktschwere
    if (event1.category === "Arbeit" && event2.category === "Arbeit") {
      return "high"
    }
    if (event1.category === "Persönlich" || event2.category === "Persönlich") {
      return "medium"
    }
    return "low"
  }

  private async suggestAlternativeTime(
    newEvent: any,
    existingEvents: any[],
  ): Promise<{ startTime: string; endTime: string } | null> {
    // Finde nächsten freien Zeitslot
    const duration = this.calculateDuration(newEvent.startTime, newEvent.endTime)
    const suggestions = await this.suggestOptimalMeetingTime([], duration)

    return suggestions.length > 0 ? suggestions[0] : null
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(":").map(Number)
    const [endH, endM] = endTime.split(":").map(Number)
    return endH * 60 + endM - (startH * 60 + startM)
  }
}

export const aiAssistant = new AIAssistant()
