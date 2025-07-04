import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// PATCH: Anfrage annehmen oder ablehnen
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { action } = await req.json();
  if (!action || !["accept", "reject"].includes(action)) return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  const request = await prisma.contactRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "Anfrage nicht gefunden" }, { status: 404 });
  if (request.toId !== userId) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (request.status !== "pending") return NextResponse.json({ error: "Anfrage bereits bearbeitet" }, { status: 409 });

  if (action === "accept") {
    // Beide als Kontakte speichern
    await prisma.contact.createMany({
      data: [
        { userId: request.fromId, name: "", email: "" },
        { userId: request.toId, name: "", email: "" },
      ],
      skipDuplicates: true,
    });
    await prisma.contactRequest.update({ where: { id: params.id }, data: { status: "accepted" } });
    return NextResponse.json({ status: "accepted" });
  } else {
    await prisma.contactRequest.update({ where: { id: params.id }, data: { status: "rejected" } });
    return NextResponse.json({ status: "rejected" });
  }
}
