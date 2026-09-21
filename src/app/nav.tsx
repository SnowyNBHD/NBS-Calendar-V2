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
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-[1rem] sm:px-6 lg:px-8 lg:py-4">
        <span className="order-1 tracking-wide text-ink">NBS.CALENDAR</span>

        <div className="order-3 flex w-full flex-wrap gap-x-4 gap-y-1 text-ink-muted sm:order-2 sm:w-auto sm:gap-x-5">
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
          <Link href="/briefing" className="hover:text-oxblood-bright">
            briefing
          </Link>
        </div>

        <form
          action={captureBrainDump}
          className="order-4 flex w-full gap-2 sm:order-3 sm:w-auto sm:min-w-[200px] sm:flex-1"
        >
          <input
            name="content"
            placeholder="&gt; brain dump..."
            required
            className="field w-full py-1.5 text-[0.95rem]"
          />
        </form>

        <div className="order-2 ml-auto flex items-center gap-4 text-ink-faint sm:order-4 sm:gap-5">
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
