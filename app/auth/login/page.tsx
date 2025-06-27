"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useUser } from '@/contexts/UserContext'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useUser()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Nutzer aus LocalStorage laden
    const usersRaw = localStorage.getItem("users")
    const users = usersRaw ? JSON.parse(usersRaw) : []

    // Nutzer suchen & Passwort prüfen
    const user = users.find((u: any) => u.email === email && u.password === password)
    if (!user) {
      setIsLoading(false)
      toast({
        title: "Fehler",
        description: "E-Mail oder Passwort ist falsch.",
        variant: "destructive",
      })
      return
    }

    // Login im Context und LocalStorage setzen
    login({
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      bio: user.bio,
      avatar: user.avatar,
    })

    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Erfolgreich angemeldet",
        description: "Sie wurden erfolgreich angemeldet.",
      })
      router.push("/calendar")
    }, 1000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Plano</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Anmelden</CardTitle>
          <CardDescription>Melden Sie sich mit Ihren Zugangsdaten an, um fortzufahren.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <Link href="/auth/reset-password" className="text-sm text-primary hover:underline">
                  Passwort vergessen?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Anmeldung läuft..." : "Anmelden"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          Noch kein Konto?{"\u00a0"}
          <Link href="/auth/register" className="text-primary hover:underline">
            Registrieren
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
