# UniFlow — Report-Ready Technical Facts Sheet (v2)

> **Document Status:** VERIFIED AGAINST CODEBASE & DATABASE METRICS  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Auditor Role:** Senior Software Architect, Database Engineer & Code Auditor  
> **Date of Audit:** October 23, 2026  

---

## 1. Master Facts & Quantitative Metrics Table

This reference table contains every quantitative metric, threshold, algorithm constant, and dependency version that the MCA mini-project report writer may cite. Every entry includes its verified source citation and verification status.

| Metric / Parameter | Value | Unit / Context | Source Code Citation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Active Relational Tables** | **19** | Tables in `backend/schema.sql` | `backend/schema.sql` | **VERIFIED** |
| **Total Database Tables** | **28** | Physical tables after grievance migration (9 legacy tables remain) | Query of `information_schema.tables` | **VERIFIED** |
| **Leftover Prototype Tables** | **9** | Unconnected tables (0 rows) | `attendance`, `grievances`, `marks`, `chat_*`, `timetable_*` | **VERIFIED** |
| **Registered API Routes** | **33** | Total registered Express endpoints including seven grievance routes | `server.js` and route files | **VERIFIED** |
| **Frontend HTML Documents** | **5** | HTML pages | `UI/index.html`, `UI/*/dashboard.html` | **VERIFIED** |
| **Frontend Script Files** | **6** | JavaScript files in `UI/` | `login.js`, `login.backup.js`, `hod.js`, `faculty.js`, `student.js`, `admin.js` | **VERIFIED** |
| **Frontend Stylesheets** | **5** | CSS files in `UI/` | `theme.css`, `login.css`, `hod.css`, `student.css`, `admin.css` | **VERIFIED** |
| **Total Source Files** | **44** | Across `backend/` and `UI/` | File counting script (`scratch/count_loc.js`) | **VERIFIED** |
| **Backend Lines of Code** | **4,495** | Lines (JS + SQL) | `node scratch/count_loc.js` | **VERIFIED** |
| **Frontend JS Lines of Code** | **5,485** | Lines (JavaScript) | `node scratch/count_loc.js` | **VERIFIED** |
| **Frontend HTML Lines** | **3,252** | Lines (Markup) | `node scratch/count_loc.js` | **VERIFIED** |
| **Frontend CSS Lines** | **1,282** | Lines (Stylesheets) | `node scratch/count_loc.js` | **VERIFIED** |
| **Total Codebase Lines of Code**| **14,514** | Lines across all layers | `node scratch/count_loc.js` | **VERIFIED** |
| **HOD Workload Limit (Engine A)**| **15** | Maximum points active load | `backend/src/controllers/workloadController.js:25` (`WORKLOAD_THRESHOLD = 15`) | **VERIFIED** |
| **Daily Student Limit (Engine B)**| **15** | Maximum points / day / class | `backend/src/controllers/facultyController.js` (`MAX_DAILY_STUDENT_WORKLOAD = 15`) | **VERIFIED** |
| **Weekly Student Limit (Engine B)**| **18** | Maximum points / 7-day window | `backend/src/controllers/facultyController.js:5` (`MAX_WEEKLY_STUDENT_WORKLOAD = 18`) | **VERIFIED** |
| **Weekly Collision Window** | **7** | Rolling days (`due_date ± 3d`) | `backend/src/controllers/facultyController.js:246` (`INTERVAL '3 days'`) | **VERIFIED** |
| **Student Workload Gauge Max** | **20** | Points (visual gauge scale) | `backend/src/controllers/studentController.js:63` (`gaugeMax = 20`) | **VERIFIED** |
| **Alternative Faculty Limit** | **5** | Max candidate faculty | `backend/src/controllers/workloadController.js:387` (`LIMIT 5`) | **VERIFIED** |
| **Alternative Dates (HOD)** | **3** | Max candidate date ranges | `backend/src/controllers/workloadController.js:342` (`LIMIT 3`) | **VERIFIED** |
| **Alternative Dates (Faculty)** | **4** | Max candidate assignment dates| `backend/src/controllers/facultyController.js:292` (`LIMIT 4`) | **VERIFIED** |
| **Alternative Date Scan Horizon**| **14** | Days scanned forward | `workloadController.js:283`, `facultyController.js:263` (`offset <= 14`) | **VERIFIED** |
| **Task Difficulty Range** | **1 to 10** | Integer scale | `tasks` check constraint (`CHECK (difficulty BETWEEN 1 AND 10)`) | **VERIFIED** |
| **JWT Expiration Setting** | **`'1d'`** | 24 Hours | `backend/src/controllers/authController.js:81` (`expiresIn: '1d'`) | **VERIFIED** |
| **Bcrypt Salt Rounds** | **10** | Rounds | `backend/seed.js:19`, `backend/simulate_workload.js:47` | **VERIFIED** |
| **Express Body Size Limit** | **100 KB** | Default `express.json()` | `backend/src/server.js:20` (`app.use(express.json())`) | **VERIFIED** |
| **Default Server Port** | **5000** | TCP Port | `backend/src/server.js:92` (`PORT = process.env.PORT || 5000`) | **VERIFIED** |
| **Default Database Port** | **5432** | TCP Port | `backend/src/config/db.js:6` (`process.env.DB_PORT || 5432`) | **VERIFIED** |
| **Total Git Commits** | **15** | Commits on main | `git log --oneline` (Root: `9e964f4`, HEAD: `6a2fff7`) | **VERIFIED** |
| **Commits by Jeneesh K Jaison** | **11** | Commits | `git log --author="Jeneesh"` | **VERIFIED** |
| **Commits by Kiran-Sivadas** | **4** | Commits | `git log --author="Kiran"` | **VERIFIED** |
| **Lines Authored: Kiran** | **4,716** | 53.1% of key source files | `git blame -w --line-porcelain` (`scratch/git_blame_stats.js`) | **VERIFIED** |
| **Lines Authored: Jeneesh** | **4,172** | 46.9% of key source files | `git blame -w --line-porcelain` (`scratch/git_blame_stats.js`) | **VERIFIED** |

---

## 2. Workload Engine Weight Constants (Engine C)

All weight factors extracted from `backend/src/controllers/workloadController.js:640-710`:

| Workload Component | Constant / Formula | Unit | Code Line Reference |
| :--- | :--- | :--- | :--- |
| **Theory Contact Hours** | `theoryHours * 1.0` | units / contact hour | `workloadController.js:641` |
| **Tutorial Contact Hours** | `tutorialHours * 0.5` | units / contact hour | `workloadController.js:644` |
| **Lab Contact Hours** | `labHours * 0.5` | units / contact hour | `workloadController.js:642` |
| **Project Contact Hours** | `projectHours * 0.5` | units / contact hour | `workloadController.js:643` |
| **Lab Supervision** | `studentsLab * 0.02` | units / student | `workloadController.js:645` |
| **Project Mentoring** | `studentsProject * 0.05` | units / student | `workloadController.js:646` |
| **Large Class Flat Addition** | `+1.0` (if $N_{\text{class}} > 80$) | flat units | `workloadController.js:649` |
| **Question Paper Setting** | `1.0` per question paper | units / paper | `workloadController.js:665` |
| **Assignment Paper Setting** | `0.5` per assignment | units / assignment | `workloadController.js:665` |
| **Fixed Theory Preparation** | `6.0` (Subject 2.0, Rubrics 2.0, CO-PO 2.0) | fixed units | `workloadController.js:675` |
| **Fixed Lab Preparation (Mod)** | `8.5` (Exp 2.0, Rubric 2.0, Eval 0.5, CO-PO 2.0, Mod 2.0)| fixed units | `workloadController.js:679` |
| **Fixed Lab Preparation (Routine)**| `7.0` (Exp 2.0, Rubric 2.0, Eval 0.5, CO-PO 2.0, Mod 0.5)| fixed units | `workloadController.js:679` |
| **Fixed Project Preparation** | `5.0` (Rubric 2.0, Eval 0.5, CO-PO 2.0, Sched 0.5) | fixed units | `workloadController.js:682` |
| **Series Exam Script Grading** | `0.05` per script ($2 \times N_{\text{class}}$ scripts)| units / script | `workloadController.js:704` |
| **End-Sem Exam Script Grading**| `0.08` per script ($1 \times N_{\text{class}}$ scripts)| units / script | `workloadController.js:705` |
| **Assignment Script Grading** | `0.02` per script ($N_{\text{assign}} \times N_{\text{class}}$ scripts)| units / script | `workloadController.js:706` |
| **Lab Output Grading** | `0.05` per output ($10 \times N_{\text{lab}}$ outputs)| units / output | `workloadController.js:707` |
| **Practical Exam Evaluation** | `0.10` per student ($1 \times N_{\text{lab}}$ students) | units / student | `workloadController.js:708` |
| **Project Viva-Voce Evaluation** | `0.15` per student ($1 \times N_{\text{proj}}$ students)| units / student | `workloadController.js:709` |
| **Project Review Evaluation** | `0.15` per student ($1 \times N_{\text{proj}}$ students)| units / student | `workloadController.js:710` |
| **Experience Multiplier (Experienced)**| `0.90` ($10\%$ reduction) | scale factor | `workloadController.js:685` |
| **Experience Multiplier (New)**| `1.00` (No reduction) | scale factor | `workloadController.js:685` |

---

## 3. Package Versions from `backend/package-lock.json`

Verified production library versions installed in `backend/node_modules`:
- `express`: `5.2.1`
- `pg`: `8.23.0`
- `jsonwebtoken`: `9.0.3`
- `bcryptjs`: `3.0.3`
- `dotenv`: `17.4.2`
- `cors`: `2.8.6`
- `nodemon`: `3.1.14` (devDependency)
- `Chart.js`: Loaded via CDN `jsdelivr.net/npm/chart.js` (v4.x)
