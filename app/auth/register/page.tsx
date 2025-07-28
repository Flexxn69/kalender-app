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
import { registerUser } from "./registerUser"

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useUser()
  const { addContact, setCurrentUserId } = useAppStore()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validierung
    if (!firstName || !lastName || !phone || !email || !password || !confirmPassword) {
      setError("Bitte füllen Sie alle Felder aus.")
      return
    }
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein.")
      return
    }

    setIsLoading(true)
    try {
      const fullName = `${firstName} ${lastName}`
      const res = await registerUser(fullName, email, password, phone)
      if (res?.error) {
        setError(res.error)
        setIsLoading(false)
        return
      }
      addContact({
        id: res.id,
        name: fullName,
        email,
        phone,
        status: "online",
        isRegistered: true,
        department: "",
      })
      setCurrentUserId(res.id)
      login({
        name: fullName,
        email,
        phone,
        status: "online",
        bio: "",
        avatar: "",
      })
      setIsLoading(false)
      toast({
        title: "Erfolgreich registriert",
        description: "Ihr Konto wurde erfolgreich erstellt.",
      })
      router.push("/calendar")
    } catch (err: any) {
      setError(err?.message || "Registrierung fehlgeschlagen.")
      setIsLoading(false)
    }
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
          {error && (
            <div className="mb-4 text-sm text-red-600 text-center" role="alert">
              {error}
            </div>
          )}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <span>
                  <svg className="animate-spin h-4 w-4 mr-2 inline-block text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Registrierung läuft...
                </span>
              ) : "Registrieren"}
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
