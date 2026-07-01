import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.text !== undefined) data.text = body.text;
  if (body.resolved !== undefined) {
    data.resolved = body.resolved;
    data.resolution = body.resolution ?? null;
    data.resolvedAt = body.resolved ? new Date() : null;
  }

  const q = await prisma.openQuestion.update({ where: { id }, data });
  return NextResponse.json(q);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.openQuestion.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
