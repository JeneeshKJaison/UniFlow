# UniFlow — Verified Module Implementation & Feature Inventory (v2)

> **Document Status:** VERIFIED AGAINST CODEBASE & DOM STRUCTURE  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Auditor Role:** Senior Software Architect & Code Auditor  
> **Date of Audit:** October 23, 2026  

---

## 1. Feature Implementation Status Overview

UniFlow features fall into four verified categories:
1. **IMPLEMENTED AND CONNECTED TO API:** Fully integrated across HTML, client JS, Express routes, controller logic, and PostgreSQL database tables.
2. **FRONTEND ONLY (MOCKED WITH `localStorage`):** Interactive UI screens that store and mutate state entirely within browser `localStorage`, with no backend endpoints.
3. **FRONTEND ONLY (STATIC SAMPLE DATA):** Displays hardcoded in-memory mock data with no persistence.
4. **NOT IMPLEMENTED:** Documented in earlier handoffs or diaries but completely non-existent in source code across all git branches.

---

## 2. Role-by-Role Feature Inventory

### 2.1 Head of Department (HOD) Module

Client Files: `UI/hod/dashboard.html`, `UI/hod/js/hod.js`, `UI/hod/css/hod.css`.

#### Feature 1: Faculty Academic Workload Chart.js Analytics
- **User Workflow:** HOD navigates to dashboard. Top section immediately renders an animated horizontal/vertical bar chart showing cumulative academic workload across all departmental teachers. HOD can click "Quick Links" categories to drill down into Teaching Load, Setting Units, Prep Units, or Evaluation Units, rendering a detailed subject breakdown table below the graph.
- **Frontend File & Function:** `UI/hod/js/hod.js:fetchWorkloadSummary()`, `renderWorkloadChart()`, `showCategoryDetails()`.
- **Backend Route & Controller:** `GET /api/workload/hod/summary` $\rightarrow$ `backend/src/controllers/workloadController.js:780` (`getHodSummary`).
- **Tables & Columns Touched:** Reads `workload_master`, `teaching_loads`, `paper_and_assignment_setting`, `preparation_and_course_factors`, `evaluation_units`.
- **Validation & Auth Check:** `authenticateToken` validates JWT signature. No server-side role check.
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 2: Workload-Aware Task Delegation (Engine A)
- **User Workflow:** HOD clicks "Assign Task", opens modal (`#taskModal`), selects faculty member, subject, difficulty (1–10), scheduled date, and deadline. Clicks "Check Workload" to preview capacity or "Assign Task" to commit. If over 15 points, system displays alternatives and blocks assignment.
- **Frontend File & Function:** `UI/hod/js/hod.js:openTaskModal()`, `triggerWorkloadSuggestion()`, `commitTaskAssignment()`.
- **Backend Routes & Controller:**
  - `POST /api/workload/suggest` $\rightarrow$ `workloadController.js:213` (`suggestTask`).
  - `POST /api/workload/assign` $\rightarrow$ `workloadController.js:447` (`assignTask`).
- **Tables & Columns Touched:** Reads/Inserts `tasks` (`created_by`, `assigned_to`, `subject_id`, `description`, `difficulty`, `scheduled_date`, `deadline`, `status`).
- **Validation & Auth Check:** Difficulty integer ($1 \le D \le 10$). Rejects with HTTP 409 Conflict if resulting load $> 15$.
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 3: Multi-Domain Department Workload Analytics
- **User Workflow:** HOD selects "Department Workload" tab, filters by category (Department, Institutional, ExtraProactive, FDP_Workshop, Research, Consultancy), views table of faculty duty allocations and aggregate hours.
- **Frontend File & Function:** `UI/hod/js/hod.js:fetchDeptHodSummary()`, `renderDeptWorkloadTable()`.
- **Backend Route & Controller:** `GET /api/workload/department/hod/summary` $\rightarrow$ `workloadController.js:1037` (`getHodDepartmentSummary`).
- **Tables & Columns Touched:** Reads `faculty_department_workload`, `users`.
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 4: Timetable Matrix
- **User Workflow:** HOD views weekly class periods per course and semester.
- **Frontend File & Function:** `UI/hod/js/hod.js:renderTimetable()`.
- **Backend Route:** None. Uses `defaultTimetable` array stored in `localStorage` under `uniflow_timetable`.
- **Status:** **MOCKED WITH `localStorage`.** (Table `timetable` in PostgreSQL has 0 rows).

#### Feature 5: Student Grievance Resolution
- **User Workflow:** HOD reviews student grievance list, enters resolution remarks in modal, and clicks "Send Remark".
- **Frontend File & Function:** `UI/hod/js/hod.js:renderGrievances()`, `openGrievanceModal()`.
- **Backend Route:** None. Mutates in-memory array (`UI/hod/js/hod.js:1263`: `g.resolution = remarks; g.status = 'Remark Sent';`).
- **Status:** **FRONTEND ONLY (STATIC SAMPLE DATA).** (Table `grievances` has 0 rows).

#### Feature 6: Department Messaging / Chat
- **User Workflow:** Chat widget displays pre-populated dialogue between HOD and faculty.
- **Frontend File & Function:** `UI/hod/js/hod.js:renderChat()`.
- **Backend Route:** None.
- **Status:** **FRONTEND ONLY (STATIC SAMPLE DATA).** (Tables `chat_threads`, `messages` have 0 rows).

---

### 2.2 Faculty Module

Client Files: `UI/faculty/dashboard.html`, `UI/faculty/js/faculty.js`, `UI/css/theme.css`.

#### Feature 1: Assigned Tasks Tracking & Status Toggling
- **User Workflow:** Faculty views tasks assigned by HOD in a table. Clicking "Start" transitions status to `in_progress`. Clicking "Mark Done" transitions status to `completed`. Clicking "Reopen" resets to `pending`.
- **Frontend File & Function:** `UI/faculty/js/faculty.js:fetchFacultyTasks()`, `updateFacultyTaskStatus(id, newStatus)`.
- **Backend Routes & Controller:**
  - `GET /api/faculty/tasks` $\rightarrow$ `backend/src/controllers/facultyController.js:10` (`getMyTasks`).
  - `PATCH /api/faculty/tasks/:id/status` $\rightarrow$ `facultyController.js:70` (`updateTaskStatus`).
- **Tables & Columns Touched:** `tasks` (`status = $1 WHERE id = $2 AND assigned_to = $3`).
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 2: Academic Class Declaration (Engine C)
- **User Workflow:** Faculty opens "Add Class" modal (`#addClassModal`), selects role (Theory/Lab/Project), enters L-T-P-J code, cohort size, prior experience flag, and lab modification flag. Clicks submit.
- **Frontend File & Function:** `UI/faculty/js/faculty.js:addClassForm.onsubmit`.
- **Backend Route & Controller:** `POST /api/workload/classes` $\rightarrow$ `workloadController.js:574` (`addClass`).
- **Tables Touched:** Transactional write to `courses`, `subjects`, `subject_faculty`, `teaching_loads`, `paper_and_assignment_setting`, `preparation_and_course_factors`, `evaluation_units`, `workload_master`.
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 3: Student Assignment Creation & Collision Prevention (Engine B)
- **User Workflow:** Faculty creates an assignment for their class. Clicks "Check Collision". If daily load $> 10$ or weekly load $> 18$, system alerts with candidate dates. Faculty can pick an alternative date or force submission via override checkbox.
- **Frontend File & Function:** `UI/faculty/js/faculty.js:checkStudentCollision()`, `publishStudentAssignment()`.
- **Backend Routes & Controller:**
  - `POST /api/faculty/student-assignments/check` $\rightarrow$ `facultyController.js:171` (`checkStudentWorkload`).
  - `POST /api/faculty/student-assignments` $\rightarrow$ `facultyController.js:338` (`assignWorkToStudents`).
- **Tables Touched:** `student_assignments`, `student_assignment_submissions`.
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 4: Faculty Task Deliverable & File Upload
- **User Workflow Claimed in Old Docs:** Faculty uploads PDF/ZIP deliverable file with remarks via modal.
- **Source Code Verification:** **NOT IMPLEMENTED.** No upload input, no `FileReader`, no file submission route exists in `faculty.js`, `facultyRoutes.js`, or `server.js`. The faculty dashboard only contains status toggle buttons.

---

### 2.3 Student Module

Client Files: `UI/student/dashboard.html`, `UI/student/js/student.js`, `UI/student/css/student.css`.

#### Feature 1: Student Dashboard & 20-Point Workload Gauge
- **User Workflow:** Student logs in, views enrolled course information, pending assignments count, and a dynamic circular gauge reflecting current workload score out of 20 points.
- **Frontend File & Function:** `UI/student/js/student.js:loadDashboard()`.
- **Backend Route & Controller:** `GET /api/student/dashboard` $\rightarrow$ `backend/src/controllers/studentController.js:10` (`getStudentDashboard`).
- **Tables Touched:** Reads `users`, `students`, `courses`, `student_assignments`, `student_assignment_submissions`.
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 2: Enrolled Courses & Assigned Tasks Listing
- **User Workflow:** Student views subjects and active course assignments with due dates and difficulty badges.
- **Frontend File & Function:** `UI/student/js/student.js:loadCourses()`, `loadAssignments()`.
- **Backend Routes & Controller:**
  - `GET /api/student/courses` $\rightarrow$ `studentController.js:154` (`getStudentCourses`).
  - `GET /api/student/assignments` $\rightarrow$ `studentController.js:78` (`getStudentAssignments`).
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 3: Assignment Turn-In Submission
- **User Workflow:** Student clicks "Turn In" on an assignment, enters submission text (e.g. GitHub URL or notes) and optional filename, and submits. Assignment moves from pending to submitted, immediately lowering the student's workload gauge.
- **Frontend File & Function:** `UI/student/js/student.js:openTurnInModal()`, `turnInForm.onsubmit`.
- **Backend Route & Controller:** `PATCH /api/student/assignments/:id/submit` $\rightarrow$ `studentController.js:195` (`submitAssignment`).
- **Tables Touched:** `student_assignment_submissions` (`status = 'submitted'`, `submission_text = $1`, `submission_file = $2`, `submitted_at = NOW()`).
- **Status:** **IMPLEMENTED AND CONNECTED TO API.**

#### Feature 4: Academic Performance & Attendance Tracking
- **User Workflow:** Student views attendance percentage bars and GPA history charts.
- **Frontend Implementation:** Hardcoded sample values in `UI/student/js/student.js:loadCourses` (`attendance: 88%`) and static SVG bars. No backend route called.
- **Status:** **FRONTEND ONLY (STATIC SAMPLE DATA).**

---

### 2.4 Administrator Module

Client Files: `UI/admin/dashboard.html`, `UI/admin/js/admin.js`, `UI/admin/css/admin.css`.

#### All Admin Features:
- Department creation and editing
- Course creation and semester setup
- Faculty and student user registration with password input
- HOD assignment to departments
- Password reveal toggle and credential reset

**Source Code Verification:**
- Handled exclusively in `UI/admin/js/admin.js:1-850`.
- Operates entirely on browser `localStorage` (`uniflow_dataStore`).
- Zero backend API routes exist under `/api/admin/*`.
- **Status:** **MOCKED WITH `localStorage`.**
