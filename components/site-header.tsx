"use client"

import { MainNav } from "@/components/main-nav"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { CalendarDays, BellRing } from "lucide-react"
import { useUser } from "@/contexts/UserContext"
import { useAppStore } from "@/lib/store"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function SiteHeader() {
  const { userProfile } = useUser()
  const notifications = useAppStore((s) => s.notifications) || []
  const unreadCount = notifications.filter(n => !n.read).length

  // Initialen berechnen
  let initials = ""
  if (userProfile && userProfile.name) {
    const nameParts = userProfile.name.trim().split(" ")
    if (nameParts.length === 1) {
      initials = nameParts[0][0]?.toUpperCase() ?? ""
    } else if (nameParts.length > 1) {
      initials = (nameParts[0][0] ?? "") + (nameParts[nameParts.length - 1][0] ?? "")
      initials = initials.toUpperCase()
    }
  }

  // Dropdown State für Glocke
  const [notifOpen, setNotifOpen] = useState(false);

  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Branding: Link nur für nicht eingeloggte User */}
          {!userProfile ? (
            <Link href="/" className="flex items-center space-x-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Plano</span>
            </Link>
          ) : (
            <div className="flex items-center space-x-2 cursor-default select-none">
              <CalendarDays className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Plano</span>
            </div>
          )}
          <MainNav />
        </div>
        <div className="flex items-center gap-4">
          {/* --- Notification Glocke --- */}
          {userProfile && (
            <div className="relative">
              <button
                className="relative p-2 rounded-full hover:bg-accent transition"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Benachrichtigungen"
              >
                <BellRing className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full text-xs px-1.5 py-0.5 min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {/* Dropdown */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 shadow-lg rounded-lg z-50 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-lg">Benachrichtigungen</h4>
                    <button
                      onClick={() => {
                        useAppStore.getState().markAllNotificationsRead?.()
                        setNotifOpen(false)
                      }}
                      className="text-xs text-blue-700 hover:underline"
                    >
                      Alle als gelesen
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-muted-foreground">Keine Benachrichtigungen</div>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto">
                      {[...notifications]
                        .sort((a, b) =>
                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        .map((n, i) => (
                          <li
                            key={n.id || i}
                            className={`p-2 rounded cursor-pointer ${!n.read ? "bg-blue-50 dark:bg-zinc-800" : ""} hover:bg-blue-100 dark:hover:bg-zinc-700`}
                            onClick={() => {
                              if (n.href) {
                                router.push(n.href)
                              }
                              useAppStore.getState().markNotificationRead?.(n.id)
                              setNotifOpen(false)
                            }}
                          >
                            <div className="font-medium">{n.title}</div>
                            <div className="text-xs text-muted-foreground">{n.description}</div>
                            <div className="text-xs text-zinc-400 mt-1">
                              {n.createdAt && new Date(n.createdAt).toLocaleString()}
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
          <ModeToggle />
          {/* Avatar nur für eingeloggte User */}
          {userProfile && (
            <Link href="/settings">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
