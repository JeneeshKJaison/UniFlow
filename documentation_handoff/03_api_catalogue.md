# UniFlow — Verified RESTful API Catalogue

This catalogue documents all 20 active REST endpoints and static routes mounted on the UniFlow Express backend (`http://localhost:5000`). Every route is verified against `server.js`, route definitions, controller logic, and frontend callers.

---

## 1. System & Authentication Endpoints

### 1.1 `GET /`
- **Purpose:** Server heartbeat / health check.
- **Access Level:** Public (No authentication required).
- **Controller:** Inline in `server.js`.
- **Response `200 OK`:**
  ```json
  { "message": "UniFlow Backend is running!" }
  ```

### 1.2 `GET /api/db-test`
- **Purpose:** Verifies active PostgreSQL connection pooling.
- **Access Level:** Public.
- **Controller:** Inline in `server.js`.
- **Response `200 OK`:**
  ```json
  { "success": true, "message": "Database connection successful", "time": "2026-10-22T18:15:00.000Z" }
  ```
- **Error `500 Internal Server Error`:**
  ```json
  { "success": false, "message": "Database connection failed" }
  ```

### 1.3 `POST /api/auth/login`
- **Purpose:** Authenticates user credentials and issues signed JWT.
- **Access Level:** Public.
- **Controller:** `authController.js` $\rightarrow$ `login`.
- **Caller:** `UI/js/login.js` on form submit.
- **Request Body:**
  ```json
  {
      "email": "faculty@uniflow.edu",
      "password": "faculty123"
  }
  ```
- **Validation & Logic:**
  - Validates `email` and `password` presence.
  - Queries `SELECT * FROM users WHERE email = $1`.
  - Executes `bcrypt.compare(password, user.password_hash)`.
  - Generates JWT containing `{ userId, email, role, isHod }`, valid for 24 hours.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
          "id": 2,
          "customId": "FAC001",
          "name": "Grace Hopper",
          "email": "faculty@uniflow.edu",
          "role": "faculty",
          "isHod": false
      }
  }
  ```
- **Error `400 Bad Request`:** Missing email or password.
- **Error `401 Unauthorized`:** User not found or password hash mismatch (`Invalid email or password`).

---

## 2. HOD Workload & Administrative Endpoints (`/api/workload/*`)

### 2.1 `GET /api/workload/subjects`
- **Purpose:** Fetches subjects scoped by faculty, course, semester, or HOD department.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `workloadController.js` $\rightarrow$ `getSubjects`.
- **Query Parameters:** `?faculty_id=2`, `?course_id=1`, `?semester=5`.
- **Caller:** `UI/hod/js/hod.js` $\rightarrow$ `renderTasks()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "subjects": [
          {
              "id": 2,
              "name": "Operating Systems",
              "code": "CS301",
              "semester": 5,
              "credits": 4,
              "course_id": 1,
              "course_name": "B.Tech Computer Science and Engineering",
              "department_name": "Computer Science",
              "faculty": [{ "id": 2, "name": "Grace Hopper", "email": "faculty@uniflow.edu" }]
          }
      ]
  }
  ```

### 2.2 `GET /api/workload/faculty`
- **Purpose:** Retrieves faculty list with total active workload points for HOD dropdowns.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `workloadController.js` $\rightarrow$ `getFaculty`.
- **Caller:** `UI/hod/js/hod.js` $\rightarrow$ `renderTasks()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "faculty": [
          {
              "id": 2,
              "custom_id": "FAC001",
              "name": "Grace Hopper",
              "email": "faculty@uniflow.edu",
              "total_active_workload": 9,
              "assigned_subjects": [{ "id": 2, "name": "Operating Systems", "code": "CS301" }]
          }
      ],
      "threshold": 15
  }
  ```

### 2.3 `GET /api/workload/tasks`
- **Purpose:** Fetches all active administrative tasks across the department.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `workloadController.js` $\rightarrow$ `getTasks`.
- **Caller:** `UI/hod/js/hod.js` $\rightarrow$ `renderTasks()`.
- **Response `200 OK`:**
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
              "assignee_name": "Grace Hopper",
              "subject_name": "Operating Systems",
              "faculty_remark": "Draft questions formulated.",
              "attachment_url": "http://localhost:5000/uploads/1725150000000_OS_Draft.pdf"
          }
      ]
  }
  ```

### 2.4 `POST /api/workload/suggest`
- **Purpose:** Evaluates faculty capacity against 15-pt limit and generates alternative dates and peer faculty.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `workloadController.js` $\rightarrow$ `suggestTask`.
- **Caller:** `UI/hod/js/hod.js` on task assignment form submit.
- **Request Body:**
  ```json
  {
      "subject_id": 2,
      "assigned_to": 2,
      "description": "NAAC Criteria 3 Audit File Preparation",
      "difficulty": 8,
      "scheduled_date": "2026-09-02",
      "deadline": "2026-09-06"
  }
  ```
- **Business Logic:**
  - Calculates overlapping active workload: `SUM(difficulty)` where `scheduled_date <= end_date AND deadline >= start_date AND status != 'completed'`.
  - If `current + difficulty <= 15`: `can_assign = true`.
  - If `current + difficulty > 15`: `can_assign = false`; initiates `generate_series` date scan (next 30 days) and peer faculty query.
- **Response `200 OK` (Overload Example):**
  ```json
  {
      "success": true,
      "can_assign": false,
      "message": "Faculty workload would exceed the maximum threshold of 15 points.",
      "selected_faculty": { "id": 2, "name": "Grace Hopper", "current_workload": 9, "added_difficulty": 8, "resulting_workload": 17 },
      "threshold": 15,
      "recommendations": {
          "alternative_dates": [
              { "scheduled_date": "2026-09-09", "deadline": "2026-09-13", "existing_workload": 4, "resulting_workload": 12 }
          ],
          "alternative_faculty": [
              { "id": 3, "name": "Linus Torvalds", "current_workload": 0, "resulting_workload": 8, "teaches_subject": true }
          ]
      }
  }
  ```

### 2.5 `POST /api/workload/assign`
- **Purpose:** Strictly verifies threshold and commits task assignment to PostgreSQL.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `workloadController.js` $\rightarrow$ `assignTask`.
- **Request Body:** Same as `/api/workload/suggest`.
- **Response `201 Created`:**
  ```json
  {
      "success": true,
      "message": "Task approved and assigned successfully.",
      "task": { "id": 14, "description": "...", "status": "approved", "difficulty": 5 },
      "workload": { "previous": 4, "added": 5, "total": 9, "threshold": 15 }
  }
  ```
- **Error `409 Conflict` (Strict Block):**
  ```json
  {
      "success": false,
      "can_assign": false,
      "message": "Workload limit exceeded. Faculty current workload is 9 pts. Adding 8 pts reaches 17 pts (Maximum allowed: 15 pts).",
      "threshold": 15
  }
  ```

### 2.6 `POST /api/workload/classes`
- **Purpose:** Computes and saves L-T-P-J academic workload units across 5 database tables.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `workloadController.js` $\rightarrow$ `addClass`.
- **Caller:** `UI/faculty/js/faculty.js` $\rightarrow$ `#addClassForm` submit.
- **Request Body:**
  ```json
  {
      "programName": "B.Tech Computer Science",
      "subjectName": "Advanced Database Management Systems",
      "semester": 5,
      "courseType": "Theory course embedded with tutorial & practical",
      "ltpjCode": "2-1-2-0",
      "role": "Theory",
      "studentsClass": 60,
      "studentsInLab": 0,
      "studentsInProject": 0,
      "priorExperience": true,
      "labModification": false
  }
  ```
- **Response `200 OK`:**
  ```json
  { "success": true, "message": "Class added successfully." }
  ```

### 2.7 `GET /api/workload/hod/summary`
- **Purpose:** Returns comprehensive rows from all 5 workload tables for Chart.js bar graph rendering and table drill-downs.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `workloadController.js` $\rightarrow$ `getHodSummary`.
- **Caller:** `UI/hod/js/hod.js` $\rightarrow$ `fetchAndRenderHodSummary()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "workload_master": [{ "faculty_name": "Grace Hopper", "grand_total_workload_units": 42.5 }],
      "teaching_loads": [...],
      "paper_and_assignment_setting": [...],
      "preparation_and_course_factors": [...],
      "evaluation_units": [...]
  }
  ```

---

## 3. Faculty Module Endpoints (`/api/faculty/*`)

### 3.1 `GET /api/faculty/tasks`
- **Purpose:** Fetches all tasks assigned to logged-in faculty with active workload summary.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `facultyController.js` $\rightarrow$ `getMyTasks`.
- **Caller:** `UI/faculty/js/faculty.js` $\rightarrow$ `fetchFacultyTasks()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "tasks": [...],
      "summary": { "totalTasks": 4, "activeCount": 2, "completedCount": 2, "currentWorkload": 9, "threshold": 15 }
  }
  ```

### 3.2 `PATCH /api/faculty/tasks/:id/status`
- **Purpose:** Updates task status (`pending`, `in_progress`, `completed`).
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `facultyController.js` $\rightarrow$ `updateTaskStatus`.
- **Request Body:** `{ "status": "completed" }`
- **Response `200 OK`:** `{ "success": true, "task": { ... } }`

### 3.3 `POST /api/faculty/tasks/:id/deliverable`
- **Purpose:** Submits faculty completion remarks and base64 file upload.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `facultyController.js` $\rightarrow$ `submitTaskDeliverable`.
- **Caller:** `UI/faculty/js/faculty.js` $\rightarrow$ `#deliverableForm` submit.
- **Request Body:**
  ```json
  {
      "status": "completed",
      "faculty_remark": "Question paper verified and rubrics mapped.",
      "filename": "OS_Midterm_Paper.pdf",
      "file_data": "data:application/pdf;base64,JVBERi0xLjQK..."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "message": "Task deliverable and remark submitted successfully!",
      "task": {
          "id": 1,
          "faculty_remark": "Question paper verified and rubrics mapped.",
          "attachment_filename": "OS_Midterm_Paper.pdf",
          "attachment_url": "http://localhost:5000/uploads/1725150000000_OS_Midterm_Paper.pdf",
          "completed_at": "2026-10-22T18:30:00.000Z"
      }
  }
  ```

### 3.4 `GET /api/faculty/subjects`
- **Purpose:** Retrieves subjects mapped to logged-in faculty via `subject_faculty`.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `facultyController.js` $\rightarrow$ `getMySubjects`.
- **Caller:** `UI/faculty/js/faculty.js` $\rightarrow$ `fetchFacultySubjects()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "subjects": [
          { "id": 2, "name": "Operating Systems", "code": "CS301", "semester": 5, "course_name": "B.Tech Computer Science and Engineering" }
      ]
  }
  ```

### 3.5 `POST /api/faculty/student-assignments/check`
- **Purpose:** Pre-validates student class workload against daily (10 pts) and weekly (18 pts) limits.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `facultyController.js` $\rightarrow$ `checkStudentWorkload`.
- **Caller:** `UI/faculty/js/faculty.js` on assignment creation submit.
- **Request Body:**
  ```json
  {
      "subject_id": 2,
      "difficulty": 8,
      "due_date": "2026-09-08"
  }
  ```
- **Response `200 OK` (Collision Detected):**
  ```json
  {
      "success": true,
      "can_assign": false,
      "is_overloaded": true,
      "reason": "Daily workload threshold exceeded",
      "workload": {
          "date": "2026-09-08",
          "current_daily_workload": 6,
          "task_difficulty": 8,
          "resulting_daily_workload": 14,
          "daily_threshold": 10
      },
      "alternative_dates": [
          { "date": "2026-09-10", "formatted_date": "Thu, Sep 10, 2026", "current_workload": 0, "resulting_workload": 8, "threshold": 10 }
      ]
  }
  ```

### 3.6 `POST /api/faculty/student-assignments`
- **Purpose:** Atomically inserts assignment and generates pending submission rows for all enrolled class students.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `facultyController.js` $\rightarrow$ `assignWorkToStudents`.
- **Request Body:**
  ```json
  {
      "subject_id": 2,
      "title": "OS Lab Assignment 1",
      "description": "Implement CPU scheduling algorithms in C.",
      "difficulty": 4,
      "due_date": "2026-09-10",
      "max_marks": 100
  }
  ```
- **Response `201 Created`:**
  ```json
  {
      "success": true,
      "message": "Assignment successfully published to 60 students in B.Tech Computer Science (Semester 5).",
      "assignment": { "id": 5, "title": "OS Lab Assignment 1" },
      "students_notified": 60
  }
  ```

### 3.7 `GET /api/faculty/student-assignments`
- **Purpose:** Fetches all student assignments assigned by logged-in faculty with turn-in metrics.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `facultyController.js` $\rightarrow$ `getMyAssignedStudentWorks`.
- **Caller:** `UI/faculty/js/faculty.js` $\rightarrow$ `fetchAssignedStudentWorks()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "assigned_works": [
          {
              "id": 5,
              "title": "OS Lab Assignment 1",
              "difficulty": 4,
              "due_date": "2026-09-10",
              "total_students": 60,
              "submitted_count": 48
          }
      ]
  }
  ```

---

## 4. Student Module Endpoints (`/api/student/*`)

### 4.1 `GET /api/student/dashboard`
- **Purpose:** Returns student profile, active course count, pending vs completed assignments, and dynamic workload percentage.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `studentController.js` $\rightarrow$ `getStudentDashboard`.
- **Caller:** `UI/student/js/student.js` $\rightarrow$ `fetchStudentDashboard()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "profile": {
          "id": 4,
          "customId": "STU001",
          "name": "Ada Lovelace",
          "email": "student@uniflow.edu",
          "courseName": "B.Tech Computer Science and Engineering",
          "semester": 5,
          "cgpa": 8.40
      },
      "stats": {
          "activeCourses": 5,
          "pendingAssignments": 2,
          "completedAssignments": 4,
          "workloadPoints": 8,
          "workloadPercentage": 40
      }
  }
  ```

### 4.2 `GET /api/student/assignments`
- **Purpose:** Retrieves all assignments for student's course and semester with personal submission status.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `studentController.js` $\rightarrow$ `getStudentAssignments`.
- **Caller:** `UI/student/js/student.js` $\rightarrow$ `fetchStudentAssignments()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "assignments": [
          {
              "id": 5,
              "title": "OS Lab Assignment 1",
              "difficulty": 4,
              "due_date": "2026-09-10",
              "subject_name": "Operating Systems",
              "faculty_name": "Grace Hopper",
              "submission_status": "pending",
              "marks_obtained": null
          }
      ]
  }
  ```

### 4.3 `GET /api/student/courses`
- **Purpose:** Returns enrolled curriculum subjects and assigned faculty names.
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `studentController.js` $\rightarrow$ `getStudentCourses`.
- **Caller:** `UI/student/js/student.js` $\rightarrow$ `fetchStudentCourses()`.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "courses": [
          { "id": 2, "code": "CS301", "name": "Operating Systems", "credits": 4, "faculty_names": "Grace Hopper" }
      ]
  }
  ```

### 4.4 `PATCH /api/student/assignments/:id/submit`
- **Purpose:** Online assignment turn-in by student (submitting notes or repository links).
- **Access Level:** Protected (`authenticateToken`).
- **Controller:** `studentController.js` $\rightarrow$ `submitAssignment`.
- **Caller:** `UI/student/js/student.js` $\rightarrow$ `window.submitStudentWork()`.
- **Request Body:** `{ "submission_text": "GitHub repo: github.com/ada/os-scheduler" }`
- **Business Logic:**
  - Updates `student_assignment_submissions` status to `'submitted'`, writes `submitted_at = NOW()`.
  - Automatically reduces the student's active pending workload on next dashboard query.
- **Response `200 OK`:**
  ```json
  {
      "success": true,
      "message": "Assignment submitted successfully!",
      "submission": { "id": 12, "status": "submitted", "submitted_at": "2026-10-22T18:40:00.000Z" }
  }
  ```
