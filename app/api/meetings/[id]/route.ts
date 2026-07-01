import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meeting = await prisma.recurringMeeting.findUnique({
    where: { id },
    include: {
      occurrences: {
        orderBy: { date: "desc" },
        include: {
          actionItems: { orderBy: { createdAt: "asc" } },
          questions: { orderBy: { createdAt: "asc" } },
          decisions: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.cadence !== undefined) data.cadence = body.cadence;
  if (body.color !== undefined) data.color = body.color;
  if (body.emoji !== undefined) data.emoji = body.emoji;
  if (body.participants !== undefined) data.participants = JSON.stringify(body.participants);
  if (body.pinned !== undefined) data.pinned = body.pinned;
  if (body.archived !== undefined) data.archived = body.archived;
  if (body.nextDate !== undefined) data.nextDate = body.nextDate ? new Date(body.nextDate) : null;

  const meeting = await prisma.recurringMeeting.update({ where: { id }, data });
  return NextResponse.json(meeting);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.recurringMeeting.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
