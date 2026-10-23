# UniFlow — Verified API Catalogue (v2)

> **Document Status:** VERIFIED AGAINST ROUTE FILES & LIVE TESTING  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Auditor Role:** Senior Software Architect & API Auditor  
> **Date of Audit:** October 23, 2026  

---

## 1. Registered API Endpoints (Verified in Code)

Every endpoint documented below is actively registered in Express route files and verified through real HTTP requests during Phase 4 audit execution.

### Summary Table

| Method | Exact Path | Middleware | Who Can Really Call (Server) | Calling Frontend Function | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | None | Public | Browser direct navigation | **IMPLEMENTED** |
| `GET` | `/api/db-test` | None | Public | Health checks | **IMPLEMENTED** |
| `POST` | `/api/auth/login` | None | Public | `UI/js/login.js:loginForm.submit` | **IMPLEMENTED** |
| `GET` | `/api/workload/subjects` | `authenticateToken` | Any Authenticated User | `UI/hod/js/hod.js:openTaskModal` | **IMPLEMENTED** |
| `GET` | `/api/workload/faculty` | `authenticateToken` | Any Authenticated User | `UI/hod/js/hod.js:renderOverview` | **IMPLEMENTED** |
| `GET` | `/api/workload/tasks` | `authenticateToken` | Any Authenticated User | `UI/hod/js/hod.js:fetchAssignedTasks` | **IMPLEMENTED** |
| `POST` | `/api/workload/suggest` | `authenticateToken` | Any Authenticated User | `UI/hod/js/hod.js:triggerWorkloadSuggestion` | **IMPLEMENTED** |
| `POST` | `/api/workload/assign` | `authenticateToken` | Any Authenticated User | `UI/hod/js/hod.js:commitTaskAssignment` | **IMPLEMENTED** |
| `POST` | `/api/workload/classes` | `authenticateToken` | Any Authenticated User | `UI/faculty/js/faculty.js:addClassForm.submit` | **IMPLEMENTED** |
| `GET` | `/api/workload/hod/summary` | `authenticateToken` | Any Authenticated User | `UI/hod/js/hod.js:fetchWorkloadSummary` | **IMPLEMENTED** |
| `GET` | `/api/workload/catalogs` | None | Public | `UI/faculty/js/faculty.js:initWorkloadCatalogs` | **IMPLEMENTED** |
| `GET` | `/api/workload/department/master` | None | Public | `UI/hod/js/hod.js:fetchDeptMaster` | **IMPLEMENTED** |
| `GET` | `/api/workload/department/faculty` | `flexibleAuth` | Public (fallback Grace H.) or Auth | `UI/faculty/js/faculty.js:renderFacultyDeptWorkload` | **IMPLEMENTED** |
| `POST` | `/api/workload/department/faculty` | `flexibleAuth` | Public (fallback Grace H.) or Auth | `UI/faculty/js/faculty.js:saveDeptWorkloadTask` | **IMPLEMENTED** |
| `DELETE`| `/api/workload/department/faculty/:id` | `flexibleAuth` | Public (fallback Grace H.) or Auth | `UI/faculty/js/faculty.js:deleteDeptWorkloadTask` | **IMPLEMENTED** |
| `GET` | `/api/workload/department/hod/summary` | `flexibleHodAuth` | Public (fallback Dr. Turing) or Auth | `UI/hod/js/hod.js:fetchDeptHodSummary` | **IMPLEMENTED** |
| `GET` | `/api/faculty/tasks` | `authenticateToken` | Any Authenticated User | `UI/faculty/js/faculty.js:fetchFacultyTasks` | **IMPLEMENTED** |
| `PATCH`| `/api/faculty/tasks/:id/status` | `authenticateToken` | Any Authenticated User (task owner) | `UI/faculty/js/faculty.js:updateFacultyTaskStatus` | **IMPLEMENTED** |
| `GET` | `/api/faculty/subjects` | `authenticateToken` | Any Authenticated User | `UI/faculty/js/faculty.js:fetchFacultySubjects` | **IMPLEMENTED** |
| `POST` | `/api/faculty/student-assignments/check` | `authenticateToken` | Any Authenticated User (assigned teacher) | `UI/faculty/js/faculty.js:checkCollisionBtn.click` | **IMPLEMENTED** |
| `POST` | `/api/faculty/student-assignments` | `authenticateToken` | Any Authenticated User (assigned teacher) | `UI/faculty/js/faculty.js:publishAssignmentBtn.click` | **IMPLEMENTED** |
| `GET` | `/api/faculty/student-assignments` | `authenticateToken` | Any Authenticated User | `UI/faculty/js/faculty.js:fetchMyStudentAssignments` | **IMPLEMENTED** |
| `GET` | `/api/student/dashboard` | `authenticateToken` | Any Authenticated User (reads req.user) | `UI/student/js/student.js:loadDashboard` | **IMPLEMENTED** |
| `GET` | `/api/student/assignments` | `authenticateToken` | Any Authenticated User (reads req.user) | `UI/student/js/student.js:loadAssignments` | **IMPLEMENTED** |
| `GET` | `/api/student/courses` | `authenticateToken` | Any Authenticated User (reads req.user) | `UI/student/js/student.js:loadCourses` | **IMPLEMENTED** |
| `PATCH`| `/api/student/assignments/:id/submit` | `authenticateToken` | Any Authenticated User (reads req.user) | `UI/student/js/student.js:turnInForm.submit` | **IMPLEMENTED** |

---

## 2. Detailed Endpoint Specifications

### 2.1 Authentication Subsystem

#### `POST /api/auth/login`
- **Controller:** `backend/src/controllers/authController.js:11` (`login`)
- **Route:** `backend/src/routes/authRoutes.js:9`
- **Middleware:** None (Public)
- **Request Body:**
  ```json
  {
    "email": "faculty@uniflow.edu",
    "password": "faculty123"
  }
  ```
- **Validation:**
  - `!email || !password` $\rightarrow$ HTTP 400 Bad Request: `{"success": false, "message": "Email and password are required"}`.
  - User not found in DB $\rightarrow$ HTTP 401 Unauthorized: `{"success": false, "message": "Invalid email or password"}`.
  - Password mismatch via `bcrypt.compare` $\rightarrow$ HTTP 401 Unauthorized: `{"success": false, "message": "Invalid email or password"}`.
- **Database Query:**
  ```sql
  SELECT id, custom_id, name, email, password_hash, role, is_hod 
  FROM users WHERE LOWER(email) = LOWER($1)
  ```
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "<JWT_STRING>",
    "user": {
      "id": 2,
      "customId": "FAC001",
      "name": "Grace Hopper",
      "email": "faculty@uniflow.edu",
      "role": "faculty",
      "isHOD": false
    }
  }
  ```
- **JWT Payload Details:** `{ userId: user.id, role: frontendRole, isHod: user.is_hod, exp: 1d }`.

---

### 2.2 HOD Workload Governance Subsystem (Engine A)

#### `GET /api/workload/faculty`
- **Controller:** `backend/src/controllers/workloadController.js:94` (`getFaculty`)
- **Route:** `backend/src/routes/workloadRoutes.js:30`
- **Middleware:** `authenticateToken`
- **Authorization Check:** None on server (any valid JWT accepted).
- **Database Query:** Aggregates active workload difficulty from `tasks` table per faculty member:
  ```sql
  SELECT u.id, u.custom_id, u.name, u.email, u.role, u.is_hod,
         COALESCE(SUM(t.difficulty), 0) AS current_workload
  FROM users u
  LEFT JOIN tasks t ON u.id = t.assigned_to 
       AND (t.status IS NULL OR t.status != 'completed')
       AND t.scheduled_date <= CURRENT_DATE 
       AND COALESCE(t.deadline, t.scheduled_date) >= CURRENT_DATE
  WHERE u.role = 'faculty' AND u.is_hod = false
  GROUP BY u.id, u.custom_id, u.name, u.email, u.role, u.is_hod
  ORDER BY u.name ASC
  ```
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "faculty": [
      {
        "id": 2,
        "custom_id": "FAC001",
        "name": "Grace Hopper",
        "email": "faculty@uniflow.edu",
        "current_workload": 9,
        "threshold": 15
      }
    ]
  }
  ```

#### `POST /api/workload/suggest`
- **Controller:** `backend/src/controllers/workloadController.js:213` (`suggestTask`)
- **Route:** `backend/src/routes/workloadRoutes.js:44`
- **Middleware:** `authenticateToken`
- **Request Body:**
  ```json
  {
    "subject_id": 2,
    "assigned_to": 2,
    "description": "Prepare Midterm Exam Papers",
    "difficulty": 4,
    "scheduled_date": "2026-11-01",
    "deadline": "2026-11-05"
  }
  ```
- **Validation:**
  - Missing fields $\rightarrow$ HTTP 400 Bad Request.
  - `difficulty < 1 || difficulty > 10` $\rightarrow$ HTTP 400 Bad Request.
- **Engine Logic:**
  - Evaluates active overlapping workload for `assigned_to` within `[scheduled_date, deadline]`.
  - If `resultingWorkload <= 15`: `can_assign = true`.
  - If `resultingWorkload > 15`: `can_assign = false`; discovers up to 5 alternative faculty members and up to 3 alternative date intervals.
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "can_assign": true,
    "message": "Grace Hopper is available for this assignment.",
    "selected_faculty": {
      "id": 2,
      "name": "Grace Hopper",
      "current_workload": 0,
      "added_difficulty": 4,
      "resulting_workload": 4
    },
    "threshold": 15,
    "recommendations": {
      "alternative_dates": [],
      "alternative_faculty": []
    }
  }
  ```

#### `POST /api/workload/assign`
- **Controller:** `backend/src/controllers/workloadController.js:447` (`assignTask`)
- **Route:** `backend/src/routes/workloadRoutes.js:51`
- **Middleware:** `authenticateToken`
- **Request Body:** Same as `suggestTask`.
- **Enforcement Check:**
  - Re-evaluates active overlapping workload in DB.
  - If `current_workload + taskDifficulty > 15`:
    **Rejects with HTTP 409 Conflict:**
    ```json
    {
      "success": false,
      "can_assign": false,
      "message": "Workload limit exceeded. Faculty current workload is 9 pts. Adding 10 pts reaches 19 pts (Maximum allowed: 15 pts).",
      "current_workload": 9,
      "requested_difficulty": 10,
      "resulting_workload": 19,
      "threshold": 15
    }
    ```
  - If within threshold: Inserts task into `tasks` table with `status = 'approved'` and returns HTTP 201 Created.

---

### 2.3 Academic Course Workload Subsystem (Engine C)

#### `POST /api/workload/classes`
- **Controller:** `backend/src/controllers/workloadController.js:574` (`addClass`)
- **Route:** `backend/src/routes/workloadRoutes.js:58`
- **Middleware:** `authenticateToken`
- **Atomicity:** Wrapped in `BEGIN` / `COMMIT` / `ROLLBACK` database transaction.
- **Request Body:**
  ```json
  {
    "programName": "B.Tech Computer Science and Engineering",
    "semester": 5,
    "courseType": "Core Theory",
    "ltpjCode": "3-1-0-0",
    "role": "Theory",
    "subjectName": "Compiler Design",
    "subjectCode": "CS502",
    "studentsClass": 60,
    "studentsInLab": 0,
    "studentsInProject": 0,
    "priorExperience": true
  }
  ```
- **Database Operations:** Writes atomically to 5 tables:
  1. `courses` (if program does not exist)
  2. `subjects` (new subject record)
  3. `subject_faculty` (allocation link)
  4. `teaching_loads`
  5. `paper_and_assignment_setting`
  6. `preparation_and_course_factors`
  7. `evaluation_units`
  8. `workload_master`
- **Success Response (HTTP 200 OK):** `{"success": true, "message": "Class added successfully."}`.

---

### 2.4 Faculty Subsystem & Student Collision Detection (Engine B)

#### `GET /api/faculty/tasks`
- **Controller:** `backend/src/controllers/facultyController.js:10` (`getMyTasks`)
- **Route:** `backend/src/routes/facultyRoutes.js:14`
- **Middleware:** `authenticateToken`
- **Database Query:** Fetches tasks where `assigned_to = req.user.userId`.
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "tasks": [
      {
        "id": 1,
        "description": "Prepare Midterm Question Paper for OS",
        "difficulty": 5,
        "deadline": "2026-09-06",
        "scheduled_date": "2026-09-02",
        "status": "pending",
        "creator_name": "Dr. Alan Turing",
        "subject_name": "Operating Systems"
      }
    ],
    "summary": {
      "totalTasks": 1,
      "activeCount": 1,
      "completedCount": 0,
      "currentWorkload": 5,
      "threshold": 15
    }
  }
  ```

#### `PATCH /api/faculty/tasks/:id/status`
- **Controller:** `backend/src/controllers/facultyController.js:70` (`updateTaskStatus`)
- **Route:** `backend/src/routes/facultyRoutes.js:15`
- **Middleware:** `authenticateToken`
- **Request Body:** `{"status": "in_progress"}` or `{"status": "completed"}` or `{"status": "pending"}`.
- **Validation:** `validStatuses = ['pending', 'in_progress', 'completed', 'active', 'approved']`.
- **Database Operation:**
  ```sql
  UPDATE tasks SET status = $1 
  WHERE id = $2 AND assigned_to = $3 
  RETURNING *
  ```
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "message": "Task status updated to \"in_progress\".",
    "task": { "id": 1, "status": "in_progress" }
  }
  ```

#### `POST /api/faculty/student-assignments/check`
- **Controller:** `backend/src/controllers/facultyController.js:171` (`checkStudentWorkload`)
- **Route:** `backend/src/routes/facultyRoutes.js:19`
- **Middleware:** `authenticateToken`
- **Request Body:**
  ```json
  {
    "subject_id": 2,
    "difficulty": 5,
    "due_date": "2026-11-10"
  }
  ```
- **Collision Rules:**
  - Daily limit: `dailyTotal + difficulty > 10`
  - Weekly limit: `weeklyTotal + difficulty > 18` (across rolling window `due_date ± 3 days`)
- **Collision Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "can_assign": false,
    "is_overloaded": true,
    "reason": "Daily workload threshold exceeded",
    "target_class": {
      "course_id": 2,
      "course_name": "B.Tech Computer Science and Engineering",
      "semester": 5,
      "subject_name": "Operating Systems"
    },
    "workload": {
      "date": "2026-11-10",
      "current_daily_workload": 8,
      "task_difficulty": 5,
      "resulting_daily_workload": 13,
      "daily_threshold": 10,
      "weekly_workload_window": 13,
      "weekly_threshold": 18
    },
    "alternative_dates": [
      {
        "date": "2026-11-11",
        "current_workload": 0,
        "resulting_workload": 5,
        "threshold": 10
      }
    ]
  }
  ```

#### `POST /api/faculty/student-assignments`
- **Controller:** `backend/src/controllers/facultyController.js:338` (`assignWorkToStudents`)
- **Route:** `backend/src/routes/facultyRoutes.js:20`
- **Middleware:** `authenticateToken`
- **Request Body:**
  ```json
  {
    "subject_id": 2,
    "title": "OS Process Scheduling Simulation",
    "description": "Implement Round Robin and Priority scheduling in C++",
    "difficulty": 4,
    "due_date": "2026-11-15",
    "max_marks": 100,
    "override_collision": false
  }
  ```
- **Database Operations (Transactional `BEGIN` / `COMMIT`):**
  1. Re-evaluates daily and weekly collision. If overloaded and `override_collision !== true`, rejects with HTTP 409 Conflict.
  2. Inserts assignment record into `student_assignments`.
  3. Automatically fans out rows to `student_assignment_submissions` with `status = 'pending'` for all enrolled students in that course and semester.
- **Success Response (HTTP 201 Created):**
  ```json
  {
    "success": true,
    "message": "Assignment successfully created and distributed to 2 students.",
    "assignment": { "id": 5, "title": "OS Process Scheduling Simulation" },
    "students_assigned": 2
  }
  ```

---

### 2.5 Student Portal Subsystem

#### `GET /api/student/dashboard`
- **Controller:** `backend/src/controllers/studentController.js:10` (`getStudentDashboard`)
- **Route:** `backend/src/routes/studentRoutes.js:11`
- **Middleware:** `authenticateToken`
- **Database Query:** Identifies student from `users` and `students` table via `req.user.userId`. Aggregates pending assignments, calculates student workload score against a 20-point gauge:
  ```sql
  SELECT s.course_id, s.semester, s.section, s.cgpa, c.name AS course_name, d.name AS department_name
  FROM students s
  JOIN courses c ON s.course_id = c.id
  JOIN departments d ON c.department_id = d.id
  WHERE s.user_id = $1
  ```
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "student": { "name": "Ada Lovelace", "course": "B.Tech CSE", "semester": 5 },
    "summary": { "pendingAssignments": 1, "submittedAssignments": 0 },
    "workload": { "score": 8, "gaugeMax": 20, "status": "Moderate Load" }
  }
  ```

#### `PATCH /api/student/assignments/:id/submit`
- **Controller:** `backend/src/controllers/studentController.js:195` (`submitAssignment`)
- **Route:** `backend/src/routes/studentRoutes.js:14`
- **Middleware:** `authenticateToken`
- **Request Body:**
  ```json
  {
    "submission_text": "GitHub Repo: https://github.com/student/os-scheduling",
    "submission_file": "report.pdf"
  }
  ```
- **Database Operation:**
  ```sql
  UPDATE student_assignment_submissions
  SET status = 'submitted', submission_text = $1, submission_file = $2, submitted_at = NOW()
  WHERE assignment_id = $3 AND student_id = $4
  RETURNING *
  ```
- **Success Response (HTTP 200 OK):**
  ```json
  {
    "success": true,
    "message": "Assignment submitted successfully!",
    "submission": { "id": 1, "status": "submitted" }
  }
  ```

---

## 3. Unregistered Routes Claimed in Earlier Documentation

The following endpoints were claimed to exist in earlier unverified documentation handoffs (`00`–`08`) but are **NOT REGISTERED** in any Express router and have no implementation in the codebase:

| Claimed Endpoint | Method | Claimed Purpose | Reality in Source Code |
| :--- | :---: | :--- | :--- |
| `/api/faculty/tasks/:id/deliverable` | `POST` | Base64 deliverable file upload & remark | **NOT REGISTERED.** No upload route exists in `facultyRoutes.js`. |
| `/api/faculty/tasks/file/:filename` | `GET` | Attachment file download handler | **NOT REGISTERED.** No file download handler exists in backend. |
| `/api/admin/users` | `POST` | Admin user enrollment & password setup | **NOT REGISTERED.** Admin features operate entirely in `localStorage`. |
| `/api/admin/departments` | `POST` | Admin department creation | **NOT REGISTERED.** Admin operates in `localStorage`. |
| `/api/admin/courses` | `POST` | Admin course creation | **NOT REGISTERED.** Admin operates in `localStorage`. |
| `/api/admin/hod/assign` | `POST` | Admin HOD credential assignment | **NOT REGISTERED.** Handled via client-side `localStorage`. |
| `/api/grievances` | `GET/POST` | Grievance lodging & tracking | **NOT REGISTERED.** Handled via mock array in `hod.js` / `faculty.js`. |
| `/api/grievances/:id` | `PATCH` | HOD sends resolution remarks | **NOT REGISTERED.** Mutates client-side object in `hod.js:1263`. |
| `/api/timetable` | `GET/POST` | Timetable grid load and updates | **NOT REGISTERED.** Stored in browser `localStorage`. |
| `/api/chat/threads` | `GET/POST` | Department messaging threads | **NOT REGISTERED.** Uses hardcoded static messages in `hod.js`. |
| `/api/student/performance` | `GET` | Marks & GPA trend data | **NOT REGISTERED.** Hardcoded sample stats in `student.js`. |
| `/api/student/attendance` | `GET` | Subject-wise attendance percentages | **NOT REGISTERED.** Hardcoded in `student.js:loadCourses`. |
