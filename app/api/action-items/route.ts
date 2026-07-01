import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const item = await prisma.actionItem.create({
    data: {
      occurrenceId: body.occurrenceId,
      meetingId: body.meetingId,
      text: body.text,
      owner: body.owner ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
