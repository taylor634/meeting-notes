import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const meetings = await prisma.recurringMeeting.findMany({
    where: { archived: false },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    include: {
      occurrences: {
        orderBy: { date: "desc" },
        take: 1,
        include: {
          actionItems: true,
        },
      },
      _count: { select: { occurrences: true } },
    },
  });

  const enriched = await Promise.all(
    meetings.map(async (m) => {
      const outstanding = await prisma.actionItem.count({
        where: { meetingId: m.id, completed: false },
      });
      return { ...m, outstandingActionItems: outstanding };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const meeting = await prisma.recurringMeeting.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      cadence: body.cadence ?? "weekly",
      color: body.color ?? "blue",
      emoji: body.emoji ?? null,
      participants: JSON.stringify(body.participants ?? []),
      nextDate: body.nextDate ? new Date(body.nextDate) : null,
    },
  });
  return NextResponse.json(meeting, { status: 201 });
}
