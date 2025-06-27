// Dashboard-Startseite (nächste Termine, Geburtstage, Gruppen-Events)
export default function DashboardPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-4">Übersicht</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 bg-card rounded shadow">
          <h2 className="font-semibold mb-2">Nächste Termine</h2>
          {/* TODO: Termine aus Store/API laden */}
          <div className="text-muted-foreground">Keine Termine</div>
        </div>
        <div className="p-4 bg-card rounded shadow">
          <h2 className="font-semibold mb-2">Geburtstage</h2>
          {/* TODO: Geburtstage aus Kontakten laden */}
          <div className="text-muted-foreground">Keine Geburtstage</div>
        </div>
        <div className="p-4 bg-card rounded shadow md:col-span-2">
          <h2 className="font-semibold mb-2">Gruppen-Events</h2>
          {/* TODO: Gruppen-Events */}
          <div className="text-muted-foreground">Keine Gruppen-Events</div>
        </div>
      </div>
    </div>
  )
}
