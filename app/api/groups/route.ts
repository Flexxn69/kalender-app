import { NextRequest, NextResponse } from "next/server"
import { sql } from "../../../lib/db"

// GET: Alle Gruppen eines Nutzers
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 })
  try {
    const groups = await sql`SELECT * FROM groups WHERE members @> ARRAY[${userId}]::varchar[]`
    return NextResponse.json(groups)
  } catch (e) {
    return NextResponse.json({ error: "Fehler beim Laden der Gruppen" }, { status: 500 })
  }
}

// POST: Neue Gruppe anlegen
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, members } = body
  if (!name || !members || !Array.isArray(members)) return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 })
  try {
    const result = await sql`
      INSERT INTO groups (name, description, members)
      VALUES (${name}, ${description || ""}, ${members})
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (e) {
    return NextResponse.json({ error: "Fehler beim Anlegen" }, { status: 500 })
  }
}
