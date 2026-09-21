import { notFound } from "next/navigation";
import { isBriefingDate } from "@/lib/briefing/prepare";
import BriefingView from "../view";

export default async function BriefingDatePage(props: PageProps<"/briefing/[date]">) {
  const { date } = await props.params;
  if (!isBriefingDate(date)) notFound();
  return <BriefingView date={date} />;
}
