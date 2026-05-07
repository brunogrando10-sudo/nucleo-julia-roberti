import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google/calendar";

// Recebe o userId via query param enviado pelo cliente
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nucleo-julia-roberti.vercel.app";

  if (!userId) {
    return NextResponse.redirect(`${baseUrl}/agenda?gcal=error`);
  }

  const url = getAuthUrl(userId);
  return NextResponse.redirect(url);
}
