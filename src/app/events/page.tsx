import { createClient } from "@/lib/supabase/server";
import { createEvent, deleteEvent } from "@/lib/actions/events";
import { APP_TIMEZONE, eventTime } from "@/lib/timezone";
import Frame from "../frame";
import { Panel, PanelEmpty } from "../panel";

export default async function EventsPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_time, location")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  return (
    <Frame>
      <h1 className="mb-6 text-2xl text-ink">Events</h1>

      <form action={createEvent} className="mb-6 flex flex-wrap gap-2">
        <input name="title" placeholder="new event..." required className="field min-w-[200px] flex-1" />
        <input name="start_time" type="datetime-local" required className="field" />
        <input name="location" placeholder="location (optional)" className="field" />
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      <Panel title="upcoming" count={events?.length ? String(events.length).padStart(2, "0") : "00"}>
        {events?.length ? (
          events.map((e) => (
            <div className="row" key={e.id}>
              <span className="nums meta shrink-0">
                {new Date(e.start_time).toLocaleDateString([], {
                  month: "numeric",
                  day: "numeric",
                  timeZone: APP_TIMEZONE,
                })}
                , {eventTime(new Date(e.start_time)).label}
              </span>
              <span className="title">{e.title}</span>
              {e.location ? <span className="meta">{e.location}</span> : null}
              <form action={deleteEvent.bind(null, e.id)}>
                <button type="submit" aria-label="delete" className="icon-btn">
                  ✕
                </button>
              </form>
            </div>
          ))
        ) : (
          <PanelEmpty>nothing upcoming</PanelEmpty>
        )}
      </Panel>
    </Frame>
  );
}
