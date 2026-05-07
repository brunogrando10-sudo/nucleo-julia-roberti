import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/google/calendar";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const userId = searchParams.get("state"); // userId passado no state

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nucleo-julia-roberti.vercel.app";

  if (error || !code || !userId) {
    console.error("GCal callback error:", { error, hasCode: !!code, hasUserId: !!userId });
    return NextResponse.redirect(`${baseUrl}/agenda?gcal=error`);
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    // Usa service role para atualizar user_metadata sem depender de cookies
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        gcal_access_token: tokens.access_token,
        gcal_refresh_token: tokens.refresh_token,
        gcal_expiry_date: tokens.expiry_date,
        gcal_connected: true,
      },
    });

    if (updateError) {
      console.error("Failed to save GCal tokens:", updateError);
      return NextResponse.redirect(`${baseUrl}/agenda?gcal=error`);
    }

    return NextResponse.redirect(`${baseUrl}/agenda?gcal=connected`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/agenda?gcal=error`);
  }
}
