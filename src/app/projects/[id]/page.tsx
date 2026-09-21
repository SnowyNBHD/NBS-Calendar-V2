import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addProjectItem,
  deleteProjectItem,
  setProjectItemDone,
  updateProject,
} from "@/lib/actions/projects";
import { APP_TIMEZONE } from "@/lib/timezone";
import Frame from "../../frame";
import { Panel, PanelEmpty } from "../../panel";

export default async function ProjectDetailPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const [{ data: todo }, { data: done }] = await Promise.all([
    supabase
      .from("project_items")
      .select("id, content")
      .eq("project_id", id)
      .eq("is_done", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_items")
      .select("id, content, done_at")
      .eq("project_id", id)
      .eq("is_done", true)
      .order("done_at", { ascending: false }),
  ]);

  return (
    <Frame>
      <Link href="/projects" className="mb-4 inline-block text-ink-faint hover:text-oxblood-bright">
        ← projects
      </Link>
      <h1 className="mb-6 text-2xl text-ink">{project.name}</h1>

      <form action={updateProject.bind(null, id)} className="mb-6 flex flex-col gap-2">
        <input name="name" defaultValue={project.name} required className="field" />
        <textarea
          name="description"
          defaultValue={project.description}
          rows={5}
          placeholder="description..."
          className="field"
        />
        <button type="submit" className="btn self-start">
          Save details
        </button>
      </form>

      <form action={addProjectItem.bind(null, id)} className="mb-6 flex gap-2">
        <input name="content" placeholder="new to-do..." required className="field flex-1" />
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      <Panel title="to do" count={todo?.length ? String(todo.length).padStart(2, "0") : "00"}>
        {todo?.length ? (
          todo.map((item) => (
            <div className="row" key={item.id}>
              <form action={setProjectItemDone.bind(null, id, item.id, true)}>
                <button type="submit" aria-label="mark done" className="toggle-box" />
              </form>
              <span className="title">{item.content}</span>
              <form action={deleteProjectItem.bind(null, id, item.id)}>
                <button type="submit" aria-label="delete" className="icon-btn">
                  ✕
                </button>
              </form>
            </div>
          ))
        ) : (
          <PanelEmpty>nothing left</PanelEmpty>
        )}
      </Panel>

      <Panel title="done" count={done?.length ? String(done.length).padStart(2, "0") : "00"}>
        {done?.length ? (
          done.map((item) => (
            <div className="row" key={item.id}>
              <form action={setProjectItemDone.bind(null, id, item.id, false)}>
                <button type="submit" aria-label="mark not done" className="toggle-box checked" />
              </form>
              <span className="title text-ink-faint line-through">{item.content}</span>
              {item.done_at ? (
                <span className="nums meta">
                  {new Date(item.done_at).toLocaleDateString([], {
                    month: "numeric",
                    day: "numeric",
                    timeZone: APP_TIMEZONE,
                  })}
                </span>
              ) : null}
              <form action={deleteProjectItem.bind(null, id, item.id)}>
                <button type="submit" aria-label="delete" className="icon-btn">
                  ✕
                </button>
              </form>
            </div>
          ))
        ) : (
          <PanelEmpty>nothing done yet</PanelEmpty>
        )}
      </Panel>
    </Frame>
  );
}
