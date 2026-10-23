# UniFlow — Verified Database Design & DDL Specification (v2)

> **Document Status:** VERIFIED AGAINST LIVE POSTGRESQL INSTANCE & DDL SCRIPTS  
> **Audit Target:** Git Commit `6a2fff722c3d8cab187c5e95882cd1c894d185c6` (Branch: `main`)  
> **Database Engine:** PostgreSQL 16+ on port `5432` (`uniflow`)  
> **Auditor Role:** Senior Database Engineer & Code Auditor  
> **Date of Audit:** October 23, 2026  

---

## 1. Schema Evolution & The Table Count Reconciliation

A primary source of confusion in earlier UniFlow documentation was contradictory claims regarding table counts (10 tables in early markdown, 16 tables in presentation slides, 18 tables in `schema.sql`, and 27 tables in the live database).

Here is the verified historical and architectural truth:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. EARLY PROTOTYPE (changes.docx)                                           │
│    • Contained exactly 16 tables:                                           │
│      users, departments, user_departments, courses, student_enrollments,    │
│      subjects, subject_faculty, timetable, timetable_faculty, tasks, marks, │
│      grievances, chat_threads, chat_participants, messages, attendance      │
│    • This was the source of the "16 tables" claim in project slides.        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. RELATIONAL SCHEMAS & STUDENT PORTAL (Commit ad9770c)                     │
│    • Re-architected schema into 10 active relational tables:                │
│      1. users                  6. subject_faculty                           │
│      2. departments            7. tasks                                     │
│      3. user_departments       8. students                                  │
│      4. courses                9. student_assignments                       │
│      5. subjects              10. student_assignment_submissions            │
│    • Replaced student_enrollments & marks with students, student_assignments│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ACADEMIC WORKLOAD & MULTI-DOMAIN REFACTOR (Commits 72a18b6 & 7c189a7)    │
│    • Added 5 Academic Workload Formulation Tables (Engine C):               │
│      11. teaching_loads              14. evaluation_units                   │
│      12. paper_and_assignment_setting 15. workload_master                   │
│      13. preparation_and_course_factors                                     │
│    • Added 3 Multi-Domain Workload Governance Tables:                       │
│      16. department_roles_master                                            │
│      17. department_tasks_master                                            │
│      18. faculty_department_workload                                        │
│    • This brought backend/schema.sql to exactly 18 active tables.           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. LIVE DATABASE STATUS (Live Query of information_schema.tables)           │
│    • Exactly 27 physical tables exist in the public PostgreSQL schema.      │
│    • 18 active production tables + 9 leftover prototype tables              │
│      (attendance, chat_participants, chat_threads, grievances, marks,       │
│       messages, student_enrollments, timetable, timetable_faculty).         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Live Database Table Inventory & Row Counts

The following row counts were captured immediately following execution of `npm run seed` and `node simulate_workload.js` against the live PostgreSQL instance:

| # | Table Name | Status in System | Schema Definition Source | Live Row Count |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `users` | **ACTIVE** (Identity & Auth) | `schema.sql:6-15`, `seed.js:103-112` | **10** |
| 2 | `departments` | **ACTIVE** (Institutional Units) | `schema.sql:18-24`, `seed.js:114-120` | **4** |
| 3 | `user_departments` | **ACTIVE** (User-Dept Affiliation) | `schema.sql:27-32`, `seed.js:122-127` | **7** |
| 4 | `courses` | **ACTIVE** (Degree Programs) | `schema.sql:35-42`, `seed.js:129-136` | **7** |
| 5 | `subjects` | **ACTIVE** (Courses / Modules) | `schema.sql:45-55`, `seed.js:138-148` | **50** |
| 6 | `subject_faculty` | **ACTIVE** (Faculty Class Mapping) | `schema.sql:58-64`, `seed.js:150-156` | **29** |
| 7 | `tasks` | **ACTIVE** (HOD Delegated Tasks) | `schema.sql:67-78`, `seed.js:158-169` | **15** |
| 8 | `students` | **ACTIVE** (Student Profiles) | `schema.sql:81-90`, `seed.js:171-180` | **2** |
| 9 | `student_assignments` | **ACTIVE** (Faculty Course Tasks) | `schema.sql:93-106`, `seed.js:182-195` | **5** |
| 10 | `student_assignment_submissions` | **ACTIVE** (Student Submissions) | `schema.sql:109-121`, `seed.js:197-209` | **10** |
| 11 | `teaching_loads` | **ACTIVE** (Engine C: Lecture/Lab) | `schema.sql:124-139`, `initWorkloadTables.js:6-21` | **19** |
| 12 | `paper_and_assignment_setting` | **ACTIVE** (Engine C: Question Setting)| `schema.sql:142-152`, `initWorkloadTables.js:23-33` | **19** |
| 13 | `preparation_and_course_factors` | **ACTIVE** (Engine C: Prep Factors) | `schema.sql:155-174`, `initWorkloadTables.js:35-54` | **19** |
| 14 | `evaluation_units` | **ACTIVE** (Engine C: Grading Units) | `schema.sql:177-191`, `initWorkloadTables.js:56-70` | **19** |
| 15 | `workload_master` | **ACTIVE** (Engine C: Grand Totals) | `schema.sql:194-207`, `initWorkloadTables.js:72-85` | **19** |
| 16 | `department_roles_master` | **ACTIVE** (Master Catalog Roles) | `schema.sql:210-216`, `initWorkloadTables.js:111-117` | **38** |
| 17 | `department_tasks_master` | **ACTIVE** (Master Catalog Tasks) | `schema.sql:219-229`, `initWorkloadTables.js:120-130` | **102** |
| 18 | `faculty_department_workload` | **ACTIVE** (Allocated Domain Tasks)| `schema.sql:232-250`, `initWorkloadTables.js:133-151` | **20** |
| 19 | `attendance` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |
| 20 | `chat_participants` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |
| 21 | `chat_threads` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |
| 22 | `grievances` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |
| 23 | `marks` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |
| 24 | `messages` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |
| 25 | `student_enrollments` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |
| 26 | `timetable` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |
| 27 | `timetable_faculty` | *PROTOTYPE (UNCONNECTED)* | `changes.docx` | **0** |

---

## 3. Detailed Data Definition Language (DDL) & Table Specifications

### 3.1 Identity, Institutional Units & Academics

#### 1. `users` Table
Stores authentication credentials and role flags for all institutional members.
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    custom_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'faculty', 'student'
    is_hod BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `departments` Table
Academic departments within the institution.
```sql
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hod_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `user_departments` Table
Many-to-many relationship linking faculty and HODs to departments.
```sql
CREATE TABLE user_departments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE(user_id, department_id)
);
```

#### 4. `courses` Table
Degree programs (e.g. B.Tech Computer Science, M.Tech, MCA).
```sql
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    total_semesters INT DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. `subjects` Table
Curricular courses/subjects mapped to a degree program and semester.
```sql
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    semester INT NOT NULL,
    credits INT DEFAULT 3,
    course_type VARCHAR(255),  -- e.g. 'Core Theory', 'Practical / Laboratory'
    ltpj_code VARCHAR(50),     -- e.g. '3-1-0-0', '0-0-3-0'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. `subject_faculty` Table
Mapping between instructors and subjects taught.
```sql
CREATE TABLE subject_faculty (
    id SERIAL PRIMARY KEY,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'Theory', -- 'Theory', 'Lab', 'Project'
    UNIQUE(subject_id, faculty_id)
);
```

---

### 3.2 Administrative Tasks Subsystem (Engine A)

#### 7. `tasks` Table
Administrative and institutional tasks delegated by the HOD to faculty members.
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INT REFERENCES users(id) ON DELETE CASCADE,
    subject_id INT REFERENCES subjects(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    deadline DATE,
    scheduled_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'approved'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    faculty_remark TEXT,                -- Added via server.js auto-migration
    attachment_filename VARCHAR(255),    -- Added via server.js auto-migration
    attachment_url TEXT,                 -- Added via server.js auto-migration
    completed_at TIMESTAMP               -- Added via server.js auto-migration
);
```

---

### 3.3 Student Assignments Subsystem (Engine B)

#### 8. `students` Table
Student demographic profile, current semester enrollment, and academic standing.
```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester INT NOT NULL DEFAULT 5,
    section VARCHAR(10) DEFAULT 'A',
    cgpa NUMERIC(3, 2) DEFAULT 8.40,
    admission_year INT DEFAULT 2023,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 9. `student_assignments` Table
Course assignments published by faculty members with collision-checked due dates.
```sql
CREATE TABLE student_assignments (
    id SERIAL PRIMARY KEY,
    faculty_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    max_marks INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 10. `student_assignment_submissions` Table
Individual student turn-in submissions and grading status.
```sql
CREATE TABLE student_assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES student_assignments(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'submitted', 'graded'
    submission_text TEXT,
    submission_file VARCHAR(255),
    marks_obtained INT,
    remarks TEXT,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);
```

---

### 3.4 Academic Course Workload Formulation Subsystem (Engine C)

> [!IMPORTANT]
> **Foreign Key Integrity Audit:**
> In `schema.sql`, tables 11 through 15 are written with `REFERENCES subjects(id) ON DELETE CASCADE` and `REFERENCES users(id) ON DELETE CASCADE`. However, in `backend/src/config/initWorkloadTables.js` and `backend/create_workload_tables.js`, these tables are instantiated with `subject_id INTEGER` and `faculty_id INTEGER` without foreign key constraints to allow synthetic simulation records.

#### 11. `teaching_loads` Table
```sql
CREATE TABLE teaching_loads (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER,
    subject_name VARCHAR(255),
    faculty_id INTEGER,
    faculty_name VARCHAR(255),
    students_in_class INTEGER DEFAULT 60,
    theory_hours NUMERIC DEFAULT 0,
    lab_hours NUMERIC DEFAULT 0,
    project_hours NUMERIC DEFAULT 0,
    tutorial_hours NUMERIC DEFAULT 0,
    students_in_lab INTEGER DEFAULT 0,
    students_in_project INTEGER DEFAULT 0,
    subtotal_weighted_units NUMERIC DEFAULT 0,
    total_load NUMERIC DEFAULT 0
);
```

#### 12. `paper_and_assignment_setting` Table
```sql
CREATE TABLE paper_and_assignment_setting (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER,
    subject_name VARCHAR(255),
    faculty_id INTEGER,
    faculty_name VARCHAR(255),
    num_question_papers INTEGER DEFAULT 0,
    num_assignments INTEGER DEFAULT 2,
    num_question_bank INTEGER DEFAULT 0,
    subtotal_setting_units NUMERIC DEFAULT 0
);
```

#### 13. `preparation_and_course_factors` Table
```sql
CREATE TABLE preparation_and_course_factors (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER,
    subject_name VARCHAR(255),
    faculty_id INTEGER,
    faculty_name VARCHAR(255),
    theory_subject_prep NUMERIC DEFAULT 0,
    theory_rubrics_prep NUMERIC DEFAULT 0,
    theory_copo_mapping NUMERIC DEFAULT 0,
    lab_experiments_prep NUMERIC DEFAULT 0,
    lab_rubrics_prep NUMERIC DEFAULT 0,
    lab_eval_sheets_prep NUMERIC DEFAULT 0,
    lab_copo_mapping NUMERIC DEFAULT 0,
    project_rubrics_prep NUMERIC DEFAULT 0,
    project_eval_sheets_prep NUMERIC DEFAULT 0,
    project_copo_mapping NUMERIC DEFAULT 0,
    project_scheduling NUMERIC DEFAULT 0,
    extra_additions NUMERIC DEFAULT 0,
    total_load NUMERIC DEFAULT 0
);
```

#### 14. `evaluation_units` Table
```sql
CREATE TABLE evaluation_units (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER,
    subject_name VARCHAR(255),
    faculty_id INTEGER,
    faculty_name VARCHAR(255),
    series_answer_scripts NUMERIC DEFAULT 0,
    end_sem_answer_scripts NUMERIC DEFAULT 0,
    assignment_scripts NUMERIC DEFAULT 0,
    lab_output_evaluations NUMERIC DEFAULT 0,
    practical_exam_evals NUMERIC DEFAULT 0,
    viva_voce_count NUMERIC DEFAULT 0,
    project_evaluations NUMERIC DEFAULT 0,
    subtotal_evaluation_units NUMERIC DEFAULT 0
);
```

#### 15. `workload_master` Table
Master compilation table displaying grand total academic workload per subject allocation.
```sql
CREATE TABLE workload_master (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER,
    subject_name VARCHAR(255),
    faculty_id INTEGER,
    faculty_name VARCHAR(255),
    teaching_load_units NUMERIC DEFAULT 0,
    question_setting_units NUMERIC DEFAULT 0,
    prep_adjustment_units NUMERIC DEFAULT 0,
    evaluation_units NUMERIC DEFAULT 0,
    theory_hours_per_week NUMERIC DEFAULT 0,
    experience_multiplier NUMERIC DEFAULT 1,
    grand_total_workload_units NUMERIC DEFAULT 0
);
```

---

### 3.5 Multi-Domain Governance Subsystem (6 Institutional Categories)

UniFlow categorizes institutional workload into six discrete domains:
1. `Department` (Departmental Administration)
2. `Institutional` (IQAC, NAAC, NBA, Exam Cell)
3. `ExtraProactive` (Clubs, Hackathons, Professional Bodies)
4. `FDP_Workshop` (Workshops Organized/Attended, Keynote Speeches)
5. `Research` (Project Guidance, Publications, Funded Proposals)
6. `Consultancy` (Industrial Software Products, Testing)

#### 16. `department_roles_master` Table
Catalog of standardized institutional roles.
```sql
CREATE TABLE department_roles_master (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'R01', 'INST01', 'EX01'
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Department',
    source_pages VARCHAR(50),
    responsibility_summary TEXT
);
```

#### 17. `department_tasks_master` Table
Catalog of standard activities with pre-calibrated effort metrics.
```sql
CREATE TABLE department_tasks_master (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'T001', 'INST02', 'RS05'
    role_id VARCHAR(50),
    role_name VARCHAR(255) NOT NULL,
    responsibility_task VARCHAR(255) NOT NULL,
    work_unit VARCHAR(100) NOT NULL,
    std_effort NUMERIC(6, 2) NOT NULL,
    occurrences_per_semester INTEGER NOT NULL,
    complexity_factor NUMERIC(4, 2) NOT NULL,
    validation_note TEXT,
    category VARCHAR(50) DEFAULT 'Department'
);
```

#### 18. `faculty_department_workload` Table
Individual faculty allocations against master catalog tasks.
```sql
CREATE TABLE faculty_department_workload (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    faculty_name VARCHAR(255) NOT NULL,
    role_id VARCHAR(50),
    role_name VARCHAR(255) NOT NULL,
    task_id VARCHAR(50),
    task_name VARCHAR(255) NOT NULL,
    work_unit VARCHAR(100) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    std_effort NUMERIC(6, 2) NOT NULL,
    occurrences INTEGER NOT NULL,
    complexity_factor NUMERIC(4, 2) NOT NULL,
    calculated_workload NUMERIC(10, 2) NOT NULL, -- quantity * std_effort * occurrences * complexity_factor
    remarks TEXT,
    category VARCHAR(50) DEFAULT 'Department',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(faculty_id, task_id)
);
```
