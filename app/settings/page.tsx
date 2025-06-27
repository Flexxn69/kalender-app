"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { BellRing, Calendar, Globe, Lock, LogOut, Moon, User } from "lucide-react"
import { useTheme } from "next-themes"
import { useUser } from "@/contexts/UserContext"

export default function SettingsPage() {
  const { userProfile, updateProfile, logout: userLogout } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // States für Profile, Notifications, Appearance, Account
  const [profile, setProfile] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("profile")
      if (saved) return JSON.parse(saved)
    }
    return {
      name: userProfile?.name || "Max Mustermann",
      email: userProfile?.email || "max@beispiel.de",
      phone: userProfile?.phone || "+49 123 456789",
      status: userProfile?.status || "online",
      bio: userProfile?.bio || "Projektmanager mit Schwerpunkt auf Marketing und Produktentwicklung.",
      avatar: userProfile?.avatar || "/placeholder.svg?height=96&width=96",
    }
  })

  const [notifications, setNotifications] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notifications")
      if (saved) return JSON.parse(saved)
    }
    return {
      reminderEnabled: true,
      newEventsEnabled: true,
      eventChangesEnabled: true,
      newMessagesEnabled: true,
      mentionsEnabled: true,
      newMembersEnabled: true,
      groupChangesEnabled: false,
    }
  })

  const [appearance, setAppearance] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("appearance")
      if (saved) return JSON.parse(saved)
    }
    return {
      defaultView: "month",
      weekStart: "monday",
      showWeekends: true,
      language: "de",
      timeFormat: "24h",
    }
  })

  const [account, setAccount] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("account")
      if (saved) return JSON.parse(saved)
    }
    return {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      twoFactorEnabled: false,
      shareOnlineStatus: true,
      readReceipts: true,
    }
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("profile")
      if (saved) setProfile(JSON.parse(saved))
      const savedNotifications = localStorage.getItem("notifications")
      if (savedNotifications) setNotifications(JSON.parse(savedNotifications))
      const savedAppearance = localStorage.getItem("appearance")
      if (savedAppearance) setAppearance(JSON.parse(savedAppearance))
      const savedAccount = localStorage.getItem("account")
      if (savedAccount) setAccount(JSON.parse(savedAccount))
    }
  }, [])

  // Hilfsfunktionen
  const handleProfileChange = (field, value) => setProfile((prev) => ({ ...prev, [field]: value }))
  const handleNotificationsChange = (field, value) => setNotifications((prev) => ({ ...prev, [field]: value }))
  const handleAppearanceChange = (field, value) => setAppearance((prev) => ({ ...prev, [field]: value }))
  const handleAccountChange = (field, value) => setAccount((prev) => ({ ...prev, [field]: value }))

  // Speichern
  const handleSaveProfile = () => {
    updateProfile?.(profile)
    localStorage.setItem("profile", JSON.stringify(profile))
    toast({ title: "Profil gespeichert", description: "Ihre Profiländerungen wurden erfolgreich gespeichert." })
  }
  const handleSaveNotifications = () => {
    localStorage.setItem("notifications", JSON.stringify(notifications))
    toast({ title: "Benachrichtigungseinstellungen gespeichert", description: "Ihre Benachrichtigungseinstellungen wurden aktualisiert." })
  }
  const handleSaveAppearance = () => {
    localStorage.setItem("appearance", JSON.stringify(appearance))
    toast({ title: "Erscheinungsbild gespeichert", description: "Ihre Einstellungen zum Erscheinungsbild wurden aktualisiert." })
  }
  const handleSaveAccount = () => {
    if (account.newPassword && account.newPassword !== account.confirmPassword) {
      toast({ title: "Fehler", description: "Die Passwörter stimmen nicht überein.", variant: "destructive" })
      return
    }
    localStorage.setItem("account", JSON.stringify(account))
    toast({ title: "Kontoeinstellungen gespeichert", description: "Ihre Kontoeinstellungen wurden aktualisiert." })
  }

  // Avatar
  const handleAvatarClick = () => fileInputRef.current?.click()
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        // ev.target.result ist die Data-URL
        handleProfileChange("avatar", ev.target.result)
        toast({ title: "Profilbild aktualisiert", description: "Ihr Profilbild wurde erfolgreich aktualisiert." })
      }
      reader.readAsDataURL(file)
    }
  }

  // Logout mit Bestätigungsdialog
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const handleLogout = () => setShowLogoutDialog(true)
  const handleConfirmLogout = () => {
    // LocalStorage-Daten löschen
    localStorage.removeItem("profile")
    localStorage.removeItem("notifications")
    localStorage.removeItem("appearance")
    localStorage.removeItem("account")
    // Kontext/Backend-Logout, falls vorhanden
    if (typeof userLogout === "function") userLogout()
    setShowLogoutDialog(false)
    toast({ title: "Abgemeldet", description: "Sie wurden erfolgreich abgemeldet." })
    router.push("/")
  }
  const handleCancelLogout = () => setShowLogoutDialog(false)

  return (
    <div className="container py-6 md:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Einstellungen</h1>
      </div>
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-2"><User className="h-4 w-4" /><span className="hidden sm:inline">Profil</span></TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2"><BellRing className="h-4 w-4" /><span className="hidden sm:inline">Benachrichtigungen</span></TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2"><Moon className="h-4 w-4" /><span className="hidden sm:inline">Erscheinungsbild</span></TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2"><Lock className="h-4 w-4" /><span className="hidden sm:inline">Konto</span></TabsTrigger>
        </TabsList>

        {/* --- PROFIL --- */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Verwalten Sie Ihre Profilinformationen und Verfügbarkeitsstatus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                  <AvatarImage src={profile.avatar || "/placeholder.svg"} />
                  <AvatarFallback>
                    {profile.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <div className="space-y-2">
                  <Button size="sm" onClick={handleAvatarClick}>Bild ändern</Button>
                  <p className="text-sm text-muted-foreground">JPG, GIF oder PNG. Maximal 2 MB.</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={profile.name} onChange={e => handleProfileChange("name", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input id="email" type="email" value={profile.email} onChange={e => handleProfileChange("email", e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" value={profile.phone} onChange={e => handleProfileChange("phone", e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md">
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      profile.status === "online"
                        ? "bg-green-500"
                        : profile.status === "busy"
                          ? "bg-red-500"
                          : profile.status === "away"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                    }`} />
                    <span>
                      {profile.status === "online"
                        ? "Verfügbar"
                        : profile.status === "busy"
                          ? "Beschäftigt"
                          : profile.status === "away"
                            ? "Abwesend"
                            : "Offline"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">(Wird automatisch basierend auf Ihren Terminen gesetzt)</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">Über mich</Label>
                <textarea
                  id="bio"
                  className="min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Erzählen Sie etwas über sich..."
                  value={profile.bio}
                  onChange={e => handleProfileChange("bio", e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveProfile}>Speichern</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- BENACHRICHTIGUNGEN --- */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Benachrichtigungen</CardTitle>
              <CardDescription>Konfigurieren Sie, wie und wann Sie benachrichtigt werden möchten.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Kalender</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Terminerinnerungen</Label>
                      <p className="text-sm text-muted-foreground">Erhalten Sie Erinnerungen für bevorstehende Termine.</p>
                    </div>
                    <Switch checked={notifications.reminderEnabled} onCheckedChange={checked => handleNotificationsChange("reminderEnabled", checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Neue Termine</Label>
                      <p className="text-sm text-muted-foreground">Benachrichtigungen, wenn neue Termine zu Ihrem Kalender hinzugefügt werden.</p>
                    </div>
                    <Switch checked={notifications.newEventsEnabled} onCheckedChange={checked => handleNotificationsChange("newEventsEnabled", checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Terminänderungen</Label>
                      <p className="text-sm text-muted-foreground">Benachrichtigungen bei Änderungen an bestehenden Terminen.</p>
                    </div>
                    <Switch checked={notifications.eventChangesEnabled} onCheckedChange={checked => handleNotificationsChange("eventChangesEnabled", checked)} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Nachrichten</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Neue Nachrichten</Label>
                      <p className="text-sm text-muted-foreground">Benachrichtigungen bei neuen Nachrichten.</p>
                    </div>
                    <Switch checked={notifications.newMessagesEnabled} onCheckedChange={checked => handleNotificationsChange("newMessagesEnabled", checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Erwähnungen</Label>
                      <p className="text-sm text-muted-foreground">Benachrichtigungen, wenn Sie in einer Nachricht erwähnt werden.</p>
                    </div>
                    <Switch checked={notifications.mentionsEnabled} onCheckedChange={checked => handleNotificationsChange("mentionsEnabled", checked)} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Gruppen</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Neue Gruppenmitglieder</Label>
                      <p className="text-sm text-muted-foreground">Benachrichtigungen, wenn neue Mitglieder einer Gruppe beitreten.</p>
                    </div>
                    <Switch checked={notifications.newMembersEnabled} onCheckedChange={checked => handleNotificationsChange("newMembersEnabled", checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Gruppenänderungen</Label>
                      <p className="text-sm text-muted-foreground">Benachrichtigungen bei Änderungen an Gruppeneinstellungen.</p>
                    </div>
                    <Switch checked={notifications.groupChangesEnabled} onCheckedChange={checked => handleNotificationsChange("groupChangesEnabled", checked)} />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveNotifications}>Speichern</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- ERSCHEINUNGSBILD --- */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Erscheinungsbild</CardTitle>
              <CardDescription>Passen Sie das Aussehen der Anwendung an Ihre Vorlieben an.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Thema</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Light */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`border rounded-md p-2 cursor-pointer hover:border-primary ${theme === "light" ? "border-primary" : ""}`}
                      onClick={() => setTheme("light")}
                    >
                      <div className="w-full h-32 bg-background rounded-md border"></div>
                    </div>
                    <Label className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="theme"
                          className="sr-only"
                          checked={theme === "light"}
                          onChange={() => setTheme("light")}
                        />
                        <div className="h-4 w-4 rounded-full border flex items-center justify-center">
                          <div className={`h-2 w-2 rounded-full ${theme === "light" ? "bg-primary" : ""}`}></div>
                        </div>
                        <span>Hell</span>
                      </div>
                    </Label>
                  </div>
                  {/* Dark */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`border rounded-md p-2 cursor-pointer hover:border-primary ${theme === "dark" ? "border-primary" : ""}`}
                      onClick={() => setTheme("dark")}
                    >
                      <div className="w-full h-32 bg-zinc-950 rounded-md border border-zinc-800"></div>
                    </div>
                    <Label className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="theme"
                          className="sr-only"
                          checked={theme === "dark"}
                          onChange={() => setTheme("dark")}
                        />
                        <div className="h-4 w-4 rounded-full border flex items-center justify-center">
                          <div className={`h-2 w-2 rounded-full ${theme === "dark" ? "bg-primary" : ""}`}></div>
                        </div>
                        <span>Dunkel</span>
                      </div>
                    </Label>
                  </div>
                  {/* System */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`border rounded-md p-2 cursor-pointer hover:border-primary ${theme === "system" ? "border-primary" : ""}`}
                      onClick={() => setTheme("system")}
                    >
                      <div className="w-full h-32 bg-gradient-to-b from-background to-zinc-950 rounded-md border"></div>
                    </div>
                    <Label className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="theme"
                          className="sr-only"
                          checked={theme === "system"}
                          onChange={() => setTheme("system")}
                        />
                        <div className="h-4 w-4 rounded-full border flex items-center justify-center">
                          <div className={`h-2 w-2 rounded-full ${theme === "system" ? "bg-primary" : ""}`}></div>
                        </div>
                        <span>System</span>
                      </div>
                    </Label>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Kalenderansicht</h3>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="default-view">Standardansicht</Label>
                    <Select
                      value={appearance.defaultView}
                      onValueChange={value => handleAppearanceChange("defaultView", value)}
                    >
                      <SelectTrigger id="default-view">
                        <SelectValue placeholder="Standardansicht auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Tag</SelectItem>
                        <SelectItem value="week">Woche</SelectItem>
                        <SelectItem value="month">Monat</SelectItem>
                        <SelectItem value="agenda">Agenda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="week-start">Wochenbeginn</Label>
                    <Select
                      value={appearance.weekStart}
                      onValueChange={value => handleAppearanceChange("weekStart", value)}
                    >
                      <SelectTrigger id="week-start">
                        <SelectValue placeholder="Wochenbeginn auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Montag</SelectItem>
                        <SelectItem value="sunday">Sonntag</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Wochenenden anzeigen</Label>
                      <p className="text-sm text-muted-foreground">Samstag und Sonntag im Kalender anzeigen.</p>
                    </div>
                    <Switch checked={appearance.showWeekends} onCheckedChange={checked => handleAppearanceChange("showWeekends", checked)} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Sprache und Region</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="language">Sprache</Label>
                    <Select
                      value={appearance.language}
                      onValueChange={value => handleAppearanceChange("language", value)}
                    >
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Sprache auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="en">Englisch</SelectItem>
                        <SelectItem value="fr">Französisch</SelectItem>
                        <SelectItem value="es">Spanisch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time-format">Zeitformat</Label>
                    <Select
                      value={appearance.timeFormat}
                      onValueChange={value => handleAppearanceChange("timeFormat", value)}
                    >
                      <SelectTrigger id="time-format">
                        <SelectValue placeholder="Zeitformat auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 Stunden</SelectItem>
                        <SelectItem value="12h">12 Stunden (AM/PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveAppearance}>Speichern</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- KONTO --- */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Konto</CardTitle>
              <CardDescription>Verwalten Sie Ihre Kontoeinstellungen und Sicherheitsoptionen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Passwort ändern</h3>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Aktuelles Passwort</Label>
                    <Input id="current-password" type="password" value={account.currentPassword} onChange={e => handleAccountChange("currentPassword", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">Neues Passwort</Label>
                    <Input id="new-password" type="password" value={account.newPassword} onChange={e => handleAccountChange("newPassword", e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                    <Input id="confirm-password" type="password" value={account.confirmPassword} onChange={e => handleAccountChange("confirmPassword", e.target.value)} />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Zwei-Faktor-Authentifizierung</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>2FA aktivieren</Label>
                    <p className="text-sm text-muted-foreground">Erhöhen Sie die Sicherheit Ihres Kontos mit Zwei-Faktor-Authentifizierung.</p>
                  </div>
                  <Switch checked={account.twoFactorEnabled} onCheckedChange={checked => handleAccountChange("twoFactorEnabled", checked)} />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Datenschutz</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Online-Status teilen</Label>
                      <p className="text-sm text-muted-foreground">Anderen Benutzern Ihren Online-Status anzeigen.</p>
                    </div>
                    <Switch checked={account.shareOnlineStatus} onCheckedChange={checked => handleAccountChange("shareOnlineStatus", checked)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Lesebestätigungen</Label>
                      <p className="text-sm text-muted-foreground">Anderen Benutzern anzeigen, wenn Sie ihre Nachrichten gelesen haben.</p>
                    </div>
                    <Switch checked={account.readReceipts} onCheckedChange={checked => handleAccountChange("readReceipts", checked)} />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="destructive" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Abmelden</Button>
              <Button onClick={handleSaveAccount}>Speichern</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Logout-Bestätigungsdialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-4">Wirklich abmelden?</h2>
            <p className="mb-6 text-muted-foreground">Möchten Sie sich wirklich abmelden?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelLogout}>Abbrechen</Button>
              <Button variant="destructive" onClick={handleConfirmLogout}>Abmelden</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
