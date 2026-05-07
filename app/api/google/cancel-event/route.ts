import { NextRequest, NextResponse } from "next/server";
import { updateCalendarEvent } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.user_metadata?.gcal_connected) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { gcalEventId } = await request.json();

    const tokens = {
      access_token: user.user_metadata.gcal_access_token,
      refresh_token: user.user_metadata.gcal_refresh_token,
      expiry_date: user.user_metadata.gcal_expiry_date,
    };

    // Marca como cancelado no GCal (mantém histórico)
    await updateCalendarEvent(tokens, gcalEventId, {
      status: "cancelled",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("cancel-event error:", err);
    return NextResponse.json({ error: "Failed to cancel event" }, { status: 500 });
  }
}
