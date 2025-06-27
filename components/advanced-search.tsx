"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, CalendarIcon, X, Clock, User, MessageSquare, FileText } from "lucide-react"
import { searchEngine } from "@/lib/search-engine"
import { useAppStore } from "@/lib/store"
import { format } from "date-fns"
import { de } from "date-fns/locale"

interface SearchFilters {
  types: string[]
  dateRange: { start: Date | null; end: Date | null }
  categories: string[]
}

export function AdvancedSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    dateRange: { start: null, end: null },
    categories: [],
  })

  const { events, messages, contacts } = useAppStore()

  useEffect(() => {
    // Baue Suchindex auf
    const allMessages = Object.values(messages).flat()
    const allFiles = allMessages.flatMap((msg) => msg.files || [])

    searchEngine.buildIndex({
      events,
      messages: allMessages,
      contacts,
      files: allFiles,
    })
  }, [events, messages, contacts])

  useEffect(() => {
    if (query.length > 2) {
      const newSuggestions = searchEngine.getSearchSuggestions(query)
      setSuggestions(newSuggestions)
    } else {
      setSuggestions([])
    }
  }, [query])

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const searchResults = searchEngine.search(query, {
        types: filters.types.length > 0 ? filters.types : undefined,
        dateRange:
          filters.dateRange.start && filters.dateRange.end
            ? { start: filters.dateRange.start, end: filters.dateRange.end }
            : undefined,
        categories: filters.categories.length > 0 ? filters.categories : undefined,
      })
      setResults(searchResults)
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }))
  }

  const clearFilters = () => {
    setFilters({
      types: [],
      dateRange: { start: null, end: null },
      categories: [],
    })
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case "events":
        return <CalendarIcon className="h-4 w-4" />
      case "messages":
        return <MessageSquare className="h-4 w-4" />
      case "contacts":
        return <User className="h-4 w-4" />
      case "files":
        return <FileText className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getResultTitle = (result: any) => {
    switch (result.type) {
      case "events":
        return result.item.title
      case "messages":
        return result.item.content.substring(0, 50) + "..."
      case "contacts":
        return result.item.name
      case "files":
        return result.item.name
      default:
        return "Unbekannt"
    }
  }

  const getResultSubtitle = (result: any) => {
    switch (result.type) {
      case "events":
        return `${format(new Date(result.item.date), "dd.MM.yyyy", { locale: de })} - ${result.item.category}`
      case "messages":
        return `Von ${result.item.senderName || result.item.sender} - ${format(new Date(result.item.time), "dd.MM.yyyy HH:mm", { locale: de })}`
      case "contacts":
        return result.item.email
      case "files":
        return `${result.item.type} - ${(result.item.size / 1024).toFixed(1)} KB`
      default:
        return ""
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Erweiterte Suche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suchfeld */}
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Suche nach Terminen, Nachrichten, Kontakten..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pr-10"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Clock className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-accent" : ""}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Suchvorschläge */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border rounded-md shadow-lg">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  onClick={() => setQuery(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter */}
        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Typ-Filter */}
                <div>
                  <Label className="text-sm font-medium">Typ</Label>
                  <div className="space-y-2 mt-2">
                    {[
                      { value: "events", label: "Termine" },
                      { value: "messages", label: "Nachrichten" },
                      { value: "contacts", label: "Kontakte" },
                      { value: "files", label: "Dateien" },
                    ].map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={type.value}
                          checked={filters.types.includes(type.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleFilterChange("types", [...filters.types, type.value])
                            } else {
                              handleFilterChange(
                                "types",
                                filters.types.filter((t) => t !== type.value),
                              )
                            }
                          }}
                        />
                        <Label htmlFor={type.value} className="text-sm">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Datum-Filter */}
                <div>
                  <Label className="text-sm font-medium">Zeitraum</Label>
                  <div className="space-y-2 mt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateRange.start
                            ? format(filters.dateRange.start, "dd.MM.yyyy", { locale: de })
                            : "Von Datum"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateRange.start || undefined}
                          onSelect={(date) =>
                            handleFilterChange("dateRange", {
                              ...filters.dateRange,
                              start: date || null,
                            })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filters.dateRange.end
                            ? format(filters.dateRange.end, "dd.MM.yyyy", { locale: de })
                            : "Bis Datum"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={filters.dateRange.end || undefined}
                          onSelect={(date) =>
                            handleFilterChange("dateRange", {
                              ...filters.dateRange,
                              end: date || null,
                            })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Kategorie-Filter */}
                <div>
                  <Label className="text-sm font-medium">Kategorien</Label>
                  <div className="space-y-2 mt-2">
                    {["Arbeit", "Persönlich", "Sport", "Bildung", "Sonstiges"].map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={filters.categories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleFilterChange("categories", [...filters.categories, category])
                            } else {
                              handleFilterChange(
                                "categories",
                                filters.categories.filter((c) => c !== category),
                              )
                            }
                          }}
                        />
                        <Label htmlFor={category} className="text-sm">
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={clearFilters}>
                  Filter zurücksetzen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aktive Filter anzeigen */}
        {(filters.types.length > 0 ||
          filters.categories.length > 0 ||
          filters.dateRange.start ||
          filters.dateRange.end) && (
          <div className="flex flex-wrap gap-2">
            {filters.types.map((type) => (
              <Badge key={type} variant="secondary" className="gap-1">
                {type}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() =>
                    handleFilterChange(
                      "types",
                      filters.types.filter((t) => t !== type),
                    )
                  }
                />
              </Badge>
            ))}
            {filters.categories.map((category) => (
              <Badge key={category} variant="secondary" className="gap-1">
                {category}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() =>
                    handleFilterChange(
                      "categories",
                      filters.categories.filter((c) => c !== category),
                    )
                  }
                />
              </Badge>
            ))}
            {filters.dateRange.start && (
              <Badge variant="secondary" className="gap-1">
                Ab {format(filters.dateRange.start, "dd.MM.yyyy", { locale: de })}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange("dateRange", { ...filters.dateRange, start: null })}
                />
              </Badge>
            )}
            {filters.dateRange.end && (
              <Badge variant="secondary" className="gap-1">
                Bis {format(filters.dateRange.end, "dd.MM.yyyy", { locale: de })}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange("dateRange", { ...filters.dateRange, end: null })}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Suchergebnisse */}
        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Suchergebnisse ({results.length})</h3>
              <Button variant="outline" size="sm" onClick={() => setResults([])}>
                <X className="h-4 w-4 mr-1" />
                Löschen
              </Button>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">Alle ({results.length})</TabsTrigger>
                <TabsTrigger value="events">Termine ({results.filter((r) => r.type === "events").length})</TabsTrigger>
                <TabsTrigger value="messages">
                  Nachrichten ({results.filter((r) => r.type === "messages").length})
                </TabsTrigger>
                <TabsTrigger value="contacts">
                  Kontakte ({results.filter((r) => r.type === "contacts").length})
                </TabsTrigger>
                <TabsTrigger value="files">Dateien ({results.filter((r) => r.type === "files").length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <Card key={index} className="p-3 hover:bg-accent/50 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{getResultIcon(result.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{getResultTitle(result)}</div>
                            <div className="text-sm text-muted-foreground truncate">{getResultSubtitle(result)}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {result.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Relevanz: {Math.round(result.score)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {["events", "messages", "contacts", "files"].map((type) => (
                <TabsContent key={type} value={type}>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {results
                        .filter((result) => result.type === type)
                        .map((result, index) => (
                          <Card key={index} className="p-3 hover:bg-accent/50 cursor-pointer">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">{getResultIcon(result.type)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{getResultTitle(result)}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {getResultSubtitle(result)}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    Relevanz: {Math.round(result.score)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {/* Keine Ergebnisse */}
        {query && results.length === 0 && !isSearching && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Keine Ergebnisse für "{query}" gefunden.</p>
            <p className="text-sm mt-1">Versuchen Sie andere Suchbegriffe oder passen Sie die Filter an.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
