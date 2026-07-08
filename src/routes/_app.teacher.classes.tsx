import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Mail } from "lucide-react";
import { TeacherGuard } from "@/components/TeacherGuard";

export const Route = createFileRoute("/_app/teacher/classes")({ component: () => <TeacherGuard><TeacherClasses /></TeacherGuard> });

function TeacherClasses() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["teacher-classes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [creating, setCreating] = useState(false);
  const create = async () => {
    if (!name.trim()) return toast.error("Enter a class name");
    if (!user) return toast.error("You must be signed in");
    setCreating(true);
    try {
      // Make sure a profile + role row exists (RLS-safe)
      await supabase.rpc("ensure_user_profile", { _display_name: undefined, _role: "teacher" });
      const { data, error } = await supabase
        .from("classes")
        .insert({ name: name.trim(), description: desc.trim() || null, teacher_id: user.id })
        .select()
        .single();
      if (error) throw error;
      setName(""); setDesc("");
      await qc.invalidateQueries({ queryKey: ["teacher-classes"] });
      toast.success(`Class created — join code ${data.join_code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create class");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="font-display text-3xl font-semibold mb-6">Classes</h1>

      <div className="rounded-xl border border-border bg-card p-4 mb-8 space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Class name (e.g. JHS 2 Geography)" />
        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description" rows={2} />
        <Button onClick={create} disabled={!name.trim()}><Plus className="h-4 w-4 mr-1" /> Create class</Button>
      </div>

      <div className="space-y-3">
        {(classes ?? []).map((c) => <ClassCard key={c.id} cls={c} />)}
        {!classes?.length && <div className="text-sm text-muted-foreground">No classes yet.</div>}
      </div>
    </div>
  );
}

function ClassCard({ cls }: { cls: any }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: members } = useQuery({
    queryKey: ["class-members", cls.id],
    queryFn: async () => {
      const { data } = await supabase.from("class_members").select("*").eq("class_id", cls.id);
      return data ?? [];
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["class-invites", cls.id],
    queryFn: async () => {
      const { data } = await supabase.from("class_invites").select("*").eq("class_id", cls.id);
      return data ?? [];
    },
  });

  const copyCode = () => { navigator.clipboard.writeText(cls.join_code); toast.success("Code copied"); };

  const sendInvite = async () => {
    if (!email.trim()) return;
    const { data, error } = await supabase.from("class_invites").insert({ class_id: cls.id, email: email.trim() }).select().single();
    if (error) return toast.error(error.message);
    const link = `${window.location.origin}/auth?invite=${data.token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied — share it with the student");
    setEmail("");
    qc.invalidateQueries({ queryKey: ["class-invites", cls.id] });
  };

  const remove = async () => {
    if (!confirm("Delete this class?")) return;
    await supabase.from("classes").delete().eq("id", cls.id);
    qc.invalidateQueries({ queryKey: ["teacher-classes"] });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{cls.name}</div>
          {cls.description && <div className="text-xs text-muted-foreground">{cls.description}</div>}
        </div>
        <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Join code</span>
        <span className="font-mono font-bold tracking-widest">{cls.join_code}</span>
        <Button variant="ghost" size="sm" onClick={copyCode}><Copy className="h-3 w-3" /></Button>
      </div>

      <div className="mt-4 flex gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" type="email" />
        <Button onClick={sendInvite}><Mail className="h-4 w-4 mr-1" /> Create invite link</Button>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {members?.length ?? 0} student{(members?.length ?? 0) === 1 ? "" : "s"} • {invites?.filter((i) => i.status === "pending").length ?? 0} pending invite(s)
      </div>
    </div>
  );
}
