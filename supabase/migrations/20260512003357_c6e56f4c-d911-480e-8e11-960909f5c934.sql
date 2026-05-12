
-- ============== generated_videos: add new columns ==============
ALTER TABLE public.generated_videos
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'storyboard',
  ADD COLUMN IF NOT EXISTS clips jsonb;

-- ============== helper: short random code ==============
CREATE OR REPLACE FUNCTION public.gen_join_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============== classes ==============
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  join_code text NOT NULL UNIQUE DEFAULT public.gen_join_code(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.class_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.class_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_invites ENABLE ROW LEVEL SECURITY;

-- security-definer membership checks (avoid recursion)
CREATE OR REPLACE FUNCTION public.is_class_teacher(_class_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = _class_id AND teacher_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_class_member(_class_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_members WHERE class_id = _class_id AND student_id = _user_id);
$$;

-- classes policies
CREATE POLICY classes_teacher_all ON public.classes
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY classes_member_select ON public.classes
  FOR SELECT TO authenticated
  USING (public.is_class_member(id, auth.uid()));

-- class_members policies
CREATE POLICY cm_teacher_select ON public.class_members
  FOR SELECT TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()));

CREATE POLICY cm_self_select ON public.class_members
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY cm_self_delete ON public.class_members
  FOR DELETE TO authenticated
  USING (auth.uid() = student_id OR public.is_class_teacher(class_id, auth.uid()));

-- inserts only via security-definer join function
-- class_invites policies
CREATE POLICY ci_teacher_all ON public.class_invites
  FOR ALL TO authenticated
  USING (public.is_class_teacher(class_id, auth.uid()))
  WITH CHECK (public.is_class_teacher(class_id, auth.uid()));

-- join class with a code (insert membership for current user)
CREATE OR REPLACE FUNCTION public.join_class_with_code(_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _class_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO _class_id FROM public.classes WHERE join_code = upper(_code);
  IF _class_id IS NULL THEN RAISE EXCEPTION 'Invalid class code'; END IF;
  INSERT INTO public.class_members (class_id, student_id) VALUES (_class_id, _uid)
    ON CONFLICT (class_id, student_id) DO NOTHING;
  RETURN _class_id;
END;
$$;

-- accept invite by token
CREATE OR REPLACE FUNCTION public.accept_class_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _class_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT class_id INTO _class_id FROM public.class_invites
    WHERE token = _token AND status = 'pending';
  IF _class_id IS NULL THEN RAISE EXCEPTION 'Invalid or used invite'; END IF;
  INSERT INTO public.class_members (class_id, student_id) VALUES (_class_id, _uid)
    ON CONFLICT (class_id, student_id) DO NOTHING;
  UPDATE public.class_invites SET status = 'accepted' WHERE token = _token;
  RETURN _class_id;
END;
$$;

-- ============== quizzes ==============
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  topic text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY quiz_teacher_all ON public.quizzes
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- ============== worksheets ==============
CREATE TABLE public.worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  topic text,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_teacher_all ON public.worksheets
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- ============== assignments ==============
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('quiz','worksheet')),
  ref_id uuid NOT NULL,
  title text NOT NULL,
  due_date timestamptz,
  payload jsonb,  -- snapshot of quiz/worksheet at assign time
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY asg_teacher_all ON public.assignments
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY asg_member_select ON public.assignments
  FOR SELECT TO authenticated
  USING (public.is_class_member(class_id, auth.uid()));

-- ============== submissions ==============
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_score numeric DEFAULT 0,
  manual_score numeric DEFAULT 0,
  total_score numeric DEFAULT 0,
  max_score numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  UNIQUE (assignment_id, student_id)
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sub_student_all ON public.submissions
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY sub_teacher_select ON public.submissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
  ));

CREATE POLICY sub_teacher_update ON public.submissions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
  ));

-- ============== game_scores ==============
CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY gs_self_all ON public.game_scores
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_classes BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_quizzes BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_worksheets BEFORE UPDATE ON public.worksheets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
