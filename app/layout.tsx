import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SiteHeader } from "@/components/site-header"
import { Toaster } from "@/components/ui/toaster"
import { UserProvider } from "@/contexts/UserContext" // <-- NEU

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Plano - Moderne Terminplanung",
  description: "Verwalten Sie Ihre persönlichen Termine und planen Sie Events mit anderen in einer intuitiven App.",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Fehlerseiten-Logik entfernt, da eigene not-found Seite gelöscht wurde
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <UserProvider>
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
