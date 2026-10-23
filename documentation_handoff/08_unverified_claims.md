# 08. Unsupported Claims, Academic Discrepancies, and Unresolved Technical Questions

This document reconciles statements found in prior project diaries, seminar presentation slide decks, and preliminary design proposals against the verified source code, active PostgreSQL schema, and Git commit history. It classifies claims into three distinct categories: `[VERIFIED]`, `[DOCUMENTED BUT UNVERIFIED]`, and `[PROPOSED]`.

---

## 1. Classification Taxonomy

1. **`[VERIFIED]`**: Directly supported by executable source code, active database schemas, reproducible script runs, or definitive Git commit logs.
2. **`[DOCUMENTED BUT UNVERIFIED]`**: Recorded in student project diaries, seminar presentations, or design documents, but lacking supporting code, test logs, or configuration files in the workspace.
3. **`[PROPOSED]`**: Formulated as planned future enhancements, academic models, or theoretical architectures not yet implemented in the codebase.

---

## 2. Discrepancy Reconciliation Matrix

| Topic / Claim Area | Documented Claim in Slides / Diary | Actual Source Code Reality | Forensic Classification | Impact & Guidance for Academic Report |
|:---|:---|:---|:---:|:---|
| **Database Table Count** | Presentation Slide 10 claims "16 Relational Tables". | **15 Tables exist in PostgreSQL** (10 operational tables in `schema.sql` + 5 academic workload tables created via migration scripts). | `[DOCUMENTED BUT UNVERIFIED]` | Report must cite the verified 15-table schema. The 16th table in early drafts was an unseparated `departments` or `timetable` table that was merged into `courses` and `tasks`. |
| **Admin Module Backend** | Diary claims "Admin module with centralized database provisioning of courses, semesters, and faculty". | **`UI/admin/js/admin.js` runs purely on browser `localStorage`** (`uniflow_dataStore`). No `/api/admin/*` routes exist in `backend/src/server.js`. | `[DOCUMENTED BUT UNVERIFIED]` | Frame the Admin module as a client-side administrative prototype in Phase 1, with direct database seeding via `backend/seed.js` for production accounts. |
| **Testing Frameworks** | Diary Week 5 claims "Automated Integration Testing via XUnit, Selenium WebDriver, and Karate Framework". | **Zero testing dependencies in `package.json`**. No test runner configuration or automated test suites exist in the repository. | `[DOCUMENTED BUT UNVERIFIED]` | Academic report must document manual test validation procedures and script-based verification (`backend/simulate_workload.js`, `test.js`) rather than falsely reporting XUnit passes. |
| **Performance Latency Benchmarks** | Presentation Slide 13 reports response times: `TC-01: 42ms`, `TC-04: 26ms`, `TC-05: 40ms`, `TC-06: 40ms`. | **No benchmark logs or profiling harnesses exist**. Response times were simulated or manually recorded during local development runs. | `[DOCUMENTED BUT UNVERIFIED]` | Classify these millisecond numbers as preliminary developer profiling measurements under local development environments. |
| **Weekly Workload Window** | Proposal states "Student workload enforces an 18-point limit per academic calendar week (Mon–Sun)". | Implemented as a **rolling 7-day window** (`due_date BETWEEN ($3::date - INTERVAL '6 days') AND ($3::date + INTERVAL '6 days')`). | `[VERIFIED]` (with algorithmic discrepancy) | Clarify the mathematical distinction: the rolling window provides continuous collision prevention regardless of calendar boundary resets. |
| **Workload Engine Model** | Presentation hints at "AI-driven predictive workload optimization". | **Deterministic multi-factor mathematical formulation** (L-T-P-J weighted arithmetic implemented in vanilla JavaScript and SQL). | `[VERIFIED]` (deterministic model) | Emphasize the deterministic, explainable mathematical formulation over black-box AI claims. Academic evaluators strongly prefer transparent mathematical proofs. |
| **Real-Time Notification Pipeline** | Proposal mentions "Instant push notifications when HOD delegates administrative duties". | **Standard synchronous HTTP REST responses**. Updates appear upon dashboard re-fetch or page navigation; no WebSockets or SSE exist. | `[PROPOSED]` | Document real-time WebSocket / SSE alerts as a Phase 2 architectural enhancement. |
| **Concurrency Controls** | Diary notes "Concurrency-safe database transactions across all task assignments". | `assignWorkToStudents` uses `BEGIN ... COMMIT` transactions, but **`assignTask` (HOD) uses non-transactional `SELECT` then `INSERT`**. | `[VERIFIED]` (partial implementation) | Accurately report transactional atomicity for student submissions while identifying the HOD task race condition as an important area for database locking enhancements. |

---

## 3. Detailed Audit of Documented but Unverified Claims

### 3.1 The "16 Relational Tables" Claim
- **Slide Statement:** Slide 10 of the mid-term presentation slide deck states: *"The backend leverages PostgreSQL with 16 normalized relational tables supporting 3NF compliance."*
- **Source Code Verification:**
  - `backend/schema.sql` declares **10 operational tables**:
    1. `users`
    2. `faculty`
    3. `students`
    4. `courses`
    5. `semesters`
    6. `subjects`
    7. `tasks`
    8. `assignments`
    9. `student_submissions`
    10. `audit_logs`
  - Migration scripts declare **5 academic workload tables**:
    11. `subject_faculty`
    12. `teaching_loads`
    13. `preparation_and_course_factors`
    14. `paper_and_assignment_setting`
    15. `evaluation_units`
  - The aggregate table `workload_master` represents the consolidated view of these 5 tables.
  - **Verdict:** There are **15 physical tables** in the active PostgreSQL database. Any reference to a 16th table refers to an uncommitted draft table (such as a standalone `departments` lookup or `notifications` queue).

### 3.2 The "Karate / Selenium / XUnit" Claim
- **Diary Statement:** Week 5 diary entry states: *"Conducted integration and regression testing using Karate Framework for API validation, Selenium WebDriver for cross-browser UI automation, and XUnit for backend test suites."*
- **Source Code Verification:**
  - `backend/package.json` contains:
    - Dependencies: `bcryptjs`, `cors`, `dotenv`, `express`, `jsonwebtoken`, `pg`.
    - DevDependencies: `nodemon`.
  - There are no `pom.xml`, `build.gradle`, `.csproj`, or Node.js test runner configs (`jest.config.js`, `.karate`, `cypress.config.js`).
  - **Verdict:** Karate, Selenium, and XUnit were investigated or prepared in external academic demonstration notes but are **not present in this repository**. The project relies on functional HTTP integration scripts (`simulate_workload.js`, `test.js`) and manual browser testing.

### 3.3 The "26ms / 42ms Latency" Benchmarks
- **Slide Statement:** Slide 13 displays test execution results with explicit timing columns:
  - `TC-01: User Login Verification — 42 ms`
  - `TC-04: Student Collision Detection — 26 ms`
  - `TC-05: Weekly Workload Threshold Enforcement — 40 ms`
  - `TC-06: File Deliverable Upload & Buffer Write — 40 ms`
- **Source Code Verification:**
  - No performance benchmark script (e.g., using `autocannon`, `k6`, or `benchmark.js`) is checked into the repository.
  - **Verdict:** These latencies reflect informal local development timings rather than an automated, statistically averaged load-testing harness. The academic report should present these figures as *preliminary development response times recorded under local PostgreSQL execution*.

---

## 4. Unresolved Technical Questions for System Evolution

The following open architectural decisions should be addressed during subsequent project reviews:

1. **Super Admin API Migration:**
   - *Question:* Should the Admin dashboard (`UI/admin/js/admin.js`) be migrated to dedicated REST endpoints (`/api/admin/users`, `/api/admin/courses`) backed by PostgreSQL, or should it remain a client-side configuration sandbox?
   - *Recommendation:* Introduce an `adminController.js` and persist courses, semesters, and user provisioning directly to the database.

2. **HOD Task Assignment Locking:**
   - *Question:* How should the race condition in `assignTask` be permanently resolved?
   - *Recommendation:* Implement explicit row-level locking (`SELECT ... FOR UPDATE`) or an atomic PostgreSQL trigger (`BEFORE INSERT ON tasks`) that rejects inserts when the active weight sum exceeds 15.

3. **File Deliverable Access Control:**
   - *Question:* Should file downloads (`/api/faculty/tasks/file/:filename`) be restricted to the assigning HOD and the owning faculty member?
   - *Recommendation:* Join the filename to `tasks` and `student_submissions` to verify that `req.user.id` matches either the assigner or assignee before streaming the file.

4. **Academic Workload Dynamic Calibration:**
   - *Question:* Are the provisional multipliers ($0.5$ for Lab Assist, $0.25$ for Project In-Charge, $1.25$ for Large Classes) officially approved by the university academic council?
   - *Recommendation:* Maintain these weights in a database configuration table (`workload_policy_parameters`) rather than hardcoding them in `workloadController.js`.

---

## 5. Master File Index: Academic Documentation Handoff

The complete documentation handoff generated for ChatGPT comprises the following 9 modular reference dossiers:

| Dossier Filename | Target Size | Primary Scope and Technical Contents | Key Academic Sections Supported |
|:---|:---:|:---|:---|
| **`00_project_overview.md`** | ~8 KB | Executive summary, academic metadata, author identities, audit taxonomy, and complete handoff guide. | Chapter 1: Introduction, Project Objectives, Scope. |
| **`01_architecture_and_stack.md`** | ~16 KB | Verified 3-tier architecture, runtime environment, design tokens, static file pipeline, and Level 0/1 DFDs. | Chapter 2: System Architecture, Technology Stack, Data Flow. |
| **`02_database_design.md`** | ~19 KB | Comprehensive data dictionary of all 15 PostgreSQL tables, foreign keys, cascade rules, and Mermaid ER diagram. | Chapter 3: Database Design, Schema Normalization, ER Modeling. |
| **`03_api_catalogue.md`** | ~17 KB | Exhaustive catalog of all 20 active REST endpoints, request/response JSON schemas, and middleware security. | Chapter 4: System Implementation, Interface Specifications. |
| **`04_workload_algorithms.md`** | ~15 KB | Mathematical formulations, SQL interval queries, pseudocode, and worked examples for all 3 Workload Engines. | Chapter 5: Algorithm Design, Mathematical Formulations. |
| **`05_module_implementation.md`** | ~10 KB | Detailed walkthroughs of Super Admin, HOD Analytics, Faculty Operations, and Student Portals. | Chapter 6: Detailed Module Walkthroughs, User Workflows. |
| **`06_testing_and_limitations.md`** | ~16 KB | Security audit, concurrency analysis, automated testing reality, comprehensive test inventory, and limitations register. | Chapter 7: Testing, Verification, Security & System Limitations. |
| **`07_git_contributions.md`** | ~12 KB | Git branch topology, chronological commit ledger, Contribution Matrix (Jeneesh vs. Kiran), and line-by-line attribution. | Chapter 8: Project Diary, Developer Contributions, Git History. |
| **`08_unverified_claims.md`** | ~11 KB | Discrepancy reconciliation matrix, unverified claim audits, unresolved questions, and master file index. | Chapter 9: Critical Evaluation, Future Scope, Appendices. |

---

## 6. Guidance for ChatGPT Report Synthesis

When generating the two separate academic project reports for **Jeneesh K Jaison (Roll No. 25MCA026)** and **Kiran Sivadas (Roll No. 25MCA029)**, observe the following instructions:

1. **Maintain Individual Focus:**
   - **Jeneesh's Report:** Highlight the Relational Database Design, Student Workload Collision Engine, Faculty Task Deliverables & Remarks, Student Portal, and L-T-P-J Academic Workload Formulation.
   - **Kiran's Report:** Highlight the System Architecture, Express Server & Database Pooling, JWT Authentication & RBAC Middleware, Admin Client-Side Architecture, and HOD Administrative Workload Allocation Engine.
2. **Ground Every Claim in Evidence:** Use the verified file paths, function names, and SQL snippets provided in these dossier files. Never invent unverified dependencies or test suites.
3. **Handle Discrepancies Professionally:** Where slide deck claims differ from code reality (e.g., 15 tables vs. 16 tables, rolling window vs. calendar week), explain the architectural rationale transparently as documented in this file.
