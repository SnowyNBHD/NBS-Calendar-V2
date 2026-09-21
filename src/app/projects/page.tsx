import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createProject, deleteProject } from "@/lib/actions/projects";
import Frame from "../frame";
import { Panel, PanelEmpty } from "../panel";

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, project_items(is_done)")
    .order("created_at", { ascending: false });

  return (
    <Frame>
      <h1 className="mb-6 text-2xl text-ink">Projects</h1>

      <form action={createProject} className="mb-6 flex gap-2">
        <input
          name="name"
          placeholder="new project..."
          required
          className="field min-w-[200px] flex-1"
        />
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      <Panel
        title="all projects"
        count={projects?.length ? String(projects.length).padStart(2, "0") : "00"}
      >
        {projects?.length ? (
          projects.map((p) => {
            const items: { is_done: boolean }[] = p.project_items ?? [];
            const done = items.filter((i) => i.is_done).length;
            return (
              <div className="row" key={p.id}>
                <Link href={`/projects/${p.id}`} className="title hover:text-oxblood-bright">
                  {p.name}
                </Link>
                <span className="nums meta">
                  {items.length - done} to do / {done} done
                </span>
                <form action={deleteProject.bind(null, p.id)}>
                  <button type="submit" aria-label="delete" className="icon-btn">
                    ✕
                  </button>
                </form>
              </div>
            );
          })
        ) : (
          <PanelEmpty>no projects yet</PanelEmpty>
        )}
      </Panel>
    </Frame>
  );
}
