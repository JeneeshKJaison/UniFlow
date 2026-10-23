# UniFlow — Changelog & Errata from Documentation v1 (v2)

> **Document Status:** VERIFIED AUDIT ERRATA REGISTER  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Auditor Role:** Senior Code Auditor & Technical Documentation Specialist  
> **Date of Audit:** October 23, 2026  

---

## 1. Overview

This document presents a side-by-side errata register tracking every incorrect statement in the earlier documentation handoff (`00`–`08`), contrasting the original text with the corrected fact and citing the verifying source code.

---

## 2. Errata Register

### Item 1: Deliverable File Submission Subsystem
- **Old v1 Text (`01_architecture_and_stack.md:Section 4`, `03_api_catalogue.md:3.3`):**
  > "UniFlow implements a deliverable file submission subsystem for faculty task deliverables (`POST /api/faculty/tasks/:id/deliverable`). The client reads the deliverable file into an ArrayBuffer/Base64 string and sends it as JSON... File storage writes the buffer into `backend/uploads/` with a timestamped filename... Static file serving exposes `http://localhost:5000/uploads/...`."
- **Corrected Fact:**
  > The faculty task deliverable file upload feature is **NOT IMPLEMENTED**. No upload route exists in `facultyRoutes.js`, no file-writing logic exists in `facultyController.js`, and `server.js` serves only `../../UI`, not an uploads directory. The faculty user interface provides simple status buttons ("Start", "Mark Done", "Reopen") that issue `PATCH /api/faculty/tasks/:id/status` with `{ status }`.
- **Evidence Citation:**
  - `backend/src/routes/facultyRoutes.js:14-22` (Registers only 6 routes; none for file upload).
  - `backend/src/controllers/facultyController.js:70-120` (`updateTaskStatus` updates only the `status` column).
  - `backend/src/server.js:21` (`app.use(express.static(path.join(__dirname, '../../UI')))`).
  - `UI/faculty/js/faculty.js:271-330` (Rendered buttons call `updateFacultyTaskStatus` with status string).

---

### Item 2: Server-Side Role Enforcement
- **Old v1 Text (`01_architecture_and_stack.md:3.2`, `06_testing_and_limitations.md:Category A`):**
  > "UniFlow implements role-based access control middleware: `requireHOD`, `requireFaculty`, and `requireStudent`. Endpoints are protected to ensure, for example, that a student token cannot access HOD routes."
- **Corrected Fact:**
  > Server-side role enforcement is **COMPLETELY ABSENT**. The file `backend/src/middleware/authMiddleware.js` exports only `authenticateToken`, which performs cryptographic signature verification via `jwt.verify()` without validating the role. All role checks are performed purely on the client side in browser JavaScript. An authenticated student token can successfully call administrative and HOD endpoints.
- **Evidence Citation:**
  - `backend/src/middleware/authMiddleware.js:3-43` (Only `authenticateToken` is exported).
  - `backend/src/controllers/workloadController.js:458-466` (`assignTask` only checks `req.user.userId || req.user.id`).
  - Real test call `TC-SEC-02` (`scratch/run_full_audit.js`): Calling `GET /api/workload/faculty` with a student token returned HTTP 200 OK with full faculty workload data.

---

### Item 3: JSON Request Body Limit
- **Old v1 Text (`01_architecture_and_stack.md:3.2`):**
  > "`express.json({ limit: '50mb' })`: Extended JSON body parsing to accommodate base64 deliverable file uploads."
- **Corrected Fact:**
  > The JSON body parser is configured with plain `app.use(express.json())` without options in `backend/src/server.js:20`. Under Express 5 and `body-parser`, the effective default body size limit is **100 KB**.
- **Evidence Citation:**
  - `backend/src/server.js:20` (`app.use(express.json());`).

---

### Item 4: Fallback Secrets in Source Code
- **Old v1 Text (`08_unverified_claims.md:Item 4`):**
  > "Database and auth configurations contain hardcoded fallback secrets: `1234` in `db.js` and `uniflow_demo_secret_key_2026` in `authMiddleware.js`."
- **Corrected Fact:**
  > Production configuration files contain **NO FALLBACK SECRETS**. In `backend/src/config/db.js:4-10`, `process.env.DB_PASSWORD` has no default fallback. In `authController.js:79` and `authMiddleware.js:27`, `process.env.JWT_SECRET` has no fallback; missing environment variables trigger fatal exceptions returning HTTP 500 / 401. (Fallback strings were present only in the scratch script `backend/test.js` and mock fallback objects in `workloadRoutes.js`).
- **Evidence Citation:**
  - `backend/src/config/db.js:4-10`.
  - `backend/src/controllers/authController.js:79`.
  - `backend/src/middleware/authMiddleware.js:25-28`.

---

### Item 5: Student Workload Weekly Collision Window
- **Old v1 Text (`04_workload_algorithms.md:Section 2`, `08_unverified_claims.md:Item 5`):**
  > "The student collision engine evaluates a Monday-to-Sunday $\pm 6$ days calendar week."
- **Corrected Fact:**
  > The student weekly workload calculation uses a **rolling 7-day interval** centered on the proposed due date (`due_date ± 3 days`). Furthermore, the alternative date discovery loop (`offset = 1..14`) checks only the daily threshold ($\le 10$), completely omitting the weekly threshold ($\le 18$) during alternative candidate selection.
- **Evidence Citation:**
  - `backend/src/controllers/facultyController.js:246` (`due_date BETWEEN ($3::date - INTERVAL '3 days') AND ($3::date + INTERVAL '3 days')`).
  - `backend/src/controllers/facultyController.js:281` (`if (candResulting <= MAX_DAILY_STUDENT_WORKLOAD)`).

---

### Item 6: Database Table Count & "16 Tables" Slide Claim
- **Old v1 Text (`00_project_overview.md`, `02_database_design.md`):**
  > "UniFlow comprises 10 relational tables in PostgreSQL." (Conflicted with presentation slide claim of 16 tables).
- **Corrected Fact:**
  > The active relational schema in `backend/schema.sql` defines exactly **18 tables** (10 core entity/student tables + 5 academic workload tables + 3 multi-domain tables). The live PostgreSQL database physically contains **27 tables** because 9 legacy prototype tables (`attendance`, `chat_threads`, `chat_participants`, `messages`, `grievances`, `marks`, `timetable`, `timetable_faculty`, `student_enrollments`) documented in `changes.docx` were retained from early prototyping. The slide claim of "16 tables" directly matched the 16 tables listed in `changes.docx`.
- **Evidence Citation:**
  - `backend/schema.sql:1-253`.
  - `changes.docx` text extracted via `scratch/extract_docx.ps1` (Lists tables 1 through 16).
  - PostgreSQL live query (`scratch/check_db.js`): returned 27 physical tables.

---

### Item 7: Large Class Adjustment Formulation
- **Old v1 Text (`04_workload_algorithms.md:Section 3`, `06_testing_and_limitations.md:TC-WL-01`):**
  > "Large classes (> 80 students) receive a $1.25\times$ scale adjustment on teaching load."
- **Corrected Fact:**
  > The implementation applies a flat unit addition of **+1.0 unit**, not a multiplicative factor.
- **Evidence Citation:**
  - `backend/src/controllers/workloadController.js:649` (`const largeClassAdjustment = studentsClass > 80 ? 1.0 : 0;`).

---

### Item 8: Token Expiration & Storage Mechanism
- **Old v1 Text (`01_architecture_and_stack.md:3.1`):**
  > "JWT token expires in 7 days / 24 hours and is stored in browser `sessionStorage`."
- **Corrected Fact:**
  > The JWT token expiry is explicitly configured as **`'1d'`** (24 hours). The token is saved in browser **`localStorage`** under the key **`'uniflow_token'`** (`localStorage.setItem('uniflow_token', data.token)`), not `sessionStorage`.
- **Evidence Citation:**
  - `backend/src/controllers/authController.js:81` (`expiresIn: '1d'`).
  - `UI/js/login.js:172-175` (`localStorage.setItem('uniflow_token', data.token)`).

---

### Item 9: Admin Module Backend Integration
- **Old v1 Text (`00_project_overview.md`, `05_module_implementation.md`):**
  > "Admin console connects to `/api/admin/*` routes to enroll users, manage departments, and assign HOD credentials."
- **Corrected Fact:**
  > Zero admin endpoints exist in the Express backend. The admin console (`UI/admin/js/admin.js`) operates entirely within browser **`localStorage`** (`uniflow_dataStore`), creating an isolated client-side mock.
- **Evidence Citation:**
  - `backend/src/server.js:22-25` (Mounts only `/api/auth`, `/api/workload`, `/api/faculty`, `/api/student`).
  - `UI/admin/js/admin.js:1-829` (Mutates `uniflow_dataStore` in `localStorage` with zero `fetch()` calls).
