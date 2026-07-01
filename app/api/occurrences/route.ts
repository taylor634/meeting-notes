import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/occurrences — create new occurrence, rolling forward open items
export async function POST(req: Request) {
  const body = await req.json();
  const { meetingId, date } = body;

  // Find last occurrence to roll forward items
  const lastOccurrence = await prisma.meetingOccurrence.findFirst({
    where: { meetingId, status: "completed" },
    orderBy: { date: "desc" },
    include: {
      actionItems: { where: { completed: false } },
      questions: { where: { resolved: false } },
    },
  });

  // Create the new occurrence
  const occurrence = await prisma.meetingOccurrence.create({
    data: {
      meetingId,
      date: new Date(date),
      status: "draft",
      notes: "",
    },
  });

  // Roll forward incomplete action items
  if (lastOccurrence?.actionItems.length) {
    await prisma.actionItem.createMany({
      data: lastOccurrence.actionItems.map((ai) => ({
        occurrenceId: occurrence.id,
        meetingId,
        text: ai.text,
        owner: ai.owner,
        dueDate: ai.dueDate,
        rolledFromId: ai.id,
      })),
    });
  }

  // Roll forward unresolved questions
  if (lastOccurrence?.questions.length) {
    await prisma.openQuestion.createMany({
      data: lastOccurrence.questions.map((q) => ({
        occurrenceId: occurrence.id,
        text: q.text,
      })),
    });
  }

  const full = await prisma.meetingOccurrence.findUnique({
    where: { id: occurrence.id },
    include: {
      actionItems: true,
      questions: true,
      decisions: true,
    },
  });

  return NextResponse.json(full, { status: 201 });
}
