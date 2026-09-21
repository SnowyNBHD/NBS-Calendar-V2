import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAll } from "@/lib/push/send";
import { errorResult, textResult } from "@/lib/mcp/results";

// What Claude may see: the owner's shared notes, its own recent notes (so it
// does not repeat itself) and every unresolved question. Private notes and
// resolved questions are never returned.
export async function fetchNotesForClaude(admin: SupabaseClient) {
  const [yours, fromClaude, questions] = await Promise.all([
    admin
      .from("notes")
      .select("id, title, body, updated_at")
      .eq("author", "user")
      .eq("kind", "note")
      .eq("visibility", "shared")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("notes")
      .select("id, title, body, created_at")
      .eq("author", "claude")
      .eq("kind", "note")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("notes")
      .select("id, title, body, answer")
      .eq("kind", "question")
      .is("resolved_at", null)
      .order("created_at", { ascending: true }),
  ]);

  for (const result of [yours, fromClaude, questions]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    yours: yours.data,
    from_claude: fromClaude.data,
    questions: (questions.data ?? []).map((q) => ({
      id: q.id as string,
      title: q.title as string,
      question: q.body as string,
      answer: q.answer as string | null,
      status: q.answer ? ("answered" as const) : ("open" as const),
    })),
  };
}

export function registerNoteTools(server: McpServer) {
  const admin = createAdminClient();

  server.registerTool(
    "create_note",
    {
      description:
        "Leave the owner a note on the Notes page (an FYI, a summary, something to remember). " +
        "Use ask_question instead when you need an answer.",
      inputSchema: z.object({
        title: z.string().max(120).optional(),
        body: z.string().min(1).max(10_000),
      }),
    },
    async ({ title, body }) => {
      try {
        const { data, error } = await admin
          .from("notes")
          .insert({ author: "claude", kind: "note", title: title ?? "", body })
          .select("id")
          .single();
        if (error) throw new Error(error.message);

        return textResult(`Left a note (id: ${data.id}).`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "ask_question",
    {
      description:
        "Ask the owner a question on the Notes page and send them a push notification. Their " +
        "answer appears in get_context under notes.questions (status 'answered'); once you have " +
        "acted on it, call resolve_question. Only ask when you are genuinely blocked or unsure.",
      inputSchema: z.object({
        question: z.string().min(1).max(2_000),
        title: z.string().max(120).optional(),
      }),
    },
    async ({ question, title }) => {
      try {
        const { data, error } = await admin
          .from("notes")
          .insert({ author: "claude", kind: "question", title: title ?? "", body: question })
          .select("id")
          .single();
        if (error) throw new Error(error.message);

        let notified = 0;
        try {
          notified = await sendPushToAll({
            title: "Claude has a question",
            body: question.length > 120 ? `${question.slice(0, 117)}...` : question,
            url: "/notes",
          });
        } catch (pushError) {
          console.error("question push failed:", pushError);
        }

        return textResult(
          `Asked the question (id: ${data.id}); notified ${notified} device(s). The answer will ` +
            "appear in get_context under notes.questions.",
        );
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "resolve_question",
    {
      description:
        "Mark a question resolved after you have acted on the owner's answer (or no longer need " +
        "it). Resolved questions disappear from get_context.",
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await admin
          .from("notes")
          .update({ resolved_at: now, updated_at: now })
          .eq("id", id)
          .eq("kind", "question")
          .select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) throw new Error(`No question with id ${id}`);

        return textResult(`Resolved question ${id}.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
