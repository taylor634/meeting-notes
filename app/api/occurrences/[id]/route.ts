import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const occ = await prisma.meetingOccurrence.findUnique({
    where: { id },
    include: {
      meeting: true,
      actionItems: { orderBy: { createdAt: "asc" } },
      questions: { orderBy: { createdAt: "asc" } },
      decisions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!occ) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(occ);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.notes !== undefined) data.notes = body.notes;
  if (body.summary !== undefined) data.summary = JSON.stringify(body.summary);
  if (body.status !== undefined) data.status = body.status;
  if (body.title !== undefined) data.title = body.title;
  if (body.date !== undefined) data.date = new Date(body.date);

  const occ = await prisma.meetingOccurrence.update({ where: { id }, data });
  return NextResponse.json(occ);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.meetingOccurrence.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
