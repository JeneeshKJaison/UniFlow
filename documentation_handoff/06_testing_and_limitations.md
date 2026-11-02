# UniFlow — Verified Test Evidence & Known Limitations (v2)

> **Document Status:** VERIFIED AGAINST REAL TEST EXECUTION ON LOCAL SERVER & POSTGRESQL  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Test Harness:** `scratch/run_full_audit.js`  
> **Test Execution Date:** October 23, 2026  
> **Auditor Role:** Senior QA Architect, Security Auditor & Code Auditor  

---

## 1. Setup & Execution Commands

The test suite was executed against the active local environment using the following exact commands:

```bash
# 1. Verify PostgreSQL connection on port 5432
powershell -Command "Test-NetConnection -ComputerName localhost -Port 5432"
# Output: TcpTestSucceeded : True

# 2. Seed database tables, initial users, courses, subjects, and student data
node backend/seed.js
# Output: Database successfully seeded with all initial data!

# 3. Start production server in background
npm start # (running on port 5000)

# 4. Execute automated HTTP test harness across all registered endpoints
node scratch/run_full_audit.js

# 5. Execute workload simulation for multi-teacher workload tables
node backend/simulate_workload.js

# 6. Capture verified physical row counts from PostgreSQL
node scratch/count_rows.js
```

---

## 2. Rebuilt Test Inventory (100% Real Routes & Fields)

The old test inventory in v1 relied on non-existent endpoints (such as `/api/faculty/assignments`), non-existent schema fields (`weight`), and fabricated authorization middleware (`requireHOD`). 

The inventory below is rebuilt strictly from verified routes, controller functions, and real HTTP responses.

### Category A: Authentication Subsystem

#### `TC-AUTH-01`: Login with Missing Credentials
- **Endpoint:** `POST /api/auth/login`
- **Request Body:** `{"email": "hod.cs@uniflow.edu"}` (missing password)
- **Real HTTP Status:** **400 Bad Request**
- **Real Response:**
  ```json
  {
    "success": false,
    "message": "Email and password are required"
  }
  ```
- **Evidence Citation:** `backend/src/controllers/authController.js:18-23`.

#### `TC-AUTH-02`: Login with Incorrect Password
- **Endpoint:** `POST /api/auth/login`
- **Request Body:** `{"email": "hod.cs@uniflow.edu", "password": "wrongpassword"}`
- **Real HTTP Status:** **401 Unauthorized**
- **Real Response:**
  ```json
  {
    "success": false,
    "message": "Invalid email or password"
  }
  ```
- **Evidence Citation:** `backend/src/controllers/authController.js:58-63`.

#### `TC-AUTH-03`: Successful HOD Authentication
- **Endpoint:** `POST /api/auth/login`
- **Request Body:** `{"email": "hod.cs@uniflow.edu", "password": "password123"}`
- **Real HTTP Status:** **200 OK**
- **Real Response (Trimmed):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "customId": "HOD-CS01",
      "name": "Dr. Alan Turing",
      "email": "hod.cs@uniflow.edu",
      "role": "hod",
      "isHOD": true
    }
  }
  ```
- **Evidence Citation:** `backend/src/controllers/authController.js:86-100`.

---

### Category B: HOD Task Delegation & Overload Guard (Engine A)

#### `TC-ENG-A-01`: Task Assignment Under 15-Point Limit
- **Endpoint:** `POST /api/workload/assign`
- **Headers:** `Authorization: Bearer <HOD_TOKEN>`
- **Request Body:**
  ```json
  {
    "subject_id": 2,
    "assigned_to": 3,
    "description": "Prepare Question Paper for OS",
    "difficulty": 8,
    "scheduled_date": "2026-12-01",
    "deadline": "2026-12-05"
  }
  ```
- **Real HTTP Status:** **201 Created**
- **Real Response:**
  ```json
  {
    "success": true,
    "message": "Task approved and assigned successfully.",
    "task": {
      "id": 29,
      "created_by": 1,
      "assigned_to": 3,
      "difficulty": 8,
      "status": "approved"
    },
    "workload": {
      "previous": 0,
      "added": 8,
      "total": 8,
      "threshold": 15
    }
  }
  ```
- **Evidence Citation:** `backend/src/controllers/workloadController.js:522-555`.

#### `TC-ENG-A-02`: Task Assignment Overload Rejection
- **Endpoint:** `POST /api/workload/assign`
- **Headers:** `Authorization: Bearer <HOD_TOKEN>`
- **Preconditions:** Faculty 2 (Grace Hopper) has active load = 9. Attempting to add 10 points ($9 + 10 = 19 > 15$).
- **Request Body:**
  ```json
  {
    "subject_id": 2,
    "assigned_to": 2,
    "description": "Gigantic Task That Exceeds Limit",
    "difficulty": 10,
    "scheduled_date": "2026-09-03",
    "deadline": "2026-09-06"
  }
  ```
- **Real HTTP Status:** **409 Conflict**
- **Real Response:**
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
- **Evidence Citation:** `backend/src/controllers/workloadController.js:510-519`.

---

### Category C: Student Assignment Collision Detection (Engine B)

#### `TC-ENG-B-01`: Student Assignment Collision Detection with Alternative Dates
- **Endpoint:** `POST /api/faculty/student-assignments/check`
- **Headers:** `Authorization: Bearer <FACULTY_TOKEN>`
- **Preconditions:** Assignments totaling 12 difficulty points already exist for B.Tech CSE Sem 5 on `2026-11-10`.
- **Request Body:**
  ```json
  {
    "subject_id": 2,
    "difficulty": 5,
    "due_date": "2026-11-10"
  }
  ```
- **Real HTTP Status:** **200 OK**
- **Real Response:**
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
      "current_daily_workload": 12,
      "task_difficulty": 5,
      "resulting_daily_workload": 17,
      "daily_threshold": 15,
      "current_weekly_workload": 12,
      "resulting_weekly_workload": 17,
      "weekly_threshold": 18
    },
    "alternative_dates": [
      { "date": "2026-11-11", "current_workload": 0, "resulting_workload": 5, "threshold": 15, "current_weekly_workload": 12, "resulting_weekly_workload": 17, "weekly_threshold": 18 }
    ]
  }
  ```
- **Evidence Citation:** `backend/src/controllers/facultyController.js:253-294`.

#### `TC-ENG-B-02`: Student Turn-In Submission
- **Endpoint:** `PATCH /api/student/assignments/5/submit`
- **Headers:** `Authorization: Bearer <STUDENT_TOKEN>`
- **Request Body:**
  ```json
  {
    "submission_text": "GitHub repo: https://github.com/student/os-semaphores"
  }
  ```
- **Real HTTP Status:** **200 OK**
- **Real Response:**
  ```json
  {
    "success": true,
    "message": "Assignment submitted successfully!",
    "submission": {
      "id": 5,
      "assignment_id": 5,
      "student_id": 4,
      "status": "submitted",
      "submission_text": "GitHub repo: https://github.com/student/os-semaphores"
    }
  }
  ```
- **Evidence Citation:** `backend/src/controllers/studentController.js:212-225`.

---

### Category D: Academic Workload Class Addition (Engine C)

#### `TC-ENG-C-01`: Multi-Table Transactional Class Declaration
- **Endpoint:** `POST /api/workload/classes`
- **Headers:** `Authorization: Bearer <FACULTY_TOKEN>`
- **Request Body:**
  ```json
  {
    "programName": "B.Tech Computer Science and Engineering",
    "semester": 5,
    "courseType": "Core Theory",
    "ltpjCode": "3-1-0-0",
    "role": "Theory",
    "subjectName": "Compiler Design",
    "subjectCode": "CS502-TEST",
    "studentsClass": 60,
    "studentsInLab": 0,
    "studentsInProject": 0,
    "priorExperience": true
  }
  ```
- **Real HTTP Status:** **200 OK**
- **Real Response:**
  ```json
  {
    "success": true,
    "message": "Class added successfully."
  }
  ```
- **Database Verification:** Verified 1 row inserted across all 5 tables (`teaching_loads`, `paper_and_assignment_setting`, `preparation_and_course_factors`, `evaluation_units`, `workload_master`).
- **Evidence Citation:** `backend/src/controllers/workloadController.js:584-756`.

---

### Category E: Security & Broken Authorization Evidence

#### `TC-SEC-01`: Request with Missing JWT Token
- **Endpoint:** `GET /api/faculty/tasks`
- **Headers:** No `Authorization` header
- **Real HTTP Status:** **401 Unauthorized**
- **Real Response:**
  ```json
  {
    "message": "Access denied. No token provided."
  }
  ```
- **Evidence Citation:** `backend/src/middleware/authMiddleware.js:8-12`.

#### `TC-SEC-02`: Student Calling Protected HOD Endpoint
- **Endpoint:** `GET /api/workload/faculty`
- **Headers:** `Authorization: Bearer <STUDENT_TOKEN>` (Token payload: `role = 'student'`)
- **Real HTTP Status:** **200 OK** (Server-Side Role Broken Authorization)
- **Real Response (Trimmed):**
  ```json
  {
    "success": true,
    "faculty": [
      { "id": 2, "name": "Grace Hopper", "current_workload": 9 },
      { "id": 3, "name": "Linus Torvalds", "current_workload": 8 }
    ]
  }
  ```
- **Critical Finding:** Demonstrates that UniFlow lacks server-side role validation. Any authenticated student token is permitted to inspect faculty workloads and invoke administrative routes.
- **Evidence Citation:** `backend/src/middleware/authMiddleware.js:25-33`.

---

### Category F: Concurrency Race Condition Test

#### `TC-CONC-01`: Parallel Overload Task Assignment Race Test
- **Methodology:** Fired two simultaneous asynchronous requests (`Promise.all`) to `POST /api/workload/assign` targeting Linus Torvalds (ID 3), each requesting difficulty 8 ($8 + 8 = 16 > 15$).
- **Observed Execution Result:**
  - Request 1: `HTTP 201 Created` (Workload became 8)
  - Request 2: `HTTP 409 Conflict` (Rejected with $8 + 8 = 16 > 15$)
- **Architecture Analysis:** In this specific Node event-loop run, Request 1's `INSERT` completed before Request 2's `SELECT`. However, because `assignTask` lacks `BEGIN ... FOR UPDATE` row-level locks, an interleaved database execution across separate Node instances will permit both requests to read the stale total and both to insert, creating a race condition.

---

## 3. Reproducible Response Time Benchmarks

Measured via a Node.js benchmarking harness using `process.hrtime.bigint()` across 10 repeated iterations per endpoint:

```
Benchmark POST /api/auth/login:
  Average:  68.53 ms
  Min:      66.06 ms
  Max:      72.80 ms
  Raw (ms): 71.7, 72.8, 66.1, 68.5, 66.7, 69.6, 67.0, 68.4, 66.9, 67.5
  (Dominant latency factor: bcrypt password hashing with 10 salt rounds)

Benchmark GET /api/faculty/tasks:
  Average:   3.06 ms
  Min:       2.31 ms
  Max:       6.04 ms
  Raw (ms):  6.0, 3.0, 2.9, 2.5, 2.3, 2.9, 2.8, 2.5, 2.9, 2.7

Benchmark POST /api/workload/suggest:
  Average:   5.71 ms
  Min:       4.21 ms
  Max:      13.89 ms
  Raw (ms): 13.9, 5.0, 4.5, 4.2, 5.6, 4.7, 5.1, 4.5, 4.8, 4.8

Benchmark GET /api/student/dashboard:
  Average:   4.30 ms
  Min:       2.83 ms
  Max:      13.07 ms
  Raw (ms): 13.1, 3.9, 3.2, 3.3, 3.9, 3.1, 3.5, 2.8, 3.3, 2.9

Benchmark POST /api/faculty/student-assignments/check:
  Average:   7.01 ms
  Min:       4.54 ms
  Max:      12.82 ms
  Raw (ms):  5.8, 4.5, 5.8, 6.3, 4.7, 6.2, 4.7, 7.3, 12.8, 11.9
```

---

## 4. Known Architectural & Code Limitations

| Limitation ID | Category | Description | Severity | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **LIM-01** | **Authorization** | **Incomplete Role Enforcement:** Existing workload/HOD endpoints still lack role checks; the new grievance routes enforce student, faculty, and HOD roles. | **High** | Students and faculty may still invoke legacy HOD workload endpoints directly via API. |
| **LIM-02** | **Concurrency** | **Check-Then-Insert Race in `assignTask`:** Workload check and task insertion are not wrapped in an isolated transaction or locking construct. | **Medium** | Concurrent rapid task assignments can exceed the 15-point threshold. |
| **LIM-03** | **Storage** | **Deliverables Not Implemented:** Deliverable file submission documented in handoffs does not exist. | **Medium** | Faculty cannot upload completion files; tasks can only be toggled to completed. |
| **LIM-05** | **Storage** | **Plaintext Tokens in `localStorage`:** JWT tokens and user objects are stored in browser `localStorage`, exposing them to cross-site scripting (XSS) extraction. | **Medium** | Standard web application vulnerability; should migrate to HttpOnly secure cookies. |
| **LIM-06** | **Unconnected Screens** | **Timetable, Chat & Admin Screens:** These UI modules still rely on mock arrays or browser-local state without backend persistence. Student grievances now use the database-backed workflow. | **Low** | Timetable scheduling, chat, and admin user registration remain isolated to the local browser session. |
