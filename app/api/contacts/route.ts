import { NextRequest, NextResponse } from "next/server"
import { sql } from "../../../lib/db"

// GET: Alle Kontakte eines Nutzers
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 })
  try {
    const contacts = await sql`SELECT * FROM contacts WHERE user_id = ${userId}`
    return NextResponse.json(contacts)
  } catch (e) {
    return NextResponse.json({ error: "Fehler beim Laden der Kontakte" }, { status: 500 })
  }
}

// POST: Kontakt hinzufügen
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, name, email, phone, status } = body
  if (!userId || !name || !email) return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 })
  try {
    const result = await sql`
      INSERT INTO contacts (user_id, name, email, phone, status)
      VALUES (${userId}, ${name}, ${email}, ${phone}, ${status || "online"})
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (e) {
    return NextResponse.json({ error: "Fehler beim Hinzufügen" }, { status: 500 })
  }
}
