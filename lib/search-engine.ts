// Erweiterte Suchfunktion
export class SearchEngine {
  private searchIndex: Map<string, any[]> = new Map()

  buildIndex(data: {
    events: any[]
    messages: any[]
    contacts: any[]
    files: any[]
  }) {
    this.searchIndex.clear()

    // Indexiere Events
    data.events.forEach((event) => {
      this.addToIndex("events", event, [event.title, event.description, event.location, event.category])
    })

    // Indexiere Messages
    Object.values(data.messages)
      .flat()
      .forEach((message: any) => {
        this.addToIndex("messages", message, [message.content, message.senderName])
      })

    // Indexiere Contacts
    data.contacts.forEach((contact) => {
      this.addToIndex("contacts", contact, [contact.name, contact.email, contact.department])
    })

    // Indexiere Files
    data.files.forEach((file) => {
      this.addToIndex("files", file, [file.name, file.type])
    })
  }

  private addToIndex(type: string, item: any, searchableFields: string[]) {
    const searchText = searchableFields
      .filter((field) => field)
      .join(" ")
      .toLowerCase()

    const words = searchText.split(/\s+/)

    words.forEach((word) => {
      if (word.length > 2) {
        // Ignoriere sehr kurze Wörter
        const key = `${type}:${word}`
        if (!this.searchIndex.has(key)) {
          this.searchIndex.set(key, [])
        }
        this.searchIndex.get(key)!.push({
          type,
          item,
          relevance: this.calculateRelevance(word, searchText),
        })
      }
    })
  }

  search(
    query: string,
    filters: {
      types?: string[]
      dateRange?: { start: Date; end: Date }
      categories?: string[]
    } = {},
  ): any[] {
    if (!query.trim()) return []

    const queryWords = query.toLowerCase().split(/\s+/)
    const results = new Map<string, any>()

    queryWords.forEach((word) => {
      if (word.length > 2) {
        // Exakte Treffer
        const exactKey = `*:${word}`
        this.searchIndex.forEach((items, key) => {
          if (key.includes(word)) {
            items.forEach((item) => {
              const id = `${item.type}:${item.item.id}`
              if (!results.has(id)) {
                results.set(id, { ...item, score: 0 })
              }
              results.get(id)!.score += item.relevance
            })
          }
        })

        // Fuzzy Matching
        this.searchIndex.forEach((items, key) => {
          if (this.fuzzyMatch(word, key.split(":")[1])) {
            items.forEach((item) => {
              const id = `${item.type}:${item.item.id}`
              if (!results.has(id)) {
                results.set(id, { ...item, score: 0 })
              }
              results.get(id)!.score += item.relevance * 0.7 // Reduzierte Relevanz für Fuzzy Matches
            })
          }
        })
      }
    })

    let filteredResults = Array.from(results.values())

    // Anwenden von Filtern
    if (filters.types && filters.types.length > 0) {
      filteredResults = filteredResults.filter((result) => filters.types!.includes(result.type))
    }

    if (filters.dateRange) {
      filteredResults = filteredResults.filter((result) => {
        if (result.type === "events" && result.item.date) {
          const eventDate = new Date(result.item.date)
          return eventDate >= filters.dateRange!.start && eventDate <= filters.dateRange!.end
        }
        return true
      })
    }

    if (filters.categories && filters.categories.length > 0) {
      filteredResults = filteredResults.filter((result) => {
        if (result.item.category) {
          return filters.categories!.includes(result.item.category)
        }
        return true
      })
    }

    // Sortiere nach Relevanz
    return filteredResults.sort((a, b) => b.score - a.score).slice(0, 50) // Limitiere auf 50 Ergebnisse
  }

  private calculateRelevance(word: string, fullText: string): number {
    const wordCount = (fullText.match(new RegExp(word, "g")) || []).length
    const textLength = fullText.length
    return (wordCount / textLength) * 100
  }

  private fuzzyMatch(pattern: string, text: string, threshold = 0.7): boolean {
    if (pattern.length === 0) return true
    if (text.length === 0) return false

    const distance = this.levenshteinDistance(pattern, text)
    const maxLength = Math.max(pattern.length, text.length)
    const similarity = 1 - distance / maxLength

    return similarity >= threshold
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  getSearchSuggestions(query: string): string[] {
    const suggestions = new Set<string>()
    const queryLower = query.toLowerCase()

    this.searchIndex.forEach((items, key) => {
      const word = key.split(":")[1]
      if (word.startsWith(queryLower) && word !== queryLower) {
        suggestions.add(word)
      }
    })

    return Array.from(suggestions).slice(0, 10)
  }
}

export const searchEngine = new SearchEngine()
