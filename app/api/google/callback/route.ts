import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nucleo-julia-roberti.vercel.app";

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/agenda?gcal=error`);
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    // Salva tokens no user_metadata do Supabase
    await supabase.auth.updateUser({
      data: {
        gcal_access_token: tokens.access_token,
        gcal_refresh_token: tokens.refresh_token,
        gcal_expiry_date: tokens.expiry_date,
        gcal_connected: true,
      },
    });

    return NextResponse.redirect(`${baseUrl}/agenda?gcal=connected`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/agenda?gcal=error`);
  }
}
