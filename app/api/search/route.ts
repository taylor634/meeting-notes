import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [meetings, actionItems, occurrences] = await Promise.all([
    prisma.recurringMeeting.findMany({
      where: {
        archived: false,
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: 5,
    }),
    prisma.actionItem.findMany({
      where: { text: { contains: q } },
      take: 5,
      include: { occurrence: { include: { meeting: true } } },
    }),
    prisma.meetingOccurrence.findMany({
      where: {
        OR: [
          { notes: { contains: q } },
          { summary: { contains: q } },
        ],
      },
      take: 5,
      include: { meeting: true },
    }),
  ]);

  return NextResponse.json({
    results: {
      meetings,
      actionItems,
      occurrences,
    },
  });
}
