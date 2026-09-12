export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
};

export async function listGoogleCalendarEvents(
  accessToken: string,
  { timeMin, timeMax }: { timeMin: Date; timeMax: Date },
) {
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  );
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "250");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google Calendar list failed: ${await res.text()}`);
  }

  const data = (await res.json()) as { items: GoogleCalendarEvent[] };
  return data.items ?? [];
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    title: string;
    startTime: string; // ISO datetime
    endTime?: string | null;
    location?: string | null;
  },
) {
  const end = event.endTime ?? new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000).toISOString();

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.title,
        location: event.location ?? undefined,
        start: { dateTime: event.startTime },
        end: { dateTime: end },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Google Calendar create failed: ${await res.text()}`);
  }

  return (await res.json()) as GoogleCalendarEvent;
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  // 410 Gone means it's already deleted on Google's side — fine either way.
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Google Calendar delete failed: ${await res.text()}`);
  }
}
