import { NextRequest, NextResponse } from "next/server";
import { getCalendarClient, GCalTokens } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.user_metadata?.gcal_connected) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 401 });
    }

    const { weekStart, weekEnd } = await request.json();

    const tokens: GCalTokens = {
      access_token: user.user_metadata.gcal_access_token,
      refresh_token: user.user_metadata.gcal_refresh_token,
      expiry_date: user.user_metadata.gcal_expiry_date,
    };

    const calendar = await getCalendarClient(tokens);

    // Busca eventos do GCal na semana
    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: weekStart,
      timeMax: weekEnd,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const events = data.items ?? [];

    // Busca pacientes existentes para tentar associar por nome
    const { data: patients } = await supabase
      .from("patients")
      .select("id, name")
      .eq("active", true);

    // Busca sessões que já têm gcal_event_id para não duplicar
    const { data: existingSessions } = await supabase
      .from("sessions")
      .select("gcal_event_id")
      .gte("scheduled_at", weekStart)
      .lte("scheduled_at", weekEnd)
      .not("gcal_event_id", "is", null);

    const existingGcalIds = new Set(
      (existingSessions ?? []).map((s) => s.gcal_event_id)
    );

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let imported = 0;
    let skipped = 0;
    const newPatients: string[] = [];

    for (const event of events) {
      // Pula eventos sem horário definido (dia inteiro) ou já importados
      if (!event.start?.dateTime || !event.id) {
        skipped++;
        continue;
      }

      if (existingGcalIds.has(event.id)) {
        skipped++;
        continue;
      }

      const eventTitle = event.summary?.trim() ?? "";
      if (!eventTitle) {
        skipped++;
        continue;
      }

      // Tenta associar ao paciente pelo nome (case-insensitive, partial match)
      const matchedPatient = patients?.find((p) =>
        p.name.toLowerCase().includes(eventTitle.toLowerCase()) ||
        eventTitle.toLowerCase().includes(p.name.toLowerCase())
      );

      let patientId = matchedPatient?.id ?? null;

      // Se não encontrou, cria o paciente automaticamente
      if (!patientId) {
        const { data: newPatient } = await supabaseAdmin
          .from("patients")
          .insert({
            name: eventTitle,
            phone: "",
            active: true,
            payment_type: "avulso",
          })
          .select("id")
          .single();

        if (newPatient) {
          patientId = newPatient.id;
          newPatients.push(eventTitle);
          // Adiciona à lista local para próximos eventos
          patients?.push({ id: newPatient.id, name: eventTitle });
        }
      }

      if (!patientId) {
        skipped++;
        continue;
      }

      // Cria a sessão
      await supabaseAdmin.from("sessions").insert({
        patient_id: patientId,
        gcal_event_id: event.id,
        scheduled_at: event.start.dateTime,
        status: "agendada",
        notes: event.description ?? null,
      });

      imported++;
    }

    return NextResponse.json({ imported, skipped, newPatients });
  } catch (err) {
    console.error("import-events error:", err);
    return NextResponse.json({ error: "Failed to import events" }, { status: 500 });
  }
}
