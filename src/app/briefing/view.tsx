import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Frame from "../frame";
import { Panel, PanelEmpty } from "../panel";

export default async function BriefingView({ date }: { date: string | null }) {
  const supabase = await createClient();

  const { data: recent } = await supabase
    .from("briefings")
    .select("briefing_date, title")
    .order("briefing_date", { ascending: false })
    .limit(14);

  const targetDate = date ?? recent?.[0]?.briefing_date ?? null;

  if (!targetDate) {
    return (
      <Frame wide>
        <h1 className="mb-6 text-2xl text-ink">Briefing</h1>
        <Panel title="briefing">
          <PanelEmpty>No briefing yet</PanelEmpty>
        </Panel>
      </Frame>
    );
  }

  const { data: briefing } = await supabase
    .from("briefings")
    .select("title")
    .eq("briefing_date", targetDate)
    .maybeSingle();

  if (!briefing) notFound();

  return (
    <Frame wide>
      <h1 className="mb-1 text-2xl text-ink">{briefing.title}</h1>
      <p className="nums mb-6 text-ink-faint">{targetDate}</p>

      <iframe
        title={`Briefing for ${targetDate}`}
        src={`/briefing/raw/${targetDate}`}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        className="briefing-frame"
      />

      <Panel title="past briefings">
        {recent?.map((b) => (
          <Link href={`/briefing/${b.briefing_date}`} className="row" key={b.briefing_date}>
            <span className="nums meta shrink-0">{b.briefing_date}</span>
            <span
              className={`title ${b.briefing_date === targetDate ? "text-oxblood-bright" : ""}`}
            >
              {b.title}
            </span>
          </Link>
        ))}
      </Panel>
    </Frame>
  );
}
