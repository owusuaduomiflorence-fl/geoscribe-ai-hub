import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageSquare,
  Image as ImageIcon,
  Video,
  BookOpen,
  Info,
  LogOut,
  Globe2,
  Menu,
  X,
  Users,
  GraduationCap,
  ClipboardList,
  Gamepad2,
  FileText,
  School,
  UserCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { displayNameFor } from "@/lib/display-name";
import { Button } from "@/components/ui/button";

const studentLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chatbot", label: "AI Chatbot", icon: MessageSquare },
  { to: "/image-generator", label: "Images", icon: ImageIcon },
  { to: "/video-generator", label: "Videos", icon: Video },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/classes", label: "My Classes", icon: School },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/about", label: "About", icon: Info },
] as const;

const teacherExtraLinks = [
  { to: "/teacher", label: "Teacher Portal", icon: Users },
  { to: "/teacher/classes", label: "Classes", icon: GraduationCap },
  { to: "/teacher/quizzes", label: "Quizzes", icon: ClipboardList },
  { to: "/teacher/worksheets", label: "Worksheets", icon: FileText },
  { to: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, isTeacher, signOut } = useAuth();
  const { data: profile } = useProfile();
  const greetName = displayNameFor(profile, user?.email, "auto", isTeacher ? "Teacher" : "Student");
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = isTeacher ? [...studentLinks, ...teacherExtraLinks] : studentLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex w-full">
      <aside
        className={`${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:sticky inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform`}
      >
        <Link to="/" className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center">
            <Globe2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-lg">Geoguide AI</span>
        </Link>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((l) => {
            const active = path === l.to;
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50"
          >
            <UserCircle className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{greetName}</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email}</div>
            </div>
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
              {isTeacher ? "Teacher" : "Student"}
            </span>
          </Link>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <button
        className="md:hidden fixed top-3 left-3 z-50 h-10 w-10 grid place-items-center rounded-lg bg-card border border-border"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <main className="flex-1 min-w-0 bg-background">{children}</main>
    </div>
  );
}
