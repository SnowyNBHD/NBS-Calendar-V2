import { createClient } from "@/lib/supabase/server";
import {
  captureBrainDump,
  discardInboxItem,
  triageToEvent,
  triageToListItem,
  triageToTask,
} from "@/lib/actions/inbox";
import Frame from "../frame";
import { Panel, PanelEmpty } from "../panel";

export default async function InboxPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: lists }] = await Promise.all([
    supabase
      .from("brain_dump_inbox")
      .select("id, raw_content, created_at")
      .eq("status", "unprocessed")
      .order("created_at", { ascending: true }),
    supabase.from("lists").select("id, name").order("name"),
  ]);

  return (
    <Frame>
      <h1 className="mb-6 text-2xl text-ink">Brain dump</h1>

      <form action={captureBrainDump} className="mb-6 flex gap-2">
        <input
          name="content"
          placeholder="dump anything here..."
          required
          autoFocus
          className="field flex-1"
        />
        <button type="submit" className="btn">
          Dump
        </button>
      </form>

      <Panel title="unsorted" count={items?.length ? String(items.length).padStart(2, "0") : "00"}>
        {items?.length ? (
          items.map((item) => (
            <div className="row flex-wrap items-center gap-y-2" key={item.id}>
              <form className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  name="content"
                  defaultValue={item.raw_content}
                  className="field min-w-[200px] flex-1"
                />
                {lists?.length ? (
                  <select name="list_id" defaultValue="" className="field">
                    <option value="" disabled>
                      list...
                    </option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input name="start_time" type="datetime-local" className="field" />
                <button formAction={triageToTask.bind(null, item.id)} className="btn text-sm">
                  Task
                </button>
                {lists?.length ? (
                  <button formAction={triageToListItem.bind(null, item.id)} className="btn text-sm">
                    List
                  </button>
                ) : null}
                <button formAction={triageToEvent.bind(null, item.id)} className="btn text-sm">
                  Event
                </button>
                <button
                  formAction={discardInboxItem.bind(null, item.id)}
                  aria-label="discard"
                  className="icon-btn"
                >
                  ✕
                </button>
              </form>
            </div>
          ))
        ) : (
          <PanelEmpty>inbox zero</PanelEmpty>
        )}
      </Panel>
    </Frame>
  );
}
