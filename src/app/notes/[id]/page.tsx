import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteNote, updateNote } from "@/lib/actions/notes";
import Frame from "../../frame";
import { Chip } from "../../chip";

export default async function NoteDetailPage(props: PageProps<"/notes/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data: note } = await supabase
    .from("notes")
    .select("id, author, kind, visibility, title, body")
    .eq("id", id)
    .maybeSingle();

  if (!note) notFound();

  return (
    <Frame>
      <Link href="/notes" className="mb-4 inline-block text-ink-faint hover:text-oxblood-bright">
        ← notes
      </Link>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl text-ink">{note.title || "Note"}</h1>
        <Chip tone={note.author === "claude" ? "high" : "default"}>
          {note.author === "claude" ? "claude" : note.visibility === "private" ? "just me" : "you"}
        </Chip>
      </div>

      <form action={updateNote.bind(null, id)} className="mb-6 flex flex-col gap-2">
        <input name="title" defaultValue={note.title} placeholder="title (optional)" className="field" />
        <textarea name="body" defaultValue={note.body} required rows={10} className="field" />
        <div className="flex flex-wrap gap-2">
          {note.author === "user" ? (
            <select name="visibility" defaultValue={note.visibility} className="field">
              <option value="shared">shared with Claude</option>
              <option value="private">just me</option>
            </select>
          ) : null}
          <button type="submit" className="btn">
            Save
          </button>
        </div>
      </form>

      <form action={deleteNote.bind(null, id)}>
        <button type="submit" className="btn">
          Delete note
        </button>
      </form>
    </Frame>
  );
}
