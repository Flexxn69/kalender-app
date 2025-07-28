// Login-API für Nutzer
export async function loginUser(email: string, password: string) {
  const res = await fetch("/api/users", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) throw new Error("Fehler beim Laden der Nutzer")
  const users = await res.json()
  const user = users.find((u: any) => u.email === email && u.password === password)
  if (!user) throw new Error("E-Mail oder Passwort falsch")
  return user
}
