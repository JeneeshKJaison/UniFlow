# UniFlow — Workload Balancing Algorithms & Mathematical Models

UniFlow incorporates three distinct mathematical workload engines:
1. **Engine A:** Administrative Task Allocation Engine (HOD $\rightarrow$ Faculty)
2. **Engine B:** Pedagogical Workload Balancing Engine (Faculty $\rightarrow$ Student)
3. **Engine C:** Comprehensive Academic Workload Formulation (L-T-P-J Model)

Every formula and algorithm below is verified against active code in `backend/src/controllers/workloadController.js` and `backend/src/controllers/facultyController.js`.

---

# 1. ENGINE A: Administrative Task Allocation (HOD $\rightarrow$ Faculty)

## 1.1 Mathematical Formulation & Invariants
- **Permissible Task Difficulty:** $\text{Diff} \in [1, 10] \cap \mathbb{Z}$ (1 = Minimal clerical duty, 10 = Exhaustive departmental audit/accreditation project).
- **Task Time Interval:** $[S_i, D_i]$, where $S_i$ is `scheduled_date` and $D_i$ is `deadline` (if deadline is omitted, $D_i = S_i$).
- **Active Task Invariant:** A task is active if and only if:
  $$\text{Status}(T_i) \notin \{\text{'completed'}\}$$
- **Time Window Overlap Condition:** An existing task $T_i$ overlaps with proposed task $T_{new} = [S_{new}, D_{new}]$ if and only if:
  $$\text{Overlap}(T_i, T_{new}) \iff (T_i.S \le D_{new}) \land (T_i.D \ge S_{new})$$
- **Cumulative Active Workload:**
  $$W_{\text{active}}(F, [S_{new}, D_{new}]) = \sum_{T_i \in \text{Tasks}(F)} T_i.\text{difficulty} \quad \text{s.t. } \text{Active}(T_i) \land \text{Overlap}(T_i, T_{new})$$
- **Strict Capacity Invariant (15-Point Limit):**
  $$W_{\text{active}}(F, [S_{new}, D_{new}]) + \text{Diff}_{new} \le 15$$

## 1.2 Algorithmic Execution Workflow (`POST /api/workload/suggest`)

```
[ Incoming Task Proposal ]
  (Faculty F, Difficulty Diff, Interval [S, D])
              │
              ▼
[ Overlapping Workload Query ]
  Calculates W_active from PostgreSQL
              │
              ▼
   Is W_active + Diff <= 15 ?
       │               │
      YES              NO
       │               │
       ▼               ▼
[ can_assign: true ] [ can_assign: false (Overload) ]
                       │
                       ├──► [ Alternative Faculty Heuristic ]
                       │      Find qualified peers where W_peer + Diff <= 15
                       │
                       └──► [ Alternative Date Heuristic ]
                              generate_series(S+1, S+30) where W_date + Diff <= 15
```

### Verified SQL for Overlapping Workload Calculation:
```sql
SELECT 
    COALESCE(SUM(t.difficulty), 0) AS current_workload,
    COALESCE(json_agg(json_build_object(
        'id', t.id, 'description', t.description,
        'difficulty', t.difficulty, 'scheduled_date', t.scheduled_date,
        'deadline', t.deadline, 'status', t.status
    )) FILTER (WHERE t.id IS NOT NULL), '[]') AS overlapping_tasks
FROM tasks t
WHERE t.assigned_to = $1
  AND (t.status IS NULL OR t.status != 'completed')
  AND t.scheduled_date <= $3   -- $3 = end_date
  AND COALESCE(t.deadline, t.scheduled_date) >= $2; -- $2 = start_date
```

## 1.3 Alternative Recommendation Heuristics

### Heuristic 1: Alternative Faculty Discovery
Searches for faculty members qualified to take the task without exceeding capacity:
- **Qualification Rule:** Faculty must teach the subject (`subject_faculty`) OR belong to the same department (`user_departments`).
- **Capacity Constraint:** Peer's current overlapping workload in $[S_{new}, D_{new}] + \text{Diff}_{new} \le 15$.
- **Ranking Function:** Prioritizes subject instructors, then lowest active workload:
  `ORDER BY teaches_subject DESC, current_workload ASC, u.name ASC LIMIT 5`.

### Heuristic 2: Alternative Date Discovery
Uses PostgreSQL's `generate_series()` function to scan 30 calendar days ahead of $S_{new}$:
```sql
SELECT 
    TO_CHAR(d::date, 'YYYY-MM-DD') AS alternative_scheduled_date,
    TO_CHAR((d::date + $duration * INTERVAL '1 day')::date, 'YYYY-MM-DD') AS alternative_deadline,
    COALESCE((
        SELECT SUM(t.difficulty) FROM tasks t
        WHERE t.assigned_to = $facultyId
          AND (t.status IS NULL OR t.status != 'completed')
          AND t.scheduled_date <= (d::date + $duration * INTERVAL '1 day')::date
          AND COALESCE(t.deadline, t.scheduled_date) >= d::date
    ), 0) AS existing_workload
FROM generate_series($start::date + INTERVAL '1 day', $start::date + INTERVAL '30 days', INTERVAL '1 day') AS d
WHERE existing_workload + $taskDifficulty <= 15
ORDER BY existing_workload ASC, d ASC
LIMIT 4;
```

## 1.4 Concurrency & Race-Condition Audit
- **Code Audit in `assignTask` (`workloadController.js` lines 493–547):**
  The endpoint executes a `SELECT SUM(...)` query, evaluates `if (resultingWorkload > 15)`, and then executes `INSERT INTO tasks ...`.
- **Finding:** **No database transaction (`BEGIN...COMMIT`) or row-level lock (`SELECT ... FOR UPDATE`) is used in `assignTask`.** If two administrative requests are made simultaneously for the same faculty member, both read operations could observe capacity before either commits, allowing concurrent commits to breach the 15-point ceiling.

---

# 2. ENGINE B: Pedagogical Workload Collision Engine (Faculty $\rightarrow$ Student)

## 2.1 Mathematical Formulation & Invariants
- **Target Class Scoping:** Strictly isolated by $(C_{\text{id}}, \text{Sem})$, where $C_{\text{id}}$ is the course ID and $\text{Sem}$ is the academic semester.
- **Daily Class Capacity Limit:**
  $$W_{\text{daily}}(C_{\text{id}}, \text{Sem}, D_{\text{due}}) = \sum_{A_i \in \text{Assignments}} A_i.\text{difficulty} \le 10 \text{ points}$$
- **Weekly Rolling Window Capacity Limit ($\pm 3$ Days):**
  $$W_{\text{weekly}}(C_{\text{id}}, \text{Sem}, D_{\text{due}}) = \sum_{A_i \in \text{Assignments}} A_i.\text{difficulty} \le 18 \text{ points}$$
  where $A_i.\text{due\_date} \in [D_{\text{due}} - 3\text{ days}, D_{\text{due}} + 3\text{ days}]$.
- **Collision Condition:**
  $$\text{HasCollision} \iff (W_{\text{daily}} + \text{Diff}_{new} > 10) \lor (W_{\text{weekly}} + \text{Diff}_{new} > 18)$$

## 2.2 Algorithmic Execution Workflow (`POST /api/faculty/student-assignments/check`)
1. **Scope Verification:** Verifies assigning faculty is allocated to subject via `subject_faculty` (`sf.subject_id = $1 AND sf.faculty_id = $2`). Rejects with `403 Forbidden` if unauthorized.
2. **Daily Load Calculation:** Executes SQL `SUM(difficulty)` for target course and semester on exact `due_date`.
3. **Weekly Rolling Load Calculation:** Executes SQL `SUM(difficulty)` for target course and semester across interval `due_date - 3 days` to `due_date + 3 days`.
4. **Collision Evaluation:** If daily limit (10) or weekly limit (18) is exceeded:
   - Sets `can_assign = false` and `is_overloaded = true`.
   - Scans upcoming 14 calendar days ($d \in [D_{\text{due}} + 1, D_{\text{due}} + 14]$).
   - Collects up to 4 safe dates where candidate daily load $+ \text{Diff}_{new} \le 10$.
   - Returns alert payload triggering the frontend **Student Workload Alert Modal**.

## 2.3 Atomic Publishing & Roster Generation (`POST /api/faculty/student-assignments`)
Unlike Engine A, Engine B implements an **atomic PostgreSQL transaction** (`client.query('BEGIN')` ... `COMMIT`):
1. Inserts the assignment record into `student_assignments`.
2. Queries all students enrolled in that class: `SELECT user_id FROM students WHERE course_id = $1 AND semester = $2`.
3. Iteratively creates default submission records:
   ```sql
   INSERT INTO student_assignment_submissions (assignment_id, student_id, status)
   VALUES ($1, $2, 'pending')
   ON CONFLICT (assignment_id, student_id) DO NOTHING;
   ```
4. On error, executes `ROLLBACK`.

## 2.4 Student Real-Time Workload Recalculation
In `studentController.js` (`getStudentDashboard`), a student's active workload score only includes pending assignments:
```sql
SELECT 
    COUNT(sa.id) FILTER (WHERE sas.status = 'pending' OR sas.status IS NULL) AS pending_assignments,
    COALESCE(SUM(sa.difficulty) FILTER (WHERE sas.status = 'pending' OR sas.status IS NULL), 0) AS active_workload_points
FROM student_assignments sa
LEFT JOIN student_assignment_submissions sas ON sa.id = sas.assignment_id AND sas.student_id = $1
WHERE sa.course_id = $2 AND sa.semester = $3;
```
**Impact:** When a student submits an assignment via `PATCH /api/student/assignments/:id/submit`, `sas.status` changes from `'pending'` to `'submitted'`, instantly reducing the student's active workload points and updating the progress bar.

---

# 3. ENGINE C: Comprehensive Academic Faculty Workload Formulation

Triggered when a faculty member submits their course declaration form (`POST /api/workload/classes`). The inputs include:
- Role / In-Charge Type: `Theory`, `Lab`, `Project`
- L-T-P-J Curriculum Code: String format `L-T-P-J` (e.g., `3-1-0-0`, `2-1-2-0`)
- Class Size: `studentsClass` (default: 60)
- Laboratory Students: `studentsInLab`
- Project Students: `studentsInProject`
- Prior Experience: Boolean (`true` / `false`)
- Lab Modification: Boolean (`true` / `false`)

## 3.1 Component 1: Teaching Loads (`teaching_loads`)
From L-T-P-J code: $L$ = Lecture hours, $T$ = Tutorial hours, $P$ = Practical hours, $J$ = Project hours.

$$\begin{aligned}
\text{Weighted Theory} &= L \times 1.0 \\
\text{Weighted Lab} &= P \times 0.5 \\
\text{Weighted Project} &= J \times 0.5 \\
\text{Weighted Tutorial} &= T \times 0.5 \\
\text{Lab Supervision} &= \text{studentsInLab} \times 0.02 \\
\text{Project Mentoring} &= \text{studentsInProject} \times 0.05 \\
\text{Large Class Adjustment} &= \begin{cases} 1.0 & \text{if } \text{studentsClass} > 80 \\ 0.0 & \text{otherwise} \end{cases}
\end{aligned}$$

$$\mathbf{TL} = \text{Weighted Theory} + \text{Weighted Lab} + \text{Weighted Project} + \text{Weighted Tutorial} + \text{Lab Supervision} + \text{Project Mentoring} + \text{Large Class Adj}$$

## 3.2 Component 2: Question & Assignment Setting (`paper_and_assignment_setting`)
- **Question Paper Units:**
  $$N_{\text{papers}} = \begin{cases} 3 & \text{if L-T-P-J } \in \{\text{'3-1-0-0'}, \text{'2-1-2-0'}\} \\ 2 & \text{if L-T-P-J } \in \{\text{'2-0-0-0'}, \text{'2-0-2-2'}\} \\ 1 & \text{if L-T-P-J } = \text{'1-0-2-0'} \\ 0 & \text{otherwise} \end{cases}$$
- **Assignment Setting Units:**
  $$N_{\text{assignments}} = \begin{cases} 4 & \text{if L-T-P-J } \in \{\text{'3-1-0-0'}, \text{'2-1-2-0'}, \text{'2-0-2-2'}\} \\ 2 & \text{otherwise} \end{cases}$$
- **Subtotal Setting Units:**
  $$\mathbf{SL} = (N_{\text{papers}} \times 1.0) + (N_{\text{assignments}} \times 0.5)$$

## 3.3 Component 3: Preparation Adjustment Units (`preparation_and_course_factors`)
Allocated strictly based on selected role:
- **If Role = 'Theory':**
  - Subject Preparation = $2.0$
  - Rubric Formulation = $2.0$
  - CO-PO Mapping = $2.0$
  - $\mathbf{PL} = 2.0 + 2.0 + 2.0 = \mathbf{6.0 \text{ units}}$
- **If Role = 'Lab':**
  - Experiments Preparation = $2.0$
  - Rubric Formulation = $2.0$
  - Continuous Evaluation Sheets = $0.5$
  - CO-PO Mapping = $2.0$
  - Lab Modification Allowance: If `labModification == true` $\rightarrow 2.0$; else $\rightarrow 0.5$.
  - $\mathbf{PL} = 2.0 + 2.0 + 0.5 + 2.0 + (2.0 \text{ or } 0.5) = \mathbf{8.5 \text{ or } 7.0 \text{ units}}$
- **If Role = 'Project':**
  - Project Rubric Formulation = $2.0$
  - Evaluation Sheet Preparation = $0.5$
  - CO-PO Mapping = $2.0$
  - Review Scheduling = $0.5$
  - $\mathbf{PL} = 2.0 + 0.5 + 2.0 + 0.5 = \mathbf{5.0 \text{ units}}$

## 3.4 Component 4: Evaluation Units (`evaluation_units`)
Evaluated based on student volumes and exam formats:
$$\begin{aligned}
\text{Series Scripts} &= (2 \times \text{studentsClass}) \times 0.05 \\
\text{End-Semester Scripts} &= \begin{cases} 0 & \text{if course contains 'without ese', 'project', or 'seminar'} \\ \text{studentsClass} \times 0.08 & \text{otherwise} \end{cases} \\
\text{Assignment Scripts} &= (N_{\text{assignments}} \times \text{studentsClass}) \times 0.02 \\
\text{Lab Outputs} &= (10 \times \text{studentsInLab}) \times 0.05 \\
\text{Practical Exams} &= \text{studentsInLab} \times 0.10 \\
\text{Viva-Voce Count} &= \text{studentsInProject} \times 0.15 \\
\text{Project Reviews} &= \text{studentsInProject} \times 0.15
\end{aligned}$$

$$\mathbf{EL} = \sum \text{All Weighted Evaluation Components Above}$$

## 3.5 Component 5: Master Aggregation (`workload_master`)
- **Experience Multiplier ($M_{\text{exp}}$):**
  $$M_{\text{exp}} = \begin{cases} 0.90 & \text{if priorExperience} = \text{true} \\ 1.00 & \text{if priorExperience} = \text{false} \end{cases}$$
- **Grand Total Master Workload:**
  $$\mathbf{GrandTotal} = (\mathbf{TL} + \mathbf{SL} + \mathbf{PL} + \mathbf{EL}) \times M_{\text{exp}}$$

---

## 3.6 Worked Numerical Example

### Scenario Input Parameters:
- **Subject:** *Advanced Database Systems* (MCA Semester 2)
- **Role:** `Theory`
- **L-T-P-J Code:** `2-1-2-0` ($L=2, T=1, P=2, J=0$)
- **Students in Class:** $85$ (Class $>80$, triggers Large Class Adjustment)
- **Students in Lab:** $0$
- **Students in Project:** $0$
- **Prior Experience:** `true` ($>0$ semesters experience)
- **Lab Modification:** `false`

### Step-by-Step Mathematical Calculation:
1. **Teaching Load ($TL$):**
   - Weighted Theory: $2 \times 1.0 = 2.0$
   - Weighted Tutorial: $1 \times 0.5 = 0.5$
   - Weighted Lab: $2 \times 0.5 = 1.0$
   - Weighted Project: $0 \times 0.5 = 0.0$
   - Lab Supervision: $0 \times 0.02 = 0.0$
   - Project Mentoring: $0 \times 0.05 = 0.0$
   - Large Class Adjustment: $85 > 80 \implies +1.0$
   - $\mathbf{TL} = 2.0 + 0.5 + 1.0 + 0 + 0 + 0 + 1.0 = \mathbf{4.50 \text{ units}}$

2. **Setting Units ($SL$):**
   - Question Papers for `2-1-2-0`: $3$ papers $\times 1.0 = 3.0$
   - Assignments for `2-1-2-0`: $4$ assignments $\times 0.5 = 2.0$
   - $\mathbf{SL} = 3.0 + 2.0 = \mathbf{5.00 \text{ units}}$

3. **Preparation Units ($PL$):**
   - Role = 'Theory' $\implies 2.0 + 2.0 + 2.0 = \mathbf{6.00 \text{ units}}$

4. **Evaluation Units ($EL$):**
   - Series Scripts: $(2 \times 85) \times 0.05 = 170 \times 0.05 = 8.50$
   - End-Sem Scripts: $85 \times 0.08 = 6.80$
   - Assignment Scripts: $(4 \times 85) \times 0.02 = 340 \times 0.02 = 6.80$
   - Lab Outputs / Practical / Viva: $0.00$
   - $\mathbf{EL} = 8.50 + 6.80 + 6.80 = \mathbf{22.10 \text{ units}}$

5. **Subtotal Before Experience Multiplier:**
   $$\text{Subtotal} = 4.50 + 5.00 + 6.00 + 22.10 = \mathbf{37.60 \text{ units}}$$

6. **Grand Total Master Workload:**
   - Multiplier $M_{\text{exp}} = 0.90$ (prior experience is true)
   $$\mathbf{GrandTotal} = 37.60 \times 0.90 = \mathbf{33.84 \text{ units}}$$

*(Verified in `backend/simulate_workload.js` line 98).*
