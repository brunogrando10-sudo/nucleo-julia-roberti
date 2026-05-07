import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.user_metadata?.gcal_connected) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 401 });
    }

    const { patientName, scheduledAt, amount, notes } = await request.json();

    const tokens = {
      access_token: user.user_metadata.gcal_access_token,
      refresh_token: user.user_metadata.gcal_refresh_token,
      expiry_date: user.user_metadata.gcal_expiry_date,
    };

    const descriptionParts = [];
    if (amount) descriptionParts.push(`Valor: ${formatCurrency(amount)}`);
    if (notes) descriptionParts.push(`Obs: ${notes}`);
    descriptionParts.push("Criado via Núcleo Julia Roberti");

    const event = await createCalendarEvent(tokens, {
      summary: `Sessão – ${patientName}`,
      description: descriptionParts.join("\n"),
      startAt: scheduledAt,
      durationMinutes: 50,
    });

    return NextResponse.json({ gcalEventId: event.id });
  } catch (err) {
    console.error("create-event error:", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
