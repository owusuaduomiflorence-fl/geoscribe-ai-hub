import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Users, GraduationCap, MessageSquare, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/teacher")({ component: TeacherPortal });

function TeacherPortal() {
  const { isTeacher, loading, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait until roles have loaded (or user has none) before deciding
    if (loading) return;
    if (roles.length > 0 && !isTeacher) {
      toast.error("Teacher access only");
      navigate({ to: "/dashboard" });
    }
  }, [isTeacher, loading, roles, navigate]);

  if (loading || (roles.length > 0 && !isTeacher)) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-muted-foreground">
        Checking access...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center">
          <Users className="h-5 w-5 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-semibold">Teacher Portal</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Tools and resources for educators. You can also access the student portal at any time.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          to="/dashboard"
          icon={GraduationCap}
          title="Open Student Portal"
          desc="Switch to the student-facing dashboard and tools."
        />
        <Card
          to="/chatbot"
          icon={MessageSquare}
          title="Lesson Planning Chat"
          desc="Use the AI tutor to draft lessons, quizzes, and rubrics."
        />
        <Card
          to="/image-generator"
          icon={ImageIcon}
          title="Classroom Visuals"
          desc="Generate diagrams and illustrations for your lessons."
        />
        <Card
          to="/journal"
          icon={Users}
          title="Class Notes"
          desc="Keep teaching notes and resources organized per topic."
        />
      </div>
    </div>
  );
}

function Card({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-border bg-card p-5 hover:bg-card/80 transition-colors shadow-card"
    >
      <Icon className="h-6 w-6 text-primary mb-3" />
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}
