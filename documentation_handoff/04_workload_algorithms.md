# UniFlow — Verified Workload Algorithms & Engines (v2)

> **Document Status:** VERIFIED AGAINST CONTROLLER SOURCE CODE & LIVE EXECUTION  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Auditor Role:** Senior Software Architect & Algorithm Auditor  
> **Date of Audit:** October 23, 2026  

---

## 1. Engine A: HOD Task Delegation & Overload Prevention Engine

### 1.1 Purpose & Governance Rule
Prevents the Head of Department from assigning administrative or departmental duties to a faculty member whose active workload within the target date window would exceed the institutional threshold of **15 points**.

### 1.2 Mathematical Formulation & Parameters
- **Threshold Ceiling:** $\Omega_{\text{max}} = 15$ points (`WORKLOAD_THRESHOLD = 15` in `workloadController.js:25`).
- **Input Variables:**
  - $f$: Target faculty ID (`assigned_to`, integer).
  - $D_{\text{new}}$: Difficulty rating of proposed task ($1 \le D_{\text{new}} \le 10$).
  - $S_{\text{req}}$: Scheduled start date (`scheduled_date`, YYYY-MM-DD).
  - $E_{\text{req}}$: Deadline date (`deadline`, YYYY-MM-DD; defaults to $S_{\text{req}}$ if omitted).
  - $L_{\text{duration}} = \max(0, \text{round}((E_{\text{req}} - S_{\text{req}}) / 86400000))$: Duration in calendar days.
- **Active Overlapping Workload ($W_{\text{active}}$):**
  $$W_{\text{active}}(f, S_{\text{req}}, E_{\text{req}}) = \sum_{t \in T_{\text{active}}(f)} D_t$$
  Where $T_{\text{active}}(f)$ is the set of all tasks assigned to faculty $f$ where:
  $$\text{status} \ne \text{'completed'} \quad \land \quad \text{scheduled\_date}_t \le E_{\text{req}} \quad \land \quad \max(\text{deadline}_t, \text{scheduled\_date}_t) \ge S_{\text{req}}$$
- **Resulting Workload ($W_{\text{resulting}}$):**
  $$W_{\text{resulting}} = W_{\text{active}} + D_{\text{new}}$$
- **Delegation Decision Function:**
  $$\text{CanAssign} = \begin{cases} \text{true}, & \text{if } W_{\text{resulting}} \le 15 \\ \text{false}, & \text{if } W_{\text{resulting}} > 15 \end{cases}$$

### 1.3 Exact SQL & Code Implementation (`workloadController.js:493-503`)
```sql
SELECT COALESCE(SUM(t.difficulty), 0) AS current_workload
FROM tasks t
WHERE t.assigned_to = $1
  AND (t.status IS NULL OR t.status != 'completed')
  AND t.scheduled_date <= $3
  AND COALESCE(t.deadline, t.scheduled_date) >= $2;
```

### 1.4 Recommendations on Overload
When $W_{\text{resulting}} > 15$:
1. **Alternative Faculty Discovery (`workloadController.js:347-388`):**
   Queries up to 5 faculty members (`LIMIT 5`) who teach the subject or belong to the department whose active load plus $D_{\text{new}} \le 15$:
   ```sql
   ORDER BY teaches_subject DESC, current_workload ASC, u.name ASC
   ```
2. **Alternative Date Discovery (`workloadController.js:283-345`):**
   Scans forward 14 days (`offset = 1..14`) in window blocks of $L_{\text{duration}}$ days. Checks if $W_{\text{active}}(f, S_{\text{cand}}, E_{\text{cand}}) + D_{\text{new}} \le 15$. Returns up to 3 candidate dates (`LIMIT 3`).

### 1.5 Execution Trace (HOD Console)
1. **User Action:** HOD opens Task Assignment modal (`UI/hod/dashboard.html:#taskModal`), enters subject, faculty, difficulty, dates, and clicks **"Check Workload"** (`#suggestBtn`).
2. **API Call:** `POST /api/workload/suggest` with JSON payload.
3. **Controller:** Computes $W_{\text{active}}$. If overloaded, returns HTTP 200 with `can_assign: false` and lists alternative teachers/dates. UI renders suggestion pills.
4. **Assignment Attempt:** HOD clicks **"Assign Task"** (`#assignBtn`), issuing `POST /api/workload/assign`.
5. **Strict Server Guard:** If $W_{\text{resulting}} > 15$, returns **HTTP 409 Conflict** with detailed diagnostic message. If within limit, executes `INSERT INTO tasks (..., status = 'approved')` and returns **HTTP 201 Created**.

### 1.6 Boundary & Edge Cases
| Scenario | Behavior in Code | Verified Status |
| :--- | :--- | :--- |
| **Resulting workload exactly 15 ($W = 15$)** | Allowed. Condition is `resultingWorkload <= WORKLOAD_THRESHOLD`. | VERIFIED |
| **Resulting workload 16 ($W = 16$)** | Rejected with HTTP 409 Conflict. | VERIFIED (Live test) |
| **Task with status `'completed'`** | Excluded from sum (`status != 'completed'`). Does not count towards 15 pts. | VERIFIED |
| **Task with no deadline (`deadline = NULL`)** | Handled via `COALESCE(deadline, scheduled_date)`. Treated as single-day task. | VERIFIED |
| **Task with no scheduled date** | Rejected upfront: HTTP 400 Bad Request (`!scheduled_date`). | VERIFIED |
| **Repeated rapid clicks** | If two clicks send identical requests, both will check DB. | **RACE HAZARD** |

### 1.7 Concurrency & Atomicity Audit
> [!WARNING]
> **Check-Then-Insert Race Condition in `assignTask`:**
> `assignTask` executes `pool.query(SELECT ...)` followed by an `if (resultingWorkload > WORKLOAD_THRESHOLD)` check, and finally `pool.query(INSERT ...)`.
> It does NOT use a transaction (`BEGIN`), does NOT use `SELECT ... FOR UPDATE`, and does NOT utilize advisory locks or database table constraints.
> If two concurrent requests hit PostgreSQL at the exact same millisecond for a faculty member with 0 load, both will read 0, both will pass the `> 15` check, and both will insert, resulting in an overloaded state (e.g. $8 + 8 = 16 > 15$).

---

## 2. Engine B: Student Assignment Collision Detection Engine

### 2.1 Purpose & Institutional Need
Prevents academic burnout caused by multiple professors scheduling heavy assignment deadlines for the same student cohort on the exact same date or within the same instructional week.

### 2.2 Mathematical Formulation & Limits
- **Daily Cohort Threshold:** $\Delta_{\text{daily}} = 10$ points (`MAX_DAILY_STUDENT_WORKLOAD = 10` in `facultyController.js:4`).
- **Weekly Cohort Threshold:** $\Delta_{\text{weekly}} = 18$ points (`MAX_WEEKLY_STUDENT_WORKLOAD = 18` in `facultyController.js:5`).
- **Target Student Cohort Identification:**
  Determined by the assigned subject's `course_id` (degree program) and `semester` (e.g. B.Tech CSE, Semester 5).
- **1. Daily Workload Calculation:**
  $$W_{\text{daily}}(C, S, \text{due\_date}) = \sum_{a \in A(C, S, \text{due\_date})} D_a$$
  $$W_{\text{daily, resulting}} = W_{\text{daily}} + D_{\text{new}}$$
  $$\text{IsDailyOverloaded} = (W_{\text{daily, resulting}} > 10)$$
- **2. Weekly Workload Calculation (Rolling 7-Day Window):**
  $$W_{\text{weekly}}(C, S, \text{due\_date}) = \sum_{a \in A_{\text{week}}(C, S, \text{due\_date})} D_a$$
  Where $A_{\text{week}}$ encompasses all assignments where:
  $$\text{due\_date}_a \in [\text{due\_date} - 3\text{ days}, \quad \text{due\_date} + 3\text{ days}]$$
  $$W_{\text{weekly, resulting}} = W_{\text{weekly}} + D_{\text{new}}$$
  $$\text{IsWeeklyOverloaded} = (W_{\text{weekly, resulting}} > 18)$$
- **3. Collision Condition:**
  $$\text{HasCollision} = \text{IsDailyOverloaded} \lor \text{IsWeeklyOverloaded}$$

### 2.3 Exact SQL & Code Implementation (`facultyController.js:215-255`)
#### Daily Workload SQL
```sql
SELECT 
    COALESCE(SUM(sa.difficulty), 0) AS total_difficulty,
    COUNT(sa.id) AS assignment_count,
    COALESCE(json_agg(...) FILTER (WHERE sa.id IS NOT NULL), '[]') AS assignments
FROM student_assignments sa
JOIN subjects s2 ON sa.subject_id = s2.id
WHERE sa.course_id = $1 AND sa.semester = $2 AND sa.due_date = $3;
```
#### Weekly Workload SQL (Rolling $\pm 3$ Days Window)
```sql
SELECT COALESCE(SUM(difficulty), 0) AS total_difficulty
FROM student_assignments
WHERE course_id = $1 AND semester = $2
  AND due_date BETWEEN ($3::date - INTERVAL '3 days') AND ($3::date + INTERVAL '3 days');
```

### 2.4 Alternative Dates Calculation (`facultyController.js:260-294`)
When a collision is detected, Engine B scans forward across the next 14 calendar days:
```javascript
for (let offset = 1; offset <= 14; offset++) {
    const candidateDate = new Date(requestedDate);
    candidateDate.setDate(requestedDate.getDate() + offset);
    // Checks ONLY daily limit
    if (candDaily + taskDiff <= MAX_DAILY_STUDENT_WORKLOAD) {
        alternativeDates.push({ date: dateStr, resulting_workload: candResulting });
    }
    if (alternativeDates.length >= 4) break; // Returns top 4 recommendations
}
```
*Critical Audit Finding:* The alternative date scan checks **only** the daily threshold ($\le 10$). It omits the weekly check ($\le 18$) during alternative date discovery.

### 2.5 Execution Trace & Override Workflow
1. Faculty opens Student Assignment modal (`UI/faculty/dashboard.html:#assignmentModal`).
2. Faculty enters subject, difficulty, and proposed due date, then clicks **"Check Collision"** (`#checkCollisionBtn`).
3. Frontend calls `POST /api/faculty/student-assignments/check`.
4. If a collision occurs, frontend displays a red warning banner (`#collisionAlertBox`) with the reason and renders alternative date buttons.
5. If the faculty member insists on publishing despite the collision, they can proceed if they check an override flag (`override_collision = true`). Otherwise, `POST /api/faculty/student-assignments` rejects with **HTTP 409 Conflict**.
6. When successfully published, a database transaction inserts into `student_assignments` and automatically provisions `student_assignment_submissions` for all enrolled students with `status = 'pending'`.

---

## 3. Engine C: Academic Course Workload Formulation Engine

### 3.1 Purpose & Institutional Framework
Translates course L-T-P-J codes, student cohort sizes, and faculty instructional roles into quantified semester workload units based on the TKM College of Engineering Regulations 2023 design summary.

### 3.2 Master Equation
$$\text{Grand Total Academic Workload} = (\text{Teaching Load} + \text{Setting Units} + \text{Prep Units} + \text{Evaluation Units}) \times \mu_{\text{exp}}$$

Where:
- $\mu_{\text{exp}} = 0.9$ if instructor has prior experience teaching the subject.
- $\mu_{\text{exp}} = 1.0$ if teaching the subject for the first time.

---

### 3.3 Component Formulations & Code Constants

#### 1. Teaching Loads Subsystem (`teaching_loads`)
From input L-T-P-J code (e.g. `3-1-2-0` $\rightarrow L=3, T=1, P=2, J=0$):
$$\text{Weighted Theory} = L \times 1.0$$
$$\text{Weighted Lab} = P \times 0.5$$
$$\text{Weighted Project} = J \times 0.5$$
$$\text{Weighted Tutorial} = T \times 0.5$$
$$\text{Lab Supervision} = N_{\text{lab}} \times 0.02$$
$$\text{Project Mentoring} = N_{\text{proj}} \times 0.05$$
$$\text{Large Class Adj} = \begin{cases} 1.0, & \text{if } N_{\text{class}} > 80 \\ 0, & \text{otherwise} \end{cases}$$
$$\text{Teaching Load Total} = \text{Weighted Theory} + \text{Weighted Lab} + \text{Weighted Project} + \text{Weighted Tutorial} + \text{Lab Supervision} + \text{Project Mentoring} + \text{Large Class Adj}$$

#### 2. Question Paper & Assignment Setting (`paper_and_assignment_setting`)
Hardcoded rules based on L-T-P-J code (`workloadController.js:655-665`):
- **Question Papers ($W_{\text{paper}} = 1.0$ each):**
  - If code is `'2-0-0-0'` or `'2-0-2-2'`: $N_{\text{papers}} = 2$.
  - If code is `'1-0-2-0'`: $N_{\text{papers}} = 1$.
  - If code is `'3-1-0-0'` or `'2-1-2-0'`: $N_{\text{papers}} = 3$.
  - All other codes: $N_{\text{papers}} = 0$.
- **Assignments ($W_{\text{assign}} = 0.5$ each):**
  - If code is `'3-1-0-0'`, `'2-1-2-0'`, or `'2-0-2-2'`: $N_{\text{assign}} = 4$.
  - All other codes: $N_{\text{assign}} = 2$.
$$\text{Setting Units Subtotal} = (N_{\text{papers}} \times 1.0) + (N_{\text{assign}} \times 0.5)$$

#### 3. Preparation Adjustment Units (`preparation_and_course_factors`)
Fixed unit assignments determined strictly by the faculty member's instructional role (`workloadController.js:673-683`):
- **If Role = `'Theory'`:**
  - Subject Preparation: $1 \times 2.0 = 2.0$
  - Rubrics Preparation: $1 \times 2.0 = 2.0$
  - CO-PO Mapping: $1 \times 2.0 = 2.0$
  - **Subtotal = 6.0 units**
- **If Role = `'Lab'`:**
  - Experiments Preparation: $1 \times 2.0 = 2.0$
  - Rubrics Preparation: $1 \times 2.0 = 2.0$
  - Evaluation Sheets: $1 \times 0.5 = 0.5$
  - CO-PO Mapping: $1 \times 2.0 = 2.0$
  - Lab In-Charge Modification: $2.0$ (if `labModification = true`), $0.5$ (if `false`)
  - **Subtotal = 8.5 units (with modifications) or 7.0 units (routine)**
- **If Role = `'Project'`:**
  - Rubrics Preparation: $1 \times 2.0 = 2.0$
  - Evaluation Sheets: $1 \times 0.5 = 0.5$
  - CO-PO Mapping: $1 \times 2.0 = 2.0$
  - Project Scheduling: $1 \times 0.5 = 0.5$
  - **Subtotal = 5.0 units**

#### 4. Evaluation Units (`evaluation_units`)
Computed from student cohort quantities (`workloadController.js:687-712`):
- Series Exam Scripts: $2 \times N_{\text{class}} \times 0.05$ (assumes 2 series exams/sem)
- End-Semester Scripts: If course type does NOT include `'without ese'`, `'project'`, or `'seminar'`: $N_{\text{class}} \times 0.08$; otherwise $0$.
- Assignment Scripts: $N_{\text{assign}} \times N_{\text{class}} \times 0.02$
- Lab Output Evaluations: $N_{\text{lab}} \times 10 \times 0.05$ (assumes 10 weekly outputs)
- Practical Exam Evaluations: $N_{\text{lab}} \times 1 \times 0.10$
- Viva-Voce Evaluations: $N_{\text{proj}} \times 1 \times 0.15$
- Project Evaluations: $N_{\text{proj}} \times 1 \times 0.15$
$$\text{Evaluation Units Subtotal} = \sum \text{Weighted Evaluation Items}$$

---

### 3.4 Verified Worked Examples (One per Role)

The calculations below were executed through a Node.js verification script (`scratch/worked_example_engine_c.js`) using the exact code constants from `workloadController.js:629-753`.

#### Worked Example 1: Theory Role (Data Structures & Algorithms)
- **Inputs:** Role: `Theory`, L-T-P-J: `3-1-0-0`, $N_{\text{class}} = 60$, $N_{\text{lab}} = 0$, $N_{\text{proj}} = 0$, Prior Experience: `true` ($\mu = 0.9$), Course Type: `'Core Theory'`.
- **Step 1: Teaching Loads**
  - Theory: $3 \times 1.0 = 3.0$
  - Tutorial: $1 \times 0.5 = 0.5$
  - Lab / Project / Supervision: $0$
  - Large class adj: $0$ ($60 \le 80$)
  - **Subtotal = 3.50 units**
- **Step 2: Setting Units**
  - Question Papers: Code `'3-1-0-0'` $\rightarrow 3 \times 1.0 = 3.0$
  - Assignments: Code `'3-1-0-0'` $\rightarrow 4 \times 0.5 = 2.0$
  - **Subtotal = 5.00 units**
- **Step 3: Preparation Units**
  - Fixed Theory Prep: $2.0 + 2.0 + 2.0 = \mathbf{6.00\text{ units}}$
- **Step 4: Evaluation Units**
  - Series Scripts: $2 \times 60 \times 0.05 = 6.00$
  - End-Sem Scripts: $60 \times 0.08 = 4.80$
  - Assignment Scripts: $4 \times 60 \times 0.02 = 4.80$
  - Lab / Practical / Project: $0$
  - **Subtotal = 15.60 units**
- **Step 5: Master Compilation**
  $$\text{Unweighted Total} = 3.50 + 5.00 + 6.00 + 15.60 = 30.10\text{ units}$$
  $$\text{Grand Total Workload} = 30.10 \times 0.9 = \mathbf{27.0900\text{ units}}$$

---

#### Worked Example 2: Lab Role (Data Structures Laboratory)
- **Inputs:** Role: `Lab`, L-T-P-J: `0-0-3-0`, $N_{\text{class}} = 60$, $N_{\text{lab}} = 30$, $N_{\text{proj}} = 0$, Prior Experience: `false` ($\mu = 1.0$), Lab Modification: `true`, Course Type: `'Practical / Laboratory without ESE'`.
- **Step 1: Teaching Loads**
  - Theory / Tutorial: $0$
  - Lab Hours: $3 \times 0.5 = 1.50$
  - Lab Supervision: $30 \times 0.02 = 0.60$
  - Large class adj: $0$
  - **Subtotal = 2.10 units**
- **Step 2: Setting Units**
  - Question Papers: Code `'0-0-3-0'` $\rightarrow 0 \times 1.0 = 0$
  - Assignments: Code `'0-0-3-0'` $\rightarrow 2 \times 0.5 = 1.0$
  - **Subtotal = 1.00 units**
- **Step 3: Preparation Units**
  - Experiments (2.0) + Rubrics (2.0) + Eval Sheets (0.5) + CO-PO (2.0) + Lab Mod (2.0) = $\mathbf{8.50\text{ units}}$
- **Step 4: Evaluation Units**
  - Series Scripts: $2 \times 60 \times 0.05 = 6.00$
  - End-Sem Scripts: $0$ (Type includes `'without ese'`)
  - Assignment Scripts: $2 \times 60 \times 0.02 = 2.40$
  - Lab Outputs: $30 \times 10 \times 0.05 = 15.00$
  - Practical Exam: $30 \times 1 \times 0.10 = 3.00$
  - **Subtotal = 26.40 units**
- **Step 5: Master Compilation**
  $$\text{Unweighted Total} = 2.10 + 1.00 + 8.50 + 26.40 = 38.00\text{ units}$$
  $$\text{Grand Total Workload} = 38.00 \times 1.0 = \mathbf{38.0000\text{ units}}$$

---

#### Worked Example 3: Project Role (Capstone Dissertation)
- **Inputs:** Role: `Project`, L-T-P-J: `0-0-0-4`, $N_{\text{class}} = 60$, $N_{\text{lab}} = 0$, $N_{\text{proj}} = 15$, Prior Experience: `true` ($\mu = 0.9$), Course Type: `'Project / Dissertation without ESE'`.
- **Step 1: Teaching Loads**
  - Theory / Tutorial / Lab: $0$
  - Project Hours: $4 \times 0.5 = 2.00$
  - Project Mentoring: $15 \times 0.05 = 0.75$
  - Large class adj: $0$
  - **Subtotal = 2.75 units**
- **Step 2: Setting Units**
  - Question Papers: $0$
  - Assignments: $2 \times 0.5 = 1.00$
  - **Subtotal = 1.00 units**
- **Step 3: Preparation Units**
  - Rubrics (2.0) + Eval Sheets (0.5) + CO-PO (2.0) + Scheduling (0.5) = $\mathbf{5.00\text{ units}}$
- **Step 4: Evaluation Units**
  - Series Scripts: $2 \times 60 \times 0.05 = 6.00$
  - End-Sem Scripts: $0$ (Type includes `'without ese'`)
  - Assignment Scripts: $2 \times 60 \times 0.02 = 2.40$
  - Viva-Voce: $15 \times 1 \times 0.15 = 2.25$
  - Project Evaluations: $15 \times 1 \times 0.15 = 2.25$
  - **Subtotal = 12.90 units**
- **Step 5: Master Compilation**
  $$\text{Unweighted Total} = 2.75 + 1.00 + 5.00 + 12.90 = 21.65\text{ units}$$
  $$\text{Grand Total Workload} = 21.65 \times 0.9 = \mathbf{19.4850\text{ units}}$$

---

### 3.5 Differences Between Implementation and Design Workbook (`Phase 0 Item 9`)

A detailed comparison between `workloadController.js:addClass` and `faculty_workload_design_summary.pdf` identified the following discrepancies:
1. **Tutorial Hour Weighting:** Implemented as `tutorialHours * 0.5` in code; workbook guidelines in some sheets specified 1.0 unit per tutorial contact hour.
2. **Question Paper Assignment Logic:** Rather than dynamic inputs, the code uses hardcoded conditional mapping based on L-T-P-J strings (`2-0-0-0` $\rightarrow 2$, `3-1-0-0` $\rightarrow 3$, etc.).
3. **Fixed Preparation Totals:** The preparation factors do not take dynamic task quantities; they hardcode fixed totals by role ($6.0$ for Theory, $8.5/7.0$ for Lab, $5.0$ for Project).
4. **Large Class Adjustment:** Applied as a flat $+1.0$ addition if `studentsClass > 80`, rather than a percentage scale factor ($1.25\times$).
5. **Project Viva and Review Weights:** Both viva-voce and project evaluations are implemented with weight $0.15 \times N_{\text{proj}}$, giving a combined factor of $0.30$ per project student.
