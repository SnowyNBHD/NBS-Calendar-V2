import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAll } from "@/lib/push/send";
import { todayKey } from "@/lib/timezone";
import { errorResult, textResult } from "@/lib/mcp/results";

export function registerBriefingTools(server: McpServer) {
  const admin = createAdminClient();

  server.registerTool(
    "publish_briefing",
    {
      description:
        "Publish today's daily briefing (one self-contained HTML page) to the app and " +
        "notify the owner's devices. Replaces any briefing already published today. " +
        "Do not include scripts or remote images; they will not load.",
      inputSchema: z.object({
        html: z.string().min(1).max(500_000),
        summary: z
          .string()
          .max(200)
          .optional()
          .describe("One line shown as the notification body"),
        title: z.string().max(80).optional(),
      }),
    },
    async ({ html, summary, title }) => {
      try {
        const date = todayKey();
        const { error } = await admin.from("briefings").upsert(
          {
            briefing_date: date,
            title: title ?? "Daily briefing",
            summary: summary ?? null,
            html,
            published_at: new Date().toISOString(),
          },
          { onConflict: "briefing_date" },
        );
        if (error) throw new Error(error.message);

        let notified = 0;
        try {
          notified = await sendPushToAll({
            title: title ?? "Daily briefing",
            body: summary ?? "Your briefing is ready",
            url: "/briefing",
          });
        } catch (pushError) {
          console.error("briefing push failed:", pushError);
        }

        return textResult(`Published briefing for ${date}; notified ${notified} device(s).`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
