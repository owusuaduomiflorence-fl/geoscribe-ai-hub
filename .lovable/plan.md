## Scope

Adding a major v2 to Geoguide AI: real motion videos, classes with student-teacher links, quiz/worksheet/assignment system with grading, and educational games.

## 1. Real Motion Video

Replace the storyboard-only generator with three options the user can pick per generation:

- **Single clip** — 1×10s motion video via Lovable's video tool (16:9, 1080p)
- **Multi-clip lesson** — AI splits the topic into 3 scene prompts, generates 3×10s clips, stitches into one ~30s lesson via ffmpeg in the edge function (or stores clips + plays them back-to-back in a single `<video>` playlist on the client)
- **Storyboard (kept as fast/cheap fallback)** — current behavior

Keep `generated_videos` table; add `kind` ('clip' | 'lesson' | 'storyboard') and `clips` (jsonb array of urls). Update the video generator UI to a mode picker.

## 2. Classes (teacher ↔ student link)

New tables:
- `classes` — name, teacher_id, join_code (random 6-char), description
- `class_members` — class_id, student_id, joined_at
- `class_invites` — class_id, email, token, status (pending/accepted)

Both join methods supported: teachers see their join code + can invite by email; students join via "Enter code" or accept email invite link.

UI:
- Teacher: `/teacher/classes` — create class, see roster, copy join code, send email invites
- Student: `/classes` — join by code, see classes they're in

## 3. Quiz & Question Bank

Tables:
- `quizzes` — teacher_id, title, topic, questions (jsonb: array of `{type: 'mcq'|'short', question, options?, correct_answer, points}`)
- AI generator endpoint that returns quiz JSON the teacher can edit/save

UI:
- Teacher: `/teacher/quizzes` — generate via AI prompt, edit questions, save to bank
- Edit screen with add/remove question, change answers/points

## 4. Worksheets

Tables:
- `worksheets` — teacher_id, title, topic, content (markdown sections)
- AI generates printable worksheet content (intro, exercises, diagram prompts, answer key)

UI:
- Teacher: `/teacher/worksheets` — generate, edit, "Print/Download as PDF" (browser print stylesheet → save as PDF; no server-side PDF needed)

## 5. Assignments & Grading

Tables:
- `assignments` — class_id, teacher_id, type ('quiz'|'worksheet'), ref_id, due_date, title
- `submissions` — assignment_id, student_id, answers (jsonb), auto_score, manual_score, total_score, status, submitted_at, graded_at

Flow:
- Teacher creates assignment from a quiz/worksheet, picks a class → all students in class see it
- Student opens assignment, submits answers → MCQs auto-graded; short-answer goes to teacher queue
- Teacher gradebook: per-class roster with scores; click submission to manually score short answers

UI:
- Student: `/assignments` — list pending/completed with scores
- Student: `/assignments/$id` — take quiz / view worksheet
- Teacher: `/teacher/assignments` — create + view; `/teacher/gradebook/$classId` — scores grid; `/teacher/grade/$submissionId` — score short answers

## 6. Educational Games

Two simple, fully client-side games (no extra deps), gated to logged-in users:
- **Map Quiz** — show African country/region name, user picks from 4 country options (data baked in)
- **Term Match** — match 6 geography terms to definitions (drag or click-to-pair)

Track high scores in `game_scores` table (game, user_id, score, created_at). Surface on dashboard.

UI:
- `/games` — game picker
- `/games/map-quiz`, `/games/term-match`

## 7. Navigation & Role Gating

- Sidebar gets new student items: **Assignments**, **Games**, **My Classes**
- Teacher portal page becomes a hub linking to: **Classes**, **Quizzes**, **Worksheets**, **Assignments**, **Gradebook**
- All teacher routes guarded by `isTeacher` (existing pattern); student-only data scoped via RLS

## Technical Details

**RLS is critical**:
- `classes`: teacher reads/writes own; students read classes they're members of
- `class_members`: student can insert self via valid join code (security-definer fn `join_class_with_code`); teacher reads members of own classes
- `quizzes`/`worksheets`: teacher owns; visible to students only via assignment join
- `assignments`: visible to teacher (own) + students in the class
- `submissions`: student RW own; teacher of the assignment's class can read + update score

**Security-definer functions**:
- `join_class_with_code(code text)` — looks up class, inserts membership for `auth.uid()`
- `is_class_teacher(_class_id, _user_id)` and `is_class_member(_class_id, _user_id)` — used in policies to avoid recursion

**Video stitching**: edge function generates 3 clips in parallel via Lovable video, then uses a tiny in-function ffmpeg (not available in Worker) — instead, store clips as an ordered array and play sequentially client-side via a small `<LessonPlayer>` component (advances on `ended`). This avoids the Worker runtime ffmpeg gap entirely.

**PDF export for worksheets**: client-side print CSS + `window.print()` — user "Save as PDF" from print dialog. No server PDF deps.

**Routes added** (all under `_app` layout):
- `/games`, `/games.map-quiz`, `/games.term-match`
- `/assignments`, `/assignments.$id`
- `/classes` (student), `/teacher.classes`, `/teacher.quizzes`, `/teacher.quizzes.$id`, `/teacher.worksheets`, `/teacher.worksheets.$id`, `/teacher.assignments`, `/teacher.gradebook`, `/teacher.gradebook.$classId`, `/teacher.grade.$submissionId`

**Edge functions added/changed**:
- `generate-video` — accepts `mode: 'clip'|'lesson'|'storyboard'`; uses Lovable video tool for clip/lesson modes
- `generate-quiz` — returns structured quiz JSON
- `generate-worksheet` — returns markdown worksheet

## Out of scope (call out to user)

- Email-invite delivery: we'll generate invite tokens and a join link; actual email sending requires the email connector (can wire later)
- Live class sessions / video conferencing
- File uploads for student handwritten answers
