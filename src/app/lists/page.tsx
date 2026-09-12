import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createList, deleteList } from "@/lib/actions/lists";
import Frame from "../frame";
import { Panel, PanelEmpty } from "../panel";

export default async function ListsPage() {
  const supabase = await createClient();

  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, created_at, list_items(count)")
    .order("created_at", { ascending: false });

  return (
    <Frame>
      <h1 className="mb-6 text-2xl text-ink">Lists</h1>

      <form action={createList} className="mb-6 flex gap-2">
        <input name="name" placeholder="new list..." required className="field min-w-[200px] flex-1" />
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      <Panel title="all lists" count={lists?.length ? String(lists.length).padStart(2, "0") : "00"}>
        {lists?.length ? (
          lists.map((l) => (
            <div className="row" key={l.id}>
              <Link href={`/lists/${l.id}`} className="title hover:text-oxblood-bright">
                {l.name}
              </Link>
              <span className="nums meta">{l.list_items?.[0]?.count ?? 0}</span>
              <form action={deleteList.bind(null, l.id)}>
                <button type="submit" aria-label="delete" className="icon-btn">
                  ✕
                </button>
              </form>
            </div>
          ))
        ) : (
          <PanelEmpty>no lists yet</PanelEmpty>
        )}
      </Panel>
    </Frame>
  );
}
