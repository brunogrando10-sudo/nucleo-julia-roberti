import { NextRequest, NextResponse } from "next/server";
import { updateCalendarEvent } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  agendada: "Agendada",
  realizada: "✅ Realizada",
  paga: "💰 Paga",
  cancelada: "❌ Cancelada",
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.user_metadata?.gcal_connected) {
      return NextResponse.json({ error: "Not connected" }, { status: 401 });
    }

    const { gcalEventId, status, patientName, scheduledAt, amount } = await request.json();

    const tokens = {
      access_token: user.user_metadata.gcal_access_token,
      refresh_token: user.user_metadata.gcal_refresh_token,
      expiry_date: user.user_metadata.gcal_expiry_date,
    };

    const descParts = [`Status: ${STATUS_LABELS[status] ?? status}`];
    if (amount) descParts.push(`Valor: ${formatCurrency(amount)}`);
    descParts.push("Gerenciado via Núcleo Julia Roberti");

    await updateCalendarEvent(tokens, gcalEventId, {
      summary: `Sessão – ${patientName} [${STATUS_LABELS[status] ?? status}]`,
      description: descParts.join("\n"),
      startAt: scheduledAt,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("update-event error:", err);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}
