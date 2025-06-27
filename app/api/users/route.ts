import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  // Session korrekt holen (App Router)
  const session = await getServerSession(authOptions);
  const currentUserId = session && typeof session.user === "object" && "id" in session.user ? (session.user as any).id : undefined;

  // Query-Parameter für Suche nach E-Mail oder Telefonnummer
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");

  let where: any = {};
  if (email && phone) {
    where = {
      OR: [
        { email: email },
        { phone: phone },
      ],
    };
  } else if (email) {
    where = { email };
  } else if (phone) {
    where = { phone };
  }

  let users;
  if (email || phone) {
    users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true }, // phone entfernt
    });
  } else {
    users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }, // phone entfernt
    });
    // Aktuellen User ausfiltern
    if (currentUserId) users = users.filter((u: {id: string}) => u.id !== currentUserId);
  }
  return NextResponse.json(users);
}
