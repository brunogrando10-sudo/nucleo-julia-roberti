import { google } from "googleapis";

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export function getAuthUrl(userId: string) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state: userId, // passa o userId no state para recuperar no callback
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
}

export interface GCalTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export async function getCalendarClient(tokens: GCalTokens) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(tokens);
  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function createCalendarEvent(
  tokens: GCalTokens,
  {
    summary,
    description,
    startAt,
    durationMinutes = 50,
  }: {
    summary: string;
    description?: string;
    startAt: string;
    durationMinutes?: number;
  }
) {
  const calendar = await getCalendarClient(tokens);
  const start = new Date(startAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      description,
      start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
    },
  });

  return event.data;
}

export async function updateCalendarEvent(
  tokens: GCalTokens,
  gcalEventId: string,
  {
    summary,
    description,
    startAt,
    durationMinutes = 50,
    status,
  }: {
    summary?: string;
    description?: string;
    startAt?: string;
    durationMinutes?: number;
    status?: "cancelled" | "confirmed";
  }
) {
  const calendar = await getCalendarClient(tokens);

  const existing = await calendar.events.get({
    calendarId: "primary",
    eventId: gcalEventId,
  });

  const patch: Record<string, unknown> = {};
  if (summary) patch.summary = summary;
  if (description !== undefined) patch.description = description;
  if (status) patch.status = status;

  if (startAt) {
    const start = new Date(startAt);
    const end = new Date(start.getTime() + (durationMinutes ?? 50) * 60 * 1000);
    patch.start = { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" };
    patch.end = { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" };
  }

  const updated = await calendar.events.patch({
    calendarId: "primary",
    eventId: gcalEventId,
    requestBody: { ...existing.data, ...patch },
  });

  return updated.data;
}

export async function deleteCalendarEvent(tokens: GCalTokens, gcalEventId: string) {
  const calendar = await getCalendarClient(tokens);
  await calendar.events.delete({
    calendarId: "primary",
    eventId: gcalEventId,
  });
}
