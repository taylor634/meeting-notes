import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ZOOM_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_APP_URL + "/api/auth/zoom/callback",
  });

  return NextResponse.redirect(
    `https://zoom.us/oauth/authorize?${params.toString()}`
  );
}
