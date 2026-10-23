# UniFlow — Diagram-Ready Architecture & Specification Pack (v2)

> **Document Status:** VERIFIED AGAINST CODEBASE & LIVE DATABASE  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Auditor Role:** Senior Software Architect, Database Engineer & Technical Illustrator  
> **Date of Audit:** October 23, 2026  

---

## 1. System Architecture & Deployment Diagram

### (a) Purpose
Illustrates the physical and network deployment architecture connecting browser clients, static Express file serving, Node.js API processes, and the PostgreSQL database.

### (b) Node & Edge Specification Table
| Node ID | Element Name | Type | Protocol / Port | Real Name in Code |
| :--- | :--- | :--- | :--- | :--- |
| `CLIENT` | Web Browser | Client Runtime | HTTP / Ports 5000 or 5500 | `UI/index.html`, Chrome/Firefox |
| `SERVER` | Node.js Express Server | Application Process | HTTP / Port 5000 (`process.env.PORT`) | `backend/src/server.js` |
| `STATIC` | Static Middleware | Express Middleware | In-memory path mapping | `express.static('../../UI')` |
| `AUTH_MW`| Auth Middleware | Middleware | In-memory JWT verification | `backend/src/middleware/authMiddleware.js` |
| `PG_POOL`| node-postgres Pool | Client Driver Pool | TCP / Port 5432 | `backend/src/config/db.js` (`new Pool(...)`) |
| `POSTGRES`| PostgreSQL Database | Relational DBMS | Port 5432 (`process.env.DB_PORT`)| Database: `uniflow` |

### (c) Mermaid Source
```mermaid
graph TD
    subgraph ClientLayer ["Client Presentation Layer (Browser)"]
        Browser["Web Browser (Chrome / Firefox / Edge)"]
        LocalStorage["Browser localStorage<br/>• uniflow_token<br/>• uniflow_currentUser<br/>• uniflow_dataStore (Admin Mock)<br/>• uniflow_timetable (Mock)"]
        Browser <--> LocalStorage
    end

    subgraph ServerLayer ["Application Layer (Node.js & Express 5)"]
        WebServer["Express HTTP Server<br/>(http://localhost:5000)"]
        StaticRouter["express.static('../../UI')<br/>HTML, CSS, JS Asset Delivery"]
        JsonBody["express.json()<br/>(Body Limit: 100 KB)"]
        CorsLayer["cors()<br/>Allow All Origins"]
        
        subgraph RouteHandlers ["Modular Express Routers"]
            AuthRoutes["/api/auth (authRoutes.js)"]
            WorkloadRoutes["/api/workload (workloadRoutes.js)"]
            FacultyRoutes["/api/faculty (facultyRoutes.js)"]
            StudentRoutes["/api/student (studentRoutes.js)"]
        end

        AuthMiddleware["authMiddleware.js<br/>authenticateToken (JWT Signature Check)"]
        PgPool["pg.Pool Connection Driver<br/>(backend/src/config/db.js)"]
    end

    subgraph DatabaseLayer ["Data Persistence Layer (PostgreSQL)"]
        PostgresDB[("PostgreSQL 16 Instance<br/>Port: 5432 | DB: uniflow<br/>(18 Active Tables / 27 Physical Tables)")]
    end

    Browser -- "HTTP GET / (Asset Requests)" --> StaticRouter
    Browser -- "HTTP POST/GET/PATCH (API Calls)" --> CorsLayer
    CorsLayer --> JsonBody
    JsonBody --> AuthRoutes
    JsonBody --> WorkloadRoutes
    JsonBody --> FacultyRoutes
    JsonBody --> StudentRoutes

    WorkloadRoutes -. "Protected Calls" .-> AuthMiddleware
    FacultyRoutes -. "Protected Calls" .-> AuthMiddleware
    StudentRoutes -. "Protected Calls" .-> AuthMiddleware

    AuthRoutes --> PgPool
    WorkloadRoutes --> PgPool
    FacultyRoutes --> PgPool
    StudentRoutes --> PgPool

    PgPool -- "TCP Parameterized SQL Queries ($1, $2)" --> PostgresDB
```

---

## 2. Layered Component Diagram of the Backend

### (a) Purpose
Decomposes the backend into discrete architectural layers (Routes $\rightarrow$ Middleware $\rightarrow$ Controllers $\rightarrow$ Data Access) and enumerates every controller export.

### (b) Component Hierarchy & Function Mapping
- **Routes Layer:** `authRoutes.js`, `workloadRoutes.js`, `facultyRoutes.js`, `studentRoutes.js`.
- **Middleware Layer:** `authMiddleware.js` (`authenticateToken`), `flexibleAuth`, `flexibleHodAuth`.
- **Controllers Layer:**
  - `authController.js`: `login`
  - `workloadController.js`: `getSubjects`, `getFaculty`, `getTasks`, `suggestTask`, `assignTask`, `addClass`, `getHodSummary`, `getWorkloadCatalogs`, `getDepartmentMaster`, `getFacultyDepartmentWorkload`, `saveFacultyDepartmentWorkload`, `deleteFacultyDepartmentWorkload`, `getHodDepartmentSummary`
  - `facultyController.js`: `getMyTasks`, `updateTaskStatus`, `getMySubjects`, `checkStudentWorkload`, `assignWorkToStudents`, `getMyAssignedStudentWorks`
  - `studentController.js`: `getStudentDashboard`, `getStudentAssignments`, `getStudentCourses`, `submitAssignment`
- **Data Access:** `backend/src/config/db.js` (`pool.query`).

### (c) Mermaid Source
```mermaid
graph TD
    subgraph Layer1 ["1. Route Layer (backend/src/routes/)"]
        R_AUTH["authRoutes.js<br/>• POST /login"]
        R_WORK["workloadRoutes.js<br/>• /subjects, /faculty, /tasks<br/>• /suggest, /assign, /classes<br/>• /hod/summary, /catalogs<br/>• /department/*"]
        R_FAC["facultyRoutes.js<br/>• /tasks, /tasks/:id/status<br/>• /subjects<br/>• /student-assignments/check<br/>• /student-assignments"]
        R_STU["studentRoutes.js<br/>• /dashboard<br/>• /assignments<br/>• /courses<br/>• /assignments/:id/submit"]
    end

    subgraph Layer2 ["2. Security & Middleware Layer"]
        M_JWT["authenticateToken<br/>(authMiddleware.js)"]
        M_FLEX["flexibleAuth / flexibleHodAuth<br/>(workloadRoutes.js)"]
    end

    subgraph Layer3 ["3. Controller Layer (backend/src/controllers/)"]
        C_AUTH["authController.js<br/>• login()"]
        C_WORK["workloadController.js<br/>• suggestTask()<br/>• assignTask()<br/>• addClass()<br/>• getHodSummary()<br/>• getDepartmentMaster()<br/>• saveFacultyDepartmentWorkload()"]
        C_FAC["facultyController.js<br/>• getMyTasks()<br/>• updateTaskStatus()<br/>• checkStudentWorkload()<br/>• assignWorkToStudents()"]
        C_STU["studentController.js<br/>• getStudentDashboard()<br/>• getStudentAssignments()<br/>• getStudentCourses()<br/>• submitAssignment()"]
    end

    subgraph Layer4 ["4. Data Access Layer"]
        DB_CONFIG["db.js<br/>const pool = new Pool(...)"]
    end

    R_AUTH --> C_AUTH
    R_WORK --> M_JWT & M_FLEX
    R_FAC --> M_JWT
    R_STU --> M_JWT

    M_JWT --> C_WORK & C_FAC & C_STU
    M_FLEX --> C_WORK

    C_AUTH --> DB_CONFIG
    C_WORK --> DB_CONFIG
    C_FAC --> DB_CONFIG
    C_STU --> DB_CONFIG
```

---

## 3. Frontend Structure & Storage Architecture

### (a) Purpose
Maps each frontend HTML view to its associated scripts, stylesheets, API endpoints invoked, and browser `localStorage` keys used.

### (b) Structure Table
| HTML Page | Script File | CSS File | API Routes Invoked | `localStorage` Keys Touched |
| :--- | :--- | :--- | :--- | :--- |
| `UI/index.html` | `UI/js/login.js` | `UI/css/login.css`<br>`UI/css/theme.css` | `POST /api/auth/login` | `uniflow_token`, `uniflow_currentUser` |
| `UI/hod/dashboard.html` | `UI/hod/js/hod.js` | `UI/hod/css/hod.css`<br>`UI/css/theme.css` | `GET /api/workload/faculty`<br>`GET /api/workload/tasks`<br>`GET /api/workload/subjects`<br>`POST /api/workload/suggest`<br>`POST /api/workload/assign`<br>`GET /api/workload/hod/summary`<br>`GET /api/workload/department/hod/summary` | `uniflow_token`, `uniflow_currentUser`, `uniflow_timetable` (Mock), `uniflow_grievances` (Mock) |
| `UI/faculty/dashboard.html` | `UI/faculty/js/faculty.js` | `UI/css/theme.css` | `GET /api/faculty/tasks`<br>`PATCH /api/faculty/tasks/:id/status`<br>`GET /api/faculty/subjects`<br>`POST /api/workload/classes`<br>`POST /api/faculty/student-assignments/check`<br>`POST /api/faculty/student-assignments`<br>`GET /api/workload/catalogs`<br>`GET/POST /api/workload/department/faculty` | `uniflow_token`, `uniflow_currentUser` |
| `UI/student/dashboard.html` | `UI/student/js/student.js` | `UI/student/css/student.css`<br>`UI/css/theme.css` | `GET /api/student/dashboard`<br>`GET /api/student/courses`<br>`GET /api/student/assignments`<br>`PATCH /api/student/assignments/:id/submit` | `uniflow_token`, `uniflow_currentUser` |
| `UI/admin/dashboard.html` | `UI/admin/js/admin.js` | `UI/admin/css/admin.css`<br>`UI/css/theme.css` | *None (All operations client-side)* | `uniflow_dataStore` (Mock departments, courses, users, HODs) |

### (c) Mermaid Source
```mermaid
graph LR
    subgraph HTML_Pages ["HTML Documents"]
        P_LOGIN["index.html"]
        P_HOD["hod/dashboard.html"]
        P_FAC["faculty/dashboard.html"]
        P_STU["student/dashboard.html"]
        P_ADM["admin/dashboard.html"]
    end

    subgraph JS_Modules ["Client Logic"]
        J_LOGIN["login.js"]
        J_HOD["hod.js"]
        J_FAC["faculty.js"]
        J_STU["student.js"]
        J_ADM["admin.js"]
    end

    subgraph API_Endpoints ["Backend Endpoints"]
        E_LOGIN["/api/auth/login"]
        E_WORK["/api/workload/*"]
        E_FAC["/api/faculty/*"]
        E_STU["/api/student/*"]
    end

    subgraph BrowserStorage ["Browser localStorage"]
        S_TOKEN["uniflow_token"]
        S_USER["uniflow_currentUser"]
        S_ADMIN["uniflow_dataStore (Admin Mock)"]
        S_TIME["uniflow_timetable (Mock)"]
    end

    P_LOGIN --> J_LOGIN
    P_HOD --> J_HOD
    P_FAC --> J_FAC
    P_STU --> J_STU
    P_ADM --> J_ADM

    J_LOGIN --> E_LOGIN
    J_HOD --> E_WORK
    J_FAC --> E_FAC & E_WORK
    J_STU --> E_STU

    J_LOGIN --> S_TOKEN & S_USER
    J_HOD --> S_TOKEN & S_TIME
    J_FAC --> S_TOKEN
    J_STU --> S_TOKEN
    J_ADM --> S_ADMIN
```

---

## 4. Entity-Relationship (ER) Diagram (Real DDL)

### (a) Purpose
Represents the verified relational schema of the 18 active database tables. Honestly differentiates between core relational tables with foreign keys and academic workload tables that store IDs without foreign key constraints.

### (b) Foreign Key Integrity Legend
- **Solid Relationship Lines (`--||`):** True relational foreign keys enforced by PostgreSQL DDL (`ON DELETE CASCADE` or `SET NULL`).
- **Dashed Relationship Lines (`..o{`):** Logical / Inferred references where columns (`subject_id`, `faculty_id`) store integer keys without database-level `REFERENCES` constraints.

### (c) Mermaid Source
```mermaid
erDiagram
    USERS ||--o{ USER_DEPARTMENTS : "belongs to"
    DEPARTMENTS ||--o{ USER_DEPARTMENTS : "contains"
    DEPARTMENTS ||--o{ COURSES : "offers"
    DEPARTMENTS ||--o| USERS : "headed by (hod_user_id)"
    COURSES ||--o{ SUBJECTS : "curriculum"
    COURSES ||--o{ STUDENTS : "enrolls"
    USERS ||--o| STUDENTS : "profile"
    SUBJECTS ||--o{ SUBJECT_FACULTY : "allocated"
    USERS ||--o{ SUBJECT_FACULTY : "assigned"
    
    USERS ||--o{ TASKS : "delegated to (assigned_to)"
    USERS ||--o{ TASKS : "delegated by (created_by)"
    SUBJECTS ||--o{ TASKS : "context (subject_id)"

    COURSES ||--o{ STUDENT_ASSIGNMENTS : "class cohort"
    SUBJECTS ||--o{ STUDENT_ASSIGNMENTS : "course topic"
    USERS ||--o{ STUDENT_ASSIGNMENTS : "created by (faculty_id)"

    STUDENT_ASSIGNMENTS ||--o{ STUDENT_ASSIGNMENT_SUBMISSIONS : "turn-in"
    USERS ||--o{ STUDENT_ASSIGNMENT_SUBMISSIONS : "submitted by (student_id)"

    DEPARTMENT_ROLES_MASTER ||--o{ DEPARTMENT_TASKS_MASTER : "categorizes (role_id)"
    USERS ||--o{ FACULTY_DEPARTMENT_WORKLOAD : "performed by (faculty_id)"

    %% Unconstrained Logical Relations (Engine C Workload Tables)
    SUBJECTS ..o{ TEACHING_LOADS : "logical subject_id (no FK)"
    USERS ..o{ TEACHING_LOADS : "logical faculty_id (no FK)"
    SUBJECTS ..o{ PAPER_AND_ASSIGNMENT_SETTING : "logical subject_id (no FK)"
    SUBJECTS ..o{ PREPARATION_AND_COURSE_FACTORS : "logical subject_id (no FK)"
    SUBJECTS ..o{ EVALUATION_UNITS : "logical subject_id (no FK)"
    SUBJECTS ..o{ WORKLOAD_MASTER : "logical subject_id (no FK)"
    USERS ..o{ WORKLOAD_MASTER : "logical faculty_id (no FK)"

    USERS {
        int id PK
        varchar custom_id UK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role
        boolean is_hod
    }

    DEPARTMENTS {
        int id PK
        varchar code UK
        varchar name
        int hod_user_id FK
    }

    COURSES {
        int id PK
        int department_id FK
        varchar name
        varchar code UK
        int total_semesters
    }

    SUBJECTS {
        int id PK
        int course_id FK
        varchar name
        varchar code UK
        int semester
        int credits
        varchar course_type
        varchar ltpj_code
    }

    TASKS {
        int id PK
        int created_by FK
        int assigned_to FK
        int subject_id FK
        text description
        int difficulty
        date scheduled_date
        date deadline
        varchar status
    }

    STUDENTS {
        int id PK
        int user_id FK, UK
        int course_id FK
        int semester
        varchar section
        numeric cgpa
    }

    STUDENT_ASSIGNMENTS {
        int id PK
        int faculty_id FK
        int subject_id FK
        int course_id FK
        int semester
        varchar title
        text description
        int difficulty
        date due_date
        int max_marks
    }

    STUDENT_ASSIGNMENT_SUBMISSIONS {
        int id PK
        int assignment_id FK
        int student_id FK
        varchar status
        text submission_text
        varchar submission_file
        timestamp submitted_at
    }

    TEACHING_LOADS {
        int id PK
        int subject_id
        varchar subject_name
        int faculty_id
        varchar faculty_name
        numeric theory_hours
        numeric lab_hours
        numeric project_hours
        numeric tutorial_hours
        numeric total_load
    }

    WORKLOAD_MASTER {
        int id PK
        int subject_id
        varchar subject_name
        int faculty_id
        varchar faculty_name
        numeric teaching_load_units
        numeric question_setting_units
        numeric prep_adjustment_units
        numeric evaluation_units
        numeric experience_multiplier
        numeric grand_total_workload_units
    }

    FACULTY_DEPARTMENT_WORKLOAD {
        int id PK
        int faculty_id FK
        varchar faculty_name
        varchar role_id
        varchar task_id
        varchar task_name
        numeric calculated_workload
        varchar category
    }
```

---

## 5. Context Diagram & Data Flow Diagrams (DFD)

### (a) Purpose
Visualizes information flow across system boundaries (Level 0 Context), major subsystems (Level 1), and calculation engines (Level 2).

### (b) Level 0 Context Diagram
```mermaid
graph TD
    HOD["Head of Department (HOD)"]
    FAC["Faculty Member"]
    STU["Student"]
    
    SYSTEM["UniFlow System<br/>(Academic Workload Governance Platform)"]

    HOD -- "1. Credentials" --> SYSTEM
    HOD -- "2. Task Specs (Subject, Faculty, Diff, Dates)" --> SYSTEM
    SYSTEM -- "3. Workload Analytics & Suggestion Decisions" --> HOD

    FAC -- "4. Class Declaration (L-T-P-J, Cohort)" --> SYSTEM
    FAC -- "5. Assignment Specs (Due Date, Diff)" --> SYSTEM
    FAC -- "6. Task Status Updates (in_progress, completed)" --> SYSTEM
    SYSTEM -- "7. Collision Warnings & Alternative Dates" --> FAC
    SYSTEM -- "8. Allocated Tasks & Subjects" --> FAC

    STU -- "9. Assignment Turn-In (Text / Link)" --> SYSTEM
    SYSTEM -- "10. Workload Gauge & Active Course Tasks" --> STU
```

### (c) Level 1 DFD (Decomposed System)
```mermaid
graph TD
    HOD["Head of Department"]
    FAC["Faculty Member"]
    STU["Student"]

    P1["1.0 Authentication & Identity Subsystem"]
    P2["2.0 HOD Workload Allocation Engine (Engine A)"]
    P3["3.0 Academic Class Formulation Engine (Engine C)"]
    P4["4.0 Student Collision Detection Engine (Engine B)"]
    P5["5.0 Student Portal & Submissions Subsystem"]

    D1[("D1: users & departments")]
    D2[("D2: tasks")]
    D3[("D3: academic_workload_tables")]
    D4[("D4: student_assignments & submissions")]

    HOD -- "Email & Password" --> P1
    FAC -- "Email & Password" --> P1
    STU -- "Email & Password" --> P1
    P1 <--> D1

    HOD -- "Task Delegation Specs" --> P2
    P2 <--> D2
    P2 <--> D1
    P2 -- "Overload Decisions & Alternatives" --> HOD

    FAC -- "Class Metrics (L-T-P-J)" --> P3
    P3 --> D3
    D3 -- "Compiled Totals" --> HOD

    FAC -- "Proposed Assignment Due Date" --> P4
    P4 <--> D4
    P4 -- "Collision Warning / Alt Dates" --> FAC

    STU -- "Turn-In Submission" --> P5
    P5 <--> D4
    P5 -- "Workload Gauge Score" --> STU
```

---

## 6. UML Use-Case Diagram

### (a) Purpose
Distinguishes implemented use cases from planned/unconnected features across all four actor roles.

### (b) Mermaid Source
```mermaid
graph LR
    subgraph Actors
        A_HOD["Head of Department"]
        A_FAC["Faculty Member"]
        A_STU["Student"]
        A_ADM["Administrator"]
    end

    subgraph ImplementedUseCases ["Implemented Use Cases (API Connected)"]
        UC1["Login to System"]
        UC2["Inspect Faculty Workload Graph"]
        UC3["Delegate Task with 15pt Limit"]
        UC4["Review Alternative Dates / Teachers"]
        UC5["Toggle Assigned Task Status"]
        UC6["Declare Class & Formulate L-T-P-J Workload"]
        UC7["Publish Assignment with Collision Check"]
        UC8["Inspect Student Workload Gauge (Max 20)"]
        UC9["Turn In Assignment Submission"]
        UC10["Manage Multi-Domain Department Workload"]
    end

    subgraph PlannedUseCases ["Planned / Mocked Use Cases (INFERRED / FRONTEND ONLY)"]
        UC_P1["Upload Task Deliverable File (NOT IMPLEMENTED)"]
        UC_P2["Manage Timetable Matrix (localStorage Only)"]
        UC_P3["Resolve Student Grievances (localStorage Only)"]
        UC_P4["Admin User Registration (localStorage Only)"]
        UC_P5["Live Department Chat (localStorage Only)"]
    end

    A_HOD --> UC1 & UC2 & UC3 & UC4 & UC10
    A_FAC --> UC1 & UC5 & UC6 & UC7 & UC10
    A_STU --> UC1 & UC8 & UC9
    A_ADM -.-> UC_P4

    A_HOD -.-> UC_P2 & UC_P3 & UC_P5
    A_FAC -.-> UC_P1
```

---

## 7. Sequence Diagrams

### 7.1 Login Authentication (`POST /api/auth/login`)
```mermaid
sequenceDiagram
    autonumber
    actor User as User (HOD/Faculty/Student)
    participant UI as Browser (login.js)
    participant API as Express (server.js)
    participant Ctrl as authController.js
    participant DB as PostgreSQL (users)

    User->>UI: Enters Email & Password, clicks Login
    UI->>API: POST /api/auth/login { email, password }
    API->>Ctrl: login(req, res)
    Ctrl->>DB: SELECT id, password_hash, role, is_hod FROM users WHERE email = $1
    DB-->>Ctrl: User Row
    Ctrl->>Ctrl: bcrypt.compare(password, password_hash)
    alt Password Matches
        Ctrl->>Ctrl: jwt.sign({ userId, role, isHod }, JWT_SECRET, { expiresIn: '1d' })
        Ctrl-->>UI: HTTP 200 OK { success: true, token, user }
        UI->>UI: localStorage.setItem('uniflow_token', token)
        UI->>UI: Redirects to role dashboard
    else Password Mismatch or User Missing
        Ctrl-->>UI: HTTP 401 Unauthorized { success: false, message: 'Invalid email or password' }
        UI->>User: Displays error banner
    end
```

### 7.2 HOD Assigns Task Within 15-Point Limit
```mermaid
sequenceDiagram
    autonumber
    actor HOD
    participant UI as hod.js
    participant API as workloadRoutes.js
    participant MW as authMiddleware.js
    participant Ctrl as workloadController.js
    participant DB as PostgreSQL (tasks)

    HOD->>UI: Fills Task modal (Faculty: Grace H., Diff: 5, Dates: Sep 2-6)
    HOD->>UI: Clicks "Assign Task"
    UI->>API: POST /api/workload/assign (Bearer Token)
    API->>MW: authenticateToken()
    MW-->>API: Validated (req.user set)
    API->>Ctrl: assignTask(req, res)
    Ctrl->>DB: SELECT SUM(difficulty) FROM tasks WHERE assigned_to = 2 AND status != 'completed' AND dates overlap
    DB-->>Ctrl: current_workload = 4
    Ctrl->>Ctrl: resulting = 4 + 5 = 9 (<= 15)
    Ctrl->>DB: INSERT INTO tasks (created_by, assigned_to, subject_id, description, difficulty, scheduled_date, deadline, status='approved')
    DB-->>Ctrl: Inserted Row (ID: 30)
    Ctrl-->>UI: HTTP 201 Created { success: true, task: {...}, workload: { previous: 4, added: 5, total: 9 } }
    UI->>HOD: Displays success alert, re-renders tasks table
```

### 7.3 HOD Assigns Task Over 15-Point Limit with Alternative Discovery
```mermaid
sequenceDiagram
    autonumber
    actor HOD
    participant UI as hod.js
    participant Ctrl as workloadController.js
    participant DB as PostgreSQL

    HOD->>UI: Clicks "Check Workload" (Diff: 10, Faculty: Grace H., Current Load: 9)
    UI->>Ctrl: POST /api/workload/suggest
    Ctrl->>DB: Computes active load: current = 9, resulting = 19 (> 15)
    Ctrl->>DB: Scans alternative faculty (LIMIT 5) teaching subject whose load + 10 <= 15
    DB-->>Ctrl: Found [Linus Torvalds, load: 0]
    Ctrl->>DB: Scans next 14 days for alternative windows where load + 10 <= 15
    DB-->>Ctrl: Found [Sep 10-14]
    Ctrl-->>UI: HTTP 200 OK { can_assign: false, recommendations: { alternative_faculty: [...], alternative_dates: [...] } }
    UI->>HOD: Renders red warning badge and recommendation chips
```

### 7.4 Faculty Publishes Student Assignment with Collision & Override
```mermaid
sequenceDiagram
    autonumber
    actor Faculty
    participant UI as faculty.js
    participant Ctrl as facultyController.js
    participant DB as PostgreSQL

    Faculty->>UI: Enters assignment (Diff: 5, Due Date: Nov 10)
    Faculty->>UI: Clicks "Check Collision"
    UI->>Ctrl: POST /api/faculty/student-assignments/check
    Ctrl->>DB: Evaluates daily load for class on Nov 10 (Found existing Diff 8 -> 8 + 5 = 13 > 10)
    Ctrl->>DB: Scans next 14 candidate days (checks candDaily + 5 <= 10)
    DB-->>Ctrl: Alternative dates [Nov 11, Nov 12, Nov 13, Nov 14]
    Ctrl-->>UI: HTTP 200 OK { can_assign: false, is_overloaded: true, alternative_dates: [...] }
    UI->>Faculty: Displays "Daily workload threshold exceeded" banner & alt date pills
    
    alt Faculty Chooses Override
        Faculty->>UI: Checks "Override Collision" and clicks "Publish"
        UI->>Ctrl: POST /api/faculty/student-assignments { override_collision: true, ... }
        Ctrl->>DB: BEGIN Transaction
        Ctrl->>DB: INSERT INTO student_assignments (...) RETURNING id
        Ctrl->>DB: INSERT INTO student_assignment_submissions (assignment_id, student_id, status='pending') FOR ALL enrolled students
        Ctrl->>DB: COMMIT Transaction
        Ctrl-->>UI: HTTP 201 Created { success: true, students_assigned: 2 }
    end
```

### 7.5 Student Turn-In and Workload Gauge Refresh
```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as student.js
    participant Ctrl as studentController.js
    participant DB as PostgreSQL

    Student->>UI: Opens Turn-In modal for Assignment 5, enters GitHub link, submits
    UI->>Ctrl: PATCH /api/student/assignments/5/submit { submission_text: 'https://...' }
    Ctrl->>DB: UPDATE student_assignment_submissions SET status='submitted', submitted_at=NOW() WHERE assignment_id=5 AND student_id=req.user.userId
    DB-->>Ctrl: Updated Row
    Ctrl-->>UI: HTTP 200 OK { success: true, message: 'Assignment submitted successfully!' }
    UI->>Ctrl: GET /api/student/dashboard
    Ctrl->>DB: Recalculates pending difficulty sum
    DB-->>Ctrl: Pending Load decreased from 8 to 0
    Ctrl-->>UI: HTTP 200 OK { workload: { score: 0, status: 'Light Load' } }
    UI->>Student: Animates gauge fill down to 0%
```

### 7.6 Faculty Declares Class (`addClass` Transactional 5-Table Write)
```mermaid
sequenceDiagram
    autonumber
    actor Faculty
    participant UI as faculty.js
    participant Ctrl as workloadController.js
    participant DB as PostgreSQL

    Faculty->>UI: Submits "Add Class" form (L-T-P-J: 3-1-0-0, Theory, 60 students, Exp: Yes)
    UI->>Ctrl: POST /api/workload/classes
    Ctrl->>DB: BEGIN Transaction
    Ctrl->>DB: 1. Find or INSERT courses
    Ctrl->>DB: 2. INSERT INTO subjects (course_id, name, code, semester, ltpj_code)
    Ctrl->>DB: 3. INSERT INTO subject_faculty (subject_id, faculty_id, role)
    Ctrl->>DB: 4. INSERT INTO teaching_loads (3.50 units)
    Ctrl->>DB: 5. INSERT INTO paper_and_assignment_setting (5.00 units)
    Ctrl->>DB: 6. INSERT INTO preparation_and_course_factors (6.00 units)
    Ctrl->>DB: 7. INSERT INTO evaluation_units (15.60 units)
    Ctrl->>DB: 8. INSERT INTO workload_master (Grand Total: 27.09 units)
    Ctrl->>DB: COMMIT Transaction
    Ctrl-->>UI: HTTP 200 OK { success: true, message: 'Class added successfully.' }
```

### 7.7 HOD Analytics Chart Load
```mermaid
sequenceDiagram
    autonumber
    actor HOD
    participant UI as hod.js
    participant Chart as Chart.js Instance
    participant Ctrl as workloadController.js
    participant DB as PostgreSQL

    HOD->>UI: Opens HOD Console
    UI->>Ctrl: GET /api/workload/hod/summary
    Ctrl->>DB: SELECT * FROM workload_master ORDER BY faculty_name
    Ctrl->>DB: SELECT * FROM teaching_loads ...
    Ctrl->>DB: SELECT * FROM evaluation_units ...
    DB-->>Ctrl: All 5 Workload Tables
    Ctrl-->>UI: HTTP 200 OK { workload_master: [...], teaching_loads: [...], ... }
    UI->>Chart: new Chart(ctx, { type: 'bar', data: { labels: facultyNames, datasets: [...] } })
    Chart-->>UI: Renders interactive animated bar graph
```

---

## 8. Flowcharts

### 8.1 Flowchart: Engine A (HOD Task Delegation Guard)
```mermaid
flowchart TD
    Start([HOD Submits Task Delegation Request]) --> Step1[Parse Inputs: faculty_id, difficulty, scheduled_date, deadline]
    Step1 --> CheckValid{Is difficulty between 1 and 10?}
    CheckValid -- No --> Err400[Return HTTP 400 Bad Request]
    CheckValid -- Yes --> Step2[Compute target date range: start_date to end_date]
    Step2 --> QueryDB[(Query active tasks for faculty where dates overlap and status != 'completed')]
    QueryDB --> CalcLoad[current_workload = SUM of difficulty]
    CalcLoad --> ResultLoad[resulting_workload = current_workload + difficulty]
    ResultLoad --> CheckThresh{Is resulting_workload <= 15?}
    
    CheckThresh -- Yes --> CommitCheck{Is this an assign request?}
    CommitCheck -- Yes --> InsertTask[(INSERT INTO tasks with status = 'approved')]
    InsertTask --> Return201[Return HTTP 201 Task Approved & Assigned]
    CommitCheck -- No --> ReturnSuggest[Return HTTP 200 can_assign: true]
    
    CheckThresh -- No --> ScanAlt[Find Alternative Faculty LIMIT 5 & Candidate Dates LIMIT 3]
    ScanAlt --> DecisionBranch{Is this an assign request?}
    DecisionBranch -- Yes --> Reject409[Return HTTP 409 Conflict: Workload limit exceeded]
    DecisionBranch -- No --> Return200Warn[Return HTTP 200 can_assign: false with recommendations]
```

### 8.2 Flowchart: Engine B (Student Workload Collision Engine)
```mermaid
flowchart TD
    Start([Faculty Requests Assignment Check]) --> Step1[Verify faculty teaches subject & retrieve course_id, semester]
    Step1 --> QueryDaily[(Query SUM difficulty from student_assignments for course & semester on due_date)]
    QueryDaily --> CalcDaily[resulting_daily = current_daily + difficulty]
    CalcDaily --> QueryWeekly[(Query SUM difficulty in rolling window: due_date - 3 days to due_date + 3 days)]
    QueryWeekly --> CalcWeekly[resulting_weekly = current_weekly + difficulty]
    
    CalcWeekly --> CheckDaily{resulting_daily > 10?}
    CheckDaily -- Yes --> SetCollision[has_collision = true, reason = 'Daily threshold exceeded']
    CheckDaily -- No --> CheckWeekly{resulting_weekly > 18?}
    CheckWeekly -- Yes --> SetCollision2[has_collision = true, reason = 'Weekly concentration exceeded']
    CheckWeekly -- No --> ClearCollision[has_collision = false]
    
    SetCollision --> ScanDates[Scan forward 14 days for candDaily + difficulty <= 10]
    SetCollision2 --> ScanDates
    ScanDates --> ReturnAlt[Return HTTP 200 can_assign: false with top 4 alternative dates]
    ClearCollision --> ReturnOK[Return HTTP 200 can_assign: true]
```

### 8.3 Flowchart: Engine C (L-T-P-J Academic Course Workload Formulation)
```mermaid
flowchart TD
    Start([Faculty Submits Add Class Form]) --> ParseCode[Extract L, T, P, J from ltpj_code string]
    ParseCode --> TL[Calculate Teaching Loads: L*1.0 + T*0.5 + P*0.5 + J*0.5 + Lab*0.02 + Proj*0.05 + LargeClassAdj]
    TL --> QS[Calculate Setting Units: Paper counts & Assignment counts from L-T-P-J code]
    QS --> Prep[Determine Prep Units based on Role: Theory=6.0, Lab=8.5/7.0, Project=5.0]
    Prep --> Eval[Calculate Evaluation Units: Series, ESE scripts, Lab outputs, Practical, Viva]
    Eval --> ExpMult{Prior Experience?}
    ExpMult -- Yes --> SetExp[multiplier = 0.9]
    ExpMult -- No --> SetExp1[multiplier = 1.0]
    SetExp --> GrandTotal[Grand Total = TeachingLoad + Setting + Prep + Eval * multiplier]
    SetExp1 --> GrandTotal
    GrandTotal --> TxCommit[(Commit Transaction across courses, subjects, subject_faculty, and 5 workload tables)]
    TxCommit --> Finish([Return HTTP 200 Class Added])
```

---

## 9. State Transition Diagrams

### 9.1 Administrative Task Status Lifecycle
```mermaid
stateDiagram-v2
    [*] --> pending : Seeded in seed.js or Created
    [*] --> approved : Assigned via POST /api/workload/assign
    
    approved --> in_progress : Faculty clicks 'Start' (PATCH status)
    pending --> in_progress : Faculty clicks 'Start' (PATCH status)
    
    in_progress --> completed : Faculty clicks 'Mark Done' (PATCH status)
    pending --> completed : Faculty clicks 'Mark Done'
    
    completed --> pending : Faculty clicks 'Reopen' (PATCH status)
```

### 9.2 Student Assignment Submission Status Lifecycle
```mermaid
stateDiagram-v2
    [*] --> pending : Faculty publishes assignment (fan-out write)
    pending --> submitted : Student submits turn-in form (PATCH /submit)
    
    note right of submitted
        'graded' status exists in schema check constraint
        but is NEVER written by any backend endpoint.
    end note
```

---

## 10. Module & Component Diagram

### (a) Purpose
Illustrates the structural relationship between backend controller modules and frontend client controllers.

### (b) Mermaid Source
```mermaid
classDiagram
    class authController {
        +login(req, res)
    }

    class workloadController {
        +getSubjects(req, res)
        +getFaculty(req, res)
        +getTasks(req, res)
        +suggestTask(req, res)
        +assignTask(req, res)
        +addClass(req, res)
        +getHodSummary(req, res)
        +getWorkloadCatalogs(req, res)
        +getDepartmentMaster(req, res)
        +getFacultyDepartmentWorkload(req, res)
        +saveFacultyDepartmentWorkload(req, res)
        +deleteFacultyDepartmentWorkload(req, res)
        +getHodDepartmentSummary(req, res)
    }

    class facultyController {
        +getMyTasks(req, res)
        +updateTaskStatus(req, res)
        +getMySubjects(req, res)
        +checkStudentWorkload(req, res)
        +assignWorkToStudents(req, res)
        +getMyAssignedStudentWorks(req, res)
    }

    class studentController {
        +getStudentDashboard(req, res)
        +getStudentAssignments(req, res)
        +getStudentCourses(req, res)
        +submitAssignment(req, res)
    }

    class authMiddleware {
        +authenticateToken(req, res, next)
    }

    authMiddleware ..> workloadController : protects
    authMiddleware ..> facultyController : protects
    authMiddleware ..> studentController : protects
```

---

## 11. Screen Navigation Flow

### (a) Purpose
Maps user transition between screens, role-based redirects upon login, and modal views.

### (b) Mermaid Source
```mermaid
graph TD
    LoginScreen["Login Screen (UI/index.html)"]
    
    subgraph HOD_Views ["HOD Portal (UI/hod/dashboard.html)"]
        HOD_Dash["HOD Overview & Workload Graph"]
        HOD_TaskModal["Assign Task Modal (Engine A)"]
        HOD_DeptWorkload["Department Workload Matrix"]
        HOD_Timetable["Timetable Matrix (Mock)"]
        HOD_Grievance["Grievance Resolution (Mock)"]
    end

    subgraph Faculty_Views ["Faculty Portal (UI/faculty/dashboard.html)"]
        Fac_Dash["Faculty Overview & Task Table"]
        Fac_AddClassModal["Add Class Modal (Engine C)"]
        Fac_AssignModal["Student Assignment Modal (Engine B)"]
        Fac_Calendar["Calendar View"]
        Fac_DeptWorkload["Faculty Multi-Domain Workload"]
    end

    subgraph Student_Views ["Student Portal (UI/student/dashboard.html)"]
        Stu_Dash["Student Dashboard (20pt Gauge)"]
        Stu_Assignments["Active Assignments List"]
        Stu_TurnInModal["Turn-In Submission Modal"]
        Stu_Courses["Enrolled Courses View"]
    end

    subgraph Admin_Views ["Admin Console (UI/admin/dashboard.html)"]
        Admin_Depts["Departments Directory (Mock)"]
        Admin_Courses["Courses Directory (Mock)"]
        Admin_Users["User Enrollment (Mock)"]
        Admin_Hods["HOD Assignment (Mock)"]
    end

    LoginScreen -- "role === 'hod'" --> HOD_Dash
    LoginScreen -- "role === 'faculty'" --> Fac_Dash
    LoginScreen -- "role === 'student'" --> Stu_Dash
    LoginScreen -- "role === 'admin'" --> Admin_Depts

    HOD_Dash --> HOD_TaskModal
    HOD_Dash --> HOD_DeptWorkload
    HOD_Dash --> HOD_Timetable
    HOD_Dash --> HOD_Grievance

    Fac_Dash --> Fac_AddClassModal
    Fac_Dash --> Fac_AssignModal
    Fac_Dash --> Fac_Calendar
    Fac_Dash --> Fac_DeptWorkload

    Stu_Dash --> Stu_Assignments
    Stu_Assignments --> Stu_TurnInModal
    Stu_Dash --> Stu_Courses

    Admin_Depts --> Admin_Courses --> Admin_Users --> Admin_Hods
```
