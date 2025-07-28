import { NextRequest, NextResponse } from "next/server"
import { sql } from "../../../lib/db"

// GET: Alle Nachrichten für eine Konversation
export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId")
  if (!conversationId) return NextResponse.json({ error: "conversationId fehlt" }, { status: 400 })
  try {
    const messages = await sql`SELECT * FROM messages WHERE conversation_id = ${conversationId} ORDER BY created_at ASC`
    return NextResponse.json(messages)
  } catch (e) {
    return NextResponse.json({ error: "Fehler beim Laden der Nachrichten" }, { status: 500 })
  }
}

// POST: Neue Nachricht senden
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { conversationId, senderId, text } = body
  if (!conversationId || !senderId || !text) return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 })
  try {
    const result = await sql`
      INSERT INTO messages (conversation_id, sender_id, text)
      VALUES (${conversationId}, ${senderId}, ${text})
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (e) {
    return NextResponse.json({ error: "Fehler beim Senden" }, { status: 500 })
  }
}
