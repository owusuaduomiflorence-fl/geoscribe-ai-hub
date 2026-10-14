import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type { Source } from "./rag.server";

export const retrieveKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { retrieve } = await import("./rag.server");
    return retrieve(context.supabase as any, context.userId, data.query, 5);
  });

export const addKnowledgeDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ title: z.string().trim().min(1).max(160), text: z.string().min(20).max(400_000), shared: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let shared = false;
    if (data.shared) {
      const { data: isTeacher } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "teacher" });
      if (!isTeacher) throw new Error("Only teachers can share documents with everyone.");
      shared = true;
    }
    const { insertChunks } = await import("./rag.server");
    const n = await insertChunks(
      { owner_id: context.userId, shared, source_type: "upload", source_title: data.title, source_ref: crypto.randomUUID() },
      data.text,
    );
    return { chunks: n };
  });
