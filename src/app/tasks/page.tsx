import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/timezone";
import { createTask, deleteTask, setTaskStatus } from "@/lib/actions/tasks";
import Frame from "../frame";
import { Panel, PanelEmpty } from "../panel";
import { Chip } from "../chip";

// Due dates default to 11:59 PM ("due that day"), so the time is only worth
// showing when it is something else.
function dueLabel(iso: string) {
  const due = new Date(iso);
  const date = due.toLocaleDateString([], { month: "numeric", day: "numeric", timeZone: APP_TIMEZONE });
  const time = due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE });
  return time === "11:59 PM" ? date : `${date}, ${time}`;
}

export default async function TasksPage() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, priority, due_date")
    .eq("status", "active")
    .order("due_date", { ascending: true, nullsFirst: false });

  return (
    <Frame>
      <h1 className="mb-6 text-2xl text-ink">Tasks</h1>

      <form action={createTask} className="mb-6 flex flex-wrap gap-2">
        <input name="title" placeholder="new task..." required className="field min-w-[200px] flex-1" />
        <input name="due_date" type="datetime-local" className="field" />
        <select name="priority" defaultValue="" className="field">
          <option value="">priority</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      <Panel title="active" count={tasks?.length ? String(tasks.length).padStart(2, "0") : "00"}>
        {tasks?.length ? (
          tasks.map((t) => (
            <div className="row" key={t.id}>
              <form action={setTaskStatus.bind(null, t.id, "done")}>
                <button type="submit" aria-label="mark done" className="toggle-box" />
              </form>
              <span className="title">
                {t.title}
                {t.due_date ? (
                  <span className="nums meta mt-0.5 block sm:ml-2 sm:mt-0 sm:inline">
                    {dueLabel(t.due_date)}
                  </span>
                ) : null}
              </span>
              {t.priority === "high" ? <Chip tone="high">high</Chip> : null}
              {t.priority === "low" ? <Chip tone="low">low</Chip> : null}
              {t.priority === "medium" ? <Chip>medium</Chip> : null}
              <form action={deleteTask.bind(null, t.id)}>
                <button type="submit" aria-label="delete" className="icon-btn">
                  ✕
                </button>
              </form>
            </div>
          ))
        ) : (
          <PanelEmpty>nothing here — brain dump something</PanelEmpty>
        )}
      </Panel>
    </Frame>
  );
}
