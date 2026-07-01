import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/settings?error=no_code", req.url));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_APP_URL + "/api/auth/google/callback"
  );

  const { tokens } = await oauth2Client.getToken(code);

  await prisma.integration.upsert({
    where: { provider: "google" },
    create: {
      provider: "google",
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? "",
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope,
    },
    update: {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope,
    },
  });

  return NextResponse.redirect(new URL("/settings?connected=google", req.url));
}
