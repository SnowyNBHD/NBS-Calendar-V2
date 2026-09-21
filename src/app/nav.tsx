import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/session";
import { captureBrainDump } from "@/lib/actions/inbox";
import Clock from "./clock";
import NotificationToggle from "./notification-toggle";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { count: openQuestions } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("kind", "question")
    .is("answer", null)
    .is("resolved_at", null);

  return (
    <nav className="border-b border-oxblood-dim">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 text-[0.95rem]">
        <span className="tracking-wide text-ink">NBS.CALENDAR</span>

        <div className="flex flex-wrap gap-4 text-ink-muted">
          <Link href="/today" className="hover:text-oxblood-bright">
            today
          </Link>
          <Link href="/calendar" className="hover:text-oxblood-bright">
            calendar
          </Link>
          <Link href="/tasks" className="hover:text-oxblood-bright">
            tasks
          </Link>
          <Link href="/lists" className="hover:text-oxblood-bright">
            lists
          </Link>
          <Link href="/projects" className="hover:text-oxblood-bright">
            projects
          </Link>
          <Link href="/notes" className="hover:text-oxblood-bright">
            notes
            {openQuestions ? (
              <span className="nums text-oxblood-bright"> ({openQuestions})</span>
            ) : null}
          </Link>
          <Link href="/events" className="hover:text-oxblood-bright">
            events
          </Link>
          <Link href="/inbox" className="hover:text-oxblood-bright">
            inbox
          </Link>
        </div>

        <form action={captureBrainDump} className="order-last flex min-w-[180px] flex-1 gap-2 sm:order-none">
          <input
            name="content"
            placeholder="&gt; brain dump..."
            required
            className="field w-full py-1.5 text-[0.9rem]"
          />
        </form>

        <div className="ml-auto flex items-center gap-5 text-ink-faint">
          <NotificationToggle />
          <Clock />
          <form action={signOut}>
            <button type="submit" className="hover:text-oxblood-bright">
              sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
