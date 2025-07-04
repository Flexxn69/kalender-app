import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// GET: Alle Kontaktanfragen für den eingeloggten User
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  // Erhaltene und gesendete Anfragen
  const requests = await prisma.contactRequest.findMany({
    where: { OR: [{ toId: userId }, { fromId: userId }] },
    include: { from: true, to: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

// POST: Neue Kontaktanfrage senden
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { toId } = await req.json();
  if (!toId) return NextResponse.json({ error: "toId fehlt" }, { status: 400 });
  if (toId === userId) return NextResponse.json({ error: "Kann dich nicht selbst hinzufügen" }, { status: 400 });

  // Prüfen, ob Empfänger ein registrierter User ist
  const userExists = await prisma.user.findUnique({ where: { id: toId } });
  if (!userExists) return NextResponse.json({ error: "Empfänger existiert nicht" }, { status: 404 });

  // Prüfen, ob schon Anfrage existiert
  const existing = await prisma.contactRequest.findFirst({
    where: { fromId: userId, toId, status: "pending" },
  });
  if (existing) return NextResponse.json({ error: "Anfrage existiert bereits" }, { status: 409 });

  const request = await prisma.contactRequest.create({
    data: { fromId: userId, toId },
  });
  return NextResponse.json(request);
}
