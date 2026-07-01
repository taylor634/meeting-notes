import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

function extractZoomLink(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/https:\/\/[a-z0-9.]*zoom\.us\/j\/[^\s"<>]+/i);
  return match ? match[0] : null;
}

function extractMeetingId(zoomUrl: string): string | null {
  const match = zoomUrl.match(/zoom\.us\/j\/(\d+)/);
  return match ? match[1] : null;
}

async function getGoogleClient() {
  const integration = await prisma.integration.findUnique({ where: { provider: "google" } });
  if (!integration) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_APP_URL + "/api/auth/google/callback"
  );

  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  });

  // Auto-refresh token if expired
  oauth2Client.on("tokens", async (tokens) => {
    await prisma.integration.update({
      where: { provider: "google" },
      data: {
        accessToken: tokens.access_token ?? integration.accessToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return oauth2Client;
}

export async function POST() {
  const auth = await getGoogleClient();
  if (!auth) return NextResponse.json({ error: "Google not connected" }, { status: 401 });

  const calendar = google.calendar({ version: "v3", auth });

  // Fetch events for the next 60 days
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  const events = data.items ?? [];

  // Match calendar events to recurring meetings by title similarity
  const meetings = await prisma.recurringMeeting.findMany({ where: { archived: false } });

  const updates: { meetingId: string; nextDate: Date; zoomLink?: string; zoomMeetingId?: string }[] = [];

  for (const meeting of meetings) {
    const titleLower = meeting.title.toLowerCase();

    const match = events.find((e) => {
      const eventTitle = (e.summary ?? "").toLowerCase();
      return (
        eventTitle.includes(titleLower) ||
        titleLower.includes(eventTitle) ||
        // fuzzy: check if most words match
        titleLower.split(" ").filter((w) => w.length > 3).some((w) => eventTitle.includes(w))
      );
    });

    if (match) {
      const startDateTime = match.start?.dateTime ?? match.start?.date;
      if (!startDateTime) continue;

      const zoomLink =
        extractZoomLink(match.description) ??
        extractZoomLink(match.location) ??
        extractZoomLink(match.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri);

      updates.push({
        meetingId: meeting.id,
        nextDate: new Date(startDateTime),
        zoomLink: zoomLink ?? undefined,
        zoomMeetingId: zoomLink ? extractMeetingId(zoomLink) ?? undefined : undefined,
      });
    }
  }

  // Apply updates
  for (const u of updates) {
    await prisma.recurringMeeting.update({
      where: { id: u.meetingId },
      data: {
        nextDate: u.nextDate,
        ...(u.zoomLink && { zoomLink: u.zoomLink }),
        ...(u.zoomMeetingId && { zoomMeetingId: u.zoomMeetingId }),
      },
    });
  }

  return NextResponse.json({
    synced: updates.length,
    total: events.length,
    matches: updates.map((u) => ({ meetingId: u.meetingId, nextDate: u.nextDate, zoomLink: u.zoomLink })),
  });
}

export async function GET() {
  const integration = await prisma.integration.findUnique({ where: { provider: "google" } });
  return NextResponse.json({ connected: !!integration });
}
