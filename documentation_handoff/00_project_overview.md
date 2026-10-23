# UniFlow — Project Overview & Documentation Handoff Index

## 1. Project Identity & Administrative Metadata

- **Project Title:** UniFlow — Department Resource Management System
- **Academic Course:** 23MCAM307 Mini Project — Scrum / Capstone Project
- **Academic Year:** 2026 – 2027
- **Target Institution / Department:** Department of Computer Applications, TKM College of Engineering
- **Project Supervisor / Product Owner / Scrum Master:** Dr. Sheera Shamsu
- **Student Contributors & Roll Numbers:**
  - **Jeneesh K Jaison** — Roll No. `25MCA026` (Author email: `jeneeshjaisonk@gmail.com`)
  - **Kiran Sivadas** — Roll No. `25MCA029` (Author email: `kiransivadas8@gmail.com`)
- **Initial Division of Responsibility (from Project Diary):**
  - Jeneesh K Jaison: Faculty and Student modules (end-to-end design, database, backend APIs, frontend integration).
  - Kiran Sivadas: HOD and Admin modules (login authentication v1, HOD task allocation v1, Admin frontend configuration).
- **Audit Execution Timestamp:** 2026-10-22T23:45:00+05:30
- **Audit Target Commit:** `2f95fcc` (branch `main`, tag/message: `graph module`)
- **Repository Location:** `c:\Users\Jenee\Downloads\TKM\Project\UniFlow`

---

## 2. Executive Summary

UniFlow is a departmental academic operations platform designed to coordinate faculty administrative responsibilities, course teaching loads, student assignment deadlines, and department-level resource allocation. The core architectural philosophy of UniFlow is **active mathematical workload balancing**: unlike traditional administrative software or academic ERPs (e.g., Fedena, openSIS) that merely record entries, UniFlow algorithmically computes cumulative workload scores, intercepts overloading actions prior to database commit, and provides automated, conflict-free alternatives.

The system encompasses four user tiers:
1. **Super Admin:** Department configuration, HOD tenure provisioning, course and curriculum directories, user enrollment.
2. **Head of Department (HOD):** Faculty workload monitoring via dynamic Chart.js analytics, threshold-enforced administrative task delegation (15-point ceiling), automated alternative faculty and date discovery, and deliverable review.
3. **Faculty Member:** Active HOD task tracking, deliverable file submission with remarks, academic course declaration (L-T-P-J workload formulation), and workload-aware student assignment creation with collision prevention.
4. **Student:** Academic profile and enrolled course visibility, dynamic weekly workload gauge (progress bar with color-coded advisory), deadline tracking, and interactive online assignment turn-in.

---

## 3. Evidence Categories Maintained in this Audit

To ensure academic and technical integrity, all facts, capabilities, and claims across this documentation handoff are strictly categorized:

| Category Tag | Definition | Audit Criterion |
| :--- | :--- | :--- |
| **`[VERIFIED]`** | Directly supported by source code, database schema, git commit logs, or reproducible execution in this workspace. | Code path, SQL table, or commit hash is explicitly cited and verified. |
| **`[DOCUMENTED BUT UNVERIFIED]`** | Stated in student project diaries, PowerPoint presentation slides, or prior discussions, but lacks backend implementation or reproducible logs. | Acknowledged as proposed or mocked; gaps and missing elements are recorded. |
| **`[PROPOSED]`** | Planned enhancements, future roadmap items, or suggested architectural refactorings. | Explicitly distinguished from running features. |

---

## 4. Documentation Dossier Directory & File Index

This handoff is partitioned into 9 specialized, evidence-grounded technical dossiers:

| Dossier File | Primary Content & Purpose | Key Evidence Base |
| :--- | :--- | :--- |
| [**`00_project_overview.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/00_project_overview.md) | Executive summary, metadata, file index, problem statement, and evidence taxonomy. | Project repository, Git metadata, Diary records. |
| [**`01_architecture_and_stack.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/01_architecture_and_stack.md) | Verified 3-tier architecture, runtime environment, dependencies, request lifecycles, and design system. | `backend/package.json`, `server.js`, `UI/css/`. |
| [**`02_database_design.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/02_database_design.md) | Data dictionary of all 15 PostgreSQL tables, ER diagram (Mermaid), keys, constraints, and relationships. | `backend/schema.sql`, migration scripts, `seed.js`. |
| [**`03_api_catalogue.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/03_api_catalogue.md) | Verified REST API catalogue (21 routes), HTTP methods, headers, payloads, status codes, and callers. | `backend/src/routes/`, `backend/src/controllers/`. |
| [**`04_workload_algorithms.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/04_workload_algorithms.md) | Deep mathematical models, formulas, pseudocode, and worked examples for the 3 workload engines. | `workloadController.js`, `facultyController.js`. |
| [**`05_module_implementation.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/05_module_implementation.md) | Detailed functional analysis of Admin, HOD, Faculty, and Student modules with UI workflows. | `UI/*/js/*.js`, `UI/*/dashboard.html`. |
| [**`06_testing_and_limitations.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/06_testing_and_limitations.md) | Testing inventory, concurrency analysis, security vulnerabilities, edge cases, and known defects. | `backend/test.js`, `simulate_workload.js`, code audit. |
| [**`07_git_contributions.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/07_git_contributions.md) | Git branch topology, commit history, and objective contribution matrix between Jeneesh and Kiran. | Git commit logs, diff stats, author headers. |
| [**`08_unverified_claims.md`**](file:///c:/Users/Jenee/Downloads/TKM/Project/UniFlow/documentation_handoff/08_unverified_claims.md) | Rigorous reconciliation of presentation slides and diary statements against active codebase reality. | PPT slides, Scrum diary vs. active source code. |

---

## 5. Summary of System Maturity & Verification Findings

1. **Backend Integration Maturity:**
   - **HOD Module:** Fully integrated with PostgreSQL backend for task allocation, workload suggestions, conflict interception, and Chart.js analytics summaries (`/api/workload/*`).
   - **Faculty Module:** Fully integrated with PostgreSQL backend for live task synchronization, status toggling, deliverable file uploads, subject allocation, student assignment collision detection, and academic workload calculation (`/api/faculty/*`, `/api/workload/classes`).
   - **Student Module:** Fully integrated with PostgreSQL backend for dashboard statistics, enrolled courses, upcoming assignments, and real-time assignment turn-in submissions (`/api/student/*`).
   - **Admin Module:** `[DOCUMENTED BUT UNVERIFIED AS REST API]` Currently implemented purely on the client side using browser `localStorage` (`uniflow_dataStore`). No backend `/api/admin/*` routes exist in `server.js`.
2. **Database Schema Integrity:**
   - 10 relational tables in `schema.sql` handle users, departments, courses, subjects, allocations, tasks, students, assignments, and submissions.
   - 5 dedicated analytical tables handle academic workload calculations (`teaching_loads`, `paper_and_assignment_setting`, `preparation_and_course_factors`, `evaluation_units`, `workload_master`).
3. **Automated Testing Reality:**
   - No automated test runner (Jest, Mocha, Supertest, XUnit) or CI/CD pipeline (Jenkins) exists in `package.json`.
   - Ad-hoc database and integration test scripts exist: `backend/test.js`, `backend/simulate_workload.js`, `backend/clear_workload.js`.
   - Presentation metrics (`26ms`, `42ms`) are unverified simulated benchmarks.
