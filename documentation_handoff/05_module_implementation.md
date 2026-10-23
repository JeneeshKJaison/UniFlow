# UniFlow — Module-by-Module Functional Deep Dive

This document details the functional workflows, frontend components, state management, and backend interactions for all four system roles.

---

## 1. Super Admin Module

### 1.1 Purpose & Role Scope
The Super Admin console provides institutional oversight: department configuration, HOD appointment, curriculum/course initialization, and user provisioning.

### 1.2 Implemented Features & Workflows
1. **Department Management:**
   - Create, edit, and view academic departments (`DEP-CS01`, `DEP-ME02`, etc.).
   - Assign and reassign HOD tenure to specific faculty accounts.
2. **Dedicated HOD Credentials Management:**
   - Dedicated table displaying Department, HOD Name, Custom ID, Email Chip, and masked Password (`••••••••`).
   - One-click copy for email and password using `navigator.clipboard.writeText`.
   - Dynamic password toggle (`visibility` icon).
   - Reset password modal and unassign HOD action.
3. **Course & Program Management:**
   - Configure degree programs (e.g., *B.Tech Computer Science*, *B.Tech Mechanical*).
   - Assign courses to parent departments and define total semesters (typically 8).
4. **User Directory & Account Provisioning:**
   - Add new faculty, students, and HODs.
   - Multi-parameter filtering: User ID search, Role filter (`all`, `faculty`, `student`, `hod`), Department filter, Course filter, and Semester filter.
   - Auto-generated Custom IDs (`FAC001`, `STU001`) with copyable credential chips.

### 1.3 Architectural Finding & Implementation Status
- **`[DOCUMENTED AS FEATURE / VERIFIED AS CLIENT-SIDE PROTOTYPE]`**
- **Audit Verification:** `UI/admin/js/admin.js` operates exclusively over `localStorage` (`uniflow_dataStore`).
- **Backend Evidence:** There are **no `/api/admin/*` endpoints** defined in `backend/src/server.js` or `backend/src/routes/`. The Admin interface is currently a fully interactive client-side prototype.

---

## 2. Head of Department (HOD) Module

### 2.1 Purpose & Role Scope
The HOD console gives department chairs active control over faculty academic workloads, administrative task delegations, timetable matrix scheduling, and deliverable file reviews.

### 2.2 Implemented Features & Workflows

#### 1. Dynamic Workload Analytics Dashboard (Chart.js Visualization)
- **Data Source:** `GET /api/workload/hod/summary`.
- **Chart.js Bar Graph:** Displays total academic workload points (`grand_total_workload_units`) grouped by faculty member.
- **Dynamic Drill-Down Categories:**
  - HOD can toggle the "Quick Links" menu to view:
    1. *Teaching Load Units* (`teaching_loads`)
    2. *Question/Assignment Setting Units* (`paper_and_assignment_setting`)
    3. *Preparation Adjustment Units* (`preparation_and_course_factors`)
    4. *Evaluation Units* (`evaluation_units`)
    5. *Theory Hours per week*
    6. *Experience Multiplier* ($0.9$ vs $1.0$)
  - Clicking any sub-category dynamically redraws the bar chart to show that specific metric.
  - Dynamically renders an Excel-style detailed Data Table directly underneath the chart showing the exact numerical breakdown per subject.

#### 2. Administrative Task Delegation with Capacity Interception
- **Workflow:** HOD selects faculty member, subject, enters description, sets difficulty (1–10), scheduled start date, and deadline.
- **Pre-Check:** On submit, `hod.js` calls `POST /api/workload/suggest`:
  - **Within Threshold ($\le 15$ pts):** Prompts confirmation showing current load, task difficulty, and resulting load, then commits via `POST /api/workload/assign`.
  - **Threshold Exceeded ($> 15$ pts):** Prevents assignment and opens the **Workload Warning Modal**.
- **Automated Alternatives:**
  - *Alternative Faculty:* Displays cards for peer faculty qualified for the subject whose workload $\le 15$ pts with a 1-click **"Assign to [Name]"** button.
  - *Alternative Dates:* Displays cards for the earliest available date windows over the next 30 days where commitments drop with a 1-click **"Shift to [Date]"** button.

#### 3. Faculty Deliverable Inspection & File Download
- Tasks table displays status chips and deliverable indicators (`📎 Attachment`).
- HOD can view faculty submission notes (`faculty_remark`) and click **"Download"** to inspect submitted deliverables (PDF, ZIP, DOCX) directly from `http://localhost:5000/uploads/...`.

#### 4. Timetable Matrix & Department Management
- Interactive weekly timetable grid (Days $\times$ 7 Periods).
- Subject list and faculty allocation matrix.
- Department chat and student performance monitoring (`localStorage` mock state).

---

## 3. Faculty Module

### 3.1 Purpose & Role Scope
The Faculty Portal provides educators with real-time visibility into HOD administrative tasks, course teaching load declarations, and student assignment management with collision prevention.

### 3.2 Implemented Features & Workflows

#### 1. HOD Task Synchronization & Work Calendar
- **Live Sync:** Fetches assigned administrative tasks via `GET /api/faculty/tasks`.
- **Metrics Bar:** Renders total active tasks, completed count, and current workload points against the 15-point ceiling.
- **Interactive Work Calendar:** Monthly calendar rendering tasks on scheduled dates and deadlines, color-coded by status (`Pending`, `In Progress`, `Completed`).
- **Status Toggle:** Quick-action buttons to toggle task status between `'in_progress'` and `'completed'` (`PATCH /api/faculty/tasks/:id/status`).

#### 2. Task Deliverable & File Submission Modal
- Faculty clicks **"📝 Remarks & File"** on any task card.
- Modal captures:
  - Completion notes / remarks (`faculty_remark`).
  - File deliverable upload (PDF, DOCX, ZIP, PNG/JPG) converted to Base64 data URI.
  - Submits via `POST /api/faculty/tasks/:id/deliverable`.
  - File is stored in `backend/uploads/` and static URL is saved to PostgreSQL.

#### 3. Course Workload Declaration ("Add Class")
- Faculty declares course in-charge responsibilities via `#addClassForm`.
- Form captures: Role (`Theory`, `Lab`, `Project`), Program Name, Subject Name, Semester, L-T-P-J curriculum code, class sizes, prior experience, and lab modifications.
- Submits via `POST /api/workload/classes`.
- Backend executes the comprehensive academic workload formulation and writes to `teaching_loads`, `paper_and_assignment_setting`, `preparation_and_course_factors`, `evaluation_units`, and `workload_master`.

#### 4. Workload-Aware Student Assignment System
- **Scoped Dropdown:** Subject selector is strictly populated with classes the faculty actually teaches (`GET /api/faculty/subjects`).
- **Assignment Form:** Captures Assignment Title, Description, Difficulty (1–10), Due Date, and Max Marks.
- **Two-Step Publishing Workflow:**
  1. Calls `POST /api/faculty/student-assignments/check` to evaluate target class workload.
  2. If resulting daily load $>10$ pts or weekly load $>18$ pts:
     - Blocks blind insertion.
     - Opens the **Student Workload Alert Modal**.
     - Shows the collision breakdown and displays cards for safe dates over the next 14 days.
     - Faculty can click **"Select & Assign"** on a recommended date or click **"Override"**.
  3. Direct commit via `POST /api/faculty/student-assignments`.
- **Submission Tracking Table:** Displays previously assigned works with real-time submission metrics ($X / Y \text{ Turn-ins}$).

---

## 4. Student Module

### 4.1 Purpose & Role Scope
The Student Portal delivers an overview of academic standing, enrolled courses, upcoming assignments, and an active workload gauge.

### 4.2 Implemented Features & Workflows

#### 1. Dynamic Weekly Workload Progress Bar
- **Data Source:** `GET /api/student/dashboard`.
- Computes active workload points: $\sum (\text{difficulty})$ for assignments where submission status is `'pending'`.
- Calculates percentage against recommended 20-point weekly capacity:
  $$\text{Workload Percentage} = \min\left(100, \text{round}\left(\frac{\text{Workload Points}}{20} \times 100\right)\right)$$
- **Dynamic Color & Advisory Transitions:**
  - **$< 40\%$ (Green):** "✓ Workload is currently light and well balanced. Great job!"
  - **$40\% - 75\%$ (Orange):** "You have a steady schedule of assignments ahead. Manage your time effectively."
  - **$> 75\%$ (Red):** "⚠️ High assignment workload this week. Prioritize deadlines approaching earliest."

#### 2. Enrolled Courses Directory
- **Data Source:** `GET /api/student/courses`.
- Displays real course codes, subject titles, credit counts, and assigned faculty names for the student's enrolled course and semester.

#### 3. Upcoming Course Assignments & Deadlines
- **Data Source:** `GET /api/student/assignments`.
- Lists all assignments published for the student's class, showing:
  - Subject code and name.
  - Faculty instructor name.
  - Difficulty badge (Level 1–10, color-coded).
  - Formatted deadline date.
  - Status badge (`Pending` vs `✓ Submitted` with marks if graded).

#### 4. Interactive Online Assignment Turn-In
- Students click the **"📤 Turn In"** button on any pending assignment.
- JavaScript prompts for submission notes or repository/drive URL.
- Calls `PATCH /api/student/assignments/:id/submit`.
- PostgreSQL updates `student_assignment_submissions` status to `'submitted'` and records `submitted_at = NOW()`.
- **Immediate Feedback Loop:** Submitting immediately updates the status chip to "✓ Submitted" and **lowers the student's active workload points in real-time**!

#### 5. Mini Assignment Calendar
- Interactive grid mapping days of the current month.
- Days with due assignments are highlighted with primary color indicators.
