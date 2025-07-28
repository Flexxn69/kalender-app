"use client"
export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 p-8">
      <h1 className="text-3xl font-bold mb-4">Seite nicht gefunden</h1>
      <p className="mb-6 text-muted-foreground">Die angeforderte Seite existiert nicht oder wurde verschoben.</p>
      <a href="/" className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium">Zurück zur Startseite</a>
    </div>
  )
}
