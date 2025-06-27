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
    // On mount: check if UserSession exists
    const session = localStorage.getItem('userSession')
    if (session) {
      setUserProfile(JSON.parse(session))
    }
  }, [])

  const login = (profile: UserProfile) => {
    setUserProfile(profile)
    localStorage.setItem('userSession', JSON.stringify(profile))
  }

  const logout = () => {
    setUserProfile(null)
    localStorage.removeItem('userSession')
  }

  const updateProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev =>
      prev ? { ...prev, ...profile } : null
    )
    // Update session in localStorage
    const current = userProfile ? { ...userProfile, ...profile } : null
    if (current) localStorage.setItem('userSession', JSON.stringify(current))
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
