# UniFlow — Verified Project Overview (v2)

> **Document Status:** VERIFIED AGAINST SOURCE CODE  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Working Tree State:** Clean with respect to repository source files. One tracked configuration file (`backend/.env`) contains a single line addition defining the local `DB_PASSWORD` variable (`git diff --ignore-space-at-eol --stat`: `1 file changed, 1 insertion(+)`).  
> **Auditor Role:** Senior Software Architect, Database Engineer & Technical Documentation Specialist  
> **Date of Audit:** October 23, 2026  

---

## 1. Executive Summary

**UniFlow** is an academic resource and workload governance web platform designed for higher-education engineering and computer applications departments (specifically tailored to autonomous institution frameworks such as TKM College of Engineering, Regulations 2023). 

The platform addresses three core institutional challenges:
1. **Administrative Task Allocation Governance:** Ensuring departmental task assignments (accreditation files, question paper drafting, lab evaluations) distributed by the Head of Department (HOD) do not exceed faculty bandwidth (enforced via a 15-point active workload ceiling).
2. **Student Assignment Collision Mitigation:** Preventing multiple course instructors from piling heavy deadlines onto the same student cohort on the same calendar day or week (enforced via a 10-point daily and 18-point rolling 7-day weekly collision detection engine).
3. **Multi-Faceted Faculty Academic Workload Formulation:** Quantifying academic teaching, laboratory supervision, continuous assessment, and institutional service into standardized workload units using course L-T-P-J metrics and experience multipliers.

---

## 2. Core Stakeholders & Role Architecture

The UniFlow codebase defines four user personas:

| Role | Server Enforcement Status | Client Portal Location | Key Implemented Features | Client-Side Mocked / Unconnected Features |
| :--- | :--- | :--- | :--- | :--- |
| **Head of Department (HOD)** | **FRONTEND ONLY** (Verified: all routes accept any valid JWT without role verification) | `UI/hod/dashboard.html` (`UI/hod/js/hod.js`) | • Workload Chart.js visualization (`GET /api/workload/hod/summary`)<br>• Workload-aware task delegation with alternative recommendations (`POST /api/workload/suggest`, `POST /api/workload/assign`)<br>• Multi-domain department workload analytics (`GET /api/workload/department/hod/summary`) | • Timetable Matrix scheduling (`localStorage`)<br>• Student Grievance Resolution modal (`localStorage`)<br>• Department Chat (`localStorage`) |
| **Faculty Member** | **FRONTEND ONLY** (Authentication verified via JWT; route permissions not checked by role) | `UI/faculty/dashboard.html` (`UI/faculty/js/faculty.js`) | • HOD Task monitoring and status toggle (`GET /api/faculty/tasks`, `PATCH /api/faculty/tasks/:id/status`)<br>• L-T-P-J Academic Class declaration with 5-table write (`POST /api/workload/classes`)<br>• Student Assignment publishing with Collision Detection (`POST /api/faculty/student-assignments/check`, `POST /api/faculty/student-assignments`)<br>• Department responsibility tracking (`GET/POST /api/workload/department/faculty`) | • Timetable view (`localStorage`)<br>• Grievance filing (`localStorage`)<br>• Deliverable file upload (NOT IMPLEMENTED in code) |
| **Student** | **FRONTEND ONLY** | `UI/student/dashboard.html` (`UI/student/js/student.js`) | • Student Dashboard overview (`GET /api/student/dashboard`)<br>• Enrolled course listing (`GET /api/student/courses`)<br>• Course assignment tracking (`GET /api/student/assignments`)<br>• Assignment text/file turn-in (`PATCH /api/student/assignments/:id/submit`) | • Semester Timetable (`localStorage`)<br>• Attendance progress (`localStorage`)<br>• Performance / GPA trends (`localStorage`) |
| **Administrator** | **FRONTEND ONLY** (No API endpoints exist for admin) | `UI/admin/dashboard.html` (`UI/admin/js/admin.js`) | None connected to backend. | • Department Management (`localStorage`)<br>• Course Management (`localStorage`)<br>• User Management & Credential Reset (`localStorage`)<br>• HOD Assignment Directory (`localStorage`) |

---

## 3. High-Level System Architecture

UniFlow follows a classic decoupled client-server architecture:
```
┌────────────────────────────────────────────────────────────────────────┐
│                        WEB BROWSER CLIENTS                             │
│                                                                        │
│   [ Admin Console ]     [ HOD Console ]   [ Faculty Portal ]  [ Student Portal ]
│   (HTML/CSS/JS)         (HTML/CSS/JS)     (HTML/CSS/JS)       (HTML/CSS/JS)
│                                                                        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / REST (Fetch API)
                                     │ Origin: http://localhost:5000 (Static Express)
                                     │ or http://127.0.0.1:5500 (Live Server)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NODE.JS / EXPRESS 5 BACKEND                     │
│                             (Port 5000)                                │
│                                                                        │
│  [ express.json() (100KB limit) ] ──► [ cors() ] ──► [ Static UI Serv ]│
│                                                                        │
│  Route Handlers:                                                       │
│    • /api/auth       (authRoutes.js)                                   │
│    • /api/workload   (workloadRoutes.js)                               │
│    • /api/faculty    (facultyRoutes.js)                                │
│    • /api/student    (studentRoutes.js)                                │
│                                                                        │
│  Security Layer:                                                       │
│    • authMiddleware.js: authenticateToken (JWT Signature Verification) │
│    • bcryptjs: Salt rounds = 10                                        │
│                                                                        │
│  Workload Calculation Engines:                                         │
│    • Engine A: HOD Task Delegation (Threshold = 15 pts)                │
│    • Engine B: Student Collision Engine (Daily = 10, Weekly = 18 pts)  │
│    • Engine C: L-T-P-J Course Workload Formulation (5 relational writes)│
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ pg Client Pool (node-postgres)
                                     │ Port 5432
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL RELATIONAL DATABASE                    │
│                               (uniflow)                                │
│                                                                        │
│   Active Relational Core (18 Tables in schema.sql & initWorkloadTables)│
│   ------------------------------------------------------------------   │
│   • Identity & Academics: users, departments, user_departments,        │
│                           courses, subjects, subject_faculty           │
│   • Administrative Tasks: tasks                                        │
│   • Student Portal:       students, student_assignments,               │
│                           student_assignment_submissions               │
│   • Academic Workload:    teaching_loads, paper_and_assignment_setting, │
│                           preparation_and_course_factors,              │
│                           evaluation_units, workload_master            │
│   • Multi-Domain Service: department_roles_master,                     │
│                           department_tasks_master,                     │
│                           faculty_department_workload                  │
│                                                                        │
│   Legacy / Prototype Tables (9 Unconnected tables in live DB):         │
│   attendance, chat_threads, chat_participants, messages, grievances,   │
│   marks, timetable, timetable_faculty, student_enrollments             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Implementation Realities vs Earlier Documentation Claims

A rigorous audit comparing the actual source code with earlier unverified handoff documentation (`00`–`08`) revealed critical contradictions that have been fully resolved:

1. **Faculty Deliverable File Upload:**
   - *Old Claim:* Base64 deliverable file upload to `backend/uploads/` with static routing at `/uploads`.
   - *Verified Reality:* **NOT IMPLEMENTED.** No upload endpoint, no `multer`, no `fs.writeFileSync`, no static `/uploads` handler exists on any commit. The faculty interface simply provides "Start", "Mark Done", and "Reopen" buttons issuing `PATCH /api/faculty/tasks/:id/status`.
2. **Server-Side Role-Based Authorization:**
   - *Old Claim:* Strict enforcement via `requireHOD`, `requireFaculty`, `requireStudent`.
   - *Verified Reality:* **ABSENT ON SERVER.** `authMiddleware.js` exports only `authenticateToken`, which validates JWT cryptographic signatures. Role checking is performed solely client-side in browser JS. A student token can call HOD and Faculty endpoints directly.
3. **JSON Body Parsing Limit:**
   - *Old Claim:* 50 MB body limit (`express.json({ limit: '50mb' })`).
   - *Verified Reality:* Plain `app.use(express.json())` is configured in `backend/src/server.js:20`. The effective default limit is **100 KB**.
4. **Environment Fallback Secrets:**
   - *Old Claim:* Hardcoded fallback JWT secrets and fallback DB connection strings.
   - *Verified Reality:* Neither `authMiddleware.js` nor `authController.js` nor `db.js` contains fallback secrets. If `JWT_SECRET` is unset, `jwt.sign()` and `jwt.verify()` throw fatal exceptions resulting in HTTP 500 / 401 errors.
5. **Student Collision Weekly Window:**
   - *Old Claim:* $\pm 6$ days Monday–Sunday calendar window.
   - *Verified Reality:* A **rolling 7-day window** defined as `due_date BETWEEN ($3::date - INTERVAL '3 days') AND ($3::date + INTERVAL '3 days')`. Alternative date calculations scan the next 14 calendar days but evaluate only daily workload ($\le 10$), omitting weekly checks.
6. **Database Schema Table Count:**
   - *Old Claim:* Presentation slides claimed "16 tables"; older documentation vacillated between 10 and 16.
   - *Verified Reality:* The active schema defines **18 tables**. The live PostgreSQL database contains **27 tables** due to 9 leftover prototype tables (`attendance`, `chat_threads`, `chat_participants`, `messages`, `grievances`, `marks`, `timetable`, `timetable_faculty`, `student_enrollments`) documented in `changes.docx`.
