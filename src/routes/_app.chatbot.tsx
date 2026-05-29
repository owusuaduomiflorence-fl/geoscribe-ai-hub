import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Send, Plus, MessageSquare, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/chatbot")({
  component: Chatbot,
  head: () => ({
    meta: [
      { title: "AI Geography Tutor — Geoguide AI" },
      { name: "description", content: "Chat with a GES-aligned AI geography tutor and get clear, syllabus-grounded answers anytime." },
      { property: "og:title", content: "AI Geography Tutor — Geoguide AI" },
      { property: "og:description", content: "Conversational AI tutor grounded in the GES geography syllabus." },
      { property: "og:url", content: "https://geoscribe-ai-hub.lovable.app/chatbot" },
    ],
    links: [{ rel: "canonical", href: "https://geoscribe-ai-hub.lovable.app/chatbot" }],
  }),
});

type Msg = { role: "user" | "assistant"; content: string };

function Chatbot() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .then(({ data }) => {
        setMessages(
          (data ?? [])
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
        );
      });
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const newChat = () => {
    setConversationId(null);
    setMessages([]);
  };

  const send = async () => {
    if (!input.trim() || streaming || !user) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);

    let convId = conversationId;
    if (!convId) {
      const { data: c, error } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title: userMsg.content.slice(0, 60) })
        .select()
        .single();
      if (error || !c) {
        toast.error("Could not start chat");
        setStreaming(false);
        return;
      }
      convId = c.id;
      setConversationId(c.id);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    }

    await supabase
      .from("messages")
      .insert({ conversation_id: convId, user_id: user.id, role: "user", content: userMsg.content });

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    let assistant = "";

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || "Chat failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              assistant += c;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      if (assistant) {
        await supabase
          .from("messages")
          .insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: assistant });
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convId);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat error");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Conversation list */}
      <div className="hidden lg:flex w-72 flex-col border-r border-border bg-card/40">
        <div className="p-4 border-b border-border">
          <Button onClick={newChat} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-1" /> New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(conversations ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setConversationId(c.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-accent/30 ${
                conversationId === c.id ? "bg-accent/40" : ""
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-6 py-4">
          <h1 className="font-semibold">AI Geography Tutor</h1>
          <p className="text-xs text-muted-foreground">
            GES-aligned · ask anything about geography
          </p>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="max-w-xl mx-auto text-center text-muted-foreground mt-12">
              <div className="text-2xl font-display font-semibold text-foreground">
                What would you like to learn?
              </div>
              <p className="text-sm mt-2">
                Try: "Explain the climate of Ghana" or "What is the difference between weathering
                and erosion?"
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-table:my-2 prose-th:bg-muted/30 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-th:border prose-td:border prose-th:border-border prose-td:border-border prose-a:text-primary prose-a:underline">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {streaming && messages[messages.length - 1]?.role === "user" && (
            <div className="flex"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          )}
        </div>
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a geography question..."
              aria-label="Ask a geography question"
              className="flex-1 rounded-lg bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={send} disabled={streaming || !input.trim()} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
