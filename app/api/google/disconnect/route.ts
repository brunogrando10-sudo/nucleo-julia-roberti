import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  await supabase.auth.updateUser({
    data: {
      gcal_access_token: null,
      gcal_refresh_token: null,
      gcal_expiry_date: null,
      gcal_connected: false,
    },
  });

  return NextResponse.json({ ok: true });
}
