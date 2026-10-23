# UniFlow — Register of Corrected Claims & Discrepancies (v2)

> **Document Status:** VERIFIED AGAINST CODEBASE EVIDENCE  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Auditor Role:** Senior Code Auditor & Software Architect  
> **Date of Audit:** October 23, 2026  

---

## 1. Overview of Audit Corrections

Earlier handoff documentation (`documentation_handoff/00`–`08`, committed in `8e7dfde`) was drafted prior to exhaustive verification against the active codebase. As a consequence, it contained fabricated endpoints, exaggerated security mechanisms, and inaccurate algorithmic specifications.

This register formally catalogs every erroneous claim, provides the verified fact, and cites the concrete source code evidence.

---

## 2. Itemized Discrepancy Register

### Claim 1: Faculty Task Deliverable File Upload
- **Claimed in v1 Documentation:**
  > "UniFlow implements a deliverable file submission subsystem for faculty task deliverables (`POST /api/faculty/tasks/:id/deliverable`). Files are uploaded as Base64, saved to `backend/uploads/`, and statically served via `express.static('/uploads')`. HOD can download them via `/api/faculty/tasks/file/:filename`." (Documented in `01_architecture_and_stack.md:Section 4`, `03_api_catalogue.md:3.3`, `05_module_implementation.md:3`, and test case `TC-DELIV-01`).
- **Verified Code Reality:** **NOT IMPLEMENTED.**
  - No route `POST /api/faculty/tasks/:id/deliverable` exists in `backend/src/routes/facultyRoutes.js` (which registers only 6 routes).
  - No static handler for `/uploads` exists in `backend/src/server.js:21` (only `../../UI` is statically served).
  - No directory named `uploads` exists anywhere in the repository (`git log --all -- "backend/uploads"` returns null).
  - Neither `FileReader` nor `deliverable` forms exist in `UI/faculty/js/faculty.js` or `UI/faculty/dashboard.html`.
  - The UI provides only simple status buttons ("Start", "Mark Done", "Reopen") calling `PATCH /api/faculty/tasks/:id/status`.
- **Classification:** **FABRICATED IN EARLIER DOCUMENTATION / NOT IMPLEMENTED.**

---

### Claim 2: Server-Side Role-Based Authorization
- **Claimed in v1 Documentation:**
  > "Endpoints are strictly protected by role enforcement middleware: `requireHOD`, `requireFaculty`, and `requireStudent`. A student token cannot access HOD routes." (Documented in `01_architecture_and_stack.md:3.2`, `06_testing_and_limitations.md:TC-AUTH-04`).
- **Verified Code Reality:** **ABSENT ON SERVER.**
  - `backend/src/middleware/authMiddleware.js` exports only a single function: `authenticateToken`.
  - `authenticateToken` strictly validates JWT cryptographic signatures using `jwt.verify(token, process.env.JWT_SECRET)`. It does NOT inspect `decoded.role`.
  - No controller function in `workloadController.js` or `facultyController.js` checks `req.user.role`.
  - During live testing (Phase 4, `TC-SEC-02`), a valid student token issued to Ada Lovelace called `GET /api/workload/faculty` and received HTTP 200 OK with full faculty workload data.
- **Classification:** **ERRONEOUS CLAIM / SECURITY VULNERABILITY (LIM-01).**

---

### Claim 3: JSON Request Body Parsing Limit
- **Claimed in v1 Documentation:**
  > "`express.json({ limit: '50mb' })`: Extended JSON body parsing to accommodate base64 deliverable file uploads." (`01_architecture_and_stack.md:3.2`).
- **Verified Code Reality:**
  - `backend/src/server.js:20` declares: `app.use(express.json());` with no arguments.
  - According to Express and `body-parser` specifications, the default limit for unconfigured JSON parsing is **100 KB**.
  - Any request exceeding 100 KB triggers an HTTP 413 Payload Too Large error.
- **Classification:** **ERRONEOUS CLAIM.**

---

### Claim 4: Fallback Database & JWT Secrets
- **Claimed in v1 Documentation:**
  > "Code includes fallback secrets in `db.js` (`1234`) and `authMiddleware.js` (`uniflow_demo_secret_key_2026`)."
- **Verified Code Reality:**
  - In `backend/src/config/db.js:4-10`:
    ```javascript
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });
    ```
    There are zero fallbacks. If `process.env.DB_PASSWORD` is omitted, it evaluates to `undefined`.
  - In `backend/src/controllers/authController.js:79` and `backend/src/middleware/authMiddleware.js:27`:
    Both files use `process.env.JWT_SECRET` with zero fallbacks. If unset, `jwt.sign()` and `jwt.verify()` throw unhandled exceptions returning HTTP 500 / 401.
  - (Note: Fallback strings were present only in the temporary test script `backend/test.js` and `workloadRoutes.js` mock user fallback).
- **Classification:** **INACCURATE CLAIM.**

---

### Claim 5: Student Collision Weekly Window Definition
- **Claimed in v1 Documentation:**
  > "Weekly workload window evaluates a Monday-to-Sunday $\pm 6$ days calendar week."
- **Verified Code Reality:**
  - `backend/src/controllers/facultyController.js:246` implements an exact **rolling 7-day window**:
    ```sql
    due_date BETWEEN ($3::date - INTERVAL '3 days') AND ($3::date + INTERVAL '3 days')
    ```
  - The window is centered on the proposed due date (3 days prior through 3 days following), not fixed to calendar weeks.
  - Furthermore, the alternative date discovery algorithm (`facultyController.js:268-281`) evaluates only the daily limit ($\le 10$), completely omitting the weekly limit during alternative candidate selection.
- **Classification:** **INACCURATE SPECIFICATION.**

---

### Claim 6: Presentation Slide Claim of "16 Tables"
- **Claimed in Slides / Early Docs:**
  > "UniFlow is built on a 16-table relational database architecture."
- **Verified Code Reality:**
  - As discovered in `changes.docx`, an early design document proposed 16 tables (`users`, `departments`, `user_departments`, `courses`, `student_enrollments`, `subjects`, `subject_faculty`, `timetable`, `timetable_faculty`, `tasks`, `marks`, `grievances`, `chat_threads`, `chat_participants`, `messages`, `attendance`).
  - Active production code migrated away from several of these tables, replacing them with `students`, `student_assignments`, `student_assignment_submissions` (`ad9770c`), and adding 5 academic workload tables + 3 multi-domain tables (`7c189a7`).
  - `backend/schema.sql` defines exactly **18 active tables**.
  - The live PostgreSQL database contains **27 tables** because the 9 legacy prototype tables were never dropped.
- **Classification:** **HISTORICAL ARTIFACT EXPLAINED.**

---

### Claim 7: Large Class Adjustment Multiplier
- **Claimed in Design Summaries:**
  > "Large classes (> 80 students) receive a $1.25\times$ scale multiplier on teaching load."
- **Verified Code Reality:**
  - In `backend/src/controllers/workloadController.js:649`:
    ```javascript
    const largeClassAdjustment = studentsClass > 80 ? 1.0 : 0;
    ```
  - The code applies a flat addition of **+1.0 unit**, not a $1.25\times$ scale multiplier.
- **Classification:** **ALGORITHM IMPLEMENTATION DISCREPANCY.**

---

### Claim 8: Admin & Timetable Persistence via Database
- **Claimed in v1 Documentation:**
  > "Admin console registers departments, courses, and users into PostgreSQL. Timetable matrix is persisted in `timetable` table."
- **Verified Code Reality:**
  - Zero admin API routes exist in `backend/src/server.js`.
  - `UI/admin/js/admin.js` operates 100% on `localStorage` (`uniflow_dataStore`).
  - `UI/hod/js/hod.js` stores timetable scheduling in `localStorage` (`uniflow_timetable`).
  - In the live database, `timetable` and `timetable_faculty` have **0 rows**.
- **Classification:** **MOCKED CLIENT-SIDE / UNCONNECTED TO BACKEND.**

---

## 3. Verified Truth Summary Table

| Topic / Feature | Earlier Unverified Claim | Verified Fact from Code | Primary Code Citation |
| :--- | :--- | :--- | :--- |
| **Deliverable Upload** | Implemented via Base64 & `/uploads` | **NOT IMPLEMENTED**; status buttons only | `facultyRoutes.js:14-22`, `faculty.js:271-283` |
| **Server Auth** | `requireHOD`, `requireFaculty`, `requireStudent` | `authenticateToken` only; **No role checks** | `authMiddleware.js:3-43` |
| **Body Size Limit** | 50 MB | **100 KB** (Express 5 default) | `server.js:20` |
| **Weekly Window** | $\pm 6$ days Monday–Sunday | **Rolling 7-day** (`due_date ± 3 days`) | `facultyController.js:246` |
| **Active Tables** | 10 or 16 tables | **18 active tables** (27 in live DB) | `schema.sql:1-250`, `check_db.js` |
| **Large Class Adj** | $1.25\times$ multiplier | **+1.0 flat unit** | `workloadController.js:649` |
| **Token Storage** | `sessionStorage` | **`localStorage`** (`uniflow_token`) | `login.js:172-175` |
| **Admin Console** | Database backed | **`localStorage` mock** | `admin.js:1-829` |
| **Timetable / Chat** | Database backed | **`localStorage` mock** (0 rows in DB) | `hod.js:renderTimetable`, `count_rows.js` |
