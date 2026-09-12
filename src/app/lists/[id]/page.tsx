import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addListItem, deleteListItem, toggleListItem } from "@/lib/actions/lists";
import Frame from "../../frame";
import { Panel, PanelEmpty } from "../../panel";

export default async function ListDetailPage(props: PageProps<"/lists/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: list } = await supabase
    .from("lists")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!list) notFound();

  const { data: items } = await supabase
    .from("list_items")
    .select("id, content, is_checked")
    .eq("list_id", id)
    .order("sort_order", { ascending: true });

  return (
    <Frame>
      <Link href="/lists" className="mb-4 inline-block text-ink-faint hover:text-oxblood-bright">
        ← lists
      </Link>
      <h1 className="mb-6 text-2xl text-ink">{list.name}</h1>

      <form action={addListItem.bind(null, id)} className="mb-6 flex gap-2">
        <input name="content" placeholder="new item..." required className="field flex-1" />
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      <Panel title="items" count={items?.length ? String(items.length).padStart(2, "0") : "00"}>
        {items?.length ? (
          items.map((item) => (
            <div className="row" key={item.id}>
              <form action={toggleListItem.bind(null, id, item.id, !item.is_checked)}>
                <button
                  type="submit"
                  aria-label="toggle"
                  className={`toggle-box ${item.is_checked ? "checked" : ""}`}
                />
              </form>
              <span className={`title ${item.is_checked ? "text-ink-faint line-through" : ""}`}>
                {item.content}
              </span>
              <form action={deleteListItem.bind(null, id, item.id)}>
                <button type="submit" aria-label="delete" className="icon-btn">
                  ✕
                </button>
              </form>
            </div>
          ))
        ) : (
          <PanelEmpty>empty</PanelEmpty>
        )}
      </Panel>
    </Frame>
  );
}
