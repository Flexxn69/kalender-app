"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Users, MessageSquare, Settings, User, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/UserContext"

export function MainNav() {
  const pathname = usePathname()
  const { userProfile } = useUser() // <-- KORREKT!

  console.log("Aktuelles userProfile im MainNav:", userProfile) // Debug

  // Navigation für eingeloggte User
  const navItemsLoggedIn = [
    {
      name: "Kalender",
      href: "/calendar",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      name: "Nachrichten",
      href: "/messages",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      name: "Kontakte",
      href: "/contacts",
      icon: <User className="h-5 w-5" />,
    },
    {
      name: "Einstellungen",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  // Navigation für nicht eingeloggte User
  const navItemsLoggedOut = [
    {
      name: "Home",
      href: "/",
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: "Anmelden",
      href: "/auth/login",
      icon: <User className="h-5 w-5" />,
    },
    {
      name: "Registrieren",
      href: "/auth/register",
      icon: <Users className="h-5 w-5" />,
    },
  ]

  const navItems = userProfile && Object.keys(userProfile).length > 0 ? navItemsLoggedIn : navItemsLoggedOut

  return (
    <nav className="flex items-center space-x-2">
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? "default" : "ghost"}
          size="sm"
          className="h-9"
          asChild
        >
          <Link href={item.href} className="flex items-center gap-1">
            {item.icon}
            <span className="hidden md:inline">{item.name}</span>
          </Link>
        </Button>
      ))}
    </nav>
  )
}
