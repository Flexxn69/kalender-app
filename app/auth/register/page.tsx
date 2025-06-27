"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useUser } from "@/contexts/UserContext"
import { useAppStore } from "@/lib/store"

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useUser()
  const { addContact, setCurrentUserId } = useAppStore()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName || !lastName || !phone || !email || !password || !confirmPassword) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Fehler",
        description: "Passwörter stimmen nicht überein.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Registrierte Nutzer aus dem LocalStorage laden
    const usersRaw = localStorage.getItem("users")
    const users = usersRaw ? JSON.parse(usersRaw) : []

    // Prüfen, ob die E-Mail schon existiert
    const exists = users.some((u: any) => u.email === email)
    if (exists) {
      setIsLoading(false)
      toast({
        title: "Fehler",
        description: "Ein Konto mit dieser E-Mail existiert bereits.",
        variant: "destructive",
      })
      return
    }

    // Neues Benutzerobjekt
    const fullName = `${firstName} ${lastName}`
    const newUserId = Math.random().toString(36).substring(2, 9)

    const newUser = {
      id: newUserId,
      name: fullName,
      email,
      phone,
      password,
      status: "online",
      bio: "",
      avatar: "",
    }

    // Nutzer zur Liste hinzufügen und speichern
    users.push(newUser)
    localStorage.setItem("users", JSON.stringify(users))

    // Benutzer auch zu den Kontakten hinzufügen
    addContact({
      id: newUserId,
      name: fullName,
      email,
      phone,
      status: "online",
      isRegistered: true,
      department: "",
    })

    // Als aktueller Benutzer setzen
    setCurrentUserId(newUserId)

    // Direkt einloggen nach Registrierung
    login({
      name: fullName,
      email,
      phone,
      status: "online",
      bio: "",
      avatar: "",
    })

    setTimeout(() => {
      setIsLoading(false)
      toast({
        title: "Erfolgreich registriert",
        description: "Ihr Konto wurde erfolgreich erstellt.",
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
          <CardTitle className="text-2xl">Registrieren</CardTitle>
          <CardDescription>Erstellen Sie ein neues Konto.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">Vorname</Label>
              <Input
                id="first-name"
                type="text"
                placeholder="Max"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Nachname</Label>
              <Input
                id="last-name"
                type="text"
                placeholder="Mustermann"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+49 123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
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
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registrierung läuft..." : "Registrieren"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm">
          Bereits ein Konto?{"\u00a0"}
          <Link href="/auth/login" className="hover:underline">
            Anmelden
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
