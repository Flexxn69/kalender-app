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
        {/* Keine Avatar- und Light/Dark-Mode-Buttons mehr */}
      </div>
    </header>
  )
}
