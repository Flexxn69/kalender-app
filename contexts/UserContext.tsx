"use client"

import { createContext, useContext, useState, useEffect } from 'react'

interface UserProfile {
  name: string
  email: string
  phone: string
  bio?: string
  avatar?: string
  status?: 'online' | 'busy' | 'away' | 'offline'
}

interface UserContextType {
  userProfile: UserProfile | null
  login: (profile: UserProfile) => void
  logout: () => void
  updateProfile: (profile: Partial<UserProfile>) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    // On mount: check if UserSession exists (API statt LocalStorage)
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/users/me")
        if (res.ok) {
          const user = await res.json()
          setUserProfile(user)
        }
      } catch {}
    }
    fetchSession()
  }, [])

  const login = (profile: UserProfile) => {
    setUserProfile(profile)
    // Optional: Session in DB oder Cookie setzen
  }

  const logout = () => {
    setUserProfile(null)
    // Session in DB oder Cookie löschen
    // AppStore-UserId zurücksetzen
    if (typeof window !== "undefined") {
      try {
        // API-Logout, falls vorhanden
        fetch("/api/users/logout", { method: "POST" })
      } catch {}
    }
    // UI-Store leeren
    if (typeof window !== "undefined") {
      const appStore = require("@/lib/store")
      if (appStore?.useAppStore) {
        try {
          appStore.useAppStore().setCurrentUserId("")
        } catch {}
      }
    }
  }

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev =>
      prev ? { ...prev, ...profile } : null
    )
    // Optional: Update auch per API
  }

  return (
    <UserContext.Provider value={{ userProfile, login, logout, updateProfile }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
