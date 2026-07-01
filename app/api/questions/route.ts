import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const q = await prisma.openQuestion.create({
    data: {
      occurrenceId: body.occurrenceId,
      text: body.text,
    },
  });
  return NextResponse.json(q, { status: 201 });
}
