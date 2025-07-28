import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function POST(req: NextRequest) {
  const { name, email, password, phone } = await req.json();

  // Prüfe, ob der Nutzer schon existiert
  const existing = await sql`SELECT * FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "E-Mail existiert bereits" }, { status: 400 });
  }

  // Nutzer anlegen (Supabase/Postgres)
  const result = await sql`
    INSERT INTO users (name, email, password, phone)
    VALUES (${name}, ${email}, ${password}, ${phone})
    RETURNING *
  `;
  return NextResponse.json(result[0]);
}