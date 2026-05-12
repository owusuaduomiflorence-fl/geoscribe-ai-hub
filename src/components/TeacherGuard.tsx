import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function TeacherGuard({ children }: { children: ReactNode }) {
  const { isTeacher, loading, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (roles.length > 0 && !isTeacher) {
      toast.error("Teacher access only");
      navigate({ to: "/dashboard" });
    }
  }, [isTeacher, loading, roles, navigate]);

  if (loading || (roles.length > 0 && !isTeacher)) {
    return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Checking access...</div>;
  }
  return <>{children}</>;
}
