import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET /api/events/all-for-user?userId=xyz
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId erforderlich' }, { status: 400 });
  }

  // Dummy-Events für Dummy-User
  const DUMMY_EVENTS: Record<string, any[]> = {
    "user-1": [
      {
        id: "event-1",
        userId: "user-1",
        title: "Dummy-Event",
        date: new Date().toISOString().slice(0, 10),
        startTime: "09:00",
        endTime: "10:00",
        description: "Testevent",
        category: "Meeting",
        sharedWith: ["user-1"],
        isGroupEvent: false
      }
    ],
    "user-2": []
  };
  if (userId in DUMMY_EVENTS) {
    return NextResponse.json(DUMMY_EVENTS[userId]);
  }

  const session = await getServerSession(req, authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  try {
    const events = await prisma.event.findMany({
      where: { userId },
      orderBy: { start: 'asc' },
    });
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Laden der Termine' }, { status: 500 });
  }
}
