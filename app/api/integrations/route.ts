import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const integrations = await prisma.integration.findMany();
  const map: Record<string, { connected: boolean; scope?: string | null; expiresAt?: string | null }> = {};
  for (const i of integrations) {
    map[i.provider] = {
      connected: true,
      scope: i.scope,
      expiresAt: i.expiresAt?.toISOString() ?? null,
    };
  }
  return NextResponse.json(map);
}

export async function DELETE(req: Request) {
  const { provider } = await req.json();
  await prisma.integration.deleteMany({ where: { provider } });
  return NextResponse.json({ disconnected: provider });
}
