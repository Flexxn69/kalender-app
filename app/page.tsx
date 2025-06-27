"use client"

import Link from "next/link"
import { CalendarDays, Users, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import { useEffect } from "react"

export default function Home() {
  const router = useRouter()
  const { user } = useUser()

  useEffect(() => {
    if (user) {
      router.replace("/calendar")
    }
  }, [user, router])

  const handleLogin = () => {
    router.push("/auth/login")
  }

  if (user) return null // Seite bleibt leer, falls Weiterleitung noch läuft

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Moderne Terminplanung für Gruppen und Personen
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Verwalten Sie Ihre persönlichen Termine und planen Sie Events mit Ihrem Team in einer intuitiven
                    App.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" onClick={handleLogin}>Jetzt starten</Button>
                  <Button size="lg" variant="outline">
                    Demo ansehen
                  </Button>
                </div>
              </div>
              <div className="mx-auto w-full max-w-[500px] lg:max-w-none">
                <div className="aspect-video overflow-hidden rounded-xl bg-foreground/5 dark:bg-foreground/10">
                  <img
                    src="/placeholder.svg?height=500&width=800"
                    alt="Kalender App Screenshot"
                    width={800}
                    height={500}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Hauptfunktionen</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Entdecken Sie die leistungsstarken Funktionen unserer Kalender-App
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Persönlicher Kalender
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Verwalten Sie Ihre Termine, Aufgaben und Ereignisse mit Kategorien, Erinnerungen und Prioritäten.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Gruppen-Kalender
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Teilen Sie Kalender mit Teams, Familie oder Freunden und vermeiden Sie Doppelbuchungen.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Integrierte Kommunikation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Kommunizieren Sie nahtlos mit integrierten Funktionen für Chat, Dateiaustausch, Abstimmungen, Telefon- und Videogespräche – alles in einer einzigen App organisiert.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
