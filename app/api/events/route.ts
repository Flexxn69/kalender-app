import { NextRequest, NextResponse } from "next/server"
import { sql } from "../../../lib/db"

// GET: Alle Events für einen Nutzer
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 })
  try {
    const events = await sql`SELECT * FROM events WHERE user_id = ${userId} ORDER BY date ASC`
    return NextResponse.json(events)
  } catch (e) {
    return NextResponse.json({ error: "Fehler beim Laden der Events" }, { status: 500 })
  }
}

// POST: Neues Event anlegen
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, title, date, startTime, endTime, description } = body
  if (!userId || !title || !date || !startTime || !endTime) return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 })
  try {
    const result = await sql`
      INSERT INTO events (user_id, title, date, start_time, end_time, description)
      VALUES (${userId}, ${title}, ${date}, ${startTime}, ${endTime}, ${description || ""})
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (e) {
    return NextResponse.json({ error: "Fehler beim Anlegen" }, { status: 500 })
  }
}
