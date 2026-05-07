import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nucleo-julia-roberti.vercel.app";

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    const url = getAuthUrl(user.id);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${baseUrl}/agenda?gcal=error`);
  }
}
