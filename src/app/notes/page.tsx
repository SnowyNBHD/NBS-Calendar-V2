import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion, createNote, deleteNote } from "@/lib/actions/notes";
import { APP_TIMEZONE } from "@/lib/timezone";
import Frame from "../frame";
import { Chip } from "../chip";
import { Panel, PanelEmpty } from "../panel";

type NoteRow = {
  id: string;
  author: "user" | "claude";
  kind: "note" | "question";
  visibility: "shared" | "private";
  title: string;
  body: string;
  answer: string | null;
  resolved_at: string | null;
  created_at: string;
};

const count = (n: number) => String(n).padStart(2, "0");

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "numeric", day: "numeric", timeZone: APP_TIMEZONE });

export default async function NotesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("notes")
    .select("id, author, kind, visibility, title, body, answer, resolved_at, created_at")
    .order("created_at", { ascending: false });

  const all = (data ?? []) as NoteRow[];
  const questions = all.filter((n) => n.kind === "question" && !n.resolved_at);
  const resolved = all.filter((n) => n.kind === "question" && n.resolved_at);
  const notes = all.filter((n) => n.kind === "note");

  return (
    <Frame>
      <h1 className="mb-6 text-2xl text-ink">Notes</h1>

      <form action={createNote} className="mb-6 flex flex-col gap-2">
        <input name="title" placeholder="title (optional)" className="field" />
        <textarea name="body" placeholder="leave a note..." required rows={4} className="field" />
        <div className="flex flex-wrap gap-2">
          <select name="visibility" defaultValue="shared" className="field">
            <option value="shared">shared with Claude</option>
            <option value="private">just me</option>
          </select>
          <button type="submit" className="btn">
            Add
          </button>
        </div>
      </form>

      {questions.length ? (
        <Panel title="questions for you" count={count(questions.length)}>
          {questions.map((q) => (
            <div className="row flex-col items-stretch" key={q.id}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {q.title ? <div className="text-ink-muted">{q.title}</div> : null}
                  <div className="whitespace-pre-wrap text-ink">{q.body}</div>
                </div>
                {q.answer ? <Chip>answered</Chip> : null}
                <form action={deleteNote.bind(null, q.id)}>
                  <button type="submit" aria-label="delete" className="icon-btn">
                    ✕
                  </button>
                </form>
              </div>
              <form action={answerQuestion.bind(null, q.id)} className="flex flex-col gap-2">
                <textarea
                  name="answer"
                  defaultValue={q.answer ?? ""}
                  placeholder="your answer..."
                  required
                  rows={2}
                  className="field"
                />
                <button type="submit" className="btn self-start">
                  Send answer
                </button>
              </form>
            </div>
          ))}
        </Panel>
      ) : null}

      <Panel title="notes" count={count(notes.length)}>
        {notes.length ? (
          notes.map((n) => (
            <div className="row" key={n.id}>
              <Chip tone={n.author === "claude" ? "high" : "default"}>
                {n.author === "claude" ? "claude" : n.visibility === "private" ? "just me" : "you"}
              </Chip>
              <Link
                href={`/notes/${n.id}`}
                className="title truncate hover:text-oxblood-bright"
              >
                {n.title || n.body}
              </Link>
              <span className="nums meta">{shortDate(n.created_at)}</span>
            </div>
          ))
        ) : (
          <PanelEmpty>no notes yet</PanelEmpty>
        )}
      </Panel>

      {resolved.length ? (
        <Panel title="resolved" count={count(resolved.length)}>
          {resolved.map((q) => (
            <div className="row flex-col items-stretch text-ink-faint" key={q.id}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 whitespace-pre-wrap">
                  {q.title ? `${q.title}: ` : ""}
                  {q.body}
                </div>
                <form action={deleteNote.bind(null, q.id)}>
                  <button type="submit" aria-label="delete" className="icon-btn">
                    ✕
                  </button>
                </form>
              </div>
              {q.answer ? <div className="whitespace-pre-wrap">answer: {q.answer}</div> : null}
            </div>
          ))}
        </Panel>
      ) : null}
    </Frame>
  );
}
