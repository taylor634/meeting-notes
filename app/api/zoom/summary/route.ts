import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getZoomToken(): Promise<string | null> {
  const integration = await prisma.integration.findUnique({ where: { provider: "zoom" } });
  if (!integration) return null;

  // Refresh token if expired
  if (integration.expiresAt && integration.expiresAt < new Date()) {
    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken ?? "",
      }),
    });

    const tokens = await res.json();
    if (tokens.access_token) {
      await prisma.integration.update({
        where: { provider: "zoom" },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? integration.refreshToken,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      return tokens.access_token;
    }
    return null;
  }

  return integration.accessToken;
}

// GET /api/zoom/summary?meetingId=xxx
export async function GET(req: NextRequest) {
  const meetingId = req.nextUrl.searchParams.get("meetingId");
  if (!meetingId) return NextResponse.json({ error: "meetingId required" }, { status: 400 });

  const token = await getZoomToken();
  if (!token) return NextResponse.json({ error: "Zoom not connected" }, { status: 401 });

  const res = await fetch(
    `https://api.zoom.us/v2/meetings/${meetingId}/meeting_summary`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err.message ?? "Zoom API error", code: res.status }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

// POST /api/zoom/summary — import summary into an occurrence
export async function POST(req: NextRequest) {
  const { occurrenceId, meetingId } = await req.json();

  const token = await getZoomToken();
  if (!token) return NextResponse.json({ error: "Zoom not connected" }, { status: 401 });

  const res = await fetch(
    `https://api.zoom.us/v2/meetings/${meetingId}/meeting_summary`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err.message ?? "Zoom API error" }, { status: res.status });
  }

  const zoomData = await res.json();

  // Extract summary bullets from Zoom AI Companion format
  const summaryText: string = zoomData.summary_overview ?? zoomData.summary ?? "";
  const nextSteps: string[] = zoomData.next_steps ?? [];
  const topics: { title: string; summary: string }[] = zoomData.summary_details ?? [];

  // Build notes from Zoom data
  let notes = "";
  if (summaryText) notes += `## Meeting Overview\n${summaryText}\n\n`;
  if (topics.length > 0) {
    notes += "## Topics Discussed\n";
    topics.forEach((t) => {
      notes += `### ${t.title}\n${t.summary}\n\n`;
    });
  }

  // Build summary bullets
  const summaryBullets: string[] = [];
  if (summaryText) {
    summaryText.split(/\.\s+/).filter(Boolean).slice(0, 4).forEach((s) => summaryBullets.push(s.trim()));
  }

  // Build action items from next steps
  const actionItems = nextSteps.map((step: string) => ({
    text: step,
    owner: null as string | null,
  }));

  // Try to extract owner from "Owner: name" or "name to do X" patterns
  const ownerPattern = /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:to|will|should)\s+/;
  actionItems.forEach((item) => {
    const match = item.text.match(ownerPattern);
    if (match) item.owner = match[1];
  });

  // Update the occurrence
  await prisma.meetingOccurrence.update({
    where: { id: occurrenceId },
    data: {
      notes: notes || undefined,
      summary: summaryBullets.length > 0 ? JSON.stringify(summaryBullets) : undefined,
    },
  });

  // Create action items
  if (actionItems.length > 0) {
    const occurrence = await prisma.meetingOccurrence.findUnique({
      where: { id: occurrenceId },
      select: { meetingId: true },
    });
    if (occurrence) {
      await prisma.actionItem.createMany({
        data: actionItems.map((item) => ({
          occurrenceId,
          meetingId: occurrence.meetingId,
          text: item.text,
          owner: item.owner,
        })),
      });
    }
  }

  return NextResponse.json({
    imported: true,
    summaryBullets: summaryBullets.length,
    actionItems: actionItems.length,
    notesLength: notes.length,
  });
}
