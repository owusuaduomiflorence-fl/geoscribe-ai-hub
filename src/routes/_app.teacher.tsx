import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, GraduationCap, ClipboardList, FileText, BookOpen, MessageSquare } from "lucide-react";
import { TeacherGuard } from "@/components/TeacherGuard";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { displayNameFor } from "@/lib/display-name";

export const Route = createFileRoute("/_app/teacher")({ component: () => <TeacherGuard><Portal /></TeacherGuard> });

function Portal() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const fullName = displayNameFor(profile, user?.email, "full", "Teacher");
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center">
          <Users className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-semibold">Welcome back, {fullName}</h1>
      </div>
      <p className="text-muted-foreground mb-8">Manage classes, build quizzes & worksheets, and grade student work.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card to="/teacher/classes" icon={GraduationCap} title="Classes" desc="Create classes, share join codes, invite students." />
        <Card to="/teacher/quizzes" icon={ClipboardList} title="Quizzes" desc="AI-generate and edit quiz question banks." />
        <Card to="/teacher/worksheets" icon={FileText} title="Worksheets" desc="Generate printable worksheets and answer keys." />
        <Card to="/teacher/assignments" icon={ClipboardList} title="Assignments" desc="Assign quizzes/worksheets to a class and grade." />
        <Card to="/dashboard" icon={BookOpen} title="Student Portal" desc="Switch to student-facing tools and view." />
        <Card to="/chatbot" icon={MessageSquare} title="Lesson Planning Chat" desc="Use the AI tutor to plan lessons." />
      </div>
    </div>
  );
}

function Card({ to, icon: Icon, title, desc }: { to: string; icon: typeof Users; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-border bg-card p-5 hover:bg-card/80 transition-colors shadow-card">
      <Icon className="h-6 w-6 text-primary mb-3" />
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}
