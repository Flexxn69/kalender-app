"use client"
"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function NotFoundPage() {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-8">
      <h1 className="text-3xl font-bold mb-4">Seite nicht gefunden</h1>
      <p className="mb-6 text-muted-foreground">Die angeforderte Seite existiert nicht oder wurde verschoben.</p>
      <Button onClick={() => router.push("/")}>Zurück zur Startseite</Button>
    </div>
  )
}
