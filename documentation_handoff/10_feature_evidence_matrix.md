# UniFlow — Feature Evidence Matrix (v2)

> **Document Status:** VERIFIED AGAINST CODEBASE, GIT OBJECTS & TEST RESULTS  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Auditor Role:** Senior Software Architect & Code Auditor  
> **Date of Audit:** October 23, 2026  

---

## 1. Feature Evidence Matrix

This matrix connects every implemented and mocked feature of the UniFlow system to its concrete implementation source code, database tables, HTTP API route, test verification evidence, originating Git commit, and corresponding screenshot identifier.

| Feature Identifier & Name | Source File & Function | Database Objects Touched | Registered API Route | Test Evidence from Phase 4 | Primary Commit Hash | Screen / Screenshot Reference | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01: User Login & JWT Issuance** | `backend/src/controllers/authController.js:11` (`login`) | `users` (`email`, `password_hash`, `role`) | `POST /api/auth/login` | `TC-AUTH-01`, `TC-AUTH-02`, `TC-AUTH-03` (Avg 68.5 ms) | `f7479cb`, `7c189a7` | `login_screen.png` | **IMPLEMENTED** |
| **F-02: Workload-Aware Task Delegation (Engine A)** | `backend/src/controllers/workloadController.js:447` (`assignTask`) | `tasks` (`assigned_to`, `difficulty`, `status`) | `POST /api/workload/assign` | `TC-ENG-A-01` (HTTP 201), `TC-ENG-A-02` (HTTP 409 Overload) | `03ae98b`, `7c189a7` | `hod_task_modal.png` | **IMPLEMENTED** |
| **F-03: Workload Suggestions & Alternatives (Engine A)** | `backend/src/controllers/workloadController.js:213` (`suggestTask`) | `tasks`, `users`, `subjects` | `POST /api/workload/suggest` | `TC-ENG-A-02` (Discovered 5 faculty, 3 date windows) | `03ae98b`, `7c189a7` | `hod_task_suggestions.png` | **IMPLEMENTED** |
| **F-04: Chart.js Academic Workload Visualizer** | `UI/hod/js/hod.js:fetchWorkloadSummary`, `renderWorkloadChart` | `workload_master`, `teaching_loads`, `evaluation_units` | `GET /api/workload/hod/summary` | Verified 19 rows loaded across all 5 tables | `2f95fcc`, `7c189a7` | `hod_dashboard_analytics.png` | **IMPLEMENTED** |
| **F-05: Multi-Domain Department Workload (HOD)** | `backend/src/controllers/workloadController.js:1037` (`getHodDepartmentSummary`) | `faculty_department_workload`, `users` | `GET /api/workload/department/hod/summary` | 20 rows returned across 6 categories | `7c189a7` | `hod_dept_workload_tab.png` | **IMPLEMENTED** |
| **F-06: Faculty Tasks Listing & Status Toggle** | `backend/src/controllers/facultyController.js:10` (`getMyTasks`, `updateTaskStatus`) | `tasks` (`status = 'in_progress'`, `'completed'`) | `GET /api/faculty/tasks`, `PATCH /api/faculty/tasks/:id/status` | Verified toggle to `in_progress` (HTTP 200) | `ad9770c`, `7c189a7` | `faculty_dashboard_tasks.png` | **IMPLEMENTED** |
| **F-07: Academic Class Declaration (Engine C)** | `backend/src/controllers/workloadController.js:574` (`addClass`) | `courses`, `subjects`, `subject_faculty`, 5 workload tables | `POST /api/workload/classes` | `TC-ENG-C-01` (Atomic write to 5 workload tables) | `72a18b6`, `7c189a7` | `faculty_add_class_modal.png` | **IMPLEMENTED** |
| **F-08: Student Collision Detection Engine (Engine B)** | `backend/src/controllers/facultyController.js:171` (`checkStudentWorkload`) | `student_assignments`, `subjects`, `courses` | `POST /api/faculty/student-assignments/check` | `TC-ENG-B-01` (Collision detected, 4 alt dates) | `ad9770c`, `634801c` | `faculty_collision_alert.png` | **IMPLEMENTED** |
| **F-09: Assignment Publishing with Fan-Out Write** | `backend/src/controllers/facultyController.js:338` (`assignWorkToStudents`) | `student_assignments`, `student_assignment_submissions` | `POST /api/faculty/student-assignments` | Verified assignment ID 5 created, distributed to 2 students | `ad9770c` | `faculty_assignment_modal.png` | **IMPLEMENTED** |
| **F-10: Student Dashboard & 20-Point Workload Gauge** | `backend/src/controllers/studentController.js:10` (`getStudentDashboard`) | `students`, `student_assignments`, `student_assignment_submissions` | `GET /api/student/dashboard` | Verified gauge score returned (Avg 4.30 ms) | `ad9770c` | `student_dashboard_gauge.png` | **IMPLEMENTED** |
| **F-11: Student Assignment Listing & Turn-In** | `backend/src/controllers/studentController.js:78, 195` (`submitAssignment`) | `student_assignment_submissions` (`status = 'submitted'`) | `GET /api/student/assignments`, `PATCH /api/student/assignments/:id/submit` | `TC-ENG-B-02` (Status updated to submitted) | `ad9770c` | `student_turn_in_modal.png` | **IMPLEMENTED** |
| **F-12: Faculty Multi-Domain Task Allocation** | `backend/src/controllers/workloadController.js:936` (`saveFacultyDepartmentWorkload`) | `faculty_department_workload` | `POST /api/workload/department/faculty` | Verified insert/update of duty hours | `7c189a7` | `faculty_dept_workload_tab.png` | **IMPLEMENTED** |
| **F-13: Timetable Matrix Scheduler** | `UI/hod/js/hod.js:renderTimetable`, `UI/faculty/js/faculty.js` | None in DB (`timetable` has 0 rows) | None | Stored in `localStorage.getItem('uniflow_timetable')` | `5572c9f` | `hod_timetable_screen.png` | **MOCKED IN localStorage** |
| **F-14: Grievance Lodging & Resolution** | `UI/hod/js/hod.js:openGrievanceModal`, `sendRemarkBtn.onclick` | None in DB (`grievances` has 0 rows) | None | In-memory object mutation (`hod.js:1263`) | `5572c9f` | `hod_grievance_modal.png` | **MOCKED IN localStorage** |
| **F-15: Department Messaging / Chat** | `UI/hod/js/hod.js:renderChat` | None in DB (`chat_threads` has 0 rows) | None | Hardcoded array in `UI/hod/js/hod.js:1894-1925` | `5572c9f` | `hod_chat_widget.png` | **FRONTEND ONLY (STATIC)** |
| **F-16: Admin Department & Course Management** | `UI/admin/js/admin.js:renderDepartments`, `renderCourses` | None in DB (Operates in browser) | None | Stored in `localStorage.getItem('uniflow_dataStore')` | `5572c9f`, `03ae98b` | `admin_depts_screen.png` | **MOCKED IN localStorage** |
| **F-17: Admin User Enrollment & Password Management** | `UI/admin/js/admin.js:saveUser`, `resetPassword` | None in DB | None | Saves user credentials to `localStorage` | `f8a4fc9`, `03ae98b` | `admin_users_modal.png` | **MOCKED IN localStorage** |
| **F-18: Faculty Deliverable File Upload** | Claimed in earlier docs (`/deliverable`) | `tasks` (`attachment_url`, `faculty_remark`) | None registered in Express routes | Verified 0 code references across all branches | `8e7dfde` (Docs only) | N/A | **NOT IMPLEMENTED** |

---

## 2. Screenshot Reproduction & Verification Guide

If live browser automation encounters sandbox or driver constraints, each screen can be reproduced in a standard browser using the following verified test data and navigation sequences:

### 1. `login_screen.png`
- **URL:** `http://localhost:5000/index.html`
- **Visuals:** Frosted glassmorphism card, UniFlow logo, Email and Password inputs, and 5 "Quick Demo Credentials" shortcut buttons.

### 2. `hod_dashboard_analytics.png`
- **Login Credentials:** `hod.cs@uniflow.edu` / `password123`
- **URL:** `http://localhost:5000/hod/dashboard.html`
- **Visuals:** Horizontal Chart.js bar chart showing cumulative workload for Grace Hopper, Linus Torvalds, Dr. John Doe, Dr. Jane Smith, and Dr. Alan Walker. Clicking "Evaluation Units" expands the drill-down subject breakdown table.

### 3. `hod_task_modal.png` & `hod_task_suggestions.png`
- **Action:** On HOD Dashboard, click **"Assign Task"**.
- **Test Input:** Select Faculty: "Grace Hopper", Subject: "Operating Systems", Difficulty: 10, Dates: Current Date to Current Date + 3 days.
- **Visuals:** Shows red overload warning banner ("Workload limit exceeded... reaches 19 pts (Maximum allowed: 15 pts)"), and renders recommendation pills with alternative teachers (e.g. Linus Torvalds).

### 4. `faculty_dashboard_tasks.png`
- **Login Credentials:** `faculty@uniflow.edu` / `faculty123`
- **URL:** `http://localhost:5000/faculty/dashboard.html`
- **Visuals:** Overview stats (Classes, Weekly Hours, Active Tasks), table of HOD-assigned tasks with action buttons "Start" and "Mark Done".

### 5. `faculty_add_class_modal.png` (Engine C)
- **Action:** On Faculty Dashboard, click **"Add Class"**.
- **Test Input:** Program: "B.Tech CSE", Semester: 5, Type: "Core Theory", L-T-P-J: `3-1-0-0`, Role: Theory, Subject: "Compiler Design", Class Size: 60, Prior Exp: Yes.
- **Visuals:** Form submits and computes 27.09 units into the 5 academic workload tables.

### 6. `faculty_collision_alert.png` (Engine B)
- **Action:** On Faculty Dashboard, click **"Create Assignment"**.
- **Test Input:** Subject: "Operating Systems", Difficulty: 5, Due Date: Select date where another assignment already exists (e.g. `2026-11-10`).
- **Visuals:** Collision alert banner displays: "Daily workload threshold exceeded (13 pts > 10 pts max)" and renders 4 alternative date buttons.

### 7. `student_dashboard_gauge.png`
- **Login Credentials:** `student@uniflow.edu` / `student123`
- **URL:** `http://localhost:5000/student/dashboard.html`
- **Visuals:** Circular SVG workload gauge showing current academic score out of 20, active course assignments list with "Turn In" buttons.
